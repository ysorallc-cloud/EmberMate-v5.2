import { useState, useCallback, useEffect, useRef } from 'react';
import { getPersonalizedEncouragement, CaregiverInsights, Encouragement } from '../utils/coffee-moment';
import { getStreaks } from '../utils/streakStorage';
import { logError } from '../utils/devLog';

const OVERDUE_THRESHOLD = 3;

interface CoffeeMomentData {
  medsTotal: number;
  medsDone: number;
  hasVitals: boolean;
  vitalsImproving: boolean;
  patientSleepQuality: 'good' | 'fair' | 'rough';
  upcomingAppointment: { days: number; doctor: string } | null;
}

export function useCoffeeMoment(
  overdueCount: number,
  hasLateMedication: boolean,
  data?: CoffeeMomentData
) {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [encouragement, setEncouragement] = useState<Encouragement | null>(null);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (dismissedRef.current) return;
    const shouldShow = overdueCount >= OVERDUE_THRESHOLD || hasLateMedication;
    setShowBanner(shouldShow);
  }, [overdueCount, hasLateMedication]);

  // Compute encouragement when modal is about to show
  const computeEncouragement = useCallback(async () => {
    try {
      const streaks = await getStreaks();
      const currentStreak = streaks.medication?.current ?? 0;
      const longestStreak = streaks.medication?.longest ?? currentStreak;

      const adherenceRate = data && data.medsTotal > 0
        ? Math.round((data.medsDone / data.medsTotal) * 100)
        : 0;

      const insights: CaregiverInsights = {
        streak: currentStreak,
        daysSinceLastLogin: 0,
        totalDaysUsing: longestStreak,
        lastNightSleep: 'fair',
        recentMoodTrend: 'stable',
        missedSelfCare: false,
        medAdherenceThisWeek: adherenceRate,
        vitalsImproving: data?.vitalsImproving ?? false,
        symptomsTrending: 'same',
        upcomingAppointment: data?.upcomingAppointment ?? null,
        lastNightPatientSleep: data?.patientSleepQuality ?? 'fair',
        justHitStreak: [7, 14, 30, 60, 90].includes(currentStreak) ? currentStreak : null,
      };

      const result = getPersonalizedEncouragement(insights);
      setEncouragement(result);
    } catch (err) {
      logError('useCoffeeMoment.computeEncouragement', err);
      setEncouragement(null);
    }
  }, [data]);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    dismissedRef.current = true;
  }, []);

  const startReset = useCallback(() => {
    setShowBanner(false);
    computeEncouragement();
    setShowModal(true);
  }, [computeEncouragement]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    dismissedRef.current = true;
  }, []);

  return { showBanner, showModal, startReset, dismissBanner, closeModal, encouragement };
}
