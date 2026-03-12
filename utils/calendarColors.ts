// ============================================================================
// SHARED CALENDAR COLOR UTILITIES
// Heatmap colors and category bar colors used by CalendarGrid and InsightsCalendar
// ============================================================================

export function getHeatColor(pct: number | undefined): string {
  if (pct === undefined || pct < 0) return 'transparent';
  if (pct >= 90) return 'rgba(16,185,129,0.35)';
  if (pct >= 70) return 'rgba(16,185,129,0.18)';
  if (pct >= 50) return 'rgba(245,158,11,0.18)';
  if (pct >= 25) return 'rgba(245,158,11,0.1)';
  return 'rgba(239,68,68,0.1)';
}

export function getHeatBorder(
  pct: number | undefined,
  fallbackBorder: string
): string {
  if (pct === undefined || pct < 0) return fallbackBorder;
  if (pct >= 90) return 'rgba(16,185,129,0.4)';
  if (pct >= 70) return 'rgba(16,185,129,0.25)';
  if (pct >= 50) return 'rgba(245,158,11,0.25)';
  return fallbackBorder;
}

export const CAT_COLORS = {
  meds: '#60A5FA',
  vitals: '#F472B6',
  meals: '#34D399',
  wellness: '#A78BFA',
  appt: '#EAB308',
} as const;

// Derive which categories were active on a given CalendarDay
import type { CalendarDay } from '../types/calendar';

export function getDayCategoryColors(day: CalendarDay): string[] {
  const cats: string[] = [];
  if ((day.medsDone ?? 0) > 0) cats.push(CAT_COLORS.meds);
  if (day.vitals) cats.push(CAT_COLORS.vitals);
  if ((day.mealsLogged ?? 0) > 0) cats.push(CAT_COLORS.meals);
  if (day.wellness) cats.push(CAT_COLORS.wellness);
  if (day.hasAppointment) cats.push(CAT_COLORS.appt);
  return cats;
}
