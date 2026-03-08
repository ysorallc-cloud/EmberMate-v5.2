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
    if (opts.medsTotal > 0) {
      if (opts.medsDone === opts.medsTotal) {
        const streak = (brief as any).adherenceStreak ?? 0;
        if (streak >= 3) {
          reflections.push({
            id: 'med-streak',
            icon: '💊',
            observation: `All ${opts.medsTotal} medications taken — ${streak} days in a row.`,
            recommendation: 'Consistency helps maintain steady medication levels throughout the day.',
            category: 'medications',
          });
        } else {
          reflections.push({
            id: 'med-complete',
            icon: '💊',
            observation: `All ${opts.medsTotal} medications taken today.`,
            category: 'medications',
          });
        }
      } else if (opts.medsDone > 0) {
        const remaining = opts.medsTotal - opts.medsDone;
        reflections.push({
          id: 'med-partial',
          icon: '💊',
          observation: `${opts.medsDone} of ${opts.medsTotal} medications taken. ${remaining} still pending.`,
          recommendation: 'If a dose was missed, try to take it as soon as you remember — unless it\'s close to the next scheduled dose.',
          category: 'medications',
        });
      } else {
        reflections.push({
          id: 'med-none',
          icon: '💊',
          observation: 'No medications logged yet today.',
          recommendation: 'Head to the Today tab to confirm doses when ready.',
          category: 'medications',
        });
      }
    }

    // ── NUTRITION REFLECTIONS ──
    if (opts.mealsTotal > 0) {
      if (opts.mealsDone >= opts.mealsTotal) {
        reflections.push({
          id: 'meals-complete',
          icon: '🍽️',
          observation: 'All planned meals logged today.',
          recommendation: 'Regular meals help stabilize energy and support medication effectiveness.',
          category: 'nutrition',
        });
      } else if (opts.mealsDone > 0) {
        const remaining = opts.mealsTotal - opts.mealsDone;
        reflections.push({
          id: 'meals-partial',
          icon: '🍽️',
          observation: `${opts.mealsDone} of ${opts.mealsTotal} meals logged. ${remaining} remaining.`,
          category: 'nutrition',
        });
      }
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
    if (opts.wellnessTotal > 0) {
      if (opts.wellnessDone >= opts.wellnessTotal) {
        reflections.push({
          id: 'wellness-complete',
          icon: '🌅',
          observation: 'All wellness check-ins completed today.',
          recommendation: 'These check-ins build a picture of daily patterns over time.',
          category: 'wellness',
        });
      } else if (opts.hasMorning && !opts.hasEvening) {
        reflections.push({
          id: 'wellness-morning-done',
          icon: '🌅',
          observation: 'Morning check-in done. Evening check-in still open.',
          recommendation: 'Evening check-ins capture how the day went — helpful for spotting patterns.',
          category: 'wellness',
        });
      }
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
// Replaces the basic "All 5 medications taken" with richer context
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
  }
): string {
  const parts: string[] = [];
  const now = new Date();
  const hour = now.getHours();

  // Time-of-day greeting
  if (hour < 12) {
    parts.push('This morning:');
  } else if (hour < 17) {
    parts.push('So far today:');
  } else {
    parts.push("Today's summary:");
  }

  // Medication status with context
  if (opts.medsTotal > 0) {
    if (opts.medsDone === opts.medsTotal) {
      parts.push(`All ${opts.medsTotal} medications have been taken.`);
    } else if (opts.medsDone > 0) {
      const pending = opts.medsTotal - opts.medsDone;
      parts.push(`${opts.medsDone} of ${opts.medsTotal} medications taken, ${pending} still pending.`);
    } else {
      parts.push('No medications logged yet.');
    }
  }

  // Meals + hydration combined
  const nutritionParts: string[] = [];
  if (opts.mealsTotal > 0 && opts.mealsDone > 0) {
    nutritionParts.push(`${opts.mealsDone} meal${opts.mealsDone > 1 ? 's' : ''} logged`);
  }
  if (opts.waterGlasses > 0) {
    nutritionParts.push(`${opts.waterGlasses} glasses of water`);
  }
  if (nutritionParts.length > 0) {
    parts.push(nutritionParts.join(' and ') + '.');
  }

  // Wellness + vitals
  if (opts.wellnessDone > 0) {
    parts.push(`${opts.wellnessDone} wellness check-in${opts.wellnessDone > 1 ? 's' : ''} completed.`);
  }
  if (opts.hasVitals) {
    parts.push('Vitals recorded.');
  }

  // Remaining items
  const remaining: string[] = [];
  if (opts.medsTotal > 0 && opts.medsDone < opts.medsTotal) {
    remaining.push(`${opts.medsTotal - opts.medsDone} medication${opts.medsTotal - opts.medsDone > 1 ? 's' : ''}`);
  }
  if (opts.wellnessTotal > opts.wellnessDone) {
    remaining.push('wellness check');
  }
  if (remaining.length > 0) {
    parts.push(`Still needs attention: ${remaining.join(', ')}.`);
  }

  return parts.join(' ');
}
