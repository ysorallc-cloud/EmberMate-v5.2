// ============================================================================
// HANDOFF DATA FLOW — INTEGRATION TESTS
// Sprint 1 data flows through to Sprint 2 handoff card via buildTodaySummary
// Uses real wellnessCheckStorage; mocks carePlanRepo, centralStorage, appointmentStorage
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildTodaySummary } from '../careSummaryBuilder';
import { getUpcomingAppointments } from '../appointmentStorage';
import { getTodayVitalsLog, getMealsLogs } from '../centralStorage';
import { ensureDailyInstances, getTodayDateString } from '../../services/carePlanGenerator';
import { saveMorningWellness, saveEveningWellness } from '../wellnessCheckStorage';
import { MorningWellnessData, EveningWellnessData } from '../../types/timeline';

// Mock modules that careSummaryBuilder imports (except wellnessCheckStorage — used real)
jest.mock('../appointmentStorage');
jest.mock('../centralStorage');
jest.mock('../../services/carePlanGenerator');

const mockGetUpcomingAppointments = getUpcomingAppointments as jest.Mock;
const mockGetTodayVitalsLog = getTodayVitalsLog as jest.Mock;
const mockGetMealsLogs = getMealsLogs as jest.Mock;
const mockEnsureDailyInstances = ensureDailyInstances as jest.Mock;
const mockGetTodayDateString = getTodayDateString as jest.Mock;

describe('handoffDataFlow — integration', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T14:00:00.000Z'));
    mockGetTodayDateString.mockReturnValue('2025-01-15');
    mockEnsureDailyInstances.mockResolvedValue([]);
    mockGetUpcomingAppointments.mockResolvedValue([]);
    mockGetTodayVitalsLog.mockResolvedValue(null);
    mockGetMealsLogs.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // Full day with concerns
  // ==========================================================================

  it('should aggregate a full day with multiple flags into buildTodaySummary', async () => {
    // Morning wellness: confused orientation
    const morningData: MorningWellnessData = {
      sleepQuality: 2,
      mood: 2,
      energyLevel: 2,
      orientation: 'confused-responsive',
      decisionMaking: 'needs-guidance',
      completedAt: new Date('2025-01-15T08:00:00.000Z'),
    };
    await saveMorningWellness('2025-01-15', morningData);

    // Evening wellness: severe pain
    const eveningData: EveningWellnessData = {
      mood: 2,
      mealsLogged: true,
      dayRating: 2,
      painLevel: 'severe',
      alertness: 'confused',
      bowelMovement: 'no',
      bathingStatus: 'full-assist',
      mobilityStatus: 'wheelchair',
      completedAt: new Date('2025-01-15T20:00:00.000Z'),
    };
    await saveEveningWellness('2025-01-15', eveningData);

    // 2 of 4 medication instances completed
    mockEnsureDailyInstances.mockResolvedValue([
      { id: '1', itemType: 'medication', itemName: 'Aspirin', status: 'completed', scheduledTime: '2025-01-15T08:00:00.000Z' },
      { id: '2', itemType: 'medication', itemName: 'Lisinopril', status: 'completed', scheduledTime: '2025-01-15T08:00:00.000Z' },
      { id: '3', itemType: 'medication', itemName: 'Metformin', status: 'pending', scheduledTime: '2025-01-15T08:00:00.000Z' },
      { id: '4', itemType: 'medication', itemName: 'Warfarin', status: 'pending', scheduledTime: '2025-01-15T08:00:00.000Z' },
    ]);

    // Meal with poor appetite from centralStorage
    mockGetMealsLogs.mockResolvedValue([
      { id: '1', timestamp: '2025-01-15T12:00:00.000Z', meals: ['Lunch'], appetite: 'poor' },
    ]);

    const summary = await buildTodaySummary();

    // Verify all fields populated
    expect(summary.medsAdherence).toEqual({ taken: 2, total: 4 });
    expect(summary.orientation).toBe('Confused but Responsive');
    expect(summary.painLevel).toBe('Severe');
    expect(summary.alertness).toBe('Confused');
    expect(summary.appetite).toBe('Poor');

    // Verify all 4 flags
    expect(summary.flaggedItems).toHaveLength(4);
    expect(summary.flaggedItems).toContain('2 meds not logged');
    expect(summary.flaggedItems).toContain('Confused but Responsive');
    expect(summary.flaggedItems).toContain('Severe pain reported');
    expect(summary.flaggedItems).toContain('Poor appetite');
  });

  // ==========================================================================
  // Clean day — no flags
  // ==========================================================================

  it('should produce empty flaggedItems on a clean day', async () => {
    // All meds completed
    mockEnsureDailyInstances.mockResolvedValue([
      { id: '1', itemType: 'medication', itemName: 'Aspirin', status: 'completed', scheduledTime: '2025-01-15T08:00:00.000Z' },
      { id: '2', itemType: 'medication', itemName: 'Lisinopril', status: 'completed', scheduledTime: '2025-01-15T08:00:00.000Z' },
    ]);

    // Normal morning
    const morningData: MorningWellnessData = {
      sleepQuality: 4,
      mood: 4,
      energyLevel: 4,
      orientation: 'alert-oriented',
      decisionMaking: 'own-decisions',
      completedAt: new Date('2025-01-15T08:00:00.000Z'),
    };
    await saveMorningWellness('2025-01-15', morningData);

    // Good meal
    mockGetMealsLogs.mockResolvedValue([
      { id: '1', timestamp: '2025-01-15T12:00:00.000Z', meals: ['Lunch'], appetite: 'good' },
    ]);

    // Normal evening
    const eveningData: EveningWellnessData = {
      mood: 4,
      mealsLogged: true,
      dayRating: 4,
      painLevel: 'none',
      alertness: 'alert',
      completedAt: new Date('2025-01-15T20:00:00.000Z'),
    };
    await saveEveningWellness('2025-01-15', eveningData);

    const summary = await buildTodaySummary();

    expect(summary.flaggedItems).toEqual([]);
    expect(summary.orientation).toBe('Alert & Oriented');
    expect(summary.painLevel).toBe('None');
    expect(summary.appetite).toBe('Good');
  });

  // ==========================================================================
  // Empty state — no data at all
  // ==========================================================================

  it('should return nulls and empty flags when no data exists', async () => {
    const summary = await buildTodaySummary();

    expect(summary.medsAdherence).toEqual({ taken: 0, total: 0 });
    expect(summary.orientation).toBeNull();
    expect(summary.painLevel).toBeNull();
    expect(summary.alertness).toBeNull();
    expect(summary.appetite).toBeNull();
    expect(summary.nextAppointment).toBeNull();
    expect(summary.flaggedItems).toEqual([]);
  });

  // ==========================================================================
  // Appointment data flows through
  // ==========================================================================

  it('should include next appointment in summary', async () => {
    mockGetUpcomingAppointments.mockResolvedValue([
      { provider: 'Dr. Chen', specialty: 'Cardiology', date: '2025-01-20' },
    ]);

    const summary = await buildTodaySummary();
    expect(summary.nextAppointment).toEqual({
      provider: 'Dr. Chen',
      specialty: 'Cardiology',
      date: '2025-01-20',
    });
  });
});
