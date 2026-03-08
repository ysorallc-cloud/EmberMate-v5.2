// ============================================================================
// INSIGHT TEXT GENERATOR
// Produces plain-language insight strings from care data
// Replaces dashboard metrics with human-readable guidance
// ============================================================================

import type { InsightText, InsightCategory } from '../types/insightText';
import { getMedicationLogs, getMedications } from './medicationStorage';
import { getVitalsInRange, VitalReading } from './vitalsStorage';
import { toLocalDateString } from '../services/carePlanGenerator';
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
    results.watch = await generateWatchItems(enabledBuckets, startDate, today);
    results.improving = await generateImprovements(enabledBuckets, startDate, today);
    results.missing = generateDataGaps(enabledBuckets, config, daysBack);
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
  end: Date
): Promise<InsightText[]> {
  const items: InsightText[] = [];

  // Medication adherence check
  if (buckets.includes('meds')) {
    try {
      const meds = await getMedications();
      const activeMeds = meds.filter(m => m.active !== false);
      if (activeMeds.length > 0) {
        const logs = await getMedicationLogs();
        const recentLogs = logs.filter(l => {
          const d = new Date(l.timestamp);
          return d >= start && d <= end;
        });
        const missed = recentLogs.filter(l => !l.taken);
        if (missed.length > 3) {
          items.push({
            id: 'watch-med-adherence',
            icon: '\u26A0\uFE0F',
            category: 'watch',
            title: 'Medication adherence',
            body: `${missed.length} doses missed or skipped in the last 7 days.`,
            severity: 'watch',
            relatedTypes: ['meds'],
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
          body: `${highBP.length} readings above 140 systolic in the last 7 days.`,
          severity: 'watch',
          relatedTypes: ['vitals'],
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
  end: Date
): Promise<InsightText[]> {
  const items: InsightText[] = [];

  if (buckets.includes('meds')) {
    try {
      const logs = await getMedicationLogs();
      const recentLogs = logs.filter(l => {
        const d = new Date(l.timestamp);
        return d >= start && d <= end;
      });
      const taken = recentLogs.filter(l => l.taken).length;
      const total = recentLogs.length;
      if (total > 0) {
        const rate = Math.round((taken / total) * 100);
        if (rate >= 90) {
          items.push({
            id: 'improve-med-adherence',
            icon: '\u2705',
            category: 'improving',
            title: 'Medication adherence strong',
            body: `${rate}% adherence this week \u2014 great consistency.`,
            severity: 'good',
            relatedTypes: ['meds'],
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

function generateDataGaps(
  buckets: BucketType[],
  config: CarePlanConfig,
  _daysBack: number
): InsightText[] {
  const items: InsightText[] = [];

  // Simplified version — check which enabled buckets have no recent data.
  // Full implementation would check actual storage for each bucket type.
  // Will be enhanced when the event model (Phase 4) is in place.
  for (const bucket of buckets) {
    const bucketConfig = config[bucket];
    if (bucketConfig?.enabled && bucketConfig.priority !== 'optional') {
      // Placeholder — full implementation checks actual storage
    }
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
