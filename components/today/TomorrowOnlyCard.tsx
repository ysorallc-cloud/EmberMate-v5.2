// ============================================================================
// TOMORROW ONLY CARD - No tasks today, shows tomorrow (Blue)
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { TomorrowPreviewItem } from '../../types/contextCard';

interface TomorrowOnlyCardProps {
  tomorrowItems: TomorrowPreviewItem[];
  tomorrowCount: number;
}

export const TomorrowOnlyCard: React.FC<TomorrowOnlyCardProps> = ({
  tomorrowItems,
  tomorrowCount,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  // Show max 2 items
  const displayItems = tomorrowItems.slice(0, 2);

  const handleViewDay = () => {
    router.push('/calendar');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelContainer}>
          <Text style={styles.sunIcon}>☀️</Text>
          <Text style={styles.label}>TOMORROW</Text>
        </View>

        <TouchableOpacity
          onPress={handleViewDay}
          accessibilityLabel="View tomorrow's schedule"
          accessibilityRole="link"
        >
          <Text style={styles.viewDayLink}>View day →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.items}>
        {displayItems.map((item, index) => (
          <View key={index} style={styles.item}>
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
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: c.blueLight,
    borderWidth: 1,
    borderColor: c.blueBorder,
    borderRadius: 14,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sunIcon: {
    fontSize: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: c.blue,
  },
  viewDayLink: {
    fontSize: 11,
    color: c.accent,
  },
  items: {
    gap: 8,
  },
  item: {
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
