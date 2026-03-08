// ============================================================================
// TIME UTILITIES
// Centralized time parsing and formatting to ensure consistency
// ============================================================================

/**
 * Parse a time string (HH:MM or H:MM AM/PM) to minutes since midnight
 * Returns null if parsing fails
 */
export function parseTimeToMinutes(time: string | undefined | null): number | null {
  if (!time) return null;
  
  const trimmed = time.trim();
  
  // Try 24-hour format first (HH:MM or H:MM)
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }
  
  // Try 12-hour format (H:MM AM/PM)
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const isPM = match12[3].toUpperCase() === 'PM';
    
    if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
  }
  
  return null;
}

/**
 * Get current time as minutes since midnight
 */
export function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Format minutes since midnight to 12-hour time string
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Format a time string to 12-hour format
 * Returns empty string if invalid (use safeFormatTime for user-facing display)
 */
export function formatTimeTo12Hour(time: string | undefined | null): string {
  const minutes = parseTimeToMinutes(time);
  if (minutes === null) return '';
  return formatMinutesToTime(minutes);
}

/**
 * CANONICAL SAFE TIME FORMATTER
 * Use this for all user-facing time displays.
 * Handles: HH:mm, H:mm, ISO timestamps, invalid values
 * Returns 'Time not set' for any invalid input - never NaN or undefined
 */
export function safeFormatTime(time: string | undefined | null): string {
  if (!time || typeof time !== 'string') return 'Time not set';

  const trimmed = time.trim();

  // Handle ISO timestamp format (contains 'T')
  if (trimmed.includes('T')) {
    const date = new Date(trimmed);
    if (isNaN(date.getTime())) return 'Time not set';
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  // Handle HH:mm or H:mm format
  const minutes = parseTimeToMinutes(trimmed);
  if (minutes === null) return 'Time not set';
  return formatMinutesToTime(minutes);
}

/**
 * Validate and normalize a time string to HH:mm format
 * Returns null if invalid
 */
export function validateAndNormalizeTime(time: string | undefined | null): string | null {
  const minutes = parseTimeToMinutes(time);
  if (minutes === null) return null;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if a time has passed today
 */
export function hasTimePassed(time: string | undefined | null): boolean {
  const timeMinutes = parseTimeToMinutes(time);
  if (timeMinutes === null) return false;
  return getCurrentTimeMinutes() > timeMinutes;
}

/**
 * Get time slot (morning/afternoon/evening/night) from time
 */
export function getTimeSlot(time: string | undefined | null): 'morning' | 'afternoon' | 'evening' | 'night' {
  const minutes = parseTimeToMinutes(time);
  if (minutes === null) return 'morning';
  
  const hours = Math.floor(minutes / 60);
  if (hours >= 5 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 17) return 'afternoon';
  if (hours >= 17 && hours < 21) return 'evening';
  return 'night';
}

/**
 * Check if a date is today
 */
export function isToday(dateStr: string | undefined | null): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * Check if an appointment is upcoming today (has time in the future)
 */
export function isUpcomingToday(dateStr: string, time: string): boolean {
  if (!isToday(dateStr)) return false;
  return !hasTimePassed(time);
}

/**
 * Get minutes until a time (returns negative if passed)
 */
export function getMinutesUntil(time: string | undefined | null): number {
  const timeMinutes = parseTimeToMinutes(time);
  if (timeMinutes === null) return Infinity;
  return timeMinutes - getCurrentTimeMinutes();
}
