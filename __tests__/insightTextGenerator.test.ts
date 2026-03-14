import {
  generateAllInsights,
  InsightResults,
} from '../utils/insightEngine';
import { createDefaultCarePlanConfig } from '../types/carePlanConfig';

// Mock instance-based storage (replaces legacy medicationStorage mock)
jest.mock('../storage/carePlanRepo', () => {
  const d = new Date().toISOString().split('T')[0];
  return {
    listDailyInstancesRange: jest.fn().mockResolvedValue([
      { id: '1', itemType: 'medication', itemName: 'Test Med', status: 'completed', date: d },
      { id: '2', itemType: 'medication', itemName: 'Test Med', status: 'completed', date: d },
      { id: '3', itemType: 'medication', itemName: 'Test Med', status: 'pending', date: d },
      { id: '4', itemType: 'medication', itemName: 'Test Med', status: 'missed', date: d },
      { id: '5', itemType: 'medication', itemName: 'Test Med', status: 'missed', date: d },
      { id: '6', itemType: 'medication', itemName: 'Test Med', status: 'missed', date: d },
    ]),
    DEFAULT_PATIENT_ID: 'default',
  };
});

jest.mock('../utils/vitalsStorage', () => ({
  getVitalsInRange: jest.fn().mockResolvedValue([]),
}));

jest.mock('../utils/correlationDetector', () => ({
  detectCorrelations: jest.fn().mockResolvedValue([]),
}));

jest.mock('../services/carePlanGenerator', () => ({
  getTodayDateString: jest.fn().mockReturnValue('2026-03-08'),
  toLocalDateString: jest.fn((d: Date) => d.toISOString().split('T')[0]),
}));

describe('Insight Text Generator', () => {
  const config = createDefaultCarePlanConfig('test-patient');

  test('returns all four insight categories', async () => {
    const results = await generateAllInsights(config);
    expect(results).toHaveProperty('watch');
    expect(results).toHaveProperty('improving');
    expect(results).toHaveProperty('missing');
    expect(results).toHaveProperty('patterns');
  });

  test('generates watch item when many meds missed', async () => {
    const results = await generateAllInsights(config);
    const medWatch = results.watch.find(i => i.id === 'watch-med-adherence');
    expect(medWatch).toBeDefined();
    expect(medWatch!.severity).toBe('watch');
  });

  test('each insight has required fields', async () => {
    const results = await generateAllInsights(config);
    const allInsights = [
      ...results.watch,
      ...results.improving,
      ...results.missing,
      ...results.patterns,
    ];
    for (const insight of allInsights) {
      expect(insight.id).toBeTruthy();
      expect(insight.icon).toBeTruthy();
      expect(insight.title).toBeTruthy();
      expect(insight.body).toBeTruthy();
      expect(insight.severity).toBeTruthy();
      expect(insight.category).toBeTruthy();
    }
  });
});
