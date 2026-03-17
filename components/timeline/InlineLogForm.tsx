// ============================================================================
// INLINE LOG FORM - Compact forms rendered inline below timeline items
// Dispatches to type-specific sub-forms based on task.type
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import { hapticSuccess } from '../../utils/hapticFeedback';

// ============================================================================
// TYPES
// ============================================================================

interface InlineLogFormProps {
  task: {
    id: string;
    type: string;
    title: string;
    subtitle?: string;
    windowLabel?: string;
    instanceId?: string;
    carePlanItemId?: string;
    itemName?: string;
    itemDosage?: string;
  };
  onComplete: (taskId: string, data?: any) => Promise<void>;
  onSkip: (taskId: string, reason?: string) => Promise<void>;
  onClose: () => void;
}

// ============================================================================
// MAIN DISPATCH
// ============================================================================

export function InlineLogForm({ task, onComplete, onSkip, onClose }: InlineLogFormProps) {
  switch (task.type) {
    case 'medication':
      return <InlineMedForm task={task} onComplete={onComplete} onSkip={onSkip} onClose={onClose} />;
    case 'vitals':
      return <InlineVitalsForm task={task} onComplete={onComplete} onClose={onClose} />;
    case 'nutrition':
      return <InlineMealForm task={task} onComplete={onComplete} onClose={onClose} />;
    case 'hydration':
      return <InlineWaterForm task={task} onComplete={onComplete} onClose={onClose} />;
    case 'mood':
      return <InlineMoodForm task={task} onComplete={onComplete} onClose={onClose} />;
    case 'wellness':
      return <NavigateButton
        route={task.windowLabel === 'evening' ? '/log-evening-wellness' : '/log-morning-wellness'}
        label="Start check-in"
        onClose={onClose}
      />;
    default:
      return <QuickCompleteForm task={task} onComplete={onComplete} onSkip={onSkip} onClose={onClose} />;
  }
}

// ============================================================================
// SUB-FORMS
// ============================================================================

function InlineMedForm({ task, onComplete, onSkip, onClose }: InlineLogFormProps) {
  const { colors } = useTheme();
  const [showSkipReason, setShowSkipReason] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    await onComplete(task.id, { outcome: 'taken' });
    hapticSuccess();
    setSaving(false);
  };

  const handleSkip = async () => {
    if (!showSkipReason) {
      setShowSkipReason(true);
      return;
    }
    setSaving(true);
    await onSkip(task.id, skipReason || undefined);
    hapticSuccess();
    setSaving(false);
  };

  return (
    <View style={[styles.formContainer, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
      <Text style={[styles.formTitle, { color: colors.textPrimary }]}>{task.itemName || task.title}</Text>
      {task.itemDosage ? <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>{task.itemDosage}</Text> : null}

      {showSkipReason && (
        <TextInput
          style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.glassBorder, backgroundColor: colors.background }]}
          placeholder="Skip reason (optional)"
          placeholderTextColor={colors.textMuted}
          value={skipReason}
          onChangeText={setSkipReason}
          autoFocus
        />
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.green }]}
          onPress={handleConfirm}
          disabled={saving}
          accessibilityLabel="Confirm taken"
          accessibilityRole="button"
        >
          <Text style={styles.confirmBtnText}>{saving ? '...' : 'Confirm Taken'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.skipBtn, { borderColor: colors.glassBorder }]}
          onPress={handleSkip}
          disabled={saving}
          accessibilityLabel="Skip medication"
          accessibilityRole="button"
        >
          <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>
            {showSkipReason ? 'Confirm Skip' : 'Skip'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close" accessibilityRole="button">
          <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InlineVitalsForm({ task, onComplete, onClose }: Omit<InlineLogFormProps, 'onSkip'>) {
  const { colors } = useTheme();
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [saving, setSaving] = useState(false);

  const hasData = systolic || diastolic || heartRate;

  const handleSave = async () => {
    setSaving(true);
    await onComplete(task.id, {
      systolic: systolic ? parseInt(systolic) : undefined,
      diastolic: diastolic ? parseInt(diastolic) : undefined,
      heartRate: heartRate ? parseInt(heartRate) : undefined,
    });
    hapticSuccess();
    setSaving(false);
  };

  return (
    <View style={[styles.formContainer, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
      <View style={styles.vitalsRow}>
        <VitalsInput label="SYS" value={systolic} onChange={setSystolic} colors={colors} />
        <Text style={[styles.vitalsSlash, { color: colors.textMuted }]}>/</Text>
        <VitalsInput label="DIA" value={diastolic} onChange={setDiastolic} colors={colors} />
        <VitalsInput label="HR" value={heartRate} onChange={setHeartRate} colors={colors} />
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: hasData ? colors.accent : colors.textDisabled }]}
          onPress={handleSave}
          disabled={!hasData || saving}
          accessibilityLabel="Save vitals"
          accessibilityRole="button"
        >
          <Text style={styles.confirmBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close" accessibilityRole="button">
          <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function VitalsInput({ label, value, onChange, colors }: { label: string; value: string; onChange: (v: string) => void; colors: typeof Colors }) {
  return (
    <View style={styles.vitalsInputWrap}>
      <Text style={[styles.vitalsLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.vitalsInput, { color: colors.textPrimary, borderColor: colors.glassBorder, backgroundColor: colors.background }]}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        maxLength={3}
        placeholder="—"
        placeholderTextColor={colors.textDisabled}
      />
    </View>
  );
}

function InlineMealForm({ task, onComplete, onClose }: Omit<InlineLogFormProps, 'onSkip'>) {
  const { colors } = useTheme();
  const [saving, setSaving] = useState(false);
  const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  const handleSelect = async (mealType: string) => {
    setSaving(true);
    await onComplete(task.id, { mealType });
    hapticSuccess();
    setSaving(false);
  };

  return (
    <View style={[styles.formContainer, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
      <View style={styles.chipRow}>
        {meals.map(meal => (
          <TouchableOpacity
            key={meal}
            style={[styles.chip, { borderColor: colors.glassBorder, backgroundColor: colors.background }]}
            onPress={() => handleSelect(meal.toLowerCase())}
            disabled={saving}
            accessibilityLabel={`Log ${meal}`}
            accessibilityRole="button"
          >
            <Text style={[styles.chipText, { color: colors.textPrimary }]}>{meal}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close" accessibilityRole="button">
          <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InlineWaterForm({ task, onComplete, onClose }: Omit<InlineLogFormProps, 'onSkip'>) {
  const { colors } = useTheme();

  const handleAdd = async () => {
    await onComplete(task.id, { glasses: 1 });
    hapticSuccess();
  };

  return (
    <View style={[styles.formContainer, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.accent }]}
          onPress={handleAdd}
          accessibilityLabel="Add one glass"
          accessibilityRole="button"
        >
          <Text style={styles.confirmBtnText}>+ Add Glass</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close" accessibilityRole="button">
          <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InlineMoodForm({ task, onComplete, onClose }: Omit<InlineLogFormProps, 'onSkip'>) {
  const { colors } = useTheme();
  const moods = [
    { emoji: '\uD83D\uDE22', label: 'Difficult', value: 1 },
    { emoji: '\uD83D\uDE15', label: 'Down', value: 2 },
    { emoji: '\uD83D\uDE10', label: 'Okay', value: 3 },
    { emoji: '\uD83D\uDE42', label: 'Good', value: 4 },
    { emoji: '\uD83D\uDE04', label: 'Great', value: 5 },
  ];

  const handleSelect = async (value: number, label: string) => {
    await onComplete(task.id, { score: value, label });
    hapticSuccess();
  };

  return (
    <View style={[styles.formContainer, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
      <View style={styles.moodRow}>
        {moods.map(m => (
          <TouchableOpacity
            key={m.value}
            style={styles.moodBtn}
            onPress={() => handleSelect(m.value, m.label)}
            accessibilityLabel={m.label}
            accessibilityRole="button"
          >
            <Text style={styles.moodEmoji}>{m.emoji}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close" accessibilityRole="button">
          <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function QuickCompleteForm({ task, onComplete, onSkip, onClose }: InlineLogFormProps) {
  const { colors } = useTheme();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    setSaving(true);
    await onComplete(task.id, notes ? { notes } : undefined);
    hapticSuccess();
    setSaving(false);
  };

  const handleSkip = async () => {
    setSaving(true);
    await onSkip(task.id);
    hapticSuccess();
    setSaving(false);
  };

  return (
    <View style={[styles.formContainer, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
      <TextInput
        style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.glassBorder, backgroundColor: colors.background }]}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textMuted}
        value={notes}
        onChangeText={setNotes}
      />
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.accent }]}
          onPress={handleComplete}
          disabled={saving}
          accessibilityLabel="Complete"
          accessibilityRole="button"
        >
          <Text style={styles.confirmBtnText}>{saving ? '...' : 'Complete'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.skipBtn, { borderColor: colors.glassBorder }]}
          onPress={handleSkip}
          disabled={saving}
          accessibilityLabel="Skip"
          accessibilityRole="button"
        >
          <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close" accessibilityRole="button">
          <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NavigateButton({ route, label, onClose }: { route: string; label: string; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.formContainer, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.accent }]}
          onPress={() => { onClose(); navigate(route); }}
          accessibilityLabel={label}
          accessibilityRole="button"
        >
          <Text style={styles.confirmBtnText}>{label} →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close" accessibilityRole="button">
          <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  formContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 28,
  },
  formTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  formSubtitle: { fontSize: 12, marginBottom: 8 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  confirmBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  confirmBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  skipBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  skipBtnText: { fontSize: 13, fontWeight: '500' },
  closeBtn: { marginLeft: 'auto', padding: 6 },
  closeBtnText: { fontSize: 14 },
  textInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '500' },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moodBtn: { padding: 6 },
  moodEmoji: { fontSize: 28 },
  vitalsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vitalsInputWrap: { flex: 1, alignItems: 'center' },
  vitalsLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  vitalsInput: { width: '100%', borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 16, textAlign: 'center' },
  vitalsSlash: { fontSize: 20, marginTop: 14 },
});
