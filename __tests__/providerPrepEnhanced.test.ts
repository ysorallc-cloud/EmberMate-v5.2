import {
  generateChangesSinceLastVisit,
  generateDoctorQuestions,
  ChangesSummary,
} from '../utils/providerPrepBuilder';
import * as eventRepo from '../storage/eventRepo';

jest.mock('../storage/eventRepo');
jest.mock('../utils/devLog', () => ({ logError: jest.fn() }));
jest.mock('../utils/safeStorage', () => ({
  safeGetItem: jest.fn().mockResolvedValue([]),
  safeSetItem: jest.fn().mockResolvedValue(true),
}));

describe('Visit Prep Enhancements', () => {
  describe('generateChangesSinceLastVisit', () => {
    test('counts missed medications correctly', async () => {
      (eventRepo.getEventsByDateRange as jest.Mock).mockResolvedValue([
        { type: 'medication_taken', timestamp: '2026-03-01T08:00:00Z', metadata: {} },
        { type: 'medication_taken', timestamp: '2026-03-02T08:00:00Z', metadata: {} },
        { type: 'medication_skipped', timestamp: '2026-03-03T08:00:00Z', metadata: {} },
        { type: 'medication_skipped', timestamp: '2026-03-04T08:00:00Z', metadata: {} },
      ]);

      const result = await generateChangesSinceLastVisit('2026-03-01');
      expect(result.medicationsMissed).toBe(2);
      expect(result.medicationsTaken).toBe(2);
      expect(result.adherenceRate).toBe(50);
    });

    test('returns null adherence when no med events', async () => {
      (eventRepo.getEventsByDateRange as jest.Mock).mockResolvedValue([]);
      const result = await generateChangesSinceLastVisit('2026-03-01');
      expect(result.adherenceRate).toBeNull();
    });

    test('counts symptom occurrences', async () => {
      (eventRepo.getEventsByDateRange as jest.Mock).mockResolvedValue([
        { type: 'symptom_reported', timestamp: '2026-03-01T08:00:00Z', metadata: { symptomName: 'Headache' } },
        { type: 'symptom_reported', timestamp: '2026-03-02T08:00:00Z', metadata: { symptomName: 'Headache' } },
        { type: 'symptom_reported', timestamp: '2026-03-03T08:00:00Z', metadata: { symptomName: 'Fatigue' } },
      ]);

      const result = await generateChangesSinceLastVisit('2026-03-01');
      expect(result.symptomCounts).toContainEqual({ name: 'Headache', count: 2 });
      expect(result.symptomCounts).toContainEqual({ name: 'Fatigue', count: 1 });
    });
  });

  describe('generateDoctorQuestions', () => {
    test('generates adherence question when rate is low', () => {
      const changes: ChangesSummary = {
        periodStart: '2026-03-01',
        periodEnd: '2026-03-08',
        daysInPeriod: 7,
        medicationsMissed: 5,
        medicationsTaken: 9,
        adherenceRate: 64,
        lowHydrationDays: 1,
        symptomCounts: [],
        vitalsAlerts: [],
        newSymptoms: [],
        totalEvents: 14,
      };

      const questions = generateDoctorQuestions(changes);
      const adherenceQ = questions.find(q => q.id === 'q-med-adherence');
      expect(adherenceQ).toBeDefined();
      expect(adherenceQ!.priority).toBe('high');
      expect(adherenceQ!.selected).toBe(true);
    });

    test('generates symptom question for recurring symptoms', () => {
      const changes: ChangesSummary = {
        periodStart: '2026-03-01',
        periodEnd: '2026-03-08',
        daysInPeriod: 7,
        medicationsMissed: 0,
        medicationsTaken: 14,
        adherenceRate: 100,
        lowHydrationDays: 0,
        symptomCounts: [{ name: 'Headache', count: 5 }],
        vitalsAlerts: [],
        newSymptoms: [],
        totalEvents: 19,
      };

      const questions = generateDoctorQuestions(changes);
      const symptomQ = questions.find(q => q.id.startsWith('q-symptom'));
      expect(symptomQ).toBeDefined();
      expect(symptomQ!.question).toContain('headache');
    });

    test('returns fallback question when no issues found', () => {
      const changes: ChangesSummary = {
        periodStart: '2026-03-01',
        periodEnd: '2026-03-08',
        daysInPeriod: 7,
        medicationsMissed: 0,
        medicationsTaken: 14,
        adherenceRate: 100,
        lowHydrationDays: 0,
        symptomCounts: [],
        vitalsAlerts: [],
        newSymptoms: [],
        totalEvents: 14,
      };

      const questions = generateDoctorQuestions(changes);
      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0].id).toBe('q-all-good');
    });
  });
});
