// ============================================================================
// USE TIMELINE HOOK
// Builds timeline from medications, appointments, and wellness checks
// ============================================================================

import { useMemo, useEffect, useState } from 'react';
import { useWellnessSettings } from './useWellnessSettings';
import { getTimelineWithStatuses } from '../utils/timelineStatus';
import { getSubtitle } from '../utils/timelineSubtitle';
import { TimelineItem } from '../types/timeline';
import { setHours, setMinutes, format } from 'date-fns';
import { getMorningWellness, getEveningWellness } from '../utils/wellnessCheckStorage';
import { getVitalsCompletionForDate } from '../utils/vitalsStorage';

interface UseTimelineProps {
  medications: Array<{
    id: string;
    name: string;
    timeSlot: 'morning' | 'evening' | 'afternoon' | 'bedtime';
    scheduledHour: number;
    scheduledMinute: number;
    taken: boolean;
    takenTime?: Date;
  }>;
  appointments: Array<{
    id: string;
    provider: string;
    specialty: string;
    date: string;
    time: string;
    location?: string;
  }>;
  today: Date;
}

export const useTimeline = ({
  medications,
  appointments,
  today,
}: UseTimelineProps) => {
  const { wellnessChecks, vitalsCheck } = useWellnessSettings();
  const [morningWellnessComplete, setMorningWellnessComplete] = useState<Date | null>(null);
  const [eveningWellnessComplete, setEveningWellnessComplete] = useState<Date | null>(null);
  const [vitalsComplete, setVitalsComplete] = useState<Date | null>(null);

  // Load wellness check and vitals completion status
  useEffect(() => {
    const loadCompletionStatus = async () => {
      const dateStr = format(today, 'yyyy-MM-dd');
      const morning = await getMorningWellness(dateStr);
      const evening = await getEveningWellness(dateStr);
      const vitalsCompletion = await getVitalsCompletionForDate(dateStr);

      setMorningWellnessComplete(morning ? morning.completedAt : null);
      setEveningWellnessComplete(evening ? evening.completedAt : null);
      setVitalsComplete(vitalsCompletion);
    };

    loadCompletionStatus();
  }, [today]);

  const items = useMemo(() => {
    const allItems: TimelineItem[] = [];

    // Add medications
    medications.forEach((med) => {
      const scheduledTime = setMinutes(
        setHours(today, med.scheduledHour),
        med.scheduledMinute
      );

      allItems.push({
        id: `med-${med.id}-${med.timeSlot}`,
        type: 'medication',
        scheduledTime,
        completedTime: med.taken ? med.takenTime : undefined,
        title: `${capitalize(med.timeSlot)} medications`,
        subtitle: '',
        status: 'upcoming',
        medicationIds: [med.id],
      });
    });

    // Group medications by time slot to show count
    const medsBySlot = medications.reduce((acc, med) => {
      if (!acc[med.timeSlot]) {
        acc[med.timeSlot] = [];
      }
      acc[med.timeSlot].push(med);
      return acc;
    }, {} as Record<string, typeof medications>);

    // Clear individual meds and add grouped ones
    const groupedMeds: TimelineItem[] = [];
    Object.entries(medsBySlot).forEach(([slot, meds]) => {
      const firstMed = meds[0];
      const scheduledTime = setMinutes(
        setHours(today, firstMed.scheduledHour),
        firstMed.scheduledMinute
      );
      const allTaken = meds.every((m) => m.taken);

      groupedMeds.push({
        id: `med-${slot}-${today.toDateString()}`,
        type: 'medication',
        scheduledTime,
        completedTime: allTaken ? new Date() : undefined,
        title: `${capitalize(slot)} medications`,
        subtitle: '',
        status: 'upcoming',
        medicationIds: meds.map((m) => m.id),
      });
    });

    // Add today's appointments
    const todayStr = today.toISOString().split('T')[0];
    appointments
      .filter((apt) => apt.date === todayStr)
      .forEach((apt) => {
        const [hours, minutes] = apt.time.split(':').map(Number);
        const scheduledTime = setMinutes(setHours(today, hours), minutes);

        allItems.push({
          id: `apt-${apt.id}`,
          type: 'appointment',
          scheduledTime,
          completedTime: undefined,
          title: `${apt.provider} — ${apt.specialty}`,
          subtitle: apt.location || '',
          status: 'upcoming',
          appointmentId: apt.id,
        });
      });

    // Add morning wellness check (ALWAYS present - core feature)
    const [morningHours, morningMinutes] = wellnessChecks.morning.time
      .split(':')
      .map(Number);
    const morningTime = setMinutes(setHours(today, morningHours), morningMinutes);

    allItems.push({
      id: `wellness-morning-${today.toDateString()}`,
      type: 'wellness-morning',
      scheduledTime: morningTime,
      completedTime: morningWellnessComplete ?? undefined,
      title: 'Morning wellness check',
      subtitle: '',
      status: 'upcoming',
      wellnessChecks: wellnessChecks.morning.checks,
    });

    // Add vitals check (if enabled)
    if (vitalsCheck.enabled) {
      const [hours, minutes] = vitalsCheck.time.split(':').map(Number);
      const vitalsTime = setMinutes(setHours(today, hours), minutes);

      allItems.push({
        id: `vitals-${today.toDateString()}`,
        type: 'vitals',
        scheduledTime: vitalsTime,
        completedTime: vitalsComplete ?? undefined,
        title: 'Vitals',
        subtitle: '',
        status: 'upcoming',
        vitalTypes: vitalsCheck.types,
      });
    }

    // Add evening wellness check (ALWAYS present - core feature)
    const [eveningHours, eveningMinutes] = wellnessChecks.evening.time
      .split(':')
      .map(Number);
    const eveningTime = setMinutes(setHours(today, eveningHours), eveningMinutes);

    allItems.push({
      id: `wellness-evening-${today.toDateString()}`,
      type: 'wellness-evening',
      scheduledTime: eveningTime,
      completedTime: eveningWellnessComplete ?? undefined,
      title: 'Evening wellness check',
      subtitle: '',
      status: 'upcoming',
      wellnessChecks: wellnessChecks.evening.checks,
    });

    // Use grouped meds instead of individual ones
    const finalItems = [
      ...groupedMeds,
      ...allItems.filter((i) => i.type !== 'medication'),
    ];

    // Calculate statuses
    const withStatuses = getTimelineWithStatuses(finalItems, today);

    // Calculate subtitles
    return withStatuses.map((item) => ({
      ...item,
      subtitle: getSubtitle(item, today),
    }));
  }, [medications, appointments, wellnessChecks, vitalsCheck, today, morningWellnessComplete, eveningWellnessComplete, vitalsComplete]);

  const availableCount = items.filter((i) => i.status === 'available').length;

  return { items, availableCount };
};

// Helper function
const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
