import React, { useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem } from '../../utils/safeStorage';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import { useDataListener } from '../../lib/events';
import { StorageKeys, StorageKeyPrefixes } from '../../utils/storageKeys';

const DISMISSED_KEY = StorageKeys.CHECKLIST_DISMISSED;

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  route?: string;
  check: () => Promise<boolean>;
}

const items: ChecklistItem[] = [
  {
    id: 'care_plan',
    label: 'Set up a care plan',
    description: 'Define daily care tasks and medications',
    route: '/care-plan',
    check: async () => {
      // Check both legacy and bucket-based care plan keys
      const legacy = await safeGetItem<any>(StorageKeys.CARE_PLAN_V1, null);
      const bucket = await safeGetItem<any>(StorageKeys.CAREPLAN_CONFIG_V1_DEFAULT, null);
      return legacy !== null || bucket !== null;
    },
  },
  {
    id: 'patient_name',
    label: 'Add who you care for',
    description: 'Personalize the app with their name',
    route: '/patient',
    check: async () => {
      const name = await safeGetItem<string | null>(StorageKeys.PATIENT_NAME, null);
      return !!name;
    },
  },
  {
    id: 'first_log',
    label: 'Log your first care task',
    description: 'Track a medication, meal, or wellness check',
    route: '/log-morning-wellness',
    check: async () => {
      // Check if any daily care instance has been completed
      const keys = await AsyncStorage.getAllKeys();
      const instanceKeys = keys.filter(k => k.startsWith(StorageKeyPrefixes.DAILY_INSTANCES));
      for (const key of instanceKeys) {
        const data = await safeGetItem<any>(key, null);
        if (!data) continue;
        try {
          const instances = data.instances || data;
          if (Array.isArray(instances) && instances.some((i: any) => i.status === 'completed')) {
            return true;
          }
        } catch {}
      }
      return false;
    },
  },
];

export function GettingStartedChecklist() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(true);
  const checkingRef = useRef(false);

  const runChecks = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const wasDismissed = await safeGetItem<string | null>(DISMISSED_KEY, null);
      if (wasDismissed === 'true') {
        setDismissed(true);
        return;
      }

      const results: Record<string, boolean> = {};
      for (const item of items) {
        try {
          results[item.id] = await item.check();
        } catch {
          results[item.id] = false;
        }
      }
      setCompleted(results);

      const allDone = items.every((i) => results[i.id]);
      setDismissed(allDone);
    } finally {
      checkingRef.current = false;
    }
  }, []);

  // Re-check on tab focus
  useFocusEffect(useCallback(() => { runChecks(); }, [runChecks]));

  // Re-check when any data changes (care plan saved, task completed, etc.)
  useDataListener(useCallback(() => { runChecks(); }, [runChecks]));

  if (dismissed) return null;

  const completedCount = items.filter((i) => completed[i.id]).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Getting Started</Text>
        <Text style={styles.progress}>
          {completedCount}/{items.length}
        </Text>
      </View>

      {items.map((item) => {
        const done = completed[item.id];
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.item}
            onPress={() => item.route && navigate(item.route)}
            activeOpacity={item.route ? 0.7 : 1}
            disabled={!item.route || done}
          >
            <Text style={styles.checkmark}>{done ? '\u2705' : '\u2B1C'}</Text>
            <View style={styles.itemText}>
              <Text style={[styles.itemLabel, done && styles.itemDone]}>{item.label}</Text>
              {!done && <Text style={styles.itemDesc}>{item.description}</Text>}
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={styles.dismiss}
        onPress={async () => {
          setDismissed(true);
          await safeSetItem(DISMISSED_KEY, 'true');
        }}
      >
        <Text style={styles.dismissText}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: c.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  progress: {
    fontSize: 13,
    color: c.textMuted,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    gap: 10,
  },
  checkmark: {
    fontSize: 16,
    marginTop: 1,
  },
  itemText: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    color: c.textPrimary,
    fontWeight: '500',
  },
  itemDone: {
    color: c.textMuted,
    textDecorationLine: 'line-through',
  },
  itemDesc: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  },
  dismiss: {
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 13,
    color: c.textMuted,
  },
});
