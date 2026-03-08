// ============================================================================
// CONTEXT CARD TYPES
// Types for the dynamic "Up Next" context card on TODAY screen
// ============================================================================

export type ContextCardState =
  | 'up-next'
  | 'caught-up'
  | 'end-of-day'
  | 'empty';

export interface UpNextData {
  type: 'medication' | 'appointment' | 'event' | 'task';
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  taskId: string;
}

export interface TomorrowPreviewItem {
  type: 'medication' | 'appointment' | 'event' | 'task';
  icon: string;
  title: string;
  time: string;
  taskId: string;
}

export interface ContextCardData {
  state: ContextCardState;
  upNext?: UpNextData;
}

export interface TimelineItem {
  id: string;
  type: 'medication' | 'appointment' | 'event' | 'task';
  title: string;
  time: string;
  date: string;
  status: 'pending' | 'done' | 'upcoming';
  completed?: boolean;
  isPending?: boolean;
  timestamp?: number;
  [key: string]: any;
}
