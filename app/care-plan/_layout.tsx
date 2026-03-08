// ============================================================================
// CARE PLAN LAYOUT
// Navigation structure for Care Plan configuration screens
// ============================================================================

import { Stack } from 'expo-router';

export default function CarePlanLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="wellness" />
      <Stack.Screen name="meds" />
      <Stack.Screen name="vitals" />
      <Stack.Screen name="meals" />
      <Stack.Screen name="water" />
      <Stack.Screen name="mood" />
      <Stack.Screen name="sleep" />
      <Stack.Screen name="symptoms" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="manage" />
    </Stack>
  );
}
