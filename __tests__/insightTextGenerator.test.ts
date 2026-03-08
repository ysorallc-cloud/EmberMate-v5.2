import {
  generateAllInsights,
  InsightResults,
} from '../utils/insightTextGenerator';
import { createDefaultCarePlanConfig } from '../types/carePlanConfig';

// Mock storage modules
jest.mock('../utils/medicationStorage', () => ({
  getMedications: jest.fn().mockResolvedValue([
    { id: '1', name: 'Test Med', active: true },
  ]),
  getMedicationLogs: jest.fn().mockResolvedValue([
    { medicationId: '1', timestamp: new Date().toISOString(), taken: true },
    { medicationId: '1', timestamp: new Date().toISOString(), taken: true },
    { medicationId: '1', timestamp: new Date().toISOString(), taken: false },
    { medicationId: '1', timestamp: new Date().toISOString(), taken: false },
    { medicationId: '1', timestamp: new Date().toISOString(), taken: false },
    { medicationId: '1', timestamp: new Date().toISOString(), taken: false },
  ]),
}));

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
