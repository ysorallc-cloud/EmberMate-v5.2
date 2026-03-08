// ============================================================================
// USE AI INSIGHT HOOK
// Provides pattern-based, supportive insights for care tasks
// ============================================================================

import { useMemo } from 'react';
import { useCareTasks } from './useCareTasks';
import {
  AIInsight,
  InsightContext,
  generateInsights,
  getPrimaryInsight,
  getInsightsForCategory,
  getCurrentWindowLabel,
} from '../utils/insightRules';
import { TimeWindowLabel } from '../types/carePlan';

// ============================================================================
// TYPES
// ============================================================================

export interface UseAIInsightReturn {
  /** Primary insight to display (highest priority, confidence >= 0.7) */
  primaryInsight: AIInsight | null;

  /** All generated insights (confidence >= 0.7) */
  allInsights: AIInsight[];

  /** Get insights for a specific category */
  getForCategory: (category: string) => AIInsight[];

  /** Whether insights are still loading */
  loading: boolean;

  /** Current insight context (for debugging) */
  context: InsightContext | null;
}

export interface UseAIInsightOptions {
  /** Include streak data (defaults to false for now) */
  includeStreak?: boolean;

  /** Include recent completion rate (defaults to false for now) */
  includeCompletionRate?: boolean;

  /** Custom consecutive logging days (for testing) */
  consecutiveLoggingDays?: number;

  /** Custom recent completion rate (for testing) */
  recentCompletionRate?: number;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for accessing AI-generated insights
 *
 * @param date Optional date string (YYYY-MM-DD). Defaults to today.
 * @param options Configuration options
 */
export function useAIInsight(
  date?: string,
  options: UseAIInsightOptions = {}
): UseAIInsightReturn {
  const { state, loading } = useCareTasks(date);

  // Build insight context from care tasks state
  const context = useMemo((): InsightContext | null => {
    if (!state) return null;

    const now = new Date();
    const currentHour = now.getHours();
    const currentWindow = getCurrentWindowLabel();

    return {
      tasks: state.tasks,
      stats: state.stats,
      byWindow: state.byWindow,
      currentHour,
      currentWindow,
      consecutiveLoggingDays: options.consecutiveLoggingDays,
      recentCompletionRate: options.recentCompletionRate,
    };
  }, [state, options.consecutiveLoggingDays, options.recentCompletionRate]);

  // Generate insights
  const allInsights = useMemo((): AIInsight[] => {
    if (!context) return [];
    return generateInsights(context);
  }, [context]);

  // Get primary insight
  const primaryInsight = useMemo((): AIInsight | null => {
    if (!context) return null;
    return getPrimaryInsight(context);
  }, [context]);

  // Category filter function
  const getForCategory = useMemo(() => {
    return (category: string): AIInsight[] => {
      if (!context) return [];
      return getInsightsForCategory(context, category);
    };
  }, [context]);

  return {
    primaryInsight,
    allInsights,
    getForCategory,
    loading,
    context,
  };
}

// ============================================================================
// TAB-SPECIFIC HOOKS
// Convenience hooks for each tab's insight needs
// ============================================================================

/**
 * Hook for Now tab insights
 * Focus: Day summary, patterns, next actions
 */
export function useNowInsight(date?: string) {
  const { primaryInsight, allInsights, loading } = useAIInsight(date);

  return {
    insight: primaryInsight,
    additionalCount: Math.max(0, allInsights.length - 1),
    loading,
  };
}

/**
 * Hook for Record tab insights
 * Focus: Logging streak, data quality
 */
export function useRecordInsight(date?: string, consecutiveLoggingDays?: number) {
  const { primaryInsight, allInsights, loading } = useAIInsight(date, {
    consecutiveLoggingDays,
  });

  // Filter for logging-related insights
  const loggingInsight = useMemo(() => {
    const streakInsight = allInsights.find(i => i.id === 'streak');
    return streakInsight || primaryInsight;
  }, [allInsights, primaryInsight]);

  return {
    insight: loggingInsight,
    loading,
  };
}

/**
 * Hook for Understand tab insights
 * Focus: Data quality, pattern detection confidence
 */
export function useUnderstandInsight(date?: string, recentCompletionRate?: number) {
  const { allInsights, loading, context } = useAIInsight(date, {
    recentCompletionRate,
  });

  // Filter for pattern-type insights
  const patternInsights = useMemo(() => {
    return allInsights.filter(i => i.type === 'pattern');
  }, [allInsights]);

  // Calculate data quality score
  const dataQualityScore = useMemo(() => {
    if (!context) return null;
    const { stats } = context;
    if (stats.total === 0) return null;
    return Math.round(stats.completionRate);
  }, [context]);

  return {
    patternInsights,
    dataQualityScore,
    loading,
  };
}

/**
 * Hook for Support tab insights
 * Focus: Team activity, coordination
 */
export function useSupportInsight(date?: string) {
  const { primaryInsight, loading } = useAIInsight(date);

  // Support tab typically shows team-related insights
  // For now, return the primary insight or null
  return {
    insight: primaryInsight,
    loading,
  };
}

export default useAIInsight;
