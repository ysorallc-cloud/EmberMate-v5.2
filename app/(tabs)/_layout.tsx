// ============================================================================
// TAB LAYOUT - 4 Tabs (Home, Log, Timeline, Plan)
// Phase 3 — Navigation restructure
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
      fontSize: 22,
      opacity: focused ? 1 : 0.5,
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
        marginTop: 3,
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
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} accentGlow={colors.accentGlow} accent={colors.accent} />,
          tabBarAccessibilityLabel: 'Home tab. What needs attention now',
          tabBarTestID: 'tab-home',
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ focused }) => <TabIcon icon="✏️" focused={focused} accentGlow={colors.accentGlow} accent={colors.accent} />,
          tabBarAccessibilityLabel: 'Log tab. Record care events',
          tabBarTestID: 'tab-log',
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: 'Timeline',
          tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} accentGlow={colors.accentGlow} accent={colors.accent} />,
          tabBarAccessibilityLabel: 'Timeline tab. View chronological care history',
          tabBarTestID: 'tab-timeline',
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} accentGlow={colors.accentGlow} accent={colors.accent} />,
          tabBarAccessibilityLabel: 'Plan tab. Care plan and settings',
          tabBarTestID: 'tab-plan',
        }}
      />
    </Tabs>
  );
}
