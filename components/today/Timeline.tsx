// ============================================================================
// TIMELINE - Container for timeline items on TODAY screen
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import { SwipeableTimelineItem } from './SwipeableTimelineItem';
import { TomorrowRow } from './TomorrowRow';
import { UndoToast } from '../common/UndoToast';
import { TimelineItem } from '../../types/timeline';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { markMedicationTaken } from '../../utils/medicationStorage';
import { saveMorningWellness, saveEveningWellness } from '../../utils/wellnessCheckStorage';
import { getTodayDateString } from '../../services/carePlanGenerator';
import { logError } from '../../utils/devLog';

interface TimelineProps {
  items: TimelineItem[];
  tomorrowCount?: number;
  onRefresh?: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({ items, tomorrowCount = 0, onRefresh }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [undoItem, setUndoItem] = useState<TimelineItem | null>(null);
  const [showUndo, setShowUndo] = useState(false);

  const handleComplete = useCallback(async (item: TimelineItem) => {
    try {
      switch (item.type) {
        case 'medication':
          if (item.medicationIds) {
            for (const medId of item.medicationIds) {
              await markMedicationTaken(medId);
            }
          }
          break;
        case 'wellness-morning':
          // Quick complete with defaults (user can edit later by tapping)
          await saveMorningWellness(getTodayDateString(), {
            sleepQuality: 3,
            mood: 3,
            energyLevel: 3,
            completedAt: new Date(),
          });
          break;
        case 'wellness-evening':
          await saveEveningWellness(getTodayDateString(), {
            mood: 3,
            mealsLogged: true,
            dayRating: 3,
            completedAt: new Date(),
          });
          break;
      }

      setUndoItem(item);
      setShowUndo(true);

      // Refresh timeline
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      logError('Timeline.handleComplete', error);
    }
  }, [onRefresh]);

  const handleUndo = useCallback(async () => {
    if (!undoItem) return;

    try {
      switch (undoItem.type) {
        case 'medication':
          if (undoItem.medicationIds) {
            for (const medId of undoItem.medicationIds) {
              await markMedicationTaken(medId, false);
            }
          }
          break;
        // Add other undo handlers as needed
      }

      // Refresh timeline
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      logError('Timeline.handleUndo', error);
    }
  }, [undoItem, onRefresh]);

  const handlePress = useCallback((item: TimelineItem) => {
    switch (item.type) {
      case 'medication':
        // Route to contextual logging if we have Care Plan data
        if (item.instanceId && item.medicationName) {
          navigate({
            pathname: '/log-medication-plan-item',
            params: {
              medicationId: item.medicationIds?.[0] || '',
              instanceId: item.instanceId,
              scheduledTime: item.scheduledTime ? item.scheduledTime.toISOString() : '',
              itemName: item.medicationName,
              itemDosage: item.dosage || '',
            },
          });
        } else {
          // Fallback to manual logging only if no Care Plan context
          const medIds = item.medicationIds?.join(',') || '';
          navigate(`/medication-confirm?ids=${medIds}`);
        }
        break;
      case 'wellness-morning':
        navigate('/log-morning-wellness');
        break;
      case 'wellness-evening':
        navigate('/log-evening-wellness');
        break;
      case 'appointment':
        navigate('/appointments');
        break;
      case 'vitals':
        navigate('/log-vitals');
        break;
      default:
        break;
    }
  }, [router]);

  const getUndoMessage = (): string => {
    if (!undoItem) return '';

    switch (undoItem.type) {
      case 'medication':
        return 'Marked as taken';
      case 'wellness-morning':
      case 'wellness-evening':
        return 'Check-in completed';
      default:
        return 'Marked as done';
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>TODAY</Text>

      <View style={styles.list}>
        {items.map((item, index) => (
          <SwipeableTimelineItem
            key={item.id}
            item={item}
            isLast={index === items.length - 1 && tomorrowCount === 0}
            onComplete={handleComplete}
            onPress={handlePress}
            onUndo={() => handleUndo()}
          />
        ))}

        {/* Tomorrow row always shown */}
        {tomorrowCount > 0 && <TomorrowRow itemCount={tomorrowCount} />}
      </View>

      {/* Undo Toast */}
      <UndoToast
        visible={showUndo}
        message={getUndoMessage()}
        onUndo={handleUndo}
        onDismiss={() => {
          setShowUndo(false);
          setUndoItem(null);
        }}
      />
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: c.textMuted,
    marginBottom: 12,
  },
  list: {},
});
