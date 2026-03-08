// ============================================================================
// TIMELINE SUBTITLE UTILITIES
// Generate dynamic subtitles based on status
// ============================================================================

import { TimelineItem } from '../types/timeline';

export const getSubtitle = (item: TimelineItem, now: Date): string => {
  switch (item.status) {
    case 'done':
      return getCompletedSubtitle(item);
    case 'available':
      return getAvailableSubtitle(item);
    case 'next':
    case 'upcoming':
      return getPendingSubtitle(item);
    default:
      return '';
  }
};

const getCompletedSubtitle = (item: TimelineItem): string => {
  switch (item.type) {
    case 'medication':
      const count = item.medicationIds?.length || 0;
      return `${count} taken`;
    case 'wellness-morning':
    case 'wellness-evening':
      return 'Completed';
    case 'vitals':
      return 'Logged';
    case 'appointment':
      return 'Completed';
    default:
      return 'Done';
  }
};

const getAvailableSubtitle = (item: TimelineItem): string => {
  // Gentle language - no time pressure
  return "When you're ready";
};

const getPendingSubtitle = (item: TimelineItem): string => {
  switch (item.type) {
    case 'medication':
      const count = item.medicationIds?.length || 0;
      return `${count} to take`;
    case 'wellness-morning':
    case 'wellness-evening':
      return item.wellnessChecks?.join(', ') || 'Check in';
    case 'vitals':
      return item.vitalTypes?.map((v) => v.toUpperCase()).join(', ') || 'Log vitals';
    case 'appointment':
      return item.subtitle; // Location or doctor specialty
    default:
      return '';
  }
};
