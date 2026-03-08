// ============================================================================
// TIMELINE STATUS UTILITIES
// Calculate status for timeline items
// ============================================================================

import { TimelineItem, TimelineItemStatus } from '../types/timeline';

export const calculateItemStatus = (
  item: TimelineItem,
  now: Date = new Date()
): TimelineItemStatus => {
  // If already completed, it's done
  if (item.completedTime) {
    return 'done';
  }

  // If scheduled time has passed, it's still available (gentle language)
  if (now > item.scheduledTime) {
    return 'available';
  }

  // Otherwise it's upcoming (caller determines which is "next")
  return 'upcoming';
};

export const getTimelineWithStatuses = (
  items: TimelineItem[],
  now: Date = new Date()
): TimelineItem[] => {
  // Sort by scheduled time
  const sorted = [...items].sort(
    (a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()
  );

  // Calculate status for each
  let foundNext = false;

  return sorted.map((item) => {
    const baseStatus = calculateItemStatus(item, now);

    // First upcoming item becomes "next"
    if (baseStatus === 'upcoming' && !foundNext) {
      foundNext = true;
      return { ...item, status: 'next' };
    }

    return { ...item, status: baseStatus };
  });
};
