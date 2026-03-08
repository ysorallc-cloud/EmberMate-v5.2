// ============================================================================
// CARE PLAN MANAGER
// Screen for managing the regimen-based CarePlan and CarePlanItems
// Uses NEW types from types/carePlan.ts and storage/carePlanRepo.ts
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import {
  CarePlan,
  CarePlanItem,
  CarePlanItemType,
  CarePlanItemPriority,
  TimeWindow,
  TimeWindowLabel,
  DEFAULT_TIME_WINDOWS,
} from '../../types/carePlan';
import {
  getActiveCarePlan,
  createCarePlan,
  listCarePlanItems,
  upsertCarePlanItem,
  archiveCarePlanItem,
  deleteCarePlanItem,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import { generateUniqueId } from '../../utils/idGenerator';
import { emitDataUpdate } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import {
  shouldPromptSampleDataClear,
  markFirstCarePlanCreated,
  clearSampleData,
} from '../../utils/sampleDataManager';
import { logError } from '../../utils/devLog';
import { BackButton } from '../../components/common/BackButton';

// ============================================================================
// TYPES
// ============================================================================

interface ItemTypeConfig {
  type: CarePlanItemType;
  label: string;
  emoji: string;
  description: string;
  defaultPriority: CarePlanItemPriority;
}

const ITEM_TYPES: ItemTypeConfig[] = [
  { type: 'medication', label: 'Medication', emoji: '💊', description: 'Pills, supplements, treatments', defaultPriority: 'required' },
  { type: 'vitals', label: 'Vitals Check', emoji: '📊', description: 'BP, glucose, temperature', defaultPriority: 'recommended' },
  { type: 'nutrition', label: 'Meal', emoji: '🍽️', description: 'Breakfast, lunch, dinner', defaultPriority: 'recommended' },
  { type: 'mood', label: 'Mood Check', emoji: '😊', description: 'How they\'re feeling', defaultPriority: 'optional' },
  { type: 'hydration', label: 'Hydration', emoji: '💧', description: 'Water intake tracking', defaultPriority: 'optional' },
  { type: 'activity', label: 'Activity', emoji: '🚶', description: 'Exercise, walking, movement', defaultPriority: 'optional' },
  { type: 'sleep', label: 'Sleep', emoji: '😴', description: 'Sleep quality tracking', defaultPriority: 'optional' },
  { type: 'appointment', label: 'Appointment', emoji: '📅', description: 'Doctor visits, check-ups', defaultPriority: 'required' },
  { type: 'custom', label: 'Custom', emoji: '✨', description: 'Any other task', defaultPriority: 'optional' },
];

const TIME_WINDOWS: { label: TimeWindowLabel; display: string; emoji: string }[] = [
  { label: 'morning', display: 'Morning', emoji: '🌅' },
  { label: 'afternoon', display: 'Afternoon', emoji: '☀️' },
  { label: 'evening', display: 'Evening', emoji: '🌆' },
  { label: 'night', display: 'Night', emoji: '🌙' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CarePlanManageScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [items, setItems] = useState<CarePlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CarePlanItem | null>(null);

  // Form state
  const [formType, setFormType] = useState<CarePlanItemType>('medication');
  const [formName, setFormName] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formPriority, setFormPriority] = useState<CarePlanItemPriority>('recommended');
  const [formActive, setFormActive] = useState(true);
  const [formTimeWindows, setFormTimeWindows] = useState<Set<TimeWindowLabel>>(new Set(['morning']));

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      let plan = await getActiveCarePlan(DEFAULT_PATIENT_ID);

      // Auto-create care plan if none exists
      if (!plan) {
        plan = await createCarePlan(DEFAULT_PATIENT_ID);
      }

      setCarePlan(plan);

      const planItems = await listCarePlanItems(plan.id);
      setItems(planItems);
    } catch (error) {
      logError('CarePlanManageScreen.loadData', error);
      Alert.alert('Error', 'Failed to load care plan');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormType('medication');
    setFormName('');
    setFormInstructions('');
    setFormPriority('recommended');
    setFormActive(true);
    setFormTimeWindows(new Set(['morning']));
    setEditingItem(null);
  };

  const openAddModal = (type?: CarePlanItemType) => {
    resetForm();
    if (type) {
      setFormType(type);
      const config = ITEM_TYPES.find(t => t.type === type);
      if (config) {
        setFormPriority(config.defaultPriority);
      }
    }
    setShowAddModal(true);
  };

  const openEditModal = (item: CarePlanItem) => {
    setEditingItem(item);
    setFormType(item.type);
    setFormName(item.name);
    setFormInstructions(item.instructions || '');
    setFormPriority(item.priority);
    setFormActive(item.active);

    // Extract time windows from schedule
    const windows = new Set<TimeWindowLabel>();
    for (const tw of item.schedule.times) {
      windows.add(tw.label);
    }
    setFormTimeWindows(windows.size > 0 ? windows : new Set(['morning']));

    setShowAddModal(true);
  };

  const toggleTimeWindow = (label: TimeWindowLabel) => {
    setFormTimeWindows(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        // Don't allow removing the last window
        if (next.size > 1) {
          next.delete(label);
        }
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!carePlan) return;
    if (!formName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    // Check if we should prompt for sample data clearing (first care plan creation)
    const shouldPrompt = await shouldPromptSampleDataClear();
    if (shouldPrompt && !editingItem) {
      // This is the first care plan item being created and sample data exists
      Alert.alert(
        'Ready to get started?',
        'EmberMate has sample data loaded to help you explore. Would you like to remove it now and start fresh with your own data?',
        [
          {
            text: 'Keep sample data',
            style: 'cancel',
            onPress: async () => {
              await markFirstCarePlanCreated();
              await performSave();
            },
          },
          {
            text: 'Remove sample data',
            style: 'destructive',
            onPress: async () => {
              await clearSampleData();
              await markFirstCarePlanCreated();
              await performSave();
            },
          },
        ]
      );
    } else {
      await performSave();
    }
  };

  const performSave = async () => {
    if (!carePlan) return;

    try {
      const now = new Date().toISOString();

      // Build time windows from selection
      const times: TimeWindow[] = Array.from(formTimeWindows).map(label => {
        const defaults = DEFAULT_TIME_WINDOWS[label as keyof typeof DEFAULT_TIME_WINDOWS];
        return {
          id: generateUniqueId(),
          kind: 'window' as const,
          label,
          start: defaults?.start || '09:00',
          end: defaults?.end || '12:00',
        };
      });

      const itemData: CarePlanItem = {
        id: editingItem?.id || generateUniqueId(),
        carePlanId: carePlan.id,
        type: formType,
        name: formName.trim(),
        instructions: formInstructions.trim() || undefined,
        priority: formPriority,
        active: formActive,
        schedule: {
          frequency: 'daily',
          times,
        },
        emoji: ITEM_TYPES.find(t => t.type === formType)?.emoji,
        createdAt: editingItem?.createdAt || now,
        updatedAt: now,
      };

      await upsertCarePlanItem(itemData);
      setShowAddModal(false);
      resetForm();
      await loadData();
      emitDataUpdate(EVENT.CARE_PLAN_ITEMS);
    } catch (error) {
      logError('CarePlanManageScreen.performSave', error);
      Alert.alert('Error', 'Failed to save item');
    }
  };

  const handleDelete = (item: CarePlanItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCarePlanItem(item.carePlanId, item.id);
              await loadData();
              emitDataUpdate(EVENT.CARE_PLAN_ITEMS);
            } catch (error) {
              logError('CarePlanManageScreen.handleDelete', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (item: CarePlanItem) => {
    try {
      await upsertCarePlanItem({ ...item, active: !item.active });
      await loadData();
      emitDataUpdate(EVENT.CARE_PLAN_ITEMS);
    } catch (error) {
      logError('CarePlanManageScreen.handleToggleActive', error);
    }
  };

  // Group items by type
  const itemsByType = items.reduce((acc, item) => {
    const key = item.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<CarePlanItemType, CarePlanItem[]>);

  const getItemConfig = (type: CarePlanItemType) => {
    return ITEM_TYPES.find(t => t.type === type) || ITEM_TYPES[ITEM_TYPES.length - 1];
  };

  const formatTimeWindows = (item: CarePlanItem): string => {
    return item.schedule.times
      .map(tw => TIME_WINDOWS.find(w => w.label === tw.label)?.display || tw.label)
      .join(', ');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AuroraBackground variant="log" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AuroraBackground variant="log" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={100}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <BackButton variant="text" />
        </View>

        <ScreenHeader
          title="Care Plan"
          subtitle="Manage daily care tasks"
        />

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Add tasks that need to happen daily. Each task can be scheduled for
            multiple times of day (morning, afternoon, evening, night).
          </Text>
        </View>

        {/* Quick Add Buttons */}
        <View style={styles.quickAddSection}>
          <Text style={styles.sectionLabel}>QUICK ADD</Text>
          <View style={styles.quickAddGrid}>
            {ITEM_TYPES.slice(0, 6).map(config => (
              <TouchableOpacity
                key={config.type}
                style={styles.quickAddButton}
                onPress={() => openAddModal(config.type)}
                accessibilityLabel={`Quick add ${config.label}`}
                accessibilityRole="button"
              >
                <Text style={styles.quickAddEmoji}>{config.emoji}</Text>
                <Text style={styles.quickAddLabel}>{config.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Items List */}
        {items.length > 0 && (
          <View style={styles.itemsSection}>
            <Text style={styles.sectionLabel}>YOUR CARE PLAN ({items.length} items)</Text>

            {Object.entries(itemsByType).map(([type, typeItems]) => {
              const config = getItemConfig(type as CarePlanItemType);
              return (
                <View key={type} style={styles.typeGroup}>
                  <View style={styles.typeHeader}>
                    <Text style={styles.typeEmoji}>{config.emoji}</Text>
                    <Text style={styles.typeLabel}>{config.label}</Text>
                    <Text style={styles.typeCount}>{typeItems.length}</Text>
                  </View>

                  {typeItems.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.itemRow, !item.active && styles.itemRowInactive]}
                      onPress={() => openEditModal(item)}
                      onLongPress={() => handleDelete(item)}
                      delayLongPress={500}
                      accessibilityLabel={`${item.name}, ${formatTimeWindows(item)}, ${item.priority}, ${item.active ? 'active' : 'inactive'}. Double tap to edit, long press to delete`}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !item.active }}
                    >
                      <View style={styles.itemContent}>
                        <Text style={[styles.itemName, !item.active && styles.itemNameInactive]}>
                          {item.name}
                        </Text>
                        <Text style={styles.itemMeta}>
                          {formatTimeWindows(item)} • {item.priority}
                        </Text>
                      </View>
                      <Switch
                        value={item.active}
                        onValueChange={() => handleToggleActive(item)}
                        trackColor={{ false: colors.glassActive, true: colors.sageGlow }}
                        thumbColor={item.active ? colors.accent : colors.textHalf}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No care tasks yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first task using the quick add buttons above
            </Text>
          </View>
        )}

        {/* Add Custom Button */}
        <TouchableOpacity
          style={styles.addCustomButton}
          onPress={() => openAddModal()}
          accessibilityLabel="Add custom task"
          accessibilityRole="button"
        >
          <Text style={styles.addCustomText}>+ Add Custom Task</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Edit Task' : 'Add Task'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                accessibilityLabel="Close modal"
                accessibilityRole="button"
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Type Selection (only for new items) */}
              {!editingItem && (
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Type</Text>
                  <View style={styles.typeGrid}>
                    {ITEM_TYPES.map(config => (
                      <TouchableOpacity
                        key={config.type}
                        style={[
                          styles.typeChip,
                          formType === config.type && styles.typeChipSelected,
                        ]}
                        onPress={() => {
                          setFormType(config.type);
                          setFormPriority(config.defaultPriority);
                        }}
                        accessibilityLabel={`${config.label} type`}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: formType === config.type }}
                      >
                        <Text style={styles.typeChipEmoji}>{config.emoji}</Text>
                        <Text style={[
                          styles.typeChipLabel,
                          formType === config.type && styles.typeChipLabelSelected,
                        ]}>
                          {config.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Name */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="e.g., Sertraline, Morning vitals check"
                  placeholderTextColor={colors.textPlaceholder}
                  accessibilityLabel="Care plan item name"
                />
              </View>

              {/* Instructions */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Instructions (optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textInputMultiline]}
                  value={formInstructions}
                  onChangeText={setFormInstructions}
                  placeholder="e.g., Take with food"
                  placeholderTextColor={colors.textPlaceholder}
                  multiline
                  numberOfLines={2}
                  accessibilityLabel="Care plan item instructions"
                />
              </View>

              {/* Time Windows */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>When (select one or more)</Text>
                <View style={styles.windowGrid}>
                  {TIME_WINDOWS.map(tw => (
                    <TouchableOpacity
                      key={tw.label}
                      style={[
                        styles.windowChip,
                        formTimeWindows.has(tw.label) && styles.windowChipSelected,
                      ]}
                      onPress={() => toggleTimeWindow(tw.label)}
                      accessibilityLabel={`${tw.display} time window`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: formTimeWindows.has(tw.label) }}
                    >
                      <Text style={styles.windowEmoji}>{tw.emoji}</Text>
                      <Text style={[
                        styles.windowLabel,
                        formTimeWindows.has(tw.label) && styles.windowLabelSelected,
                      ]}>
                        {tw.display}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Priority */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Priority</Text>
                <View style={styles.priorityRow}>
                  {(['required', 'recommended', 'optional'] as CarePlanItemPriority[]).map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityChip,
                        formPriority === p && styles.priorityChipSelected,
                      ]}
                      onPress={() => setFormPriority(p)}
                      accessibilityLabel={`${p.charAt(0).toUpperCase() + p.slice(1)} priority`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: formPriority === p }}
                    >
                      <Text style={[
                        styles.priorityLabel,
                        formPriority === p && styles.priorityLabelSelected,
                      ]}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Active Toggle */}
              <View style={styles.formSection}>
                <View style={styles.toggleRow}>
                  <Text style={styles.formLabel}>Active</Text>
                  <Switch
                    value={formActive}
                    onValueChange={setFormActive}
                    trackColor={{ false: colors.glassActive, true: colors.sageGlow }}
                    thumbColor={formActive ? colors.accent : colors.textHalf}
                  />
                </View>
                <Text style={styles.formHint}>
                  Inactive items won't generate daily tasks
                </Text>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                accessibilityLabel={editingItem ? 'Save changes' : 'Add task'}
                accessibilityRole="button"
              >
                <Text style={styles.saveButtonText}>
                  {editingItem ? 'Save Changes' : 'Add Task'}
                </Text>
              </TouchableOpacity>

              {/* Delete Button (edit mode only) */}
              {editingItem && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    setShowAddModal(false);
                    handleDelete(editingItem);
                  }}
                  accessibilityLabel={`Delete ${editingItem.name}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.deleteButtonText}>Delete Task</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: c.textSecondary,
    fontSize: 16,
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Header
  header: {
    marginBottom: 8,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: c.accent,
    fontWeight: '500',
  },

  // Info Card
  infoCard: {
    backgroundColor: c.sageTint,
    borderWidth: 1,
    borderColor: c.sageBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 20,
  },

  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textHalf,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Quick Add
  quickAddSection: {
    marginBottom: 24,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAddButton: {
    backgroundColor: c.glassHover,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 100,
  },
  quickAddEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickAddLabel: {
    fontSize: 12,
    color: c.textSecondary,
  },

  // Items List
  itemsSection: {
    marginBottom: 20,
  },
  typeGroup: {
    marginBottom: 16,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  typeEmoji: {
    fontSize: 16,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textBright,
  },
  typeCount: {
    fontSize: 12,
    color: c.textMuted,
    backgroundColor: c.glassHover,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glassFaint,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  itemRowInactive: {
    opacity: 0.5,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 2,
  },
  itemNameInactive: {
    textDecorationLine: 'line-through',
  },
  itemMeta: {
    fontSize: 11,
    color: c.textMuted,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textSecondary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
  },

  // Add Custom Button
  addCustomButton: {
    backgroundColor: c.sageLight,
    borderWidth: 1,
    borderColor: c.sageGlow,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addCustomText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.accent,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: c.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: c.glassActive,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
  },
  modalClose: {
    fontSize: 20,
    color: c.textHalf,
    padding: 4,
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 40,
  },

  // Form
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textSecondary,
    marginBottom: 8,
  },
  formHint: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: c.glassHover,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: c.textPrimary,
  },
  textInputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Type Grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.glassHover,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  typeChipSelected: {
    backgroundColor: c.sageBorder,
    borderColor: c.accent,
  },
  typeChipEmoji: {
    fontSize: 14,
  },
  typeChipLabel: {
    fontSize: 12,
    color: c.textSecondary,
  },
  typeChipLabelSelected: {
    color: c.accent,
    fontWeight: '500',
  },

  // Window Grid
  windowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  windowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.glassHover,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  windowChipSelected: {
    backgroundColor: c.sageBorder,
    borderColor: c.accent,
  },
  windowEmoji: {
    fontSize: 16,
  },
  windowLabel: {
    fontSize: 13,
    color: c.textSecondary,
  },
  windowLabelSelected: {
    color: c.accent,
    fontWeight: '500',
  },

  // Priority
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    flex: 1,
    backgroundColor: c.glassHover,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  priorityChipSelected: {
    backgroundColor: c.sageBorder,
    borderColor: c.accent,
  },
  priorityLabel: {
    fontSize: 12,
    color: c.textTertiary,
  },
  priorityLabelSelected: {
    color: c.accent,
    fontWeight: '500',
  },

  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Buttons
  saveButton: {
    backgroundColor: c.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: c.background,
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButtonText: {
    color: c.red,
    fontSize: 15,
    fontWeight: '500',
  },
});
