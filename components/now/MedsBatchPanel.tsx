// ============================================================================
// MEDS BATCH PANEL - Confirm multiple meds at once
// Replaces individual per-med navigation when meds ring is tapped
// ============================================================================

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { navigate } from '../../lib/navigate';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { parseTimeForDisplay, isOverdue } from '../../utils/nowHelpers';

interface MedInstance {
  id: string;
  itemName: string;
  itemDosage?: string;
  scheduledTime: string;
  carePlanItemId?: string;
  instructions?: string;
  [key: string]: any;
}

interface MedsBatchPanelProps {
  pendingMeds: MedInstance[];
  completedMeds: MedInstance[];
  onBatchConfirm: (instanceIds: string[]) => Promise<void>;
  onItemPress: (instance: MedInstance) => void;
  stat: { completed: number; total: number };
  onClose: () => void;
}

export function MedsBatchPanel({
  pendingMeds,
  completedMeds,
  onBatchConfirm,
  onItemPress,
  stat,
  onClose,
}: MedsBatchPanelProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set()
  );
  const [confirming, setConfirming] = useState(false);

  const toggleMed = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(pendingMeds.map(m => m.id)));
  };

  const handleConfirmSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    setConfirming(true);
    try {
      await onBatchConfirm(ids);
    } catch {
      Alert.alert('Error', 'Failed to confirm some medications. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const hasOverdue = pendingMeds.some(m => isOverdue(m.scheduledTime));

  return (
    <View style={[
      styles.container,
      styles.containerDefault,
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>{'\uD83D\uDC8A'}</Text>
          <Text style={styles.label}>Meds</Text>
          <Text style={styles.count}>{stat.completed}/{stat.total}</Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Close Meds details"
          accessibilityRole="button"
        >
          <Text style={styles.close}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>

      {/* Pending meds checklist */}
      {pendingMeds.length > 0 && (
        <>
          {pendingMeds.map((med) => {
            const isChecked = selected.has(med.id);
            const timeStr = parseTimeForDisplay(med.scheduledTime);
            const overdueItem = isOverdue(med.scheduledTime);

            return (
              <View key={med.id} style={styles.medRow}>
                <TouchableOpacity
                  style={[styles.checkbox, isChecked && styles.checkboxChecked]}
                  onPress={() => toggleMed(med.id)}
                  accessibilityLabel={`${isChecked ? 'Deselect' : 'Select'} ${med.itemName}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isChecked }}
                >
                  {isChecked && <Text style={styles.checkmark}>{'\u2713'}</Text>}
                </TouchableOpacity>
                <View style={styles.medDetails}>
                  <Text style={styles.medName}>{med.itemName}</Text>
                  <Text style={[styles.medMeta, overdueItem && styles.medMetaOverdue]}>
                    {med.itemDosage ? `${med.itemDosage} \u00B7 ` : ''}
                    {timeStr || ''}
                    {overdueItem ? ' \u00B7 Overdue' : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={() => onItemPress(med)}
                  accessibilityLabel={`Details for ${med.itemName}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.detailsText}>Details</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Batch actions */}
          <View style={styles.batchActions}>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={selected.size === pendingMeds.length ? () => setSelected(new Set()) : selectAll}
              accessibilityLabel={selected.size === pendingMeds.length ? 'Deselect all medications' : 'Select all medications'}
              accessibilityRole="button"
            >
              <Text style={styles.selectAllText}>
                {selected.size === pendingMeds.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (selected.size === 0 || confirming) && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirmSelected}
              disabled={selected.size === 0 || confirming}
              accessibilityLabel={
                confirming
                  ? 'Confirming medications'
                  : `Confirm ${selected.size} medication${selected.size !== 1 ? 's' : ''}`
              }
              accessibilityRole="button"
            >
              <Text style={styles.confirmButtonText}>
                {confirming
                  ? 'Confirming...'
                  : selected.size === 0
                  ? 'Select Meds to Confirm'
                  : `Confirm ${selected.size === pendingMeds.length ? 'All' : selected.size} Med${selected.size !== 1 ? 's' : ''}`}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {pendingMeds.length === 0 && completedMeds.length === 0 && (
        <Text style={styles.emptyText}>No medications scheduled today</Text>
      )}

      {/* Completed meds */}
      {completedMeds.map((med) => {
        const timeStr = parseTimeForDisplay(med.scheduledTime);
        const isMissed = med.status === 'missed';
        const statusText = isMissed ? 'Missed' : med.status === 'skipped' ? 'Skipped' : 'Done';

        // Deduplicate dosage: skip if already in the item name
        const showDosage = med.itemDosage && !med.itemName.includes(med.itemDosage);

        if (isMissed) {
          return (
            <TouchableOpacity
              key={med.id}
              style={styles.medRow}
              onPress={() => onItemPress(med)}
              activeOpacity={0.7}
              accessibilityLabel={`${med.itemName}, Missed. Tap to log late.`}
              accessibilityRole="button"
            >
              <View style={styles.missedCircle}>
                <Text style={styles.missedIcon}>{'\u2014'}</Text>
              </View>
              <View style={styles.medDetails}>
                <Text style={styles.medNameMissed}>{med.itemName}</Text>
                <Text style={styles.medMetaOverdue}>
                  {showDosage ? `${med.itemDosage} \u00B7 ` : ''}
                  {timeStr ? `${timeStr} \u00B7 ` : ''}
                  Missed
                </Text>
              </View>
              <Text style={styles.logLateText}>Log Late</Text>
            </TouchableOpacity>
          );
        }

        return (
          <View key={med.id} style={styles.medRow}>
            <View style={styles.doneCircle}>
              <Text style={styles.doneCheck}>{'\u2713'}</Text>
            </View>
            <View style={styles.medDetails}>
              <Text style={styles.medNameDone}>{med.itemName}</Text>
              <Text style={styles.medMetaDone}>
                {showDosage ? `${med.itemDosage} \u00B7 ` : ''}
                {timeStr ? `${timeStr} \u00B7 ` : ''}
                {statusText}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  containerDefault: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
  },
  containerOverdue: {
    backgroundColor: c.redFaint,
    borderWidth: 1,
    borderColor: c.redBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: { fontSize: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  count: {
    fontSize: 12,
    color: c.textMuted,
  },
  close: {
    fontSize: 14,
    color: c.textMuted,
    padding: 4,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: c.glassBorder,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  checkmark: {
    fontSize: 13,
    color: c.textPrimary,
    fontWeight: 'bold',
  },
  medDetails: {
    flex: 1,
  },
  medName: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
  },
  medMeta: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
  medMetaOverdue: {
    color: c.red,
  },
  detailsButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
  },
  detailsText: {
    fontSize: 12,
    color: c.textMuted,
  },
  batchActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.glassBorder,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectAllText: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '500',
  },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: c.accent,
    borderRadius: 10,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: c.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  doneCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCheck: {
    fontSize: 13,
    color: c.green,
    fontWeight: 'bold',
  },
  missedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missedIcon: {
    fontSize: 13,
    color: c.amber,
    fontWeight: 'bold',
  },
  medNameDone: {
    fontSize: 14,
    color: c.textMuted,
    textDecorationLine: 'line-through',
  },
  medNameMissed: {
    fontSize: 14,
    color: c.textMuted,
  },
  medMetaDone: {
    fontSize: 12,
    color: c.textDisabled,
    marginTop: 2,
  },
  logLateText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.amber,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.amberBorder,
    backgroundColor: c.amberFaint,
    overflow: 'hidden',
  },
});
