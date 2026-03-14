// ============================================================================
// INSIGHT RULES — UNIT TESTS
// Tests for rule-based insight generation, including Sprint 1 additions
// ============================================================================

import {
  generateInsights,
  getPrimaryInsight,
  getInsightsForCategory,
  getCurrentWindowLabel,
  InsightContext,
  AIInsight,
} from '../careInsights';
import { CarePlanTask, TaskStats } from '../../types/carePlanTask';
import { TimeWindowLabel } from '../../types/carePlan';

// ============================================================================
// HELPERS
// ============================================================================

function makeTask(overrides: Partial<CarePlanTask> = {}): CarePlanTask {
  return {
    id: 'task-1',
    instanceId: 'inst-1',
    carePlanItemId: 'item-1',
    title: 'Test Task',
    subtitle: '',
    emoji: '💊',
    type: 'medication',
    priority: 'normal',
    windowLabel: 'morning',
    scheduledTime: '08:00',
    scheduledTimeDisplay: '8:00 AM',
    date: '2025-01-15',
    status: 'pending',
    isOverdue: false,
    isDueSoon: false,
    ...overrides,
  } as CarePlanTask;
}

function makeStats(overrides: Partial<TaskStats> = {}): TaskStats {
  return {
    total: 5,
    pending: 3,
    completed: 2,
    skipped: 0,
    missed: 0,
    overdue: 0,
    completionRate: 40,
    ...overrides,
  };
}

function makeContext(overrides: Partial<InsightContext> = {}): InsightContext {
  return {
    tasks: [],
    stats: makeStats(),
    byWindow: { morning: [], afternoon: [], evening: [], night: [], custom: [] },
    currentHour: 10,
    currentWindow: 'morning',
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('insightRules — unit tests', () => {
  // ==========================================================================
  // allCompleteRule
  // ==========================================================================

  describe('allCompleteRule', () => {
    it('should return "all done" insight when all tasks are completed', () => {
      const ctx = makeContext({
        stats: makeStats({ total: 5, pending: 0, completed: 5 }),
      });
      const insights = generateInsights(ctx);
      const allDone = insights.find(i => i.id === 'all-complete');
      expect(allDone).toBeDefined();
      expect(allDone!.type).toBe('reinforcement');
    });

    it('should NOT return insight when tasks are still pending', () => {
      const ctx = makeContext({
        stats: makeStats({ total: 5, pending: 2 }),
      });
      const insights = generateInsights(ctx);
      expect(insights.find(i => i.id === 'all-complete')).toBeUndefined();
    });

    it('should NOT return insight when there are no tasks', () => {
      const ctx = makeContext({
        stats: makeStats({ total: 0, pending: 0 }),
      });
      const insights = generateInsights(ctx);
      expect(insights.find(i => i.id === 'all-complete')).toBeUndefined();
    });
  });

  // ==========================================================================
  // streakRule
  // ==========================================================================

  describe('streakRule', () => {
    it('should return streak insight for 3+ consecutive days', () => {
      const ctx = makeContext({ consecutiveLoggingDays: 5 });
      const insights = generateInsights(ctx);
      const streak = insights.find(i => i.id === 'streak');
      expect(streak).toBeDefined();
      expect(streak!.title).toBe('5-day streak');
    });

    it('should NOT return streak insight for less than 3 days', () => {
      const ctx = makeContext({ consecutiveLoggingDays: 2 });
      const insights = generateInsights(ctx);
      expect(insights.find(i => i.id === 'streak')).toBeUndefined();
    });
  });

  // ==========================================================================
  // highCompletionRule
  // ==========================================================================

  describe('highCompletionRule', () => {
    it('should return insight for 85%+ completion rate', () => {
      const ctx = makeContext({ recentCompletionRate: 92 });
      const insights = generateInsights(ctx);
      const high = insights.find(i => i.id === 'high-completion');
      expect(high).toBeDefined();
      expect(high!.message).toContain('92%');
    });

    it('should NOT return insight for lower completion rate', () => {
      const ctx = makeContext({ recentCompletionRate: 60 });
      const insights = generateInsights(ctx);
      expect(insights.find(i => i.id === 'high-completion')).toBeUndefined();
    });
  });

  // ==========================================================================
  // vitalsBeforeBPMedsRule
  // ==========================================================================

  describe('vitalsBeforeBPMedsRule', () => {
    it('should suggest vitals before BP medication in morning', () => {
      const ctx = makeContext({
        currentHour: 8,
        tasks: [
          makeTask({ type: 'medication', status: 'pending', title: 'Lisinopril 10mg' }),
          makeTask({ id: 'v1', type: 'vitals', status: 'pending', title: 'Morning Vitals' }),
        ],
      });
      const insights = generateInsights(ctx);
      const dep = insights.find(i => i.id === 'vitals-before-bp');
      expect(dep).toBeDefined();
      expect(dep!.type).toBe('dependency');
    });

    it('should NOT trigger outside morning hours', () => {
      const ctx = makeContext({
        currentHour: 15,
        tasks: [
          makeTask({ type: 'medication', status: 'pending', title: 'Lisinopril 10mg' }),
          makeTask({ id: 'v1', type: 'vitals', status: 'pending', title: 'Vitals' }),
        ],
      });
      const insights = generateInsights(ctx);
      expect(insights.find(i => i.id === 'vitals-before-bp')).toBeUndefined();
    });
  });

  // ==========================================================================
  // eveningWindDownRule
  // ==========================================================================

  describe('eveningWindDownRule', () => {
    it('should return insight at 8-10pm with pending evening tasks', () => {
      const ctx = makeContext({
        currentHour: 20,
        byWindow: {
          morning: [],
          afternoon: [],
          evening: [makeTask({ status: 'pending' }), makeTask({ id: 't2', status: 'pending' })],
          night: [],
          custom: [],
        },
      });
      const insights = generateInsights(ctx);
      const windDown = insights.find(i => i.id === 'evening-wind-down');
      expect(windDown).toBeDefined();
      expect(windDown!.message).toContain('2 tasks');
    });

    it('should use singular "task" for 1 remaining', () => {
      const ctx = makeContext({
        currentHour: 21,
        byWindow: {
          morning: [],
          afternoon: [],
          evening: [],
          night: [makeTask({ status: 'pending' })],
          custom: [],
        },
      });
      const insights = generateInsights(ctx);
      const windDown = insights.find(i => i.id === 'evening-wind-down');
      expect(windDown).toBeDefined();
      expect(windDown!.message).toContain('1 task');
    });
  });

  // ==========================================================================
  // generateInsights — sorting & filtering
  // ==========================================================================

  describe('generateInsights — sorting & filtering', () => {
    it('should sort insights by priority (lower number = higher priority)', () => {
      const ctx = makeContext({
        currentHour: 16,
        stats: makeStats({ total: 5, pending: 0, completed: 5 }),
        consecutiveLoggingDays: 7,
        recentCompletionRate: 95,
        tasks: [
          makeTask({ type: 'medication', status: 'completed', title: 'Med A' }),
        ],
      });

      const insights = generateInsights(ctx);
      expect(insights.length).toBeGreaterThan(1);

      for (let i = 1; i < insights.length; i++) {
        expect(insights[i].priority).toBeGreaterThanOrEqual(insights[i - 1].priority);
      }
    });

    it('should filter out insights with confidence below 0.7', () => {
      // All rules have confidence >= 0.7, so this is a structural check
      const ctx = makeContext({
        currentHour: 16,
        tasks: [
          makeTask({ type: 'medication', status: 'completed', title: 'Med A' }),
        ],
      });
      const insights = generateInsights(ctx);
      insights.forEach(i => {
        expect(i.confidence).toBeGreaterThanOrEqual(0.7);
      });
    });
  });

  // ==========================================================================
  // getPrimaryInsight
  // ==========================================================================

  describe('getPrimaryInsight', () => {
    it('should return the highest-priority insight', () => {
      const ctx = makeContext({
        stats: makeStats({ total: 5, pending: 0, completed: 5 }),
      });
      const primary = getPrimaryInsight(ctx);
      expect(primary).not.toBeNull();
      expect(primary!.id).toBe('all-complete');
    });

    it('should return null when no insights match', () => {
      const ctx = makeContext({
        currentHour: 3,
        stats: makeStats({ total: 5, pending: 3 }),
      });
      const primary = getPrimaryInsight(ctx);
      expect(primary).toBeNull();
    });
  });

  // ==========================================================================
  // getInsightsForCategory
  // ==========================================================================

  describe('getInsightsForCategory', () => {
    it('should filter insights by category', () => {
      const ctx = makeContext({
        currentHour: 16,
        tasks: [
          makeTask({ type: 'medication', status: 'completed', title: 'Med A' }),
        ],
      });
      const medsInsights = getInsightsForCategory(ctx, 'meds');
      medsInsights.forEach(i => {
        expect(i.category).toBe('meds');
      });
    });
  });

  // ==========================================================================
  // getCurrentWindowLabel
  // ==========================================================================

  describe('getCurrentWindowLabel', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return morning for 5am-11:59am', () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-15T08:00:00'));
      expect(getCurrentWindowLabel()).toBe('morning');
    });

    it('should return afternoon for 12pm-4:59pm', () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-15T14:00:00'));
      expect(getCurrentWindowLabel()).toBe('afternoon');
    });

    it('should return evening for 5pm-8:59pm', () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-15T19:00:00'));
      expect(getCurrentWindowLabel()).toBe('evening');
    });

    it('should return night for 9pm-4:59am', () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-15T23:00:00'));
      expect(getCurrentWindowLabel()).toBe('night');
    });
  });
});
