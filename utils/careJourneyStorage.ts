// ============================================================================
// CARE JOURNEY STORAGE
// Opt-in status, condition selection, and milestone tracking
// ============================================================================

import { safeGetItem, safeSetItem } from './safeStorage';
import { logError } from './devLog';

const ACTIVE_JOURNEY_KEY = '@embermate_care_journey_active';
const JOURNEY_START_KEY = '@embermate_care_journey_start';
const MILESTONE_VIEWED_KEY = '@embermate_care_journey_viewed';

export interface ActiveJourney {
  conditionId: string; // e.g. 'hypertension'
  conditionName: string;
  startDate: string; // ISO date
  enabledAt: string; // ISO timestamp
}

/**
 * Get the active care journey, or null if none configured
 */
export async function getActiveJourney(): Promise<ActiveJourney | null> {
  try {
    return await safeGetItem<ActiveJourney | null>(ACTIVE_JOURNEY_KEY, null);
  } catch (error) {
    logError('careJourneyStorage.getActiveJourney', error);
    return null;
  }
}

/**
 * Set an active care journey
 */
export async function setActiveJourney(journey: ActiveJourney): Promise<void> {
  try {
    await safeSetItem(ACTIVE_JOURNEY_KEY, journey);
  } catch (error) {
    logError('careJourneyStorage.setActiveJourney', error);
  }
}

/**
 * Clear the active journey (opt out)
 */
export async function clearActiveJourney(): Promise<void> {
  try {
    await safeSetItem(ACTIVE_JOURNEY_KEY, null);
  } catch (error) {
    logError('careJourneyStorage.clearActiveJourney', error);
  }
}

/**
 * Get the journey start date
 */
export async function getJourneyStartDate(): Promise<string | null> {
  const journey = await getActiveJourney();
  return journey?.startDate ?? null;
}

/**
 * Mark a milestone as viewed
 */
export async function markMilestoneViewed(milestoneIndex: number): Promise<void> {
  try {
    const viewed = await safeGetItem<number[]>(MILESTONE_VIEWED_KEY, []);
    if (!viewed.includes(milestoneIndex)) {
      viewed.push(milestoneIndex);
      await safeSetItem(MILESTONE_VIEWED_KEY, viewed);
    }
  } catch (error) {
    logError('careJourneyStorage.markMilestoneViewed', error);
  }
}

/**
 * Get list of viewed milestone indices
 */
export async function getViewedMilestones(): Promise<number[]> {
  try {
    return await safeGetItem<number[]>(MILESTONE_VIEWED_KEY, []);
  } catch (error) {
    logError('careJourneyStorage.getViewedMilestones', error);
    return [];
  }
}

/**
 * Compute which milestone is current based on start date
 */
export function computeCurrentMilestone(
  startDate: string,
  milestones: { weekRange: [number, number] }[]
): number {
  const start = new Date(startDate);
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const weeksSinceStart = Math.floor(daysSinceStart / 7);

  for (let i = 0; i < milestones.length; i++) {
    const [weekStart, weekEnd] = milestones[i].weekRange;
    if (weeksSinceStart >= weekStart && weeksSinceStart <= weekEnd) {
      return i;
    }
  }

  // If past all milestones, return last one
  if (weeksSinceStart > 0 && milestones.length > 0) {
    return milestones.length - 1;
  }
  return 0;
}
