// ============================================================================
// APP REVIEW PROMPT
// Triggers native App Store review dialog after positive milestones
// ============================================================================

import * as StoreReview from 'expo-store-review';
import { devLog, logError } from './devLog';
import { StorageKeys } from './storageKeys';
import { safeGetItem, safeSetItem } from './safeStorage';

const REVIEW_PROMPTED_KEY = StorageKeys.REVIEW_PROMPTED;

/**
 * Request an app review if:
 * 1. The platform supports it
 * 2. We haven't already prompted the user
 *
 * Called from streakStorage when a 7-day streak is reached.
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    const alreadyPrompted = await safeGetItem<string | null>(REVIEW_PROMPTED_KEY, null);
    if (alreadyPrompted) {
      devLog('[AppReview] Already prompted, skipping');
      return;
    }

    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) {
      devLog('[AppReview] Store review not available on this platform');
      return;
    }

    devLog('[AppReview] Requesting store review');
    await StoreReview.requestReview();
    await safeSetItem(REVIEW_PROMPTED_KEY, new Date().toISOString());
  } catch (error) {
    logError('appReview.maybeRequestReview', error);
  }
}
