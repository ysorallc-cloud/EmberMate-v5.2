import {
  generateSummaryText,
  InsightResults,
  PeriodSummary,
} from '../utils/insightTextGenerator';

describe('generateSummaryText', () => {
  const baseSummary: PeriodSummary = {
    totalInstances: 50,
    completedInstances: 40,
    completionRate: 80,
    activeDays: 7,
    totalDays: 7,
    topBucket: 'meds',
  };

  const baseResults: InsightResults = {
    watch: [],
    improving: [],
    missing: [],
    patterns: [],
  };

  it('includes both watch and improving topics when present', () => {
    const results: InsightResults = {
      ...baseResults,
      watch: [
        { id: 'w1', icon: '⚠️', category: 'watch', title: 'Evening meds dropped', body: '', severity: 'watch', relatedTypes: [] },
      ],
      improving: [
        { id: 'i1', icon: '✅', category: 'improving', title: 'Morning timing improved', body: '', severity: 'good', relatedTypes: [] },
      ],
    };

    const text = generateSummaryText(results, baseSummary, []);
    expect(text).toContain('Evening meds dropped');
    expect(text).toContain('Morning timing improved');
  });

  it('includes upcoming appointment when provided', () => {
    const text = generateSummaryText(baseResults, baseSummary, [
      { provider: 'Dr. Smith', date: '2026-03-15' },
    ]);
    expect(text).toContain('Dr. Smith');
  });

  it('returns fallback when no insights and no instances', () => {
    const emptySummary: PeriodSummary = { ...baseSummary, totalInstances: 0 };
    const text = generateSummaryText(baseResults, emptySummary, []);
    expect(text).toContain('Start logging');
  });

  it('returns adherence fallback when no insights but has instances', () => {
    const text = generateSummaryText(baseResults, baseSummary, []);
    expect(text).toContain('80%');
    expect(text).toContain('7 days');
  });
});
