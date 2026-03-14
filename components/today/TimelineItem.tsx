// ============================================================================
// TIMELINE ITEM - Individual timeline item with status indicators
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import { TimelineItem as TimelineItemType } from '../../types/timeline';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { format } from 'date-fns';

interface Props {
  item: TimelineItemType;
  isLast: boolean;
}

export const TimelineItem: React.FC<Props> = ({ item, isLast }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const handlePress = () => {
    switch (item.type) {
      case 'medication':
        // Route to contextual logging if we have instance data, otherwise fallback
        if (item.instanceId && item.medicationName) {
          navigate({
            pathname: '/log-medication-plan-item',
            params: {
              medicationId: item.medicationIds?.[0] || '',
              instanceId: item.instanceId,
              scheduledTime: item.time ? format(item.time, 'HH:mm') : '',
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
      case 'appointment':
        navigate('/appointments');
        break;
      case 'wellness-morning':
        navigate('/log-morning-wellness');
        break;
      case 'wellness-evening':
        navigate('/log-evening-wellness');
        break;
      case 'vitals':
        navigate('/quick-log?expand=vitals');
        break;
    }
  };

  const circleStyles = getCircleStyles(item.status, colors);
  const statusColors = getStatusColors(item.status, colors);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={`${item.title}, ${formatTime(item.scheduledTime)}, ${item.status === 'done' ? 'completed' : item.status}`}
      accessibilityRole="button"
      accessibilityState={{ checked: item.status === 'done' }}
    >
      {/* Timeline connector */}
      <View style={styles.connector}>
        <View style={[styles.circle, circleStyles]}>
          {item.status === 'done' && <Text style={styles.checkmark}>✓</Text>}
          {item.status === 'available' && (
            <Text style={styles.availableIcon}>◐</Text>
          )}
        </View>

        {!isLast && (
          <View style={[styles.line, { backgroundColor: statusColors.line }]} />
        )}
      </View>

      {/* Content */}
      <View
        style={[
          styles.content,
          { opacity: item.status === 'done' ? 0.6 : 1 },
        ]}
      >
        {/* Time row */}
        <View style={styles.timeRow}>
          <Text style={[styles.time, { color: statusColors.time }]}>
            {formatTime(item.scheduledTime)}
          </Text>
          {item.status === 'available' && (
            <Text style={styles.availableLabel}>• Still available</Text>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>{item.title}</Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: statusColors.subtitle }]}>
          {item.subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// Helper functions
const formatTime = (date: Date): string => {
  return format(date, 'h:mm a');
};

const getCircleStyles = (status: string, c: typeof Colors) => {
  switch (status) {
    case 'done':
      return {
        backgroundColor: c.green,
        borderColor: c.green,
      };
    case 'next':
      return {
        backgroundColor: 'transparent',
        borderColor: c.gold,
      };
    case 'available':
      return {
        backgroundColor: c.amberBrightTint,
        borderColor: 'rgba(251, 191, 36, 0.4)',
      };
    default: // upcoming
      return {
        backgroundColor: 'transparent',
        borderColor: c.border,
      };
  }
};

const getStatusColors = (status: string, c: typeof Colors) => {
  switch (status) {
    case 'done':
      return {
        time: c.textMuted,
        subtitle: c.green,
        line: c.greenBorder,
      };
    case 'next':
      return {
        time: c.textMuted,
        subtitle: c.gold,
        line: c.border,
      };
    case 'available':
      return {
        time: c.amberBrightStrong,
        subtitle: c.textMuted,
        line: c.border,
      };
    default: // upcoming
      return {
        time: c.textMuted,
        subtitle: c.textMuted,
        line: c.border,
      };
  }
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  connector: {
    width: 28,
    alignItems: 'center',
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: c.textPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  availableIcon: {
    fontSize: 10,
    fontWeight: '700',
    color: c.amberBrightStrong,
  },
  line: {
    flex: 1,
    width: 2,
    minHeight: 36,
    marginVertical: 4,
  },
  content: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  time: {
    fontSize: 11,
  },
  availableLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: c.amberBrightStrong,
  },
  title: {
    fontSize: 14,
    color: c.textPrimary,
    marginTop: 1,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
});
