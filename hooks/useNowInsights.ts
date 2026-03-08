// ============================================================================
// useNowInsights - Unified insight with multi-day history
// Returns a single { insight } — highest priority from careInsight or aiInsight
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import type { TodayStats, AIInsight, CareInsight } from '../utils/nowHelpers';
import { isOverdue } from '../utils/nowHelpers';
import { generateCareInsight, generateAIInsight, RecentHistory } from '../utils/careInsights';
import type { Medication } from '../utils/medicationStorage';
import type { Appointment } from '../utils/appointmentStorage';
import { listLogsInRange } from '../storage/carePlanRepo';
import { getVitalsInRange } from '../utils/vitalsStorage';
import { getTodayDateString } from '../services/carePlanGenerator';
import { DEFAULT_PATIENT_ID } from '../types/patient';
import { logError } from '../utils/devLog';

function getDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export function useNowInsights(
  todayStats: TodayStats,
  instancesState: any,
  today: string,
  medications: Medication[],
  appointments: Appointment[],
  dailyTracking: any
) {
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [careInsight, setCareInsight] = useState<CareInsight | null>(null);
  const [recentHistory, setRecentHistory] = useState<RecentHistory | null>(null);

  // INS-2: Fetch multi-day history for P3 pattern insights
  useEffect(() => {
    async function loadHistory() {
      try {
        const end = getTodayDateString();
        const start = getDateNDaysAgo(7);

        // Fetch logs and vitals in parallel
        const [logs, vitals] = await Promise.all([
          listLogsInRange(DEFAULT_PATIENT_ID, start, end),
          getVitalsInRange(start, end),
        ]);

        // Count lunch skips over last 5 days
        const fiveDaysAgo = getDateNDaysAgo(5);
        const recentDates = new Set<string>();
        const lunchDates = new Set<string>();
        for (const log of logs) {
          if (log.date >= fiveDaysAgo) {
            recentDates.add(log.date);
            // Check if this is a lunch/meal log
            if (log.data && 'mealType' in log.data && (log.data as any).mealType === 'lunch') {
              lunchDates.add(log.date);
            }
          }
        }
        const daysWithData = recentDates.size;
        const lunchSkipCount = Math.max(0, Math.min(daysWithData, 5) - lunchDates.size);

        // Calculate average BP from vitals
        const bpReadings = vitals.filter(v => v.type === 'systolic' || v.type === 'diastolic');
        const systolicReadings = vitals.filter(v => v.type === 'systolic');
        const diastolicReadings = vitals.filter(v => v.type === 'diastolic');
        const avgSystolic = systolicReadings.length >= 3
          ? systolicReadings.reduce((sum, v) => sum + v.value, 0) / systolicReadings.length
          : null;
        const avgDiastolic = diastolicReadings.length >= 3
          ? diastolicReadings.reduce((sum, v) => sum + v.value, 0) / diastolicReadings.length
          : null;

        // Count consecutive days with 100% med adherence (from today backwards)
        const medLogsByDate = new Map<string, number>();
        const medTotalByDate = new Map<string, number>();
        for (const log of logs) {
          if (log.outcome === 'completed' || log.outcome === 'skipped') {
            medLogsByDate.set(log.date, (medLogsByDate.get(log.date) || 0) + 1);
          }
          medTotalByDate.set(log.date, (medTotalByDate.get(log.date) || 0) + 1);
        }
        let consecutiveMedDays = 0;
        const checkDate = new Date();
        for (let i = 0; i < 14; i++) {
          const dateStr = checkDate.toISOString().split('T')[0];
          const completed = medLogsByDate.get(dateStr) || 0;
          const total = medTotalByDate.get(dateStr) || 0;
          if (total > 0 && completed === total) {
            consecutiveMedDays++;
          } else if (total > 0) {
            break;
          }
          // Skip days with no data (weekends, gaps)
          checkDate.setDate(checkDate.getDate() - 1);
        }

        setRecentHistory({
          lunchSkipCount,
          avgSystolic,
          avgDiastolic,
          bpReadingCount: Math.max(systolicReadings.length, diastolicReadings.length),
          consecutiveMedDays,
          daysTracked: daysWithData,
        });
      } catch (err) {
        logError('useNowInsights.loadHistory', err);
      }
    }
    loadHistory();
  }, [today]);

  // Regenerate AI Insight when stats or timeline change
  useEffect(() => {
    if (!medications) return;

    let overdueCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let eveningMedsRemaining = 0;

    if (instancesState?.instances && instancesState.date === today) {
      overdueCount = instancesState.instances.filter((i: any) => i.status === 'pending' && isOverdue(i.scheduledTime)).length;
      upcomingCount = instancesState.instances.filter((i: any) => i.status === 'pending' && !isOverdue(i.scheduledTime)).length;
      completedCount = instancesState.instances.filter((i: any) => i.status === 'completed' || i.status === 'skipped').length;

      eveningMedsRemaining = instancesState.instances.filter((i: any) => {
        if (i.itemType !== 'medication' || i.status !== 'pending') return false;
        const scheduledDate = new Date(i.scheduledTime);
        const hour = scheduledDate.getHours();
        return hour >= 16 && hour < 22;
      }).length;
    }

    const todayAppts = appointments.filter(appt => {
      const apptDate = new Date(appt.date);
      return apptDate.toDateString() === new Date().toDateString();
    });

    const moodLevel = dailyTracking?.mood ?? null;

    const insight = generateAIInsight(
      todayStats,
      moodLevel,
      todayAppts,
      medications,
      overdueCount,
      upcomingCount,
      completedCount,
      eveningMedsRemaining
    );
    setAiInsight(insight);
  }, [todayStats, instancesState, today, medications, appointments, dailyTracking]);

  // Generate Care Insight when stats, instances, or history change
  useEffect(() => {
    const instances = instancesState?.instances || [];
    const completedCount = instances.filter(
      (i: any) => i.status === 'completed' || i.status === 'skipped'
    ).length;

    const insight = generateCareInsight(
      todayStats,
      instances,
      completedCount,
      recentHistory,
      appointments
    );
    setCareInsight(insight);
  }, [todayStats, instancesState, recentHistory, appointments]);

  // INS-5: Merge into single insight — careInsight has priority tiers built in
  const insight = useMemo(() => {
    return careInsight || aiInsight || null;
  }, [careInsight, aiInsight]);

  return { insight };
}
