// ============================================================================
// TAB LAYOUT - 3 Tabs (Today, Journal, Understand)
// V5 — Team/Support moved to Settings > Care Team (Premium)
// ============================================================================

import { Tabs } from 'expo-router';
import { View, Text, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';

const TabIcon = ({ icon, focused, accentGlow, accent }: { icon: string; focused: boolean; accentGlow: string; accent: string }) => (
  <View
    style={{ alignItems: 'center' }}
    accessible={false}
    importantForAccessibility="no-hide-descendants"
  >
    <Text style={{
      fontSize: 24,
      opacity: focused ? 1 : 0.5,
      transform: [{ scale: focused ? 1.1 : 1 }],
      ...(focused && Platform.OS === 'ios' && {
        textShadowColor: accentGlow,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
      }),
    }}>
      {icon}
    </Text>
    {focused && (
      <View style={{
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: accent,
        marginTop: 4,
      }} />
    )}
  </View>
);

export default function TabLayout() {
  const { colors, resolvedTheme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.background,
          borderTopColor: colors.glassBorder,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 28,
          height: 80,
          position: 'absolute',
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={40}
              tint={resolvedTheme === 'light' ? 'light' : 'dark'}
              style={{ flex: 1, backgroundColor: resolvedTheme === 'light' ? 'rgba(248, 255, 254, 0.85)' : 'rgba(0, 0, 0, 0.92)' }}
            />
          ) : null
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => <TabIcon icon="☀️" focused={focused} accentGlow={colors.accentGlow} accent={colors.accent} />,
          tabBarAccessibilityLabel: 'Today tab. What needs attention today',
          tabBarButtonTestID: 'tab-today',
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ focused }) => <TabIcon icon="📖" focused={focused} accentGlow={colors.accentGlow} accent={colors.accent} />,
          tabBarAccessibilityLabel: 'Journal tab. Review care history and daily summary',
          tabBarButtonTestID: 'tab-journal',
        }}
      />
      <Tabs.Screen
        name="understand"
        options={{
          title: 'Insights',
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} accentGlow={colors.accentGlow} accent={colors.accent} />,
          tabBarAccessibilityLabel: 'Insights tab. View health patterns and insights',
          tabBarButtonTestID: 'tab-understand',
        }}
      />
    </Tabs>
  );
}
