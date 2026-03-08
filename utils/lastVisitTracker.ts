// ============================================================================
// LAST VISIT TRACKER
// Tracks user visits to show welcome banner after extended absences
// ============================================================================

import { safeGetItem, safeSetItem } from './safeStorage';
import { logError } from './devLog';

const LAST_VISIT_KEY = 'last_visit_timestamp';
const WELCOME_BANNER_DISMISSED_KEY = 'welcome_banner_dismissed';

/**
 * Record current visit timestamp
 */
export async function recordVisit(): Promise<void> {
  try {
    const now = Date.now();
    await safeSetItem(LAST_VISIT_KEY, now.toString());
  } catch (error) {
    logError('lastVisitTracker.recordVisit', error);
  }
}

/**
 * Get days since last visit
 */
export async function getDaysSinceLastVisit(): Promise<number> {
  try {
    const lastVisit = await safeGetItem<string | null>(LAST_VISIT_KEY, null);

    if (!lastVisit) {
      return 0; // First visit
    }

    const lastVisitTime = parseInt(lastVisit, 10);
    const now = Date.now();
    const daysSince = Math.floor((now - lastVisitTime) / (1000 * 60 * 60 * 24));

    return daysSince;
  } catch (error) {
    logError('lastVisitTracker.getDaysSinceLastVisit', error);
    return 0;
  }
}

/**
 * Check if should show welcome banner
 * Shows if user has been away 3+ days and hasn't dismissed within 24 hours
 */
export async function shouldShowWelcomeBanner(): Promise<boolean> {
  try {
    const daysSince = await getDaysSinceLastVisit();

    // Show if been away 3+ days
    if (daysSince < 3) {
      return false;
    }

    // Check if already dismissed today
    const dismissed = await safeGetItem<string | null>(WELCOME_BANNER_DISMISSED_KEY, null);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);

      // Don't show again if dismissed within last 24 hours
      if (hoursSinceDismissed < 24) {
        return false;
      }
    }

    return true;
  } catch (error) {
    logError('lastVisitTracker.shouldShowWelcomeBanner', error);
    return false;
  }
}

/**
 * Dismiss welcome banner
 */
export async function dismissWelcomeBanner(): Promise<void> {
  try {
    await safeSetItem(
      WELCOME_BANNER_DISMISSED_KEY,
      Date.now().toString()
    );
  } catch (error) {
    logError('lastVisitTracker.dismissWelcomeBanner', error);
  }
}
