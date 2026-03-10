import { generateEnhancedNarrative } from '../utils/journalReflections';

describe('Journal narrative', () => {
  const mockBrief = {
    generatedAt: new Date().toISOString(),
    patient: { name: 'Dad' },
    medications: [
      { name: 'Aspirin', status: 'completed', takenAt: '08:00' },
      { name: 'Lisinopril', status: 'completed', takenAt: '08:00' },
      { name: 'Warfarin', status: 'completed', takenAt: '08:00' },
      { name: 'Metformin', status: 'pending' },
      { name: 'Omeprazole', status: 'pending' },
    ],
    vitals: {
      recorded: true,
      readings: { systolic: 132, diastolic: 82, heartRate: 72 },
    },
    meals: { total: 3, meals: [] },
    hydration: { glasses: 4 },
    wellnessChecks: { done: 1, total: 2 },
    sleep: { logged: true, hours: 7 },
    mood: {},
    attentionItems: [],
    interpretations: {},
  } as any;

  test('references patient by name', () => {
    const result = generateEnhancedNarrative(mockBrief, {
      medsDone: 3,
      medsTotal: 5,
      mealsDone: 1,
      mealsTotal: 3,
      waterGlasses: 4,
      wellnessDone: 1,
      wellnessTotal: 2,
      hasVitals: true,
      patientName: 'Dad',
    });
    expect(result).toContain('Dad');
  });

  test('does not start with system-log phrasing', () => {
    const result = generateEnhancedNarrative(mockBrief, {
      medsDone: 3,
      medsTotal: 5,
      mealsDone: 1,
      mealsTotal: 3,
      waterGlasses: 4,
      wellnessDone: 1,
      wellnessTotal: 2,
      hasVitals: true,
      patientName: 'Dad',
    });
    expect(result).not.toMatch(/^Today's summary:/);
    expect(result).not.toMatch(/^This morning:/);
    expect(result).not.toMatch(/^So far today:/);
  });
});
