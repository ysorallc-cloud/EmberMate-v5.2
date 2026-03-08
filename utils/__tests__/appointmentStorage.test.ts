// ============================================================================
// APPOINTMENT STORAGE UNIT TESTS
// Tests for CRUD operations, filtering, and scheduling utilities
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAppointments,
  getAppointment,
  getUpcomingAppointments,
  getAppointmentsByDate,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  completeAppointment,
  deleteAppointment,
  getDaysUntil,
  getNextAppointment,
  countUpcomingAppointments,
  Appointment,
} from '../appointmentStorage';

const APPOINTMENTS_KEY = '@embermate_appointments';

// Helper to create a basic appointment object
function createTestAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'test-appt-1',
    provider: 'Dr. Test',
    specialty: 'General',
    date: '2025-01-20T14:00:00.000Z',
    time: '14:00',
    location: 'Test Clinic',
    hasBrief: false,
    completed: false,
    cancelled: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AppointmentStorage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
    await AsyncStorage.setItem('@embermate_onboarding_complete', 'true');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================================
  // CRUD Operations Tests
  // ============================================================================
  describe('getAppointments', () => {
    it('should return empty array when no appointments exist', async () => {
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([]));
      const result = await getAppointments();
      expect(result).toEqual([]);
    });

    it('should return stored appointments', async () => {
      const testAppts = [createTestAppointment({ provider: 'Dr. Chen' })];
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(testAppts));

      const result = await getAppointments();

      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('Dr. Chen');
    });
  });

  describe('getAppointment', () => {
    it('should return specific appointment by ID', async () => {
      const testAppts = [
        createTestAppointment({ id: 'appt-1', provider: 'Dr. Smith' }),
        createTestAppointment({ id: 'appt-2', provider: 'Dr. Jones' }),
      ];
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(testAppts));

      const result = await getAppointment('appt-2');

      expect(result).not.toBeNull();
      expect(result!.provider).toBe('Dr. Jones');
    });

    it('should return null for non-existent appointment', async () => {
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([]));
      const result = await getAppointment('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('createAppointment', () => {
    beforeEach(async () => {
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([]));
    });

    it('should create appointment with generated ID', async () => {
      const newAppt = {
        provider: 'Dr. New',
        specialty: 'Cardiology',
        date: '2025-01-25T10:00:00.000Z',
        time: '10:00',
        location: 'Heart Center',
        hasBrief: false,
        completed: false,
        cancelled: false,
      };

      const result = await createAppointment(newAppt);

      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.provider).toBe('Dr. New');
    });

    it('should add appointment to storage', async () => {
      const newAppt = {
        provider: 'Dr. Added',
        specialty: 'Primary Care',
        date: '2025-01-25T10:00:00.000Z',
        time: '10:00',
        location: 'Clinic',
        hasBrief: false,
        completed: false,
        cancelled: false,
      };

      await createAppointment(newAppt);
      const allAppts = await getAppointments();

      expect(allAppts).toHaveLength(1);
      expect(allAppts[0].provider).toBe('Dr. Added');
    });
  });

  describe('updateAppointment', () => {
    it('should update appointment properties', async () => {
      const testAppts = [createTestAppointment({ id: 'update-appt' })];
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(testAppts));

      const result = await updateAppointment('update-appt', {
        location: 'New Location',
        notes: 'Updated notes',
      });

      expect(result).not.toBeNull();
      expect(result!.location).toBe('New Location');
      expect(result!.notes).toBe('Updated notes');
    });

    it('should return null for non-existent appointment', async () => {
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([]));
      const result = await updateAppointment('nonexistent', { notes: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('cancelAppointment', () => {
    it('should mark appointment as cancelled', async () => {
      const testAppts = [createTestAppointment({ id: 'cancel-appt' })];
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(testAppts));

      const result = await cancelAppointment('cancel-appt');

      expect(result).toBe(true);
      const appt = await getAppointment('cancel-appt');
      expect(appt!.cancelled).toBe(true);
    });
  });

  describe('completeAppointment', () => {
    it('should mark appointment as completed', async () => {
      const testAppts = [createTestAppointment({ id: 'complete-appt' })];
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(testAppts));

      const result = await completeAppointment('complete-appt');

      expect(result).toBe(true);
      const appt = await getAppointment('complete-appt');
      expect(appt!.completed).toBe(true);
    });
  });

  describe('deleteAppointment', () => {
    it('should remove appointment from storage', async () => {
      const testAppts = [
        createTestAppointment({ id: 'delete-appt' }),
        createTestAppointment({ id: 'keep-appt' }),
      ];
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(testAppts));

      const result = await deleteAppointment('delete-appt');

      expect(result).toBe(true);
      const allAppts = await getAppointments();
      expect(allAppts).toHaveLength(1);
      expect(allAppts[0].id).toBe('keep-appt');
    });

    it('should return false if appointment does not exist', async () => {
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([]));
      const result = await deleteAppointment('nonexistent');
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Filtering Tests
  // ============================================================================
  describe('getUpcomingAppointments', () => {
    it('should return only future, non-cancelled, non-completed appointments', async () => {
      const testAppts = [
        createTestAppointment({ id: 'future', date: '2025-01-20T10:00:00.000Z' }),
        createTestAppointment({ id: 'past', date: '2025-01-10T10:00:00.000Z' }),
        createTestAppointment({ id: 'cancelled', date: '2025-01-22T10:00:00.000Z', cancelled: true }),
        createTestAppointment({ id: 'completed', date: '2025-01-23T10:00:00.000Z', completed: true }),
      ];
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(testAppts));

      const result = await getUpcomingAppointments();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('future');
    });

    it('should sort by date ascending', async () => {
      const testAppts = [
        createTestAppointment({ id: 'later', date: '2025-01-25T10:00:00.000Z' }),
        createTestAppointment({ id: 'sooner', date: '2025-01-18T10:00:00.000Z' }),
        createTestAppointment({ id: 'soonest', date: '2025-01-16T10:00:00.000Z' }),
      ];
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(testAppts));

      const result = await getUpcomingAppointments();

      expect(result[0].id).toBe('soonest');
      expect(result[1].id).toBe('sooner');
      expect(result[2].id).toBe('later');
    });
  });

  describe('getAppointmentsByDate', () => {
    it('should return appointments for specific date', async () => {
      const testAppts = [
        createTestAppointment({ id: 'jan20-1', date: '2025-01-20T10:00:00.000Z' }),
        createTestAppointment({ id: 'jan20-2', date: '2025-01-20T14:00:00.000Z' }),
        createTestAppointment({ id: 'jan21', date: '2025-01-21T10:00:00.000Z' }),
      ];
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(testAppts));

      const result = await getAppointmentsByDate(new Date('2025-01-20'));

      expect(result).toHaveLength(2);
      expect(result.map(a => a.id)).toContain('jan20-1');
      expect(result.map(a => a.id)).toContain('jan20-2');
    });

    it('should exclude cancelled appointments', async () => {
      const testAppts = [
        createTestAppointment({ id: 'active', date: '2025-01-20T10:00:00.000Z' }),
        createTestAppointment({ id: 'cancelled', date: '2025-01-20T14:00:00.000Z', cancelled: true }),
      ];
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(testAppts));

      const result = await getAppointmentsByDate(new Date('2025-01-20'));

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('active');
    });
  });

  // ============================================================================
  // Utility Functions Tests
  // ============================================================================
  describe('getDaysUntil', () => {
    it('should calculate days until future appointment', () => {
      const appt = createTestAppointment({ date: '2025-01-20T10:00:00.000Z' });

      const result = getDaysUntil(appt);

      // From Jan 15 to Jan 20 = 5 days
      expect(result).toBe(5);
    });

    it('should return negative for past appointment', () => {
      const appt = createTestAppointment({ date: '2025-01-10T10:00:00.000Z' });

      const result = getDaysUntil(appt);

      expect(result).toBeLessThan(0);
    });
  });

  describe('getNextAppointment', () => {
    it('should return the soonest upcoming appointment', async () => {
      const testAppts = [
        createTestAppointment({ id: 'later', date: '2025-01-25T10:00:00.000Z' }),
        createTestAppointment({ id: 'soonest', date: '2025-01-16T10:00:00.000Z' }),
        createTestAppointment({ id: 'sooner', date: '2025-01-20T10:00:00.000Z' }),
      ];
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(testAppts));

      const result = await getNextAppointment();

      expect(result).not.toBeNull();
      expect(result!.id).toBe('soonest');
    });

    it('should return null when no upcoming appointments', async () => {
      const testAppts = [
        createTestAppointment({ id: 'past', date: '2025-01-10T10:00:00.000Z' }),
        createTestAppointment({ id: 'cancelled', date: '2025-01-20T10:00:00.000Z', cancelled: true }),
      ];
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(testAppts));

      const result = await getNextAppointment();

      expect(result).toBeNull();
    });
  });

  describe('countUpcomingAppointments', () => {
    it('should count only upcoming appointments', async () => {
      const testAppts = [
        createTestAppointment({ id: 'future1', date: '2025-01-20T10:00:00.000Z' }),
        createTestAppointment({ id: 'future2', date: '2025-01-25T10:00:00.000Z' }),
        createTestAppointment({ id: 'past', date: '2025-01-10T10:00:00.000Z' }),
        createTestAppointment({ id: 'cancelled', date: '2025-01-22T10:00:00.000Z', cancelled: true }),
      ];
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(testAppts));

      const result = await countUpcomingAppointments();

      expect(result).toBe(2);
    });

    it('should return 0 when no appointments', async () => {
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([]));
      const result = await countUpcomingAppointments();
      expect(result).toBe(0);
    });
  });
});
