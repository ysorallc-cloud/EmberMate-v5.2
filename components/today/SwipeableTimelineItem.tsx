// ============================================================================
// SWIPEABLE TIMELINE ITEM
// Swipe right to complete, tap to open details
// Role: logging - Interactive capture of task completion
// ============================================================================

import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Vibration,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { TimelineItem as TimelineItemType } from '../../types/timeline';
import { format } from 'date-fns';
import { ComponentRole } from '../../types/componentRoles';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 100;
const SNAP_THRESHOLD = 60;

interface Props {
  item: TimelineItemType;
  isLast: boolean;
  onComplete: (item: TimelineItemType) => void;
  onPress: (item: TimelineItemType) => void;
  onUndo: (item: TimelineItemType) => void;
  /** Component role - defaults to 'logging' for SwipeableTimelineItem */
  __role?: ComponentRole;
}

export const SwipeableTimelineItem: React.FC<Props> = ({
  item,
  isLast,
  onComplete,
  onPress,
  onUndo,
  __role = 'logging',
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // __role is available for role-based styling/behavior if needed
  const translateX = useRef(new Animated.Value(0)).current;
  const [isRevealed, setIsRevealed] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, []);

  // Haptic feedback
  const triggerHaptic = (type: 'light' | 'medium' | 'success') => {
    if (Platform.OS === 'ios') {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
      }
    } else {
      Vibration.vibrate(type === 'success' ? [0, 50] : [0, 10]);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderGrant: () => {
        translateX.setOffset((translateX as any)._value);
        translateX.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow right swipe for completion
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);

          // Haptic at threshold
          if (gestureState.dx >= SNAP_THRESHOLD && !isRevealed) {
            setIsRevealed(true);
            triggerHaptic('medium');
          } else if (gestureState.dx < SNAP_THRESHOLD && isRevealed) {
            setIsRevealed(false);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.flattenOffset();

        if (gestureState.dx >= SWIPE_THRESHOLD) {
          // Complete action
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            triggerHaptic('success');
            setJustCompleted(true);
            onComplete(item);

            // Reset position after completion (with cleanup support)
            if (resetTimerRef.current) {
              clearTimeout(resetTimerRef.current);
            }
            resetTimerRef.current = setTimeout(() => {
              translateX.setValue(0);
              resetTimerRef.current = null;
            }, 100);
          });
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
          setIsRevealed(false);
        }
      },
    })
  ).current;

  // Don't allow swipe on completed items
  const isSwipeable = item.status !== 'done' && !justCompleted;

  const circleStyles = getCircleStyles(item.status, colors);
  const statusColors = getStatusColors(item.status, colors);

  // Background revealed on swipe
  const backgroundOpacity = translateX.interpolate({
    inputRange: [0, SNAP_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Swipe Background */}
      {isSwipeable && (
        <Animated.View
          style={[
            styles.swipeBackground,
            { opacity: backgroundOpacity },
          ]}
        >
          <Text style={styles.swipeBackgroundIcon}>✓</Text>
          <Text style={styles.swipeBackgroundText}>
            Mark as {item.type === 'medication' ? 'taken' : 'done'}
          </Text>
        </Animated.View>
      )}

      {/* Main Item */}
      <Animated.View
        style={[
          styles.itemContainer,
          { transform: [{ translateX: isSwipeable ? translateX : 0 }] },
        ]}
        {...(isSwipeable ? panResponder.panHandlers : {})}
      >
        <TouchableOpacity
          style={styles.item}
          onPress={() => onPress(item)}
          activeOpacity={0.7}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${item.subtitle}. Scheduled for ${formatTime(item.scheduledTime)}. Status: ${item.status === 'done' ? 'completed' : item.status === 'available' ? 'still available' : 'pending'}`}
          accessibilityHint={isSwipeable ? 'Double tap to view details. Swipe right to mark as complete' : 'Double tap to view details'}
          accessibilityState={{
            checked: item.status === 'done',
          }}
        >
          {/* Timeline connector */}
          <View style={styles.connector}>
            <View style={[styles.circle, circleStyles]}>
              {item.status === 'done' && <Text style={styles.checkmark}>✓</Text>}
              {item.status === 'available' && <Text style={styles.availableIcon}>◐</Text>}
            </View>
            {!isLast && (
              <View style={[styles.line, { backgroundColor: statusColors.line }]} />
            )}
          </View>

          {/* Content */}
          <View style={[styles.content, { opacity: item.status === 'done' ? 0.6 : 1 }]}>
            <View style={styles.timeRow}>
              <Text style={[styles.time, { color: statusColors.time }]}>
                {formatTime(item.scheduledTime)}
              </Text>
              {item.status === 'available' && (
                <Text style={styles.availableLabel}>• Still available</Text>
              )}
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={[styles.subtitle, { color: statusColors.subtitle }]}>
              {item.subtitle}
            </Text>
          </View>

          {/* Undo button for just-completed items */}
          {justCompleted && (
            <TouchableOpacity
              style={styles.undoButton}
              onPress={() => {
                setJustCompleted(false);
                onUndo(item);
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Undo ${item.title}`}
              accessibilityHint="Marks this item as not completed"
            >
              <Text style={styles.undoIcon} importantForAccessibility="no-hide-descendants">↩️</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// Helper functions
const formatTime = (date: Date | undefined | null): string => {
  // Handle invalid dates gracefully
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '--:--';
  }
  try {
    return format(date, 'h:mm a');
  } catch {
    return '--:--';
  }
};

const getCircleStyles = (status: string, c: typeof Colors) => {
  switch (status) {
    case 'done':
      return { backgroundColor: c.green, borderColor: c.green };
    case 'next':
      return { backgroundColor: 'transparent', borderColor: c.gold };
    case 'available':
      return { backgroundColor: c.amberBrightTint, borderColor: 'rgba(251, 191, 36, 0.4)' };
    default:
      return { backgroundColor: 'transparent', borderColor: c.border };
  }
};

const getStatusColors = (status: string, c: typeof Colors) => {
  switch (status) {
    case 'done':
      return { time: c.textMuted, subtitle: c.green, line: 'rgba(34, 197, 94, 0.3)' };
    case 'next':
      return { time: c.textMuted, subtitle: c.gold, line: c.border };
    case 'available':
      return { time: c.amberBrightStrong, subtitle: c.textMuted, line: c.border };
    default:
      return { time: c.textMuted, subtitle: c.textMuted, line: c.border };
  }
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    position: 'relative',
  },
  swipeBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    gap: 8,
  },
  swipeBackgroundIcon: {
    fontSize: 20,
    color: c.green,
  },
  swipeBackgroundText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.green,
  },
  itemContainer: {
    backgroundColor: c.background,
  },
  item: {
    flexDirection: 'row',
    paddingVertical: 4,
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
    fontSize: 10,
    color: c.textPrimary,
    fontWeight: '700',
  },
  availableIcon: {
    fontSize: 10,
    color: c.amberBrightStrong,
    fontWeight: '700',
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
  undoButton: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  undoIcon: {
    fontSize: 18,
  },
});
