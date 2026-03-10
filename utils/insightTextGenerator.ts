// ============================================================================
// INSIGHT TEXT GENERATOR
// Produces plain-language insight strings from care data
// Uses instance-based data (same source as Today page and Journal)
// ============================================================================

import type { InsightText, InsightCategory } from '../types/insightText';
import { getVitalsInRange, VitalReading } from './vitalsStorage';
import { toLocalDateString } from '../services/carePlanGenerator';
import { listDailyInstancesRange, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { CarePlanConfig, BucketType, getEnabledBuckets } from '../types/carePlanConfig';
import { logError } from './devLog';

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export interface InsightResults {
  watch: InsightText[];
  improving: InsightText[];
  missing: InsightText[];
  patterns: InsightText[];
}

export interface PeriodSummary {
  totalInstances: number;
  completedInstances: number;
  completionRate: number;
  activeDays: number;
  totalDays: number;
  topBucket: string | null;
}

export async function computePeriodSummary(daysBack: number): Promise<PeriodSummary> {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - daysBack);
  const startStr = toLocalDateString(start);
  const endStr = toLocalDateString(today);

  const instances = await listDailyInstancesRange(DEFAULT_PATIENT_ID, startStr, endStr);
  const completed = instances.filter(i => i.status === 'completed' || i.status === 'skipped').length;
  const daySet = new Set(instances.map(i => i.date).filter(Boolean));

  // Find the bucket with the most instances
  const bucketCounts: Record<string, number> = {};
  for (const inst of instances) {
    const t = inst.itemType || 'other';
    bucketCounts[t] = (bucketCounts[t] || 0) + 1;
  }
  const topBucket = Object.entries(bucketCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    totalInstances: instances.length,
    completedInstances: completed,
    completionRate: instances.length > 0 ? Math.round((completed / instances.length) * 100) : 0,
    activeDays: daySet.size,
    totalDays: daysBack,
    topBucket,
  };
}

export async function generateAllInsights(
  config: CarePlanConfig,
  daysBack: number = 7
): Promise<InsightResults> {
  const results: InsightResults = {
    watch: [],
    improving: [],
    missing: [],
    patterns: [],
  };

  try {
    const enabledBuckets = getEnabledBuckets(config);
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - daysBack);

    // Generate each category
    results.watch = await generateWatchItems(enabledBuckets, startDate, today, daysBack);
    results.improving = await generateImprovements(enabledBuckets, startDate, today, daysBack);
    results.missing = await generateDataGaps(enabledBuckets, config, daysBack, startDate, today);
    results.patterns = await generatePatterns(enabledBuckets, startDate, today);
  } catch (err) {
    logError('generateAllInsights', err);
  }

  return results;
}

// ============================================================================
// WATCH ITEMS — things that need attention
// ============================================================================

async function generateWatchItems(
  buckets: BucketType[],
  start: Date,
  end: Date,
  daysBack: number
): Promise<InsightText[]> {
  const items: InsightText[] = [];

  // Medication adherence check (instance-based)
  if (buckets.includes('meds')) {
    try {
      const startStr = toLocalDateString(start);
      const endStr = toLocalDateString(end);
      const instances = await listDailyInstancesRange(DEFAULT_PATIENT_ID, startStr, endStr);
      const medInstances = instances.filter(i => i.itemType === 'medication');

      if (medInstances.length > 0) {
        const completed = medInstances.filter(i => i.status === 'completed' || i.status === 'skipped').length;
        const missed = medInstances.filter(i => i.status === 'missed' || i.status === 'pending').length;
        const adherenceRate = Math.round((completed / medInstances.length) * 100);

        if (adherenceRate < 80) {
          items.push({
            id: 'watch-med-adherence',
            icon: '\u26A0\uFE0F',
            category: 'watch',
            title: 'Medication adherence',
            body: `${adherenceRate}% adherence over the last ${daysBack} days \u2014 ${missed} doses missed or pending.`,
            severity: 'watch',
            relatedTypes: ['meds'],
            whyItMatters: 'Consistent medication timing is important for effectiveness. Missing multiple doses may need a schedule adjustment.',
            actions: [
              { label: 'View Schedule', icon: '\uD83D\uDCCB', route: '/care-plan' },
            ],
          });
        }
      }
    } catch {}
  }

  // Vitals threshold check
  if (buckets.includes('vitals')) {
    try {
      const startStr = toLocalDateString(start);
      const endStr = toLocalDateString(end);
      const vitals = await getVitalsInRange(startStr, endStr);
      const highBP = vitals.filter(
        (v: VitalReading) => v.type === 'systolic' && v.value > 140
      );
      if (highBP.length >= 2) {
        items.push({
          id: 'watch-high-bp',
          icon: '\u26A0\uFE0F',
          category: 'watch',
          title: 'Blood pressure elevated',
          body: `${highBP.length} readings above 140 systolic in the last ${daysBack} days.`,
          severity: 'watch',
          relatedTypes: ['vitals'],
          whyItMatters: 'Keeping blood pressure under 130/80 reduces risk of heart attack and stroke. Bring this up at the next provider visit.',
          actions: [
            { label: 'Log Reading', icon: '\uD83D\uDCCA', route: '/log-vitals' },
            { label: 'Visit Prep', icon: '\uD83D\uDCCB', route: '/provider-prep' },
          ],
        });
      }
    } catch {}
  }

  return items;
}

// ============================================================================
// IMPROVEMENTS — positive trends
// ============================================================================

async function generateImprovements(
  buckets: BucketType[],
  start: Date,
  end: Date,
  daysBack: number
): Promise<InsightText[]> {
  const items: InsightText[] = [];

  if (buckets.includes('meds')) {
    try {
      const startStr = toLocalDateString(start);
      const endStr = toLocalDateString(end);
      const instances = await listDailyInstancesRange(DEFAULT_PATIENT_ID, startStr, endStr);
      const medInstances = instances.filter(i => i.itemType === 'medication');

      if (medInstances.length > 0) {
        const completed = medInstances.filter(i => i.status === 'completed' || i.status === 'skipped').length;
        const rate = Math.round((completed / medInstances.length) * 100);

        if (rate >= 90) {
          items.push({
            id: 'improve-med-adherence',
            icon: '\u2705',
            category: 'improving',
            title: 'Medication adherence strong',
            body: `${rate}% adherence over the last ${daysBack} days \u2014 great consistency.`,
            severity: 'good',
            relatedTypes: ['meds'],
            whyItMatters: 'Consistent medication adherence is the single most impactful thing a caregiver can track.',
          });
        }
      }
    } catch {}
  }

  return items;
}

// ============================================================================
// DATA GAPS — what's missing
// ============================================================================

async function generateDataGaps(
  buckets: BucketType[],
  config: CarePlanConfig,
  daysBack: number,
  start: Date,
  end: Date
): Promise<InsightText[]> {
  const items: InsightText[] = [];

  try {
    const startStr = toLocalDateString(start);
    const endStr = toLocalDateString(end);
    const instances = await listDailyInstancesRange(DEFAULT_PATIENT_ID, startStr, endStr);

    // Check for days with zero instances
    const daySet = new Set<string>();
    for (const inst of instances) {
      if (inst.date) daySet.add(inst.date);
    }

    const expectedDays = daysBack;
    const actualDays = daySet.size;
    const gapDays = expectedDays - actualDays;

    if (gapDays >= 2) {
      items.push({
        id: 'gap-missing-days',
        icon: '\uD83D\uDCC5',
        category: 'missing',
        title: `${gapDays} days with no data`,
        body: `Out of the last ${daysBack} days, ${gapDays} have no logged activity. Consistent tracking helps identify patterns.`,
        severity: 'info',
        relatedTypes: [],
      });
    }

    // Check per-bucket gaps
    for (const bucket of buckets) {
      const bucketConfig = config[bucket];
      if (!bucketConfig?.enabled) continue;

      const itemTypeMap: Record<string, string> = {
        meds: 'medication', vitals: 'vitals', meals: 'nutrition',
        wellness: 'wellness', activity: 'activity', sleep: 'sleep',
      };
      const itemType = itemTypeMap[bucket];
      if (!itemType) continue;

      const bucketInstances = instances.filter(i => i.itemType === itemType);
      const bucketDays = new Set(bucketInstances.map(i => i.date)).size;

      if (bucketDays < actualDays * 0.5 && actualDays >= 3) {
        const label = bucket.charAt(0).toUpperCase() + bucket.slice(1);
        items.push({
          id: `gap-${bucket}`,
          icon: '\uD83D\uDCCA',
          category: 'missing',
          title: `${label} tracking gap`,
          body: `${label} data found on only ${bucketDays} of ${actualDays} active days. More data helps spot trends.`,
          severity: 'info',
          relatedTypes: [bucket],
        });
      }
    }
  } catch (err) {
    logError('generateDataGaps', err);
  }

  if (items.length === 0 && buckets.length > 0) {
    items.push({
      id: 'gap-placeholder',
      icon: '\uD83D\uDCCA',
      category: 'missing',
      title: 'Tracking looks good',
      body: 'No significant data gaps this week.',
      severity: 'info',
      relatedTypes: [],
    });
  }

  return items;
}

// ============================================================================
// PATTERNS — correlations in plain language
// ============================================================================

async function generatePatterns(
  _buckets: BucketType[],
  _start: Date,
  _end: Date
): Promise<InsightText[]> {
  const items: InsightText[] = [];

  try {
    const { detectCorrelations } = require('./correlationDetector');
    const correlations = await detectCorrelations();
    if (correlations && correlations.length > 0) {
      for (const corr of correlations.slice(0, 3)) {
        items.push({
          id: `pattern-${corr.id || Date.now()}`,
          icon: '\uD83D\uDD0D',
          category: 'pattern',
          title: corr.title || 'Pattern noticed',
          body: corr.description || corr.summary || 'A correlation was detected.',
          severity: 'info',
          relatedTypes: corr.types || [],
        });
      }
    }
  } catch {}

  return items;
}
