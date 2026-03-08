// =============================================================================
// Task 4.3: Server-side subscription validation (client-side interface)
// Verify subscription validation rejects stale or missing receipts
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setSubscriptionTier,
  getSubscriptionState,
} from '../../storage/subscriptionRepo';
import { checkFeatureAccess } from '../featureGate';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Task 4.3: Receipt validation', () => {
  it('premium via promo code works without receipt (promo path unchanged)', async () => {
    await setSubscriptionTier('premium', 'promo_code', '2099-12-31T00:00:00.000Z');

    const state = await getSubscriptionState();
    expect(state.tier).toBe('premium');
    expect(state.purchaseReceipt).toBeUndefined();

    const result = await checkFeatureAccess('pdf_export');
    expect(result.allowed).toBe(true);
  });

  it('premium via store purchase requires receipt field', async () => {
    // Setting store-based subscription without receipt should still store it,
    // but feature gate should reject due to missing receipt
    await setSubscriptionTier('premium', 'app_store', '2099-12-31T00:00:00.000Z');

    const state = await getSubscriptionState();
    expect(state.tier).toBe('premium');
    expect(state.purchaseReceipt).toBeUndefined();

    // Feature gate should deny — no receipt for store purchase
    const result = await checkFeatureAccess('pdf_export');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/receipt/i);
  });

  it('premium via store purchase with receipt stores receipt fields', async () => {
    const receipt = 'base64-encoded-receipt-data';
    await setSubscriptionTier('premium', 'app_store', '2099-12-31T00:00:00.000Z', receipt);

    const state = await getSubscriptionState();
    expect(state.tier).toBe('premium');
    expect(state.purchaseReceipt).toBe(receipt);
    expect(state.receiptValidatedAt).toBeDefined();
  });

  it('stale receipt (>7 days) causes feature gate to return allowed: false', async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const receipt = 'base64-encoded-receipt-data';

    // Set up premium with a receipt, then manually make it stale
    await setSubscriptionTier('premium', 'app_store', '2099-12-31T00:00:00.000Z', receipt);

    // Directly overwrite to set stale receiptValidatedAt
    const state = await getSubscriptionState();
    const staleState = { ...state, receiptValidatedAt: eightDaysAgo };
    await AsyncStorage.setItem('@embermate_subscription_state', JSON.stringify(staleState));

    const result = await checkFeatureAccess('pdf_export');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/receipt/i);
  });

  it('fresh receipt passes feature gate check', async () => {
    const receipt = 'base64-encoded-receipt-data';
    await setSubscriptionTier('premium', 'app_store', '2099-12-31T00:00:00.000Z', receipt);

    const state = await getSubscriptionState();
    // receiptValidatedAt should be recent (just set)
    expect(state.receiptValidatedAt).toBeDefined();

    const result = await checkFeatureAccess('pdf_export');
    expect(result.allowed).toBe(true);
  });

  it('google_play purchase also requires receipt validation', async () => {
    await setSubscriptionTier('premium', 'google_play', '2099-12-31T00:00:00.000Z');

    const result = await checkFeatureAccess('pdf_export');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/receipt/i);
  });

  it('validateReceipt placeholder returns true and logs warning', async () => {
    const { validateReceipt } = require('../../storage/subscriptionRepo');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await validateReceipt('some-receipt');
    expect(result).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/server.*endpoint|receipt.*validation/i)
    );

    warnSpy.mockRestore();
  });
});
