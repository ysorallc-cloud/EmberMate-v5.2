// ============================================================================
// USE APPOINTMENTS HOOK
// Single source of truth for appointment access across the app
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { logError } from '../utils/devLog';
import { useDataListener, emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import {
  Appointment,
  getAppointments,
  getAppointmentsByDate,
  getUpcomingAppointments,
  getNextAppointment,
  createAppointment,
  updateAppointment,
  completeAppointment,
  cancelAppointment,
  deleteAppointment,
} from '../utils/appointmentStorage';

// ============================================================================
// TYPES
// ============================================================================

export interface UseAppointmentsReturn {
  // State
  appointments: Appointment[];
  todayAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  nextAppointment: Appointment | null;
  loading: boolean;
  error: Error | null;

  // Actions
  refresh: () => Promise<void>;
  getAppointmentsForDate: (date: Date) => Promise<Appointment[]>;
  create: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Promise<Appointment>;
  update: (id: string, updates: Partial<Appointment>) => Promise<Appointment | null>;
  complete: (id: string) => Promise<boolean>;
  cancel: (id: string) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for accessing and managing appointments
 * This is the SINGLE SOURCE OF TRUTH for appointments across the app
 */
export function useAppointments(): UseAppointmentsReturn {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load all appointment data
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date();

      const [all, todayAppts, upcoming, next] = await Promise.all([
        getAppointments(),
        getAppointmentsByDate(today),
        getUpcomingAppointments(),
        getNextAppointment(),
      ]);

      setAppointments(all);
      setTodayAppointments(todayAppts);
      setUpcomingAppointments(upcoming);
      setNextAppointment(next);
    } catch (err) {
      logError('useAppointments.loadData', err);
      setError(err instanceof Error ? err : new Error('Failed to load appointments'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for relevant data updates only
  useDataListener((category) => {
    if (['appointments', 'sampleDataCleared', 'patient'].includes(category)) {
      loadData();
    }
  });

  /**
   * Refresh appointments data
   */
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  /**
   * Get appointments for a specific date
   */
  const getAppointmentsForDate = useCallback(async (date: Date): Promise<Appointment[]> => {
    return await getAppointmentsByDate(date);
  }, []);

  /**
   * Create a new appointment
   */
  const create = useCallback(async (
    appointment: Omit<Appointment, 'id' | 'createdAt'>
  ): Promise<Appointment> => {
    const newAppointment = await createAppointment(appointment);
    emitDataUpdate(EVENT.APPOINTMENTS); // Notify all listeners
    return newAppointment;
  }, []);

  /**
   * Update an appointment
   */
  const update = useCallback(async (
    id: string,
    updates: Partial<Appointment>
  ): Promise<Appointment | null> => {
    const updated = await updateAppointment(id, updates);
    if (updated) {
      emitDataUpdate(EVENT.APPOINTMENTS); // Notify all listeners
    }
    return updated;
  }, []);

  /**
   * Mark an appointment as completed
   */
  const complete = useCallback(async (id: string): Promise<boolean> => {
    const success = await completeAppointment(id);
    if (success) {
      emitDataUpdate(EVENT.APPOINTMENTS); // Notify all listeners
    }
    return success;
  }, []);

  /**
   * Cancel an appointment
   */
  const cancel = useCallback(async (id: string): Promise<boolean> => {
    const success = await cancelAppointment(id);
    if (success) {
      emitDataUpdate(EVENT.APPOINTMENTS); // Notify all listeners
    }
    return success;
  }, []);

  /**
   * Delete an appointment
   */
  const remove = useCallback(async (id: string): Promise<boolean> => {
    const success = await deleteAppointment(id);
    if (success) {
      emitDataUpdate(EVENT.APPOINTMENTS); // Notify all listeners
    }
    return success;
  }, []);

  return {
    appointments,
    todayAppointments,
    upcomingAppointments,
    nextAppointment,
    loading,
    error,
    refresh,
    getAppointmentsForDate,
    create,
    update,
    complete,
    cancel,
    remove,
  };
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for just today's appointments
 */
export function useTodayAppointments() {
  const { todayAppointments, loading, error, refresh } = useAppointments();
  return { appointments: todayAppointments, loading, error, refresh };
}

/**
 * Hook for just the next appointment
 */
export function useNextAppointment() {
  const { nextAppointment, loading, error, refresh } = useAppointments();
  return { appointment: nextAppointment, loading, error, refresh };
}

/**
 * Hook for upcoming appointments
 */
export function useUpcomingAppointments() {
  const { upcomingAppointments, loading, error, refresh } = useAppointments();
  return { appointments: upcomingAppointments, loading, error, refresh };
}
