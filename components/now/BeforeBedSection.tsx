import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import { CareBrief } from '../../utils/careSummaryBuilder';
import { CareTasksState } from '../../hooks/useCareTasks';
import { BucketType } from '../../types/carePlanConfig';

interface BeforeBedItem { icon: string; text: string; route: string; }

function buildBeforeBedItems(
  careTasksState: CareTasksState | null,
  brief: CareBrief,
  patientGender: string | null,
  enabledBuckets: BucketType[],
): BeforeBedItem[] {
  const items: BeforeBedItem[] = [];
  const seenRoutes = new Set<string>();
  const seenLabels = new Set<string>();

  if (careTasksState) {
    const eveningTasks = careTasksState.byWindow['evening'] || [];
    const nightTasks = careTasksState.byWindow['night'] || [];
    for (const task of [...eveningTasks, ...nightTasks]) {
      if (task.status === 'pending') {
        const route = task.primaryAction?.route || '';
        if (route && seenRoutes.has(route)) continue;
        if (route) seenRoutes.add(route);
        const normalizedText = (task.title || '').toLowerCase().trim();
        if (normalizedText && seenLabels.has(normalizedText)) continue;
        if (normalizedText) seenLabels.add(normalizedText);
        items.push({
          icon: task.emoji || '✅',
          text: task.title,
          route,
        });
      }
    }
  }

  if (enabledBuckets.includes('sleep') && !brief.sleep.logged) {
    const pronoun = patientGender?.toLowerCase() === 'male' ? 'he'
      : patientGender?.toLowerCase() === 'female' ? 'she' : 'they';
    const sleepRoute = '/quick-log?expand=sleep';
    if (!seenRoutes.has(sleepRoute)) {
      seenRoutes.add(sleepRoute);
      items.push({ icon: '😴', text: `Log sleep when ${pronoun} go${pronoun === 'they' ? '' : 'es'} to bed`, route: sleepRoute });
    }
  }

  if (seenLabels.has('evening wellness check')) return items;

  if (enabledBuckets.includes('wellness')) {
    const hasEvening = brief.mood.eveningWellness != null;
    if (!hasEvening && new Date().getHours() >= 17) {
      const wellnessRoute = '/log-evening-wellness';
      if (!seenRoutes.has(wellnessRoute)) {
        seenRoutes.add(wellnessRoute);
        items.push({ icon: '📋', text: 'Evening wellness check', route: wellnessRoute });
      }
    }
  }

  return items;
}

interface BeforeBedSectionProps {
  brief: CareBrief;
  careTasksState: CareTasksState | null;
  patientGender: string | null;
  enabledBuckets: BucketType[];
  SectionHeaderRow: React.ComponentType<any>;
  sectionStyles: any;
}

export function BeforeBedSection({ brief, careTasksState, patientGender, enabledBuckets, SectionHeaderRow, sectionStyles }: BeforeBedSectionProps) {
  const { colors } = useTheme();

  if (new Date().getHours() < 17) return null;

  const bedItems = buildBeforeBedItems(careTasksState, brief, patientGender, enabledBuckets);
  if (bedItems.length === 0) return null;

  const styles = createStyles(colors);

  return (
    <>
      <SectionHeaderRow title="Before Bed" styles={sectionStyles} />
      <View style={sectionStyles.sectionCard}>
        {bedItems.map((item, i) => (
          <TouchableOpacity
            key={`bed-${i}`}
            style={styles.beforeBedRow}
            onPress={() => item.route && navigate(item.route)}
            activeOpacity={0.7}
          >
            <Text style={styles.beforeBedIcon}>{item.icon}</Text>
            <Text style={[styles.beforeBedText, { color: colors.textSecondary }]}>{item.text}</Text>
            <Text style={[styles.beforeBedArrow, { color: colors.accent }]}>→</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  beforeBedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  beforeBedIcon: {
    fontSize: 16,
  },
  beforeBedText: {
    flex: 1,
    fontSize: 13,
  },
  beforeBedArrow: {
    fontSize: 14,
  },
});
