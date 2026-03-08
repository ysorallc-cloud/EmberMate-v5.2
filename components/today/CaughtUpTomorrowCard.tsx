// ============================================================================
// CAUGHT UP + TOMORROW CARD - All done + tomorrow preview (Green)
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { TomorrowPreviewItem } from '../../types/contextCard';

interface CaughtUpTomorrowCardProps {
  tomorrowItems: TomorrowPreviewItem[];
  tomorrowCount: number;
}

export const CaughtUpTomorrowCard: React.FC<CaughtUpTomorrowCardProps> = ({
  tomorrowItems,
  tomorrowCount,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  // Show max 2 items
  const displayItems = tomorrowItems.slice(0, 2);

  const handleViewDay = () => {
    // Navigate to calendar with tomorrow selected
    router.push('/calendar');
  };

  return (
    <View style={styles.container}>
      {/* All Done Section */}
      <View style={styles.topSection}>
        <View style={styles.checkContainer}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>

        <View style={styles.topContent}>
          <Text style={styles.topLabel}>ALL DONE FOR TODAY</Text>
          <Text style={styles.topTitle}>Great job! Rest up.</Text>
        </View>
      </View>

      {/* Tomorrow Section */}
      <View style={styles.bottomSection}>
        <View style={styles.tomorrowHeader}>
          <View style={styles.tomorrowLabelContainer}>
            <Text style={styles.sunIcon}>☀️</Text>
            <Text style={styles.tomorrowLabel}>TOMORROW</Text>
          </View>

          <TouchableOpacity
            onPress={handleViewDay}
            accessibilityLabel="View tomorrow's schedule"
            accessibilityRole="link"
          >
            <Text style={styles.viewDayLink}>View day →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tomorrowItems}>
          {displayItems.map((item, index) => (
            <View key={index} style={styles.tomorrowItem}>
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemTime}>{item.time}</Text>
            </View>
          ))}
        </View>

        {tomorrowCount > 2 && (
          <Text style={styles.moreText}>+{tomorrowCount - 2} more</Text>
        )}
      </View>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: c.greenLight,
    borderWidth: 1,
    borderColor: c.greenBorder,
    borderRadius: 14,
    overflow: 'hidden',
  },
  topSection: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: c.glassActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkIcon: {
    fontSize: 18,
    color: c.green,
  },
  topContent: {
    flex: 1,
  },
  topLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: c.green,
    marginBottom: 2,
  },
  topTitle: {
    fontSize: 14,
    color: c.textPrimary,
  },
  bottomSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: c.greenBorder,
  },
  tomorrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tomorrowLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sunIcon: {
    fontSize: 12,
  },
  tomorrowLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: c.textMuted,
  },
  viewDayLink: {
    fontSize: 11,
    color: c.accent,
  },
  tomorrowItems: {
    gap: 8,
  },
  tomorrowItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 13,
    color: c.textPrimary,
  },
  itemTime: {
    fontSize: 11,
    color: c.textMuted,
  },
  moreText: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 8,
  },
});
