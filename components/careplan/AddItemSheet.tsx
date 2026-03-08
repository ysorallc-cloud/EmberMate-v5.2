// ============================================================================
// ADD ITEM SHEET — Type selection bottom sheet
// Shown when tapping "Add item" from a routine section in Care Plan
// Routes to the appropriate configuration screen with window pre-set
// ============================================================================

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { navigate } from '../../lib/navigate';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface AddItemSheetProps {
  visible: boolean;
  windowLabel?: string; // 'morning' | 'midday' | 'evening'
  onClose: () => void;
}

const ITEM_TYPES = [
  {
    emoji: '\uD83D\uDC8A',
    label: 'Medication',
    description: 'Track a medication with dosage and schedule',
    route: '/care-plan/meds',
  },
  {
    emoji: '\uD83D\uDCCA',
    label: 'Vital sign',
    description: 'Monitor blood pressure, temperature, etc.',
    route: '/care-plan/vitals',
  },
  {
    emoji: '\uD83C\uDF05',
    label: 'Wellness check',
    description: 'Configure morning or evening check-in fields',
    route: '/care-plan/wellness',
  },
  {
    emoji: '\uD83C\uDF7D',
    label: 'Meal tracking',
    description: 'Log meals and nutrition',
    route: '/care-plan/meals',
  },
  {
    emoji: '\uD83C\uDFC3',
    label: 'Activity',
    description: 'Track exercise and movement',
    route: '/care-plan/activity',
  },
] as const;

export function AddItemSheet({ visible, windowLabel, onClose }: AddItemSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSelect = (route: string) => {
    onClose();
    const fullRoute = windowLabel ? `${route}?defaultWindow=${windowLabel}` : route;
    setTimeout(() => navigate(fullRoute), 150);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Add to routine</Text>
          {windowLabel && (
            <Text style={styles.subtitle}>
              This item will be scheduled for{' '}
              {windowLabel === 'midday' ? 'afternoon' : windowLabel}
            </Text>
          )}

          <View style={styles.options}>
            {ITEM_TYPES.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.option}
                onPress={() => handleSelect(item.route)}
                activeOpacity={0.7}
                accessibilityLabel={`Add ${item.label}`}
                accessibilityRole="button"
              >
                <Text style={styles.optionEmoji}>{item.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{item.label}</Text>
                  <Text style={styles.optionDesc}>{item.description}</Text>
                </View>
                <Text style={styles.optionChevron}>{'\u203A'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.backgroundElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: c.textMuted,
    marginBottom: 8,
  },
  options: {
    marginTop: 12,
    gap: 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  optionEmoji: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 16,
  },
  optionChevron: {
    fontSize: 18,
    color: c.accent,
  },
});
