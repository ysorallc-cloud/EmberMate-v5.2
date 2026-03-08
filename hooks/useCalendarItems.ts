// ============================================================================
// USE CALENDAR ITEMS HOOK
// React hook for fetching calendar items (appointments + events)
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { logError } from '../utils/devLog';
import { CalendarItem } from '../types/calendar';
import { getCalendarItems } from '../utils/calendarService';

interface UseCalendarItemsParams {
  startDate: Date;
  endDate: Date;
}

export function useCalendarItems({ startDate, endDate }: UseCalendarItemsParams) {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Convert dates to timestamps for stable dependencies
  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getCalendarItems(startDate, endDate);
      setItems(data);
    } catch (err) {
      setError(err as Error);
      logError('useCalendarItems.fetchItems', err);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTimestamp, endTimestamp]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    isLoading,
    error,
    refetch: fetchItems,
  };
}
