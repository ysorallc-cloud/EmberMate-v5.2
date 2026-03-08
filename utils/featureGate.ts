// ============================================================================
// FEATURE GATE
// Checks whether the current subscription tier allows a feature
// ============================================================================

import { getSubscriptionState } from '../storage/subscriptionRepo';
import { listPatients } from '../storage/patientRegistry';
import { GatedFeature, FeatureGateResult, TIER_LIMITS, SubscriptionState } from '../types/subscription';

const RECEIPT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Returns true if this subscription source requires a validated receipt.
 */
function isStoreBased(source: SubscriptionState['source']): boolean {
  return source === 'app_store' || source === 'google_play';
}

/**
 * Check if a store-based premium subscription has a fresh receipt.
 * Returns a rejection result if the receipt is missing or stale, or null if OK.
 */
function checkReceiptFreshness(state: SubscriptionState): FeatureGateResult | null {
  if (state.tier !== 'premium' || !isStoreBased(state.source)) return null;

  if (!state.purchaseReceipt || !state.receiptValidatedAt) {
    return {
      allowed: false,
      reason: 'Store purchase receipt is missing. Please restore your purchase to re-validate.',
      currentTier: state.tier,
      requiredTier: 'premium',
    };
  }

  const age = Date.now() - new Date(state.receiptValidatedAt).getTime();
  if (age > RECEIPT_MAX_AGE_MS) {
    return {
      allowed: false,
      reason: 'Store purchase receipt is stale. Please restore your purchase to re-validate.',
      currentTier: state.tier,
      requiredTier: 'premium',
    };
  }

  return null;
}

/**
 * Check if a gated feature is accessible under the current subscription.
 */
export async function checkFeatureAccess(feature: GatedFeature): Promise<FeatureGateResult> {
  const state = await getSubscriptionState();
  const limits = TIER_LIMITS[state.tier];

  // For store-based premium, verify receipt freshness before any feature check
  const receiptIssue = checkReceiptFreshness(state);
  if (receiptIssue) return receiptIssue;

  switch (feature) {
    case 'multi_patient': {
      const patients = await listPatients();
      if (patients.length >= limits.maxPatients) {
        return {
          allowed: false,
          reason: `Free tier supports ${limits.maxPatients} patient. Upgrade to Premium for up to ${TIER_LIMITS.premium.maxPatients}.`,
          currentTier: state.tier,
          requiredTier: 'premium',
        };
      }
      return { allowed: true, currentTier: state.tier };
    }

    case 'pdf_export':
      if (!limits.pdfExport) {
        return {
          allowed: false,
          reason: 'PDF export is a Premium feature. Upgrade to export care summaries as PDF.',
          currentTier: state.tier,
          requiredTier: 'premium',
        };
      }
      return { allowed: true, currentTier: state.tier };

    case 'advanced_insights':
      if (!limits.advancedInsights) {
        return {
          allowed: false,
          reason: 'Advanced Insights is a Premium feature.',
          currentTier: state.tier,
          requiredTier: 'premium',
        };
      }
      return { allowed: true, currentTier: state.tier };

    case 'care_team':
      if (!limits.careTeam) {
        return {
          allowed: false,
          reason: 'Care Team collaboration is a Premium feature.',
          currentTier: state.tier,
          requiredTier: 'premium',
        };
      }
      return { allowed: true, currentTier: state.tier };

    case 'activity_feed':
      if (!limits.activityFeed) {
        return {
          allowed: false,
          reason: 'Activity Feed is a Premium feature.',
          currentTier: state.tier,
          requiredTier: 'premium',
        };
      }
      return { allowed: true, currentTier: state.tier };

    case 'correlation_reports':
      if (!limits.correlationReports) {
        return {
          allowed: false,
          reason: 'Correlation Reports is a Premium feature.',
          currentTier: state.tier,
          requiredTier: 'premium',
        };
      }
      return { allowed: true, currentTier: state.tier };

    default:
      return { allowed: true, currentTier: state.tier };
  }
}

/**
 * Convenience: returns true/false only
 */
export async function canUseFeature(feature: GatedFeature): Promise<boolean> {
  const result = await checkFeatureAccess(feature);
  return result.allowed;
}

/**
 * Check feature access and navigate to upgrade screen if not allowed.
 * Returns true if the feature is available, false if the user was redirected.
 *
 * NOTE: Free-only launch — all features are unlocked for all tiers.
 * This function currently always returns true.
 */
export async function requireFeatureOrUpgrade(feature: GatedFeature): Promise<boolean> {
  const result = await checkFeatureAccess(feature);
  return result.allowed;
}
