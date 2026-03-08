// ============================================================================
// INSIGHT ACTIONS TRACKING
// Logs when users take actions on insights for analytics
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { devLog, logError } from './devLog';
import { StorageKeys } from './storageKeys';
import { safeGetItem, safeSetItem } from './safeStorage';

const INSIGHT_ACTIONS_KEY = StorageKeys.INSIGHT_ACTIONS;

export interface InsightActionLog {
  insightId: string;
  actionId: string;
  timestamp: number;
}

/**
 * Log when user takes an action on an insight
 */
export async function logInsightAction(
  insightId: string,
  actionId: string
): Promise<void> {
  try {
    const logs = await getInsightActionLogs();

    logs.push({
      insightId,
      actionId,
      timestamp: Date.now(),
    });

    // Keep only last 500 logs to prevent storage overflow
    const trimmedLogs = logs.slice(-500);

    await safeSetItem(INSIGHT_ACTIONS_KEY, trimmedLogs);

    devLog(`Insight action logged: ${actionId} for insight ${insightId}`);
  } catch (error) {
    logError('insightActions.logInsightAction', error);
  }
}

/**
 * Get all insight action logs
 */
export async function getInsightActionLogs(): Promise<InsightActionLog[]> {
  try {
    return await safeGetItem<InsightActionLog[]>(INSIGHT_ACTIONS_KEY, []);
  } catch (error) {
    logError('insightActions.getInsightActionLogs', error);
    return [];
  }
}

/**
 * Calculate action rate for analytics
 */
export async function calculateActionRate(): Promise<{
  totalInsightsSeen: number;
  totalActionsTaken: number;
  actionRate: number;
}> {
  try {
    const logs = await getInsightActionLogs();

    // Get unique insights seen
    const uniqueInsights = new Set(logs.map(l => l.insightId));
    const totalInsightsSeen = uniqueInsights.size;

    // Count actions taken (excluding dismissals)
    const totalActionsTaken = logs.filter(l => l.actionId !== 'dismiss').length;

    const actionRate = totalInsightsSeen > 0
      ? (totalActionsTaken / totalInsightsSeen) * 100
      : 0;

    return {
      totalInsightsSeen,
      totalActionsTaken,
      actionRate,
    };
  } catch (error) {
    logError('insightActions.calculateActionRate', error);
    return {
      totalInsightsSeen: 0,
      totalActionsTaken: 0,
      actionRate: 0,
    };
  }
}

/**
 * Get actions taken for a specific insight
 */
export async function getActionsForInsight(insightId: string): Promise<InsightActionLog[]> {
  try {
    const logs = await getInsightActionLogs();
    return logs.filter(l => l.insightId === insightId);
  } catch (error) {
    logError('insightActions.getActionsForInsight', error);
    return [];
  }
}

/**
 * Get recent action statistics (last 30 days)
 */
export async function getRecentActionStats(): Promise<{
  insightsShown: number;
  actionsTaken: number;
  dismissed: number;
  actionRate: string;
}> {
  try {
    const logs = await getInsightActionLogs();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const recentLogs = logs.filter(l => l.timestamp >= thirtyDaysAgo);
    const uniqueInsights = new Set(recentLogs.map(l => l.insightId));
    const insightsShown = uniqueInsights.size;
    const actionsTaken = recentLogs.filter(l => l.actionId !== 'dismiss').length;
    const dismissed = recentLogs.filter(l => l.actionId === 'dismiss').length;
    const actionRate = insightsShown > 0
      ? ((actionsTaken / insightsShown) * 100).toFixed(1)
      : '0';

    return {
      insightsShown,
      actionsTaken,
      dismissed,
      actionRate: `${actionRate}%`,
    };
  } catch (error) {
    logError('insightActions.getRecentActionStats', error);
    return {
      insightsShown: 0,
      actionsTaken: 0,
      dismissed: 0,
      actionRate: '0%',
    };
  }
}

/**
 * Clear all action logs (for testing)
 */
export async function clearInsightActionLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(INSIGHT_ACTIONS_KEY);
  } catch (error) {
    logError('insightActions.clearInsightActionLogs', error);
  }
}
