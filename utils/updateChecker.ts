// ============================================================================
// OTA UPDATE CHECKER
// Check for and apply OTA updates on app launch
// ============================================================================

import * as Updates from 'expo-updates';
import { Alert, Platform } from 'react-native';
import { reportWarning } from './errorReporting';

/**
 * Check for OTA updates on app launch.
 * Call in appStartup.ts, AFTER initErrorReporting().
 *
 * Only runs in production builds — no-ops in Expo Go / dev client.
 */
export async function checkForUpdates(): Promise<void> {
  if (__DEV__) return;

  try {
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      const result = await Updates.fetchUpdateAsync();

      if (result.isNew) {
        // Let user know, then reload
        Alert.alert(
          'Update Available',
          'A new version has been downloaded. The app will restart to apply it.',
          [
            {
              text: 'Restart Now',
              onPress: () => Updates.reloadAsync(),
            },
          ],
          { cancelable: false },
        );
      }
    }
  } catch (error) {
    // Don't crash the app if update check fails — just report it
    reportWarning('OTA update check failed', {
      error: error instanceof Error ? error.message : String(error),
      platform: Platform.OS,
    });
  }
}
