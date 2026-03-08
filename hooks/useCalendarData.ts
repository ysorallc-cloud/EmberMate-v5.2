// ============================================================================
// USE CALENDAR DATA HOOK
// Builds calendar days with heatmap completion data and day detail
// ============================================================================

import { useMemo, useEffect, useState, useCallback } from 'react';
import { logError } from '../utils/devLog';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isAfter,
  format,
} from 'date-fns';
import { CalendarDay } from '../types/calendar';
import { getMedications, Medication } from '../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../utils/appointmentStorage';
import { getMorningWellness, getEveningWellness } from '../utils/wellnessCheckStorage';
import { getVitalsCompletionForDate } from '../utils/vitalsStorage';
import { getVitalsLogs } from '../utils/centralStorage';
import { getMealsLogs } from '../utils/centralStorage';
import { getWaterLogs } from '../utils/centralStorage';
import { getSleepLogs } from '../utils/centralStorage';
import { getMoodLogs } from '../utils/centralStorage';
import { listDailyInstancesRange, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';

const MOOD_LABELS: Record<string, string> = {
  '1': 'Struggling', '2': 'Difficult', '3': 'Managing', '4': 'Good', '5': 'Great',
};

// ============================================================================
// MONTH SUMMARY STATS
// ============================================================================

export interface MonthSummary {
  avgCompletion: number;
  perfectDays: number;
  missedMedDays: number;
  totalTrackedDays: number;
}

export const useCalendarData = (currentMonth: Date, selectedDate: Date) => {
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [monthSummary, setMonthSummary] = useState<MonthSummary>({
    avgCompletion: 0, perfectDays: 0, missedMedDays: 0, totalTrackedDays: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadMonthData = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date();

      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const calStart = startOfWeek(monthStart);
      const calEnd = endOfWeek(monthEnd);

      const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

      // Load all data sources in parallel
      const startStr = format(calStart, 'yyyy-MM-dd');
      const endStr = format(calEnd, 'yyyy-MM-dd');

      const [
        medications,
        appointments,
        instances,
        vitalsLogs,
        mealsLogs,
        waterLogs,
        sleepLogs,
        moodLogs,
      ] = await Promise.all([
        getMedications(),
        getUpcomingAppointments(),
        listDailyInstancesRange(DEFAULT_PATIENT_ID, startStr, endStr).catch(() => []),
        getVitalsLogs().catch(() => []),
        getMealsLogs().catch(() => []),
        getWaterLogs().catch(() => []),
        getSleepLogs().catch(() => []),
        getMoodLogs().catch(() => []),
      ]);

      const activeMeds = medications.filter(m => m.active);
      const medsTotal = activeMeds.length;

      // Index data by date for efficient lookup
      const instancesByDate = new Map<string, any[]>();
      for (const inst of instances) {
        const d = inst.date || inst.scheduledTime?.split('T')[0];
        if (d) {
          if (!instancesByDate.has(d)) instancesByDate.set(d, []);
          instancesByDate.get(d)!.push(inst);
        }
      }

      const vitalsLogsByDate = new Map<string, any>();
      for (const v of vitalsLogs) {
        const d = new Date(v.timestamp).toISOString().split('T')[0];
        vitalsLogsByDate.set(d, v);
      }

      const mealsByDate = new Map<string, number>();
      for (const m of mealsLogs) {
        const d = new Date(m.timestamp).toISOString().split('T')[0];
        mealsByDate.set(d, (mealsByDate.get(d) || 0) + 1);
      }

      const waterByDate = new Map<string, number>();
      for (const w of waterLogs) {
        const d = new Date(w.timestamp).toISOString().split('T')[0];
        waterByDate.set(d, Math.max(waterByDate.get(d) || 0, w.glasses));
      }

      const sleepByDate = new Map<string, any>();
      for (const s of sleepLogs) {
        const d = new Date(s.timestamp).toISOString().split('T')[0];
        sleepByDate.set(d, s);
      }

      const moodByDate = new Map<string, any>();
      for (const m of moodLogs) {
        const d = new Date(m.timestamp).toISOString().split('T')[0];
        moodByDate.set(d, m);
      }

      // Build calendar days with completion data
      const days: CalendarDay[] = [];
      let sumCompletion = 0;
      let perfectCount = 0;
      let missedMedCount = 0;
      let trackedDayCount = 0;

      for (const date of allDays) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const isCurrentMonth = isSameMonth(date, currentMonth);
        const isTodayDate = isSameDay(date, today);
        const isFuture = isAfter(date, today) && !isTodayDate;

        // Appointment info
        const dayAppts = appointments.filter(a => a.date === dateStr);
        const hasAppt = dayAppts.length > 0;
        const firstAppt = dayAppts[0];

        // Completion data
        const dayInstances = instancesByDate.get(dateStr) || [];
        const medInstances = dayInstances.filter((i: any) => i.itemType === 'medication');
        const medsDone = medInstances.filter((i: any) => i.status === 'completed').length;

        const vitalsLog = vitalsLogsByDate.get(dateStr);
        const hasVitals = !!vitalsLog;

        // Load wellness
        let hasWellness = false;
        let wellnessData: { mood?: string; pain?: string } | null = null;
        try {
          const morning = await getMorningWellness(dateStr);
          const evening = await getEveningWellness(dateStr);
          hasWellness = !!(morning || evening);
          if (morning || evening) {
            const moodVal = morning?.mood || evening?.mood;
            wellnessData = {
              mood: moodVal ? (MOOD_LABELS[String(moodVal)] || String(moodVal)) : undefined,
              pain: evening?.painLevel || undefined,
            };
          }
        } catch {}

        const mealsCount = mealsByDate.get(dateStr) || 0;
        const waterCount = waterByDate.get(dateStr) || 0;
        const sleepLog = sleepByDate.get(dateStr);
        const moodLog = moodByDate.get(dateStr);

        // Calculate completion percentage
        let totalItems = 0;
        let doneItems = 0;

        if (medsTotal > 0) {
          totalItems += medsTotal;
          doneItems += Math.min(medsDone, medsTotal);
        }
        totalItems += 1; // vitals
        if (hasVitals) doneItems += 1;
        totalItems += 1; // wellness
        if (hasWellness) doneItems += 1;
        totalItems += 3; // 3 meals
        doneItems += Math.min(mealsCount, 3);

        const completionPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

        // Vitals detail
        let vitalsData: { bp?: string; hr?: number; glucose?: number } | null = null;
        if (vitalsLog) {
          vitalsData = {
            bp: vitalsLog.systolic && vitalsLog.diastolic
              ? `${vitalsLog.systolic}/${vitalsLog.diastolic}` : undefined,
            hr: vitalsLog.heartRate,
            glucose: vitalsLog.glucose,
          };
        }

        const day: CalendarDay = {
          date,
          isToday: isTodayDate,
          isSelected: isSameDay(date, selectedDate),
          isCurrentMonth,
          hasItems: totalItems > 0,
          hasAppointment: hasAppt,
          itemCount: totalItems,
          isFuture,
          completionPct: isFuture ? undefined : completionPct,
          medsTotal,
          medsDone: isFuture ? 0 : medsDone,
          vitals: hasVitals,
          wellness: hasWellness,
          mealsLogged: mealsCount,
          mealsTotal: 3,
          waterGlasses: waterCount,
          waterTarget: 8,
          sleepHours: sleepLog ? sleepLog.hours : null,
          sleepQuality: sleepLog
            ? (sleepLog.quality >= 4 ? 'good' : sleepLog.quality >= 3 ? 'fair' : 'poor')
            : null,
          appointment: firstAppt ? {
            provider: firstAppt.provider,
            specialty: firstAppt.specialty || 'Appointment',
            time: firstAppt.time ? formatTimeDisplay(firstAppt.time) : '',
          } : null,
          vitalsData,
          wellnessData,
          moodLabel: moodLog?.mood ? (MOOD_LABELS[String(moodLog.mood)] || String(moodLog.mood)) : null,
        };

        days.push(day);

        // Aggregate month stats (current month, non-future days only)
        if (isCurrentMonth && !isFuture) {
          trackedDayCount++;
          sumCompletion += completionPct;
          if (completionPct >= 90) perfectCount++;
          if (medsTotal > 0 && medsDone < medsTotal) missedMedCount++;
        }
      }

      setCalendarDays(days);
      setMonthSummary({
        avgCompletion: trackedDayCount > 0 ? Math.round(sumCompletion / trackedDayCount) : 0,
        perfectDays: perfectCount,
        missedMedDays: missedMedCount,
        totalTrackedDays: trackedDayCount,
      });
    } catch (error) {
      logError('useCalendarData.loadMonthData', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, selectedDate]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  return { calendarDays, monthSummary, loading };
};

function formatTimeDisplay(time24: string): string {
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}
