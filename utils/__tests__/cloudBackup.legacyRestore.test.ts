// =============================================================================
// Task 2.5: Verify legacy v1 backup format (from dataBackup.ts) can be
// restored after consolidation into cloudBackup.ts.
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  restoreLegacyBackup,
  isBackupEncrypted,
  getBackupPreview,
  BackupData,
} from '../cloudBackup';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Task 2.5: Legacy v1 backup restore', () => {
  const sampleBackup: BackupData = {
    version: '1.0.0',
    timestamp: '2025-06-15T12:00:00.000Z',
    data: {
      medications: [{ id: '1', name: 'Aspirin', dosage: '81mg' }],
      medicationLogs: [{ id: 'log1', medicationIds: ['1'], timestamp: '2025-06-15T08:00:00Z' }],
      appointments: [{ id: 'appt1', provider: 'Dr. Smith', date: '2025-07-01' }],
      patientInfo: {
        '@embermate_patient_name': 'Alice',
        '@embermate_patient_info': { age: 78 },
      },
      careTeam: [{ id: 'ct1', name: 'Sarah', role: 'Daughter' }],
      caregivers: [],
      settings: {
        '@embermate_theme': 'dark',
      },
    },
  };

  it('restores a plain v1.0.0 BackupData object to AsyncStorage', async () => {
    const success = await restoreLegacyBackup(sampleBackup);
    expect(success).toBe(true);

    // Verify medications were stored
    const meds = await AsyncStorage.getItem('@embermate_medications');
    expect(meds).not.toBeNull();
    expect(JSON.parse(meds!)).toEqual(sampleBackup.data.medications);

    // Verify appointments were stored
    const appts = await AsyncStorage.getItem('@embermate_appointments');
    expect(appts).not.toBeNull();
    expect(JSON.parse(appts!)).toEqual(sampleBackup.data.appointments);

    // Verify patient info keys
    const patientName = await AsyncStorage.getItem('@embermate_patient_name');
    expect(patientName).toBe(JSON.stringify('Alice'));

    // Verify careTeam
    const team = await AsyncStorage.getItem('@embermate_care_team');
    expect(team).not.toBeNull();
    expect(JSON.parse(team!)).toEqual(sampleBackup.data.careTeam);

    // Verify settings
    const theme = await AsyncStorage.getItem('@embermate_theme');
    expect(theme).toBe(JSON.stringify('dark'));
  });

  it('rejects invalid backup (missing version or data)', async () => {
    const bad = { timestamp: '2025-01-01' } as any;
    const success = await restoreLegacyBackup(bad);
    expect(success).toBe(false);
  });

  it('handles empty data sections gracefully', async () => {
    const minimal: BackupData = {
      version: '1.0.0',
      timestamp: '2025-01-01T00:00:00Z',
      data: {
        medications: [],
        medicationLogs: [],
        appointments: [],
        patientInfo: {},
        careTeam: [],
        caregivers: [],
        settings: {},
      },
    };
    const success = await restoreLegacyBackup(minimal);
    expect(success).toBe(true);
  });

  describe('isBackupEncrypted', () => {
    it('returns false for a plain v1 backup', () => {
      const content = JSON.stringify(sampleBackup);
      expect(isBackupEncrypted(content)).toBe(false);
    });

    it('returns true for an encrypted payload with salt and hmac', () => {
      const encrypted = JSON.stringify({ salt: 'abc', hmac: 'def', data: 'ghi' });
      expect(isBackupEncrypted(encrypted)).toBe(true);
    });

    it('returns true for a payload with encrypted flag', () => {
      const flagged = JSON.stringify({ ...sampleBackup, encrypted: true });
      expect(isBackupEncrypted(flagged)).toBe(true);
    });
  });

  describe('getBackupPreview', () => {
    it('returns preview for a plain v1 backup', () => {
      const content = JSON.stringify(sampleBackup);
      const preview = getBackupPreview(content);
      expect(preview).not.toBeNull();
      expect(preview!.encrypted).toBe(false);
      expect(preview!.version).toBe('1.0.0');
      expect(preview!.timestamp).toBe('2025-06-15T12:00:00.000Z');
    });

    it('returns null for invalid JSON', () => {
      expect(getBackupPreview('not json')).toBeNull();
    });
  });
});
