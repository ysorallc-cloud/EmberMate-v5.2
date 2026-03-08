// ============================================================================
// USE EVENTS HOOK
// React hook wrapping eventRepo with state management and event bus
// ============================================================================

import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  saveEvent as repoSaveEvent,
  getEventsByDate,
  getEventsByDateRange,
} from '../storage/eventRepo';
import { emitDataUpdate, useDataListener } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { logError } from '../utils/devLog';
import type { CareEvent } from '../types/event';

const DEFAULT_PATIENT_ID = 'default';

interface UseEventsReturn {
  events: CareEvent[];
  loading: boolean;
  saveEvent: (event: Omit<CareEvent, 'id' | 'createdAt'>) => Promise<CareEvent | null>;
  refreshEvents: () => Promise<void>;
}

export function useEvents(
  date?: string,
  patientId: string = DEFAULT_PATIENT_ID
): UseEventsReturn {
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const targetDate = date || new Date().toISOString().split('T')[0];
      const data = await getEventsByDate(targetDate, patientId);
      setEvents(data);
    } catch (err) {
      logError('useEvents.loadEvents', err);
    } finally {
      setLoading(false);
    }
  }, [date, patientId]);

  // Load on focus
  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  // Refresh on data updates
  useDataListener(loadEvents);

  const saveEvent = useCallback(async (
    event: Omit<CareEvent, 'id' | 'createdAt'>
  ): Promise<CareEvent | null> => {
    try {
      const saved = await repoSaveEvent(event);
      emitDataUpdate(EVENT.LOG_EVENTS);
      // Optimistic update
      setEvents(prev => [...prev, saved].sort(
        (a, b) => a.timestamp.localeCompare(b.timestamp)
      ));
      return saved;
    } catch (err) {
      logError('useEvents.saveEvent', err);
      return null;
    }
  }, []);

  return {
    events,
    loading,
    saveEvent,
    refreshEvents: loadEvents,
  };
}

/**
 * Hook for querying events across a date range.
 * Use for insights, reports, and journal views.
 */
export function useEventRange(
  startDate: string,
  endDate: string,
  patientId: string = DEFAULT_PATIENT_ID
) {
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEventsByDateRange(startDate, endDate, patientId);
      setEvents(data);
    } catch (err) {
      logError('useEventRange.loadEvents', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, patientId]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  useDataListener(loadEvents);

  return { events, loading, refreshEvents: loadEvents };
}
