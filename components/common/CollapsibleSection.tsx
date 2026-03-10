import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../theme/theme-tokens';

interface Props {
  title: string;
  badge?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, badge, defaultExpanded = false, children }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { colors } = useTheme();
  const s = styles(colors);

  return (
    <View style={s.wrapper}>
      <TouchableOpacity
        style={s.header}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}. Tap to ${expanded ? 'collapse' : 'expand'}.`}
      >
        <Text style={s.title}>{title.toUpperCase()}</Text>
        {badge && <Text style={s.badge}>{badge}</Text>}
        <Text style={[s.chevron, expanded && s.chevronOpen]}>›</Text>
      </TouchableOpacity>
      {expanded && <View style={s.content}>{children}</View>}
    </View>
  );
}

const styles = (c: typeof Colors) => StyleSheet.create({
  wrapper: { marginBottom: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: c.textMuted,
  },
  badge: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textMuted,
    backgroundColor: c.glassDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chevron: {
    fontSize: 16,
    color: c.textMuted,
    transform: [{ rotate: '90deg' }],
  },
  chevronOpen: {
    transform: [{ rotate: '-90deg' }],
  },
  content: {
  },
});
