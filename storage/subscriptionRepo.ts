// ============================================================================
// SUBSCRIPTION REPOSITORY
// Storage layer for subscription/tier state
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { devLog } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { GlobalKeys } from '../utils/storageKeys';
import { hashData } from '../utils/secureStorage';
import {
  SubscriptionState,
  SubscriptionTier,
  DEFAULT_SUBSCRIPTION_STATE,
} from '../types/subscription';

// ============================================================================
// PROMO CODES (SHA-256 hashed — no plaintext codes in source)
// ============================================================================

const HASHED_PROMO_CODES: Record<string, { tier: SubscriptionTier; durationDays: number }> = {
  'f00472e3c02be1ceaca8afeefbf4c58ca763b115d10a1946943fd8ad50a4e679': { tier: 'premium', durationDays: 365 },
  '2254b04f8190aa7dc555b1c694bb0aa905308a531cf2e0d87dcc12573aae34b4': { tier: 'premium', durationDays: 90 },
  '036ee9a8dd27f1360eab0a62ef259a5522c4b6029754aef4192bae4abb7947b8': { tier: 'premium', durationDays: 180 },
};

// ============================================================================
// SUBSCRIPTION OPERATIONS
// ============================================================================

/**
 * Get the current subscription state
 */
export async function getSubscriptionState(): Promise<SubscriptionState> {
  return safeGetItem<SubscriptionState>(GlobalKeys.SUBSCRIPTION_STATE, DEFAULT_SUBSCRIPTION_STATE);
}

/**
 * Set subscription tier with optional source, expiration, and purchase receipt.
 * When source is 'app_store' or 'google_play', pass the receipt to enable
 * server-side validation. Without a receipt, store-based subscriptions will
 * be rejected by the feature gate.
 */
export async function setSubscriptionTier(
  tier: SubscriptionTier,
  source?: SubscriptionState['source'],
  expiresAt?: string | null,
  purchaseReceipt?: string
): Promise<SubscriptionState> {
  const current = await getSubscriptionState();
  const now = new Date().toISOString();

  const updated: SubscriptionState = {
    tier,
    activatedAt: tier === 'premium' ? now : null,
    expiresAt: expiresAt ?? null,
    source: source ?? (tier === 'free' ? 'none' : current.source),
    version: current.version + 1,
    ...(purchaseReceipt ? { purchaseReceipt, receiptValidatedAt: now } : {}),
  };

  await safeSetItem(GlobalKeys.SUBSCRIPTION_STATE, updated);
  emitDataUpdate(EVENT.SUBSCRIPTION);
  return updated;
}

/**
 * Validate a purchase receipt against the server.
 * PLACEHOLDER: Currently logs a warning and returns true.
 *
 * Server endpoint contract (future implementation):
 *   POST /api/v1/subscriptions/validate-receipt
 *   Body: { platform: 'ios' | 'android', receipt: string }
 *   Response: { valid: boolean, expiresAt?: string, productId?: string }
 */
export async function validateReceipt(_receipt: string): Promise<boolean> {
  if (__DEV__) {
    console.warn(
      'Receipt validation: server endpoint not yet implemented. Returning true for dev testing.'
    );
    return true;
  }

  // TODO: Integrate RevenueCat or implement server-side receipt validation:
  //   1. POST receipt to your backend → Apple/Google verification endpoint
  //   2. Backend verifies with App Store / Google Play and returns validity + expiry
  //   3. Replace this stub with the response from your backend
  // Until then, reject in production to prevent free premium access.
  devLog('Receipt validation: no server endpoint configured. Rejecting receipt in production.');
  return false;
}

/**
 * Activate a promo code. Returns true if valid and applied.
 */
export async function activatePromoCode(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  const codeHash = await hashData(normalized);
  const promo = HASHED_PROMO_CODES[codeHash];
  if (!promo) return false;

  const expiresAt = new Date(
    Date.now() + promo.durationDays * 24 * 60 * 60 * 1000
  ).toISOString();

  await setSubscriptionTier(promo.tier, 'promo_code', expiresAt);
  return true;
}

/**
 * Check if subscription is active (not expired)
 */
export async function isSubscriptionActive(): Promise<boolean> {
  const state = await getSubscriptionState();
  if (state.tier === 'free') return true; // free is always "active"
  if (!state.expiresAt) return true; // no expiration = active
  return new Date(state.expiresAt) > new Date();
}
