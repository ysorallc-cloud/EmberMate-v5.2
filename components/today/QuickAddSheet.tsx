// ============================================================================
// QUICK ADD SHEET — Bottom sheet for unscheduled logging
// Only 3 options: Symptom, Note, Bathroom
// Opens from + button on Today screen
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { hapticSuccess } from '../../utils/hapticFeedback';
import { saveSymptomLog, saveNotesLog } from '../../utils/centralStorage';
import { emitDataUpdate } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { logError } from '../../utils/devLog';
import { emitSymptomEvent, emitNoteEvent, emitBathroomEvent } from '../../utils/eventEmitter';

type QuickAddType = 'symptom' | 'note' | 'bathroom' | null;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function QuickAddSheet({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeType, setActiveType] = useState<QuickAddType>(null);
  const [text, setText] = useState('');
  const [severity, setSeverity] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setActiveType(null);
    setText('');
    setSeverity(null);
    setSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleSaveSymptom = useCallback(async () => {
    if (!text.trim() || !severity) return;
    setSaving(true);
    try {
      await saveSymptomLog({
        timestamp: new Date().toISOString(),
        symptoms: [text.trim()],
        severity: severity === 'Mild' ? 3 : severity === 'Moderate' ? 5 : 8,
      });
      emitDataUpdate(EVENT.SYMPTOMS);
      try { await emitSymptomEvent(text.trim(), severity.toLowerCase(), { source: 'quick_log' }); } catch {}
      hapticSuccess();
      handleClose();
    } catch (err) {
      logError('QuickAddSheet.symptom', err);
    }
    setSaving(false);
  }, [text, severity, handleClose]);

  const handleSaveNote = useCallback(async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await saveNotesLog({
        timestamp: new Date().toISOString(),
        content: text.trim(),
      });
      emitDataUpdate(EVENT.NOTES);
      try { await emitNoteEvent(text.trim(), { source: 'quick_log' }); } catch {}
      hapticSuccess();
      handleClose();
    } catch (err) {
      logError('QuickAddSheet.note', err);
    }
    setSaving(false);
  }, [text, handleClose]);

  const handleSaveBathroom = useCallback(async (type: string) => {
    setSaving(true);
    try {
      await saveNotesLog({
        timestamp: new Date().toISOString(),
        content: `[Bathroom] ${type === 'bm' ? 'Bowel movement' : 'Urination'}`,
      });
      emitDataUpdate(EVENT.NOTES);
      try { await emitBathroomEvent(type, { source: 'quick_log' }); } catch {}
      hapticSuccess();
      handleClose();
    } catch (err) {
      logError('QuickAddSheet.bathroom', err);
    }
    setSaving(false);
  }, [handleClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {/* Handle bar */}
            <View style={styles.handleBar} />

            {!activeType ? (
              /* ── TYPE SELECTOR ── */
              <>
                <Text style={styles.sheetTitle}>Quick Add</Text>
                <View style={styles.optionRow}>
                  <TouchableOpacity
                    style={styles.optionCard}
                    onPress={() => setActiveType('symptom')}
                  >
                    <Text style={styles.optionIcon}>{'\uD83E\uDD12'}</Text>
                    <Text style={styles.optionLabel}>Symptom</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.optionCard}
                    onPress={() => setActiveType('note')}
                  >
                    <Text style={styles.optionIcon}>{'\uD83D\uDCDD'}</Text>
                    <Text style={styles.optionLabel}>Note</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.optionCard}
                    onPress={() => setActiveType('bathroom')}
                  >
                    <Text style={styles.optionIcon}>{'\uD83D\uDEBD'}</Text>
                    <Text style={styles.optionLabel}>Bathroom</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : activeType === 'symptom' ? (
              /* ── SYMPTOM FORM ── */
              <>
                <TouchableOpacity onPress={reset} style={styles.backButton}>
                  <Text style={styles.backText}>{'\u2190'} Back</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>Log Symptom</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="What symptom?"
                  placeholderTextColor={colors.textMuted}
                  value={text}
                  onChangeText={setText}
                  autoFocus
                />
                <Text style={styles.fieldLabel}>Severity</Text>
                <View style={styles.chipRow}>
                  {['Mild', 'Moderate', 'Severe'].map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, severity === s && styles.chipSelected]}
                      onPress={() => setSeverity(s)}
                    >
                      <Text style={[
                        styles.chipText,
                        severity === s && styles.chipTextSelected,
                      ]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.saveButton, (!text.trim() || !severity) && styles.saveButtonDisabled]}
                  onPress={handleSaveSymptom}
                  disabled={!text.trim() || !severity || saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : activeType === 'note' ? (
              /* ── NOTE FORM ── */
              <>
                <TouchableOpacity onPress={reset} style={styles.backButton}>
                  <Text style={styles.backText}>{'\u2190'} Back</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>Add Note</Text>
                <TextInput
                  style={[styles.textInput, styles.textInputMultiline]}
                  placeholder="Observation or reminder..."
                  placeholderTextColor={colors.textMuted}
                  value={text}
                  onChangeText={setText}
                  multiline
                  numberOfLines={3}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.saveButton, !text.trim() && styles.saveButtonDisabled]}
                  onPress={handleSaveNote}
                  disabled={!text.trim() || saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ── BATHROOM FORM ── */
              <>
                <TouchableOpacity onPress={reset} style={styles.backButton}>
                  <Text style={styles.backText}>{'\u2190'} Back</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>Log Bathroom</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, { flex: 1 }]}
                    onPress={() => handleSaveBathroom('bm')}
                    disabled={saving}
                  >
                    <Text style={styles.chipText}>Bowel Movement</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chip, { flex: 1 }]}
                    onPress={() => handleSaveBathroom('urination')}
                    disabled={saving}
                  >
                    <Text style={styles.chipText}>Urination</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    paddingTop: Spacing.md,
    minHeight: 200,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.glassBorder,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: Spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.sm,
  },
  optionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: BorderRadius.lg,
    paddingVertical: 20,
    gap: 8,
  },
  optionIcon: {
    fontSize: 28,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
  },
  backButton: {
    marginBottom: Spacing.sm,
  },
  backText: {
    color: c.accent,
    fontSize: 14,
  },
  textInput: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: c.textPrimary,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textSecondary,
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: c.glassBorder,
    backgroundColor: c.surface,
  },
  chipSelected: {
    borderColor: c.accent,
    backgroundColor: 'rgba(0, 200, 150, 0.15)',
  },
  chipText: {
    color: c.textPrimary,
    fontSize: 14,
    textAlign: 'center',
  },
  chipTextSelected: {
    color: c.accent,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: c.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
