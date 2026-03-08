// ============================================================================
// CONTEXT CARD STATE SELECTION LOGIC
// Determines which card state to show based on tasks and time
// ============================================================================

import { ContextCardState, TimelineItem } from '../types/contextCard';

interface ContextCardInput {
  todaysTasks: TimelineItem[];
  currentHour: number; // 0-23
}

/**
 * Determines which context card state to display
 */
export const getContextCardState = ({
  todaysTasks,
  currentHour,
}: ContextCardInput): ContextCardState => {
  const now = new Date();

  // Check if there's an upcoming task today (not done, scheduled after now)
  const hasUpcomingToday = todaysTasks.some((task) => {
    if (task.completed || task.status === 'done') return false;
    const taskTime = parseTaskTime(task.date, task.time);
    return taskTime > now;
  });

  // Check if all today's tasks are done
  const allDoneToday =
    todaysTasks.length > 0 &&
    todaysTasks.every((task) => task.completed || task.status === 'done');

  // Check if there are no tasks today
  const noTasksToday = todaysTasks.length === 0;

  // Decision tree
  if (hasUpcomingToday) {
    return 'up-next';
  }

  if (allDoneToday) {
    if (currentHour >= 21) {
      // 9 PM or later
      return 'end-of-day';
    }
    return 'caught-up';
  }

  if (noTasksToday) {
    return 'empty';
  }

  // Fallback (tasks exist but all are in the past and not marked done)
  return 'caught-up';
};

/**
 * Parse task date and time into a Date object
 */
function parseTaskTime(date: string, time: string): Date {
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
}
