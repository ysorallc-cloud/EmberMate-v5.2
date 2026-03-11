// ============================================================================
// JOURNAL REFLECTIONS
// Generates contextual observations and non-clinical recommendations
// from today's care data. These add meaning, not repeat facts.
// ============================================================================

import { CareBrief } from './careSummaryBuilder';
import { logError } from './devLog';

export interface JournalReflection {
  id: string;
  icon: string;
  observation: string;     // What happened, in context
  recommendation?: string; // Gentle, non-clinical suggestion
  category: 'medications' | 'nutrition' | 'wellness' | 'hydration' | 'vitals' | 'general';
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export function generateReflections(
  brief: CareBrief,
  opts: {
    medsDone: number;
    medsTotal: number;
    mealsDone: number;
    mealsTotal: number;
    waterGlasses: number;
    wellnessDone: number;
    wellnessTotal: number;
    hasVitals: boolean;
    hasMorning: boolean;
    hasEvening: boolean;
  }
): JournalReflection[] {
  const reflections: JournalReflection[] = [];

  try {
    // ── MEDICATION REFLECTIONS ──
    // Only show med-streak (multi-day context); narrative covers daily counts
    if (opts.medsTotal > 0 && opts.medsDone === opts.medsTotal) {
      const streak = (brief as any).adherenceStreak ?? 0;
      if (streak >= 3) {
        reflections.push({
          id: 'med-streak',
          icon: '💊',
          observation: `All ${opts.medsTotal} medications taken — ${streak} days in a row.`,
          recommendation: 'Consistency helps maintain steady medication levels throughout the day.',
          category: 'medications',
        });
      }
    }

    // ── NUTRITION REFLECTIONS ──
    // Only show meals-complete (positive reinforcement); narrative covers partial counts
    if (opts.mealsTotal > 0 && opts.mealsDone >= opts.mealsTotal) {
      reflections.push({
        id: 'meals-complete',
        icon: '🍽️',
        observation: 'All planned meals logged today.',
        recommendation: 'Regular meals help stabilize energy and support medication effectiveness.',
        category: 'nutrition',
      });
    }

    // ── HYDRATION REFLECTIONS ──
    if (opts.waterGlasses > 0 || opts.medsTotal > 0) {
      if (opts.waterGlasses >= 8) {
        reflections.push({
          id: 'water-good',
          icon: '💧',
          observation: `${opts.waterGlasses} glasses of water today — well hydrated.`,
          category: 'hydration',
        });
      } else if (opts.waterGlasses >= 4) {
        const remaining = 8 - opts.waterGlasses;
        reflections.push({
          id: 'water-partial',
          icon: '💧',
          observation: `${opts.waterGlasses} glasses so far. ${remaining} more to reach the daily goal.`,
          recommendation: 'Staying hydrated supports kidney function and helps medications absorb properly.',
          category: 'hydration',
        });
      } else if (opts.waterGlasses > 0) {
        reflections.push({
          id: 'water-low',
          icon: '💧',
          observation: `Only ${opts.waterGlasses} glass${opts.waterGlasses === 1 ? '' : 'es'} of water logged today.`,
          recommendation: 'Consider offering water with each medication dose — it builds a natural hydration habit.',
          category: 'hydration',
        });
      }
    }

    // ── WELLNESS CHECK REFLECTIONS ──
    // Only show wellness-morning-done (specific next-step); narrative covers completion
    if (opts.wellnessTotal > 0 && opts.hasMorning && !opts.hasEvening) {
      reflections.push({
        id: 'wellness-morning-done',
        icon: '🌅',
        observation: 'Morning check-in done. Evening check-in still open.',
        recommendation: 'Evening check-ins capture how the day went — helpful for spotting patterns.',
        category: 'wellness',
      });
    }

    // ── VITALS REFLECTIONS ──
    if (opts.hasVitals && brief.vitals?.readings) {
      const r = brief.vitals.readings;
      if (r.systolic != null && r.diastolic != null) {
        const systolic = r.systolic;
        const diastolic = r.diastolic;
        let bpNote = '';
        if (systolic <= 120 && diastolic <= 80) {
          bpNote = 'Blood pressure is in a normal range today.';
        } else if (systolic <= 140 && diastolic <= 90) {
          bpNote = 'Blood pressure is slightly elevated but within a common range.';
        } else {
          bpNote = 'Blood pressure is elevated today.';
        }
        reflections.push({
          id: 'vitals-bp',
          icon: '❤️',
          observation: `${bpNote} (${systolic}/${diastolic})`,
          recommendation: systolic > 140
            ? 'Worth noting for the next provider visit — consistent elevation is more meaningful than a single reading.'
            : undefined,
          category: 'vitals',
        });
      }
    }

    // ── CROSS-CATEGORY OBSERVATIONS ──
    // Medication + hydration connection
    if (opts.medsDone > 0 && opts.waterGlasses < 3) {
      reflections.push({
        id: 'cross-med-water',
        icon: '💡',
        observation: 'Medications were taken but water intake is low.',
        recommendation: 'Many medications work best with adequate hydration. Pairing a glass of water with each dose is an easy habit.',
        category: 'general',
      });
    }

    // Empty day encouragement
    if (reflections.length === 0) {
      reflections.push({
        id: 'empty-day',
        icon: '📝',
        observation: 'Nothing logged yet today.',
        recommendation: 'No pressure — even logging one thing helps build a picture over time.',
        category: 'general',
      });
    }

  } catch (err) {
    logError('generateReflections', err);
  }

  return reflections;
}

// ============================================================================
// ENHANCED NARRATIVE
// Reads like a caregiver briefing — a story of how the day is going
// ============================================================================

export function generateEnhancedNarrative(
  brief: CareBrief,
  opts: {
    medsDone: number;
    medsTotal: number;
    mealsDone: number;
    mealsTotal: number;
    waterGlasses: number;
    wellnessDone: number;
    wellnessTotal: number;
    hasVitals: boolean;
    patientName?: string;
  }
): string {
  const name = opts.patientName || 'They';
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  // Determine pronoun from patient name for natural flow
  const pronoun = 'they';
  const possessive = 'their';

  // ── Build the positive lead ──
  const positives: string[] = [];

  if (opts.medsTotal > 0 && opts.medsDone === opts.medsTotal) {
    positives.push(`took ${possessive} meds on time`);
  } else if (opts.medsDone > 0) {
    positives.push(`took ${opts.medsDone} of ${possessive} ${opts.medsTotal} meds`);
  }

  if (opts.mealsDone > 0) {
    if (opts.mealsDone >= opts.mealsTotal) {
      positives.push('ate all planned meals');
    } else {
      const mealLabels = ['breakfast', 'lunch', 'dinner'];
      const label = opts.mealsDone <= mealLabels.length ? mealLabels.slice(0, opts.mealsDone).join(' and ') : `${opts.mealsDone} meals`;
      positives.push(`had ${label}`);
    }
  }

  if (opts.hasVitals && brief.vitals?.readings) {
    const r = brief.vitals.readings;
    if (r.systolic != null && r.diastolic != null) {
      positives.push(`had vitals checked (${r.systolic}/${r.diastolic})`);
    } else {
      positives.push('had vitals checked');
    }
  }

  if (opts.wellnessDone > 0) {
    positives.push(`completed ${possessive} ${opts.wellnessDone === 1 ? 'morning' : 'wellness'} check-in`);
  }

  // ── Build the gaps ──
  const gaps: string[] = [];

  if (opts.medsTotal > 0 && opts.medsDone === 0) {
    gaps.push('meds haven\'t been confirmed yet');
  } else if (opts.medsTotal > 0 && opts.medsDone < opts.medsTotal) {
    const pending = opts.medsTotal - opts.medsDone;
    gaps.push(`${pending} med${pending > 1 ? 's' : ''} still pending`);
  }

  if (opts.mealsTotal > 0 && opts.mealsDone === 0) {
    gaps.push('no meals logged');
  } else if (opts.mealsTotal > 0 && opts.mealsDone < opts.mealsTotal) {
    const mealGap = opts.mealsTotal - opts.mealsDone;
    gaps.push(`${mealGap} meal${mealGap > 1 ? 's' : ''} not logged`);
  }

  if (!opts.hasVitals) {
    gaps.push('vitals haven\'t been checked');
  }

  if (opts.waterGlasses === 0) {
    gaps.push('no water logged');
  } else if (opts.waterGlasses < 4) {
    gaps.push('water intake is low');
  }

  if (!brief.sleep.logged && hour >= 17) {
    gaps.push('sleep hasn\'t been logged');
  }

  // ── Compose the narrative ──
  const sentences: string[] = [];

  if (positives.length === 0 && gaps.length === 0) {
    return `Nothing logged for ${name} yet today. No pressure \u2014 even one thing helps.`;
  }

  if (positives.length > 0) {
    const lead = positives.length <= 2
      ? positives.join(' and ')
      : positives.slice(0, -1).join(', ') + ', and ' + positives[positives.length - 1];
    sentences.push(`${name} had a ${positives.length >= 3 ? 'solid' : 'good'} ${timeOfDay} \u2014 ${pronoun} ${lead}.`);
  } else {
    sentences.push(`${name}'s day is just getting started.`);
  }

  if (gaps.length > 0) {
    const gapText = gaps.length <= 2
      ? gaps.join(' and ')
      : gaps.slice(0, -1).join(', ') + ', and ' + gaps[gaps.length - 1];

    if (positives.length > 0) {
      sentences.push(`Still on the list: ${gapText}.`);
    } else {
      sentences.push(`So far, ${gapText}.`);
    }
  }

  // What's ahead (only if before evening and there's pending work)
  if (hour < 17 && gaps.length > 0) {
    sentences.push('Evening meds and check-in are still ahead.');
  }

  return sentences.join(' ');
}
