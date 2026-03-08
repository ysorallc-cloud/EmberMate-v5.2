// ============================================================================
// Event System for Real-Time Sync Between Pages
// ============================================================================

import { useEffect, useRef } from 'react';
import { devLog } from '../utils/devLog';
import { EventCategory } from './eventNames';

type EventCallback = (category: string) => void;
const listeners: Set<EventCallback> = new Set();

export const emitDataUpdate = (category: EventCategory) => {
  devLog('[Events] emitDataUpdate:', category, '| listeners:', listeners.size);
  listeners.forEach(callback => callback(category));
};

export const emitNavigateToRecord = (section?: string) => {
  // This can be used for deep-linking to specific sections
  listeners.forEach(callback => callback(`navigate:${section || 'all'}`));
};

/**
 * Hook to listen for data updates.
 * Uses a ref to always call the latest callback, avoiding stale closure issues.
 */
export const useDataListener = (callback: EventCallback) => {
  // Use a ref to always have access to the latest callback
  const callbackRef = useRef(callback);

  // Update the ref whenever callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Create a stable wrapper that calls the latest callback via ref
    const stableCallback: EventCallback = (category) => {
      callbackRef.current(category);
    };

    listeners.add(stableCallback);
    devLog('[Events] useDataListener mounted, total listeners:', listeners.size);

    return () => {
      listeners.delete(stableCallback);
      devLog('[Events] useDataListener unmounted, total listeners:', listeners.size);
    };
  }, []); // Empty deps is correct here because we use the ref
};
