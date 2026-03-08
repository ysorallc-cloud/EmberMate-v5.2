// ============================================================================
// USE CONTEXT CARD HOOK
// Determines context card state and prepares display data
// ============================================================================

import { useMemo } from 'react';
import { getContextCardState } from '../utils/contextCardState';
import { ContextCardData, TimelineItem } from '../types/contextCard';

interface UseContextCardProps {
  todaysTasks: TimelineItem[];
}

export const useContextCard = ({
  todaysTasks,
}: UseContextCardProps): ContextCardData => {
  const currentHour = new Date().getHours();

  return useMemo(() => {
    const state = getContextCardState({
      todaysTasks,
      currentHour,
    });

    // Build Up Next data if needed
    let upNext = undefined;
    if (state === 'up-next') {
      const now = new Date();
      const nextTask = todaysTasks
        .filter((t) => !t.completed && t.status !== 'done')
        .filter((t) => {
          try {
            const taskTime = parseTaskTime(t.date, t.time);
            return taskTime > now;
          } catch {
            return false;
          }
        })
        .sort((a, b) => {
          const timeA = parseTaskTime(a.date, a.time).getTime();
          const timeB = parseTaskTime(b.date, b.time).getTime();
          return timeA - timeB;
        })[0];

      if (nextTask) {
        upNext = {
          type: nextTask.type,
          icon: getIconForType(nextTask.type),
          title: nextTask.title,
          subtitle: formatSubtitle(nextTask),
          time: nextTask.time,
          taskId: nextTask.id,
        };
      }
    }

    return {
      state,
      upNext,
    };
  }, [todaysTasks, currentHour]);
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get icon emoji for task type
 */
const getIconForType = (type: string): string => {
  const icons: Record<string, string> = {
    medication: '💊',
    appointment: '🩺',
    event: '📌',
    task: '✓',
    lab: '🧪',
    pharmacy: '💊',
  };
  return icons[type] || '📋';
};

/**
 * Format time from 24-hour to 12-hour with AM/PM
 */
const formatTime = (time: string): string => {
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return time;
  }
};

/**
 * Format subtitle text for Up Next card
 */
const formatSubtitle = (task: TimelineItem): string => {
  if (task.type === 'medication') {
    const count = task.medicationCount || 1;
    return `${count} med${count !== 1 ? 's' : ''} due at ${formatTime(task.time)}`;
  }
  if (task.type === 'appointment') {
    const location = task.location || 'Location TBD';
    return `${formatTime(task.time)} • ${location}`;
  }
  return formatTime(task.time);
};

/**
 * Parse task date and time into Date object
 */
const parseTaskTime = (date: string, time: string): Date => {
  try {
    // Handle ISO date strings
    if (date.includes('T')) {
      return new Date(date);
    }
    // Handle separate date and time
    return new Date(`${date}T${time}`);
  } catch {
    return new Date();
  }
};
