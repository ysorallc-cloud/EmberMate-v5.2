// ============================================================================
// MEDICATIONS BUCKET CONFIGURATION
// Configure medication tracking in the Care Plan
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import { navigate } from '../../lib/navigate';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import {
  MedsBucketConfig,
  MedicationPlanItem,
  formatTimeForDisplay,
} from '../../types/carePlanConfig';
import { COMMON_MEDICATIONS, TIME_SLOTS } from '../../components/medication/medicationFormHelpers';
import { emitDataUpdate } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';

// ============================================================================
// MEDICATION ITEM COMPONENT
// ============================================================================

interface MedicationItemProps {
  medication: MedicationPlanItem;
  onEdit: () => void;
  onToggleActive: (active: boolean) => void;
  onRemove: () => void;
  onToggleNotification: () => void;
}

function MedicationItem({ medication, onEdit, onToggleActive, onRemove, onToggleNotification }: MedicationItemProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const timeDisplay = medication.customTimes?.length
    ? medication.customTimes.map(t => formatTimeForDisplay(t)).join(', ')
    : medication.timesOfDay?.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ') || 'No time set';

  // Check if notifications are enabled for this medication
  const notificationsEnabled = medication.notificationsEnabled ?? true;

  return (
    <View style={[styles.medItem, !medication.active && styles.medItemInactive]}>
      <TouchableOpacity
        style={styles.medItemMain}
        onPress={onEdit}
        activeOpacity={0.7}
        accessibilityLabel={`Edit ${medication.name}, ${medication.dosage}, ${timeDisplay}`}
        accessibilityRole="button"
      >
        <View style={styles.medItemLeft}>
          <Text style={styles.medEmoji}>💊</Text>
          <View style={styles.medInfo}>
            <Text style={[styles.medName, !medication.active && styles.medNameInactive]}>
              {medication.name}
            </Text>
            <Text style={styles.medDosage}>{medication.dosage}</Text>
            <Text style={styles.medTime}>{timeDisplay}</Text>
            {medication.instructions && (
              <Text style={styles.medInstructions} numberOfLines={1}>
                {medication.instructions}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.medItemRight}>
          {/* Notification Bell Toggle */}
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onToggleNotification}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={notificationsEnabled ? `${medication.name} reminders on, tap to turn off` : `${medication.name} reminders off, tap to turn on`}
            accessibilityRole="switch"
            accessibilityState={{ checked: notificationsEnabled }}
          >
            <Text style={[styles.notificationIcon, !notificationsEnabled && styles.notificationIconOff]}>
              {notificationsEnabled ? '🔔' : '🔕'}
            </Text>
          </TouchableOpacity>
          <Switch
            value={medication.active}
            onValueChange={onToggleActive}
            trackColor={{ false: colors.glassStrong, true: colors.accent }}
            thumbColor={medication.active ? colors.textPrimary : colors.switchThumbOff}
            ios_backgroundColor={colors.glassStrong}
          />
        </View>
      </TouchableOpacity>
      <View style={styles.medItemActions}>
        <TouchableOpacity style={styles.medActionButton} onPress={onEdit} accessibilityLabel={`Edit ${medication.name}`} accessibilityRole="button">
          <Text style={styles.medActionText}>Edit</Text>
        </TouchableOpacity>
        <View style={styles.medActionDivider} />
        <TouchableOpacity
          style={styles.medActionButton}
          onPress={() => {
            Alert.alert(
              'Remove Medication',
              `Are you sure you want to remove ${medication.name}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: onRemove },
              ]
            );
          }}
          accessibilityLabel={`Remove ${medication.name}`}
          accessibilityRole="button"
        >
          <Text style={[styles.medActionText, styles.medActionTextDanger]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// QUICK ADD PANEL
// ============================================================================

interface QuickAddPanelProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (med: { name: string; dosage: string; timeSlot: string }) => void;
  onFullForm: () => void;
}

function QuickAddPanel({ visible, onClose, onAdd, onFullForm }: QuickAddPanelProps) {
  const { colors } = useTheme();
  const quickAddStyles = useMemo(() => createQuickAddStyles(colors), [colors]);
  const [selectedMed, setSelectedMed] = useState<typeof COMMON_MEDICATIONS[0] | null>(null);
  const [selectedDosage, setSelectedDosage] = useState('');
  const [selectedTime, setSelectedTime] = useState('morning');
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const [showDosageDropdown, setShowDosageDropdown] = useState(false);

  if (!visible) return null;

  const handleAdd = () => {
    if (selectedMed && selectedDosage) {
      onAdd({ name: selectedMed.name, dosage: selectedDosage, timeSlot: selectedTime });
      setSelectedMed(null);
      setSelectedDosage('');
    }
  };

  return (
    <View style={quickAddStyles.container}>
      <View style={quickAddStyles.header}>
        <Text style={quickAddStyles.headerTitle}>Quick Add</Text>
        <TouchableOpacity onPress={onFullForm}>
          <Text style={quickAddStyles.fullFormLink}>Full form {'\u2192'}</Text>
        </TouchableOpacity>
      </View>

      {/* Medication Dropdown */}
      <View style={{ zIndex: 20, marginBottom: 10 }}>
        <TouchableOpacity
          style={[quickAddStyles.dropdown, showMedDropdown && quickAddStyles.dropdownOpen]}
          onPress={() => { setShowMedDropdown(!showMedDropdown); setShowDosageDropdown(false); }}
          activeOpacity={0.7}
        >
          <Text style={[quickAddStyles.dropdownText, !selectedMed && quickAddStyles.dropdownPlaceholder]} numberOfLines={1}>
            {selectedMed?.name || 'Select medication...'}
          </Text>
          <Text style={[quickAddStyles.dropdownArrow, showMedDropdown && quickAddStyles.dropdownArrowFlipped]}>{'\u25BC'}</Text>
        </TouchableOpacity>
        {showMedDropdown && (
          <ScrollView style={quickAddStyles.dropdownList} nestedScrollEnabled>
            {COMMON_MEDICATIONS.map((med, idx) => (
              <TouchableOpacity
                key={med.name}
                style={[quickAddStyles.dropdownItem, idx < COMMON_MEDICATIONS.length - 1 && quickAddStyles.dropdownItemBorder]}
                onPress={() => {
                  setSelectedMed(med);
                  setSelectedDosage(med.commonDosages[0] || '');
                  setShowMedDropdown(false);
                }}
              >
                <Text style={quickAddStyles.dropdownItemText}>{med.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Dosage Dropdown */}
      <View style={{ zIndex: 10, marginBottom: 12 }}>
        <TouchableOpacity
          style={[quickAddStyles.dropdown, showDosageDropdown && quickAddStyles.dropdownOpen, !selectedMed && { opacity: 0.5 }]}
          onPress={() => { if (selectedMed) { setShowDosageDropdown(!showDosageDropdown); setShowMedDropdown(false); } }}
          activeOpacity={selectedMed ? 0.7 : 1}
        >
          <Text style={[quickAddStyles.dropdownText, !selectedDosage && quickAddStyles.dropdownPlaceholder]} numberOfLines={1}>
            {selectedDosage || (selectedMed ? 'Select dosage...' : 'Select med first')}
          </Text>
          <Text style={[quickAddStyles.dropdownArrow, showDosageDropdown && quickAddStyles.dropdownArrowFlipped]}>{'\u25BC'}</Text>
        </TouchableOpacity>
        {showDosageDropdown && selectedMed && (
          <ScrollView style={quickAddStyles.dropdownList} nestedScrollEnabled>
            {selectedMed.commonDosages.map((dose, idx) => (
              <TouchableOpacity
                key={dose}
                style={[quickAddStyles.dropdownItem, idx < selectedMed.commonDosages.length - 1 && quickAddStyles.dropdownItemBorder]}
                onPress={() => { setSelectedDosage(dose); setShowDosageDropdown(false); }}
              >
                <Text style={quickAddStyles.dropdownItemText}>{dose}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Time Slot Selector */}
      <View style={quickAddStyles.timeRow}>
        {TIME_SLOTS.map(slot => (
          <TouchableOpacity
            key={slot.key}
            style={[quickAddStyles.timeButton, selectedTime === slot.key && quickAddStyles.timeButtonActive]}
            onPress={() => setSelectedTime(slot.key)}
            activeOpacity={0.7}
          >
            <Text style={quickAddStyles.timeIcon}>{slot.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={[quickAddStyles.addButton, (!selectedMed || !selectedDosage) && quickAddStyles.addButtonDisabled]}
        onPress={handleAdd}
        disabled={!selectedMed || !selectedDosage}
        activeOpacity={0.7}
      >
        <Text style={[quickAddStyles.addButtonText, (!selectedMed || !selectedDosage) && quickAddStyles.addButtonTextDisabled]}>
          {selectedMed ? `Add ${selectedMed.name}` : 'Add Medication'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createQuickAddStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: 'rgba(20, 184, 166, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.4)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: c.accent,
  },
  fullFormLink: {
    fontSize: 11,
    color: c.textMuted,
  },
  dropdown: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownOpen: {
    borderColor: c.accent,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dropdownText: {
    fontSize: 14,
    color: c.textPrimary,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: c.textMuted,
  },
  dropdownArrow: {
    fontSize: 10,
    color: c.textMuted,
    marginLeft: 8,
  },
  dropdownArrowFlipped: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownList: {
    backgroundColor: c.backgroundElevated,
    borderWidth: 1,
    borderColor: c.accent,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 160,
  },
  dropdownItem: {
    padding: 10,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  dropdownItemText: {
    fontSize: 13,
    color: c.textPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  timeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  timeButtonActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderColor: 'rgba(20, 184, 166, 0.4)',
  },
  timeIcon: {
    fontSize: 18,
  },
  addButton: {
    backgroundColor: c.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: c.glassStrong,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.background,
  },
  addButtonTextDisabled: {
    color: c.textMuted,
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MedsBucketScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    config,
    loading,
    updateMedication,
    removeMedication,
    getActiveMedications,
    addMedication,
  } = useCarePlanConfig();

  const medsConfig = config?.meds as MedsBucketConfig | undefined;
  const medications = medsConfig?.medications || [];

  // Quick add panel state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');


  const handleToggleMedActive = useCallback(async (medId: string, active: boolean) => {
    await updateMedication(medId, { active });
  }, [updateMedication]);

  const handleRemoveMed = useCallback(async (medId: string) => {
    await removeMedication(medId);
  }, [removeMedication]);

  const handleEditMed = useCallback((medId: string) => {
    // Navigate to medication form with edit mode
    navigate(`/medication-form?id=${medId}&source=careplan`);
  }, [router]);

  const handleAddMed = useCallback(() => {
    // Navigate to medication form to add new
    navigate('/medication-form?source=careplan');
  }, [router]);

  const handleQuickAdd = useCallback(async (med: { name: string; dosage: string; timeSlot: string }) => {
    try {
      const timeSlotToTime: Record<string, string> = {
        morning: '08:00', afternoon: '13:00', evening: '18:00', bedtime: '22:00',
      };

      if (addMedication) {
        await addMedication({
          name: med.name,
          dosage: med.dosage,
          timesOfDay: [med.timeSlot as any],
          customTimes: [timeSlotToTime[med.timeSlot] || '08:00'],
          scheduledTimeHHmm: timeSlotToTime[med.timeSlot] || '08:00',
          active: true,
          supplyEnabled: true,
          daysSupply: 30,
          refillThresholdDays: 7,
          notificationsEnabled: true,
          scheduleFrequency: 'daily',
        });
      }

      emitDataUpdate(EVENT.MEDICATION);
      emitDataUpdate(EVENT.CARE_PLAN_ITEMS);
      emitDataUpdate(EVENT.DAILY_INSTANCES);

      setToastMessage(`${med.name} ${med.dosage} added!`);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2500);
      setShowQuickAdd(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add medication');
    }
  }, [addMedication]);

  const handleToggleNotification = useCallback(async (med: MedicationPlanItem) => {
    await updateMedication(med.id, {
      notificationsEnabled: !(med.notificationsEnabled ?? true),
    });
  }, [updateMedication]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerLabel}>MEDICATIONS</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Medications List */}
          <Text style={styles.sectionLabel}>YOUR MEDICATIONS</Text>

          {medications.length === 0 && !showQuickAdd && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💊</Text>
              <Text style={styles.emptyTitle}>No medications added</Text>
              <Text style={styles.emptySubtitle}>
                Add your medications to track doses and get reminders.
              </Text>
            </View>
          )}

          {medications.map(med => (
            <MedicationItem
              key={med.id}
              medication={med}
              onEdit={() => handleEditMed(med.id)}
              onToggleActive={(active) => handleToggleMedActive(med.id, active)}
              onRemove={() => handleRemoveMed(med.id)}
              onToggleNotification={() => handleToggleNotification(med)}
            />
          ))}

          {/* Inline Quick Add Panel */}
          <QuickAddPanel
            visible={showQuickAdd}
            onClose={() => setShowQuickAdd(false)}
            onAdd={handleQuickAdd}
            onFullForm={handleAddMed}
          />

          {/* Single add button — always visible when Quick Add is closed */}
          {!showQuickAdd && (
            <TouchableOpacity
              style={styles.addButtonOutline}
              onPress={() => setShowQuickAdd(true)}
              activeOpacity={0.7}
              accessibilityLabel={medications.length > 0 ? 'Add another medication' : 'Add medication'}
              accessibilityRole="button"
            >
              <Text style={styles.addButtonText}>
                {medications.length > 0 ? '+ Add Another Medication' : '+ Add Medication'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Confirmation Toast */}
        {toastVisible && (
          <View style={styles.toast}>
            <View style={styles.toastIcon}>
              <Text style={styles.toastIconText}>{'\u2713'}</Text>
            </View>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

      </LinearGradient>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  gradient: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: c.backgroundElevated,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: c.textPrimary,
  },
  headerLabel: {
    fontSize: 11,
    color: c.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },

  // Section Labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textHalf,
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },

  addButtonText: {
    fontSize: 14,
    color: c.accent,
    fontWeight: '500',
  },

  // Medication Item
  medItem: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  medItemInactive: {
    opacity: 0.6,
  },
  medItemMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  medItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  medEmoji: {
    fontSize: 24,
    marginTop: 2,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  medNameInactive: {
    color: c.textSecondary,
  },
  medDosage: {
    fontSize: 14,
    color: c.textSecondary,
    marginBottom: 2,
  },
  medTime: {
    fontSize: 13,
    color: c.accent,
  },
  medInstructions: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  medItemRight: {
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    padding: 4,
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationIconOff: {
    opacity: 0.5,
  },
  medItemActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  medActionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  medActionDivider: {
    width: 1,
    backgroundColor: c.border,
  },
  medActionText: {
    fontSize: 14,
    color: c.accent,
    fontWeight: '500',
  },
  medActionTextDanger: {
    color: c.red,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  addButtonOutline: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: c.sageGlow,
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 50,
  },
  toastIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastIconText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
});
