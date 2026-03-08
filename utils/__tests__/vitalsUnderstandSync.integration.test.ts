// ============================================================================
// VITALS → UNDERSTAND SYNC INTEGRATION TEST
// Flow: Log vitals → verify centralStorage returns them correctly
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveVitalsLog,
  getTodayVitalsLog,
  getTodayLogStatus,
} from '../centralStorage';

describe('Vitals → Understand Sync Integration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
    // Clear all vitals storage
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should save and retrieve vitals log', async () => {
    // Step 1: Save vitals via centralStorage
    await saveVitalsLog({
      timestamp: new Date().toISOString(),
      systolic: 120,
      diastolic: 80,
      heartRate: 72,
      temperature: 98.6,
    });

    // Step 2: Read back via getTodayVitalsLog
    const vitals = await getTodayVitalsLog();
    expect(vitals).not.toBeNull();
    expect(vitals!.systolic).toBe(120);
    expect(vitals!.diastolic).toBe(80);
    expect(vitals!.heartRate).toBe(72);
    expect(vitals!.temperature).toBe(98.6);
  });

  it('should reflect vitals in today log status', async () => {
    // Step 1: Check initial status — vitals should not be logged
    const initialStatus = await getTodayLogStatus();
    expect(initialStatus.vitals).toBe(false);

    // Step 2: Save vitals
    await saveVitalsLog({
      timestamp: new Date().toISOString(),
      systolic: 130,
      diastolic: 85,
      heartRate: 68,
    });

    // Step 3: Verify getTodayLogStatus reflects vitals
    const updatedStatus = await getTodayLogStatus();
    expect(updatedStatus.vitals).toBe(true);
  });

  it('should return data shape compatible with Understand page', async () => {
    // Save complete vitals
    await saveVitalsLog({
      timestamp: new Date().toISOString(),
      systolic: 118,
      diastolic: 78,
      heartRate: 70,
      temperature: 98.4,
    });

    const vitals = await getTodayVitalsLog();
    expect(vitals).toBeDefined();

    // Verify data shape has the fields Understand page expects
    expect(vitals).toHaveProperty('id');
    expect(vitals).toHaveProperty('timestamp');
    expect(vitals).toHaveProperty('systolic');
    expect(vitals).toHaveProperty('diastolic');
    expect(vitals).toHaveProperty('heartRate');
    expect(typeof vitals!.systolic).toBe('number');
    expect(typeof vitals!.diastolic).toBe('number');
    expect(typeof vitals!.heartRate).toBe('number');
  });

  it('should handle partial vitals gracefully', async () => {
    // Save only blood pressure (no heart rate or temp)
    await saveVitalsLog({
      timestamp: new Date().toISOString(),
      systolic: 125,
      diastolic: 82,
    });

    const vitals = await getTodayVitalsLog();
    expect(vitals).not.toBeNull();
    expect(vitals!.systolic).toBe(125);
    expect(vitals!.diastolic).toBe(82);
    // Heart rate and temperature should be undefined or null
    expect(vitals!.heartRate).toBeUndefined();
  });
});
