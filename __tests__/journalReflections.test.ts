import {
  generateReflections,
  generateEnhancedNarrative,
} from '../utils/journalReflections';

// Minimal CareBrief mock
const baseBrief = {
  medications: [],
  vitals: { scheduled: false, readings: null },
  wellnessChecks: { total: 0, done: 0 },
  sleep: { logged: false },
  attentionItems: [],
  interpretations: {},
  adherenceStreak: 0,
  handoffNarrative: '',
  statusNarrative: '',
  nextAppointment: null,
  generatedAt: new Date().toISOString(),
} as any;

const baseOpts = {
  medsDone: 0, medsTotal: 0,
  mealsDone: 0, mealsTotal: 0,
  waterGlasses: 0,
  wellnessDone: 0, wellnessTotal: 0,
  hasVitals: false, hasMorning: false, hasEvening: false,
};

describe('Journal Reflections', () => {
  test('generates medication streak reflection', () => {
    const reflections = generateReflections(
      { ...baseBrief, adherenceStreak: 5 },
      { ...baseOpts, medsDone: 3, medsTotal: 3 }
    );
    const medRef = reflections.find(r => r.id === 'med-streak');
    expect(medRef).toBeDefined();
    expect(medRef!.observation).toContain('5 days in a row');
    expect(medRef!.recommendation).toBeTruthy();
  });

  test('generates low hydration warning when meds taken', () => {
    const reflections = generateReflections(baseBrief, {
      ...baseOpts,
      medsDone: 2, medsTotal: 3, waterGlasses: 1,
    });
    const crossRef = reflections.find(r => r.id === 'cross-med-water');
    expect(crossRef).toBeDefined();
    expect(crossRef!.recommendation).toContain('hydration');
  });

  test('generates empty day encouragement when nothing logged', () => {
    const reflections = generateReflections(baseBrief, baseOpts);
    expect(reflections.length).toBeGreaterThan(0);
    expect(reflections[0].id).toBe('empty-day');
  });

  test('recommendations are non-clinical language', () => {
    const reflections = generateReflections(
      { ...baseBrief, adherenceStreak: 4 },
      { ...baseOpts, medsDone: 5, medsTotal: 5, waterGlasses: 2 }
    );
    for (const ref of reflections) {
      if (ref.recommendation) {
        // Should not contain clinical directives
        expect(ref.recommendation).not.toMatch(/must|should always|required|prescribed/i);
        // Should not claim medical authority
        expect(ref.recommendation).not.toMatch(/doctor recommends|medically necessary/i);
      }
    }
  });

  test('vitals reflection provides context not alarm', () => {
    const reflections = generateReflections(
      {
        ...baseBrief,
        vitals: { scheduled: true, readings: { systolic: 145, diastolic: 92 } },
      },
      { ...baseOpts, hasVitals: true }
    );
    const vitalsRef = reflections.find(r => r.id === 'vitals-bp');
    expect(vitalsRef).toBeDefined();
    expect(vitalsRef!.observation).toContain('elevated');
    // Should suggest noting for provider, not diagnosing
    expect(vitalsRef!.recommendation).toContain('provider visit');
  });
});

describe('Enhanced Narrative', () => {
  test('references patient name when provided', () => {
    const briefWithVitals = {
      ...baseBrief,
      vitals: { scheduled: true, readings: { systolic: 120, diastolic: 80 } },
    };
    const narrative = generateEnhancedNarrative(briefWithVitals, {
      ...baseOpts,
      medsDone: 3, medsTotal: 3,
      hasVitals: true,
      patientName: 'Dad',
    });
    expect(narrative).toContain('Dad');
  });

  test('combines meals and water naturally', () => {
    const narrative = generateEnhancedNarrative(baseBrief, {
      ...baseOpts,
      mealsDone: 2, mealsTotal: 3, waterGlasses: 5,
    });
    expect(narrative).toContain('2 of 3 meals logged');
    expect(narrative).toContain('5 glasses of water');
  });

  test('notes pending medications', () => {
    const narrative = generateEnhancedNarrative(baseBrief, {
      ...baseOpts,
      medsDone: 2, medsTotal: 5,
      wellnessDone: 0, wellnessTotal: 2,
    });
    expect(narrative).toContain('still pending');
    expect(narrative).toContain('medication');
  });
});
