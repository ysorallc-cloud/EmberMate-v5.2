// ============================================================================
// LOG BATHROOM - Bowel movement and urination tracking
// ============================================================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { navigateBack, canNavigateBack, navigateReplace } from '../lib/navigate';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { ScreenHeader } from '../components/ScreenHeader';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { saveNotesLog } from '../utils/centralStorage';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { logError } from '../utils/devLog';
import { hapticSuccess } from '../utils/hapticFeedback';
import { emitBathroomEvent } from '../utils/eventEmitter';

const BOWEL_OPTIONS = [
  { id: 'normal', label: 'Normal', icon: '✅' },
  { id: 'loose', label: 'Loose', icon: '💧' },
  { id: 'hard', label: 'Hard/Constipated', icon: '🔴' },
  { id: 'none', label: 'No BM today', icon: '➖' },
];

const URINATION_OPTIONS = [
  { id: 'normal', label: 'Normal', icon: '✅' },
  { id: 'frequent', label: 'Frequent', icon: '🔁' },
  { id: 'reduced', label: 'Reduced', icon: '⬇️' },
  { id: 'difficult', label: 'Difficult/Painful', icon: '⚠️' },
];

export default function LogBathroomScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [bowel, setBowel] = useState<string | null>(null);
  const [urination, setUrination] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (saved) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      const timer = setTimeout(async () => {
        await hapticSuccess();
        canNavigateBack() ? navigateBack() : navigateReplace('/(tabs)/today');
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [saved]);

  const handleSave = async () => {
    if (!bowel && !urination) return;

    try {
      const parts: string[] = [];
      if (bowel) {
        const bowelLabel = BOWEL_OPTIONS.find(o => o.id === bowel)?.label || bowel;
        parts.push(`Bowel: ${bowelLabel}`);
      }
      if (urination) {
        const urinationLabel = URINATION_OPTIONS.find(o => o.id === urination)?.label || urination;
        parts.push(`Urination: ${urinationLabel}`);
      }
      if (notes.trim()) {
        parts.push(`Notes: ${notes.trim()}`);
      }

      await saveNotesLog({
        timestamp: new Date().toISOString(),
        content: `[Bathroom] ${parts.join(' | ')}`,
      });
      emitDataUpdate(EVENT.NOTES);
      try { await emitBathroomEvent(parts.join(' | '), { notes: notes.trim() || undefined }); } catch {}
      setSaved(true);
    } catch (error) {
      logError('LogBathroomScreen.handleSave', error);
    }
  };

  if (saved) {
    return (
      <View style={{ flex: 1 }}>
        <AuroraBackground variant="log" />
        <View style={styles.confirmContainer}>
          <Animated.View style={[styles.confirmContent, { opacity: fadeAnim }]}>
            <Text style={styles.confirmIcon}>✅</Text>
            <Text style={styles.confirmTitle}>Logged</Text>
            <Text style={styles.confirmSubtitle}>Bathroom visit recorded</Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground variant="log" />
      <ScreenHeader title="Bathroom" />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Bowel Movement */}
        <Text style={styles.sectionTitle}>Bowel Movement</Text>
        <View style={styles.optionsGrid}>
          {BOWEL_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionChip, bowel === option.id && styles.optionChipSelected]}
              onPress={() => setBowel(bowel === option.id ? null : option.id)}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text style={[styles.optionLabel, bowel === option.id && styles.optionLabelSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Urination */}
        <Text style={styles.sectionTitle}>Urination</Text>
        <View style={styles.optionsGrid}>
          {URINATION_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionChip, urination === option.id && styles.optionChipSelected]}
              onPress={() => setUrination(urination === option.id ? null : option.id)}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text style={[styles.optionLabel, urination === option.id && styles.optionLabelSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <Text style={styles.sectionTitle}>Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Any additional details..."
          placeholderTextColor={colors.textPlaceholder}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, (!bowel && !urination) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!bowel && !urination}
        >
          <Text style={styles.saveButtonText}>Log Bathroom Visit</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  content: { flex: 1 },
  contentInner: { padding: Spacing.md, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textSecondary,
    marginBottom: 10,
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
  },
  optionChipSelected: {
    backgroundColor: c.accentDim,
    borderColor: c.accentBorder,
  },
  optionIcon: { fontSize: 16 },
  optionLabel: {
    fontSize: 14,
    color: c.textSecondary,
  },
  optionLabelSelected: {
    color: c.accent,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: BorderRadius.md,
    padding: 12,
    color: c.textPrimary,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: c.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmContent: {
    alignItems: 'center',
  },
  confirmIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: c.textBright,
    marginBottom: 4,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: c.textSecondary,
  },
});
