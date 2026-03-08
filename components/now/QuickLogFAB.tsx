import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { navigate } from '../../lib/navigate';
import { useTheme } from '../../contexts/ThemeContext';

export function QuickLogFAB() {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: colors.accent }]}
      onPress={() => navigate('/quick-log')}
      accessibilityLabel="Log a new entry — meds, vitals, meals, and more"
      accessibilityRole="button"
      activeOpacity={0.8}
    >
      <View style={styles.fabContent}>
        <Text style={styles.icon}>+</Text>
        <Text style={styles.label}>Log</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  fabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 24,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
