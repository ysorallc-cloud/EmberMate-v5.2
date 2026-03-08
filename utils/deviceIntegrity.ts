// ============================================================================
// DEVICE INTEGRITY CHECK
// Lightweight jailbreak/root detection — warns but does not block
// ============================================================================

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { safeGetItem, safeSetItem } from './safeStorage';
import { logError } from './devLog';

const INTEGRITY_CHECKED_KEY = '@embermate_integrity_checked';

// Common jailbreak indicator paths (iOS)
const JAILBREAK_PATHS = [
  '/Applications/Cydia.app',
  '/Library/MobileSubstrate/MobileSubstrate.dylib',
  '/bin/bash',
  '/usr/sbin/sshd',
  '/etc/apt',
  '/private/var/lib/apt/',
];

// Common root indicator paths (Android)
const ROOT_PATHS = [
  '/system/app/Superuser.apk',
  '/sbin/su',
  '/system/bin/su',
  '/system/xbin/su',
  '/data/local/xbin/su',
  '/data/local/bin/su',
  '/system/sd/xbin/su',
];

/**
 * Check if the device appears to be jailbroken/rooted.
 * Uses filesystem path checks — no native library required.
 * Returns true if indicators are found.
 */
export async function checkDeviceIntegrity(): Promise<boolean> {
  try {
    const paths = Platform.OS === 'ios' ? JAILBREAK_PATHS : ROOT_PATHS;

    for (const path of paths) {
      try {
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
          return true; // compromised indicator found
        }
      } catch {
        // getInfoAsync may throw on restricted paths — that's expected and OK
      }
    }

    return false;
  } catch (error) {
    logError('deviceIntegrity.checkDeviceIntegrity', error);
    return false; // fail open — don't block legitimate users on detection errors
  }
}

/**
 * Run the integrity check once per install. Returns true if a warning should be shown.
 * Stores the result so users aren't warned repeatedly.
 */
export async function shouldShowIntegrityWarning(): Promise<boolean> {
  try {
    const alreadyChecked = await safeGetItem<string | null>(INTEGRITY_CHECKED_KEY, null);
    if (alreadyChecked !== null) {
      return alreadyChecked === 'compromised';
    }

    const isCompromised = await checkDeviceIntegrity();
    await safeSetItem(INTEGRITY_CHECKED_KEY, isCompromised ? 'compromised' : 'clean');
    return isCompromised;
  } catch (error) {
    logError('deviceIntegrity.shouldShowIntegrityWarning', error);
    return false;
  }
}
