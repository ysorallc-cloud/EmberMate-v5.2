// Functional note logging
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { saveNote } from '../utils/noteStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { hapticSuccess } from '../utils/hapticFeedback';
import { EVENT } from '../lib/eventNames';
import { getTodayDateString } from '../services/carePlanGenerator';
import { logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { emitNoteEvent } from '../utils/eventEmitter';
import { SaveConfirmation } from '../components/common/SaveConfirmation';
import { SAVE_DESTINATIONS } from '../utils/saveDestinations';

export default function LogNoteScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [savedPreview, setSavedPreview] = useState('');

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Required', 'Please enter a note');
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      await saveNote({
        content: content.trim(),
        timestamp: now.toISOString(),
        date: getTodayDateString(),
      });

      emitDataUpdate(EVENT.NOTES);
      try { await emitNoteEvent(content.trim()); } catch {}

      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(DEFAULT_PATIENT_ID, getTodayDateString(), instanceId, 'completed',
            { type: 'custom', note: content.trim() },
            { source: 'record' });
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogNoteScreen.completeInstance', err);
        }
      }

      await hapticSuccess();
      setSavedPreview(content.trim().slice(0, 80));
      setShowConfirmation(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to save note');
      logError('LogNoteScreen.handleSave', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]} style={styles.gradient}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <SubScreenHeader title="Log Note" emoji="📝" />

            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Note *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={content}
                  onChangeText={setContent}
                  placeholder="Seemed more energetic today. Appetite was good at lunch. Remember to ask doctor about new medication next visit..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                  autoFocus
                  accessibilityLabel="Care note, required"
                />
              </View>

              <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving} accessibilityLabel={saving ? 'Saving note' : 'Save note'} accessibilityHint="Saves the care observation note" accessibilityRole="button" accessibilityState={{ disabled: saving }}>
                <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Note'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
      <SaveConfirmation
        visible={showConfirmation}
        icon="📝"
        title="Note Saved"
        preview={savedPreview}
        destinations={SAVE_DESTINATIONS.note}
        onDismiss={() => navigateBack()}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  gradient: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  form: { gap: 24 },
  formGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '500', color: c.textSecondary },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: c.textPrimary },
  textArea: { minHeight: 200, paddingTop: 14 },
  saveButton: { backgroundColor: c.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: c.textPrimary, fontSize: 15, fontWeight: '600' },
});
