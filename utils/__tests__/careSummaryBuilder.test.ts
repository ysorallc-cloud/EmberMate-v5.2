// ============================================================================
// CARE SUMMARY BUILDER — TESTS
// Tests for buildTodaySummary with mocked dependencies
// ============================================================================

import { buildTodaySummary, TodaySummary } from '../careSummaryBuilder';
import { getMorningWellness, getEveningWellness } from '../wellnessCheckStorage';
import { getUpcomingAppointments } from '../appointmentStorage';
import { getTodayVitalsLog, getMealsLogs } from '../centralStorage';
import { ensureDailyInstances, getTodayDateString } from '../../services/carePlanGenerator';

jest.mock('../wellnessCheckStorage');
jest.mock('../appointmentStorage');
jest.mock('../centralStorage');
jest.mock('../../services/carePlanGenerator');

const mockGetMorningWellness = getMorningWellness as jest.Mock;
const mockGetEveningWellness = getEveningWellness as jest.Mock;
const mockGetUpcomingAppointments = getUpcomingAppointments as jest.Mock;
const mockGetTodayVitalsLog = getTodayVitalsLog as jest.Mock;
const mockGetMealsLogs = getMealsLogs as jest.Mock;
const mockEnsureDailyInstances = ensureDailyInstances as jest.Mock;
const mockGetTodayDateString = getTodayDateString as jest.Mock;

function setupDefaults() {
  mockGetTodayDateString.mockReturnValue('2025-01-15');
  mockEnsureDailyInstances.mockResolvedValue([]);
  mockGetMorningWellness.mockResolvedValue(null);
  mockGetEveningWellness.mockResolvedValue(null);
  mockGetUpcomingAppointments.mockResolvedValue([]);
  mockGetTodayVitalsLog.mockResolvedValue(null);
  mockGetMealsLogs.mockResolvedValue([]);
}

describe('careSummaryBuilder — buildTodaySummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
    setupDefaults();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // MEDICATION ADHERENCE (from DailyCareInstances)
  // ==========================================================================

  describe('medsAdherence', () => {
    it('should count taken vs total medication instances', async () => {
      mockEnsureDailyInstances.mockResolvedValue([
        { id: '1', itemType: 'medication', itemName: 'Aspirin', status: 'completed', scheduledTime: '2025-01-15T08:00:00.000Z' },
        { id: '2', itemType: 'medication', itemName: 'Lisinopril', status: 'pending', scheduledTime: '2025-01-15T08:00:00.000Z' },
        { id: '3', itemType: 'medication', itemName: 'Metformin', status: 'completed', scheduledTime: '2025-01-15T12:00:00.000Z' },
        { id: '4', itemType: 'medication', itemName: 'Warfarin', status: 'pending', scheduledTime: '2025-01-15T18:00:00.000Z' },
        { id: '5', itemType: 'medication', itemName: 'Vitamin D', status: 'completed', scheduledTime: '2025-01-15T08:00:00.000Z' },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.medsAdherence.taken).toBe(3);
      expect(summary.medsAdherence.total).toBe(5);
    });

    it('should return 0/0 when no medication instances', async () => {
      mockEnsureDailyInstances.mockResolvedValue([]);

      const summary = await buildTodaySummary();
      expect(summary.medsAdherence.taken).toBe(0);
      expect(summary.medsAdherence.total).toBe(0);
    });

    it('should exclude non-medication instances from med count', async () => {
      mockEnsureDailyInstances.mockResolvedValue([
        { id: '1', itemType: 'medication', itemName: 'Aspirin', status: 'completed', scheduledTime: '2025-01-15T08:00:00.000Z' },
        { id: '2', itemType: 'vitals', itemName: 'Blood Pressure', status: 'completed', scheduledTime: '2025-01-15T08:00:00.000Z' },
        { id: '3', itemType: 'mood', itemName: 'Mood Check', status: 'pending', scheduledTime: '2025-01-15T12:00:00.000Z' },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.medsAdherence.total).toBe(1);
      expect(summary.medsAdherence.taken).toBe(1);
    });
  });

  // ==========================================================================
  // ORIENTATION / PAIN / ALERTNESS / APPETITE
  // ==========================================================================

  describe('orientation from morning wellness', () => {
    it('should map orientation value to label', async () => {
      mockGetMorningWellness.mockResolvedValue({
        orientation: 'confused-responsive',
      });

      const summary = await buildTodaySummary();
      expect(summary.orientation).toBe('Confused but Responsive');
    });

    it('should return null when no morning wellness', async () => {
      const summary = await buildTodaySummary();
      expect(summary.orientation).toBeNull();
    });
  });

  describe('painLevel from evening wellness', () => {
    it('should map pain value to label', async () => {
      mockGetEveningWellness.mockResolvedValue({
        painLevel: 'severe',
      });

      const summary = await buildTodaySummary();
      expect(summary.painLevel).toBe('Severe');
    });

    it('should return null when no evening wellness', async () => {
      const summary = await buildTodaySummary();
      expect(summary.painLevel).toBeNull();
    });
  });

  describe('alertness from evening wellness', () => {
    it('should map alertness value to label', async () => {
      mockGetEveningWellness.mockResolvedValue({
        alertness: 'drowsy',
      });

      const summary = await buildTodaySummary();
      expect(summary.alertness).toBe('Drowsy');
    });
  });

  describe('appetite from last centralStorage meal', () => {
    it('should use appetite from the most recent meal log today', async () => {
      mockGetMealsLogs.mockResolvedValue([
        { id: '1', timestamp: '2025-01-15T12:00:00.000Z', meals: ['Lunch'], appetite: 'poor' },
        { id: '2', timestamp: '2025-01-15T08:00:00.000Z', meals: ['Breakfast'], appetite: 'good' },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.appetite).toBe('Poor'); // first in list (newest first)
    });

    it('should return null when no meals logged', async () => {
      const summary = await buildTodaySummary();
      expect(summary.appetite).toBeNull();
    });
  });

  // ==========================================================================
  // NEXT APPOINTMENT
  // ==========================================================================

  describe('nextAppointment', () => {
    it('should include next upcoming appointment', async () => {
      mockGetUpcomingAppointments.mockResolvedValue([
        { provider: 'Dr. Smith', specialty: 'Cardiology', date: '2025-01-20' },
        { provider: 'Dr. Jones', specialty: 'Neurology', date: '2025-02-01' },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.nextAppointment).toEqual({
        provider: 'Dr. Smith',
        specialty: 'Cardiology',
        date: '2025-01-20',
      });
    });

    it('should return null when no upcoming appointments', async () => {
      const summary = await buildTodaySummary();
      expect(summary.nextAppointment).toBeNull();
    });
  });

  // ==========================================================================
  // FLAGGED ITEMS
  // ==========================================================================

  describe('flaggedItems', () => {
    it('should flag unlogged medications', async () => {
      mockEnsureDailyInstances.mockResolvedValue([
        { id: '1', itemType: 'medication', itemName: 'Aspirin', status: 'pending', scheduledTime: '2025-01-15T08:00:00.000Z' },
        { id: '2', itemType: 'medication', itemName: 'Lisinopril', status: 'pending', scheduledTime: '2025-01-15T08:00:00.000Z' },
        { id: '3', itemType: 'medication', itemName: 'Metformin', status: 'completed', scheduledTime: '2025-01-15T08:00:00.000Z' },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.flaggedItems).toContain('2 meds not logged');
    });

    it('should flag confused/disoriented/unresponsive orientation', async () => {
      mockGetMorningWellness.mockResolvedValue({
        orientation: 'disoriented',
      });

      const summary = await buildTodaySummary();
      expect(summary.flaggedItems).toContain('Disoriented');
    });

    it('should flag severe pain', async () => {
      mockGetEveningWellness.mockResolvedValue({
        painLevel: 'severe',
      });

      const summary = await buildTodaySummary();
      expect(summary.flaggedItems).toContain('Severe pain reported');
    });

    it('should flag poor or refused appetite', async () => {
      mockGetMealsLogs.mockResolvedValue([
        { id: '1', timestamp: '2025-01-15T12:00:00.000Z', meals: ['Lunch'], appetite: 'refused' },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.flaggedItems).toContain('Poor appetite');
    });

    it('should flag all issues when all are present', async () => {
      mockEnsureDailyInstances.mockResolvedValue([
        { id: '1', itemType: 'medication', itemName: 'Aspirin', status: 'pending', scheduledTime: '2025-01-15T08:00:00.000Z' },
      ]);
      mockGetMorningWellness.mockResolvedValue({
        orientation: 'confused-responsive',
      });
      mockGetEveningWellness.mockResolvedValue({
        painLevel: 'severe',
      });
      mockGetMealsLogs.mockResolvedValue([
        { id: '1', timestamp: '2025-01-15T12:00:00.000Z', meals: ['Lunch'], appetite: 'poor' },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.flaggedItems).toHaveLength(4);
      expect(summary.flaggedItems).toContain('1 med not logged');
      expect(summary.flaggedItems).toContain('Confused but Responsive');
      expect(summary.flaggedItems).toContain('Severe pain reported');
      expect(summary.flaggedItems).toContain('Poor appetite');
    });

    it('should have empty flaggedItems when everything is normal', async () => {
      mockEnsureDailyInstances.mockResolvedValue([
        { id: '1', itemType: 'medication', itemName: 'Aspirin', status: 'completed', scheduledTime: '2025-01-15T08:00:00.000Z' },
      ]);
      mockGetMorningWellness.mockResolvedValue({
        orientation: 'alert-oriented',
      });
      mockGetEveningWellness.mockResolvedValue({
        painLevel: 'mild',
      });
      mockGetMealsLogs.mockResolvedValue([
        { id: '1', timestamp: '2025-01-15T12:00:00.000Z', meals: ['Lunch'], appetite: 'good' },
      ]);

      const summary = await buildTodaySummary();
      expect(summary.flaggedItems).toEqual([]);
    });
  });
});
