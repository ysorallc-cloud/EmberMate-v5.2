// ============================================================================
// useSubscription Hook
// Reactive subscription state with feature gate checks
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { logError } from '../utils/devLog';
import { getSubscriptionState, activatePromoCode } from '../storage/subscriptionRepo';
import { checkFeatureAccess } from '../utils/featureGate';
import { useDataListener } from '../lib/events';
import { SubscriptionTier, GatedFeature, FeatureGateResult } from '../types/subscription';

export function useSubscription() {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const state = await getSubscriptionState();
      setTier(state.tier);
    } catch (error) {
      logError('useSubscription.refresh', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-fetch when subscription events fire
  useDataListener((category) => {
    if (category === 'subscription') {
      refresh();
    }
  });

  const checkAccess = useCallback(
    (feature: GatedFeature): Promise<FeatureGateResult> => checkFeatureAccess(feature),
    []
  );

  const activatePromo = useCallback(
    (code: string): Promise<boolean> => activatePromoCode(code),
    []
  );

  return {
    tier,
    isPremium: tier === 'premium',
    loading,
    checkAccess,
    activatePromo,
  };
}
