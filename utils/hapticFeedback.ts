// ============================================================================
// HAPTIC FEEDBACK UTILITIES
// Provides tactile feedback for important actions
// ============================================================================

import * as Haptics from 'expo-haptics';
import { safeGetItem, safeSetItem } from './safeStorage';
import { logError } from './devLog';
import { StorageKeys } from './storageKeys';

const HAPTICS_ENABLED_KEY = StorageKeys.HAPTICS_ENABLED;
const HAPTICS_STRENGTH_KEY = StorageKeys.HAPTICS_STRENGTH;

export type HapticStrength = 'light' | 'medium' | 'strong';

// ============================================================================
// SETTINGS
// ============================================================================

/**
 * Check if haptics are enabled
 */
export async function isHapticsEnabled(): Promise<boolean> {
  try {
    const enabled = await safeGetItem<string | null>(HAPTICS_ENABLED_KEY, null);
    return enabled !== 'false'; // Default to true
  } catch (error) {
    return true;
  }
}

/**
 * Set haptics enabled/disabled
 */
export async function setHapticsEnabled(enabled: boolean): Promise<void> {
  try {
    await safeSetItem(HAPTICS_ENABLED_KEY, enabled.toString());
  } catch (error) {
    logError('hapticFeedback.setHapticsEnabled', error);
  }
}

/**
 * Get haptic strength setting
 */
export async function getHapticStrength(): Promise<HapticStrength> {
  try {
    const strength = await safeGetItem<string | null>(HAPTICS_STRENGTH_KEY, null);
    return (strength as HapticStrength) || 'medium';
  } catch (error) {
    return 'medium';
  }
}

/**
 * Set haptic strength
 */
export async function setHapticStrength(strength: HapticStrength): Promise<void> {
  try {
    await safeSetItem(HAPTICS_STRENGTH_KEY, strength);
  } catch (error) {
    logError('hapticFeedback.setHapticStrength', error);
  }
}

// ============================================================================
// FEEDBACK FUNCTIONS
// ============================================================================

/**
 * Success feedback - medication logged, action completed
 */
export async function hapticSuccess(): Promise<void> {
  try {
    const enabled = await isHapticsEnabled();
    if (!enabled) return;
    
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );
  } catch (error) {
    // Silently fail - haptics are nice-to-have
  }
}

/**
 * Error feedback - action failed, validation error
 */
export async function hapticError(): Promise<void> {
  try {
    const enabled = await isHapticsEnabled();
    if (!enabled) return;
    
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Error
    );
  } catch (error) {
    // Silently fail
  }
}

/**
 * Warning feedback - attention needed, low supply
 */
export async function hapticWarning(): Promise<void> {
  try {
    const enabled = await isHapticsEnabled();
    if (!enabled) return;
    
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Warning
    );
  } catch (error) {
    // Silently fail
  }
}

/**
 * Light impact - button press, selection
 */
export async function hapticLight(): Promise<void> {
  try {
    const enabled = await isHapticsEnabled();
    if (!enabled) return;
    
    await Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Light
    );
  } catch (error) {
    // Silently fail
  }
}

/**
 * Medium impact - toggle, selection change
 */
export async function hapticMedium(): Promise<void> {
  try {
    const enabled = await isHapticsEnabled();
    if (!enabled) return;
    
    await Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Medium
    );
  } catch (error) {
    // Silently fail
  }
}

/**
 * Heavy impact - important action, emergency
 */
export async function hapticHeavy(): Promise<void> {
  try {
    const enabled = await isHapticsEnabled();
    if (!enabled) return;
    
    await Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Heavy
    );
  } catch (error) {
    // Silently fail
  }
}

/**
 * Selection changed - scrolling through options
 */
export async function hapticSelection(): Promise<void> {
  try {
    const enabled = await isHapticsEnabled();
    if (!enabled) return;
    
    await Haptics.selectionAsync();
  } catch (error) {
    // Silently fail
  }
}

// ============================================================================
// CONTEXTUAL FEEDBACK
// ============================================================================

/**
 * Medication logging feedback
 */
export async function hapticMedicationLogged(): Promise<void> {
  const strength = await getHapticStrength();
  
  switch (strength) {
    case 'light':
      await hapticLight();
      break;
    case 'strong':
      await hapticMedium();
      break;
    default:
      await hapticSuccess();
  }
}

/**
 * Emergency action feedback
 */
export async function hapticEmergency(): Promise<void> {
  const enabled = await isHapticsEnabled();
  if (!enabled) return;
  
  try {
    // Strong pattern for emergency
    await hapticHeavy();
    await new Promise(resolve => setTimeout(resolve, 100));
    await hapticHeavy();
  } catch (error) {
    // Silently fail
  }
}

/**
 * Refill warning feedback
 */
export async function hapticRefillWarning(): Promise<void> {
  await hapticWarning();
}
