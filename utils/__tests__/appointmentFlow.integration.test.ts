// ============================================================================
// APPOINTMENT FLOW INTEGRATION TESTS
// End-to-end tests for appointment management workflows
// ============================================================================

// Bypass encryption so tests can write/read plain JSON via AsyncStorage
jest.mock('../secureStorage', () => ({
  setSecureItem: async (key: string, value: any) => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  },
  getSecureItem: async (key: string, defaultValue?: any) => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return defaultValue;
    try { return JSON.parse(raw); } catch { return raw; }
  },
  removeSecureItem: async (key: string) => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.removeItem(key);
    return true;
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAppointments,
  createAppointment,
  completeAppointment,
  cancelAppointment,
  getUpcomingAppointments,
  getNextAppointment,
  getAppointmentsByDate,
  countUpcomingAppointments,
} from '../appointmentStorage';

const APPOINTMENTS_KEY = '@embermate_appointments';

describe('Appointment Flow Integration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
    await AsyncStorage.setItem('@embermate_onboarding_complete', 'true');
    await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([]));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================================
  // Flow 1: Create appointment -> Mark complete -> Verify status
  // ============================================================================
  describe('Create -> Complete -> Verify Status Flow', () => {
    it('should handle complete appointment lifecycle', async () => {
      // Step 1: Create a new appointment
      const appointment = await createAppointment({
        provider: 'Dr. Chen',
        specialty: 'Cardiology',
        date: '2025-01-20T14:00:00.000Z',
        time: '14:00',
        location: 'Valley Medical Center',
        hasBrief: false,
        completed: false,
        cancelled: false,
        notes: 'Blood pressure follow-up',
      });

      expect(appointment.id).toBeDefined();
      expect(appointment.provider).toBe('Dr. Chen');

      // Step 2: Verify appointment appears in upcoming list
      let upcoming = await getUpcomingAppointments();
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].id).toBe(appointment.id);

      // Step 3: Mark appointment as completed
      const completed = await completeAppointment(appointment.id);
      expect(completed).toBe(true);

      // Step 4: Verify it no longer appears in upcoming
      upcoming = await getUpcomingAppointments();
      expect(upcoming).toHaveLength(0);

      // Step 5: Verify it still exists in all appointments
      const allAppts = await getAppointments();
      expect(allAppts).toHaveLength(1);
      expect(allAppts[0].completed).toBe(true);
    });
  });

  // ============================================================================
  // Flow 2: Create appointment -> Cancel -> Verify filtering
  // ============================================================================
  describe('Create -> Cancel -> Verify Filtering Flow', () => {
    it('should properly filter cancelled appointments', async () => {
      // Step 1: Create multiple appointments
      const appt1 = await createAppointment({
        provider: 'Dr. Smith',
        specialty: 'Primary Care',
        date: '2025-01-18T10:00:00.000Z',
        time: '10:00',
        location: 'Family Clinic',
        hasBrief: false,
        completed: false,
        cancelled: false,
      });

      const appt2 = await createAppointment({
        provider: 'Dr. Jones',
        specialty: 'Dermatology',
        date: '2025-01-22T11:00:00.000Z',
        time: '11:00',
        location: 'Skin Care Center',
        hasBrief: false,
        completed: false,
        cancelled: false,
      });

      // Step 2: Verify both in upcoming
      let upcoming = await getUpcomingAppointments();
      expect(upcoming).toHaveLength(2);

      // Step 3: Cancel first appointment
      const cancelled = await cancelAppointment(appt1.id);
      expect(cancelled).toBe(true);

      // Step 4: Verify only uncancelled appointment in upcoming
      upcoming = await getUpcomingAppointments();
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].id).toBe(appt2.id);

      // Step 5: Verify cancelled appointment still exists with cancelled flag
      const allAppts = await getAppointments();
      expect(allAppts).toHaveLength(2);
      const cancelledAppt = allAppts.find(a => a.id === appt1.id);
      expect(cancelledAppt!.cancelled).toBe(true);

      // Step 6: Verify count reflects only active appointments
      const count = await countUpcomingAppointments();
      expect(count).toBe(1);
    });
  });

  // ============================================================================
  // Flow 3: Create multiple appointments -> Get upcoming -> Verify order
  // ============================================================================
  describe('Create Multiple -> Get Upcoming -> Verify Order Flow', () => {
    it('should correctly sort and filter upcoming appointments', async () => {
      // Step 1: Create appointments in random date order
      await createAppointment({
        provider: 'Dr. Latest',
        specialty: 'Orthopedics',
        date: '2025-02-15T09:00:00.000Z',
        time: '09:00',
        location: 'Bone & Joint Center',
        hasBrief: false,
        completed: false,
        cancelled: false,
      });

      await createAppointment({
        provider: 'Dr. Soonest',
        specialty: 'General',
        date: '2025-01-16T08:00:00.000Z',
        time: '08:00',
        location: 'Quick Care',
        hasBrief: false,
        completed: false,
        cancelled: false,
      });

      await createAppointment({
        provider: 'Dr. Middle',
        specialty: 'Neurology',
        date: '2025-01-25T14:00:00.000Z',
        time: '14:00',
        location: 'Brain Center',
        hasBrief: false,
        completed: false,
        cancelled: false,
      });

      // Add a past appointment (should be filtered out)
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([
        ...JSON.parse(await AsyncStorage.getItem(APPOINTMENTS_KEY) || '[]'),
        {
          id: 'past-appt',
          provider: 'Dr. Past',
          specialty: 'History',
          date: '2025-01-10T10:00:00.000Z',
          time: '10:00',
          location: 'Time Machine',
          hasBrief: false,
          completed: false,
          cancelled: false,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ]));

      // Step 2: Get upcoming appointments
      const upcoming = await getUpcomingAppointments();

      // Step 3: Verify correct count (excludes past appointment)
      expect(upcoming).toHaveLength(3);

      // Step 4: Verify correct order (soonest first)
      expect(upcoming[0].provider).toBe('Dr. Soonest');
      expect(upcoming[1].provider).toBe('Dr. Middle');
      expect(upcoming[2].provider).toBe('Dr. Latest');

      // Step 5: Verify getNextAppointment returns soonest
      const next = await getNextAppointment();
      expect(next).not.toBeNull();
      expect(next!.provider).toBe('Dr. Soonest');
    });
  });

  // ============================================================================
  // Flow 4: Schedule appointments -> Filter by date
  // ============================================================================
  describe('Schedule -> Filter by Date Flow', () => {
    it('should correctly filter appointments by specific date', async () => {
      // Step 1: Create appointments on different dates
      await createAppointment({
        provider: 'Dr. Morning',
        specialty: 'General',
        date: '2025-01-20T09:00:00.000Z',
        time: '09:00',
        location: 'Morning Clinic',
        hasBrief: false,
        completed: false,
        cancelled: false,
      });

      await createAppointment({
        provider: 'Dr. Afternoon',
        specialty: 'Specialist',
        date: '2025-01-20T15:00:00.000Z',
        time: '15:00',
        location: 'Afternoon Clinic',
        hasBrief: false,
        completed: false,
        cancelled: false,
      });

      await createAppointment({
        provider: 'Dr. NextDay',
        specialty: 'Other',
        date: '2025-01-21T10:00:00.000Z',
        time: '10:00',
        location: 'Tomorrow Clinic',
        hasBrief: false,
        completed: false,
        cancelled: false,
      });

      // Step 2: Filter by January 20
      const jan20Appts = await getAppointmentsByDate(new Date('2025-01-20'));

      // Step 3: Verify only Jan 20 appointments returned
      expect(jan20Appts).toHaveLength(2);
      expect(jan20Appts.map(a => a.provider)).toContain('Dr. Morning');
      expect(jan20Appts.map(a => a.provider)).toContain('Dr. Afternoon');

      // Step 4: Filter by January 21
      const jan21Appts = await getAppointmentsByDate(new Date('2025-01-21'));
      expect(jan21Appts).toHaveLength(1);
      expect(jan21Appts[0].provider).toBe('Dr. NextDay');

      // Step 5: Filter by date with no appointments
      const jan25Appts = await getAppointmentsByDate(new Date('2025-01-25'));
      expect(jan25Appts).toHaveLength(0);
    });
  });

  // ============================================================================
  // Flow 5: Comprehensive calendar management
  // ============================================================================
  describe('Comprehensive Calendar Management Flow', () => {
    it('should handle full appointment lifecycle with multiple states', async () => {
      // Create a week's worth of appointments
      const appt1 = await createAppointment({
        provider: 'Dr. Monday',
        specialty: 'General',
        date: '2025-01-20T10:00:00.000Z',
        time: '10:00',
        location: 'Clinic A',
        hasBrief: false,
        completed: false,
        cancelled: false,
      });

      const appt2 = await createAppointment({
        provider: 'Dr. Wednesday',
        specialty: 'Specialist',
        date: '2025-01-22T14:00:00.000Z',
        time: '14:00',
        location: 'Clinic B',
        hasBrief: true,
        completed: false,
        cancelled: false,
      });

      const appt3 = await createAppointment({
        provider: 'Dr. Friday',
        specialty: 'Follow-up',
        date: '2025-01-24T09:00:00.000Z',
        time: '09:00',
        location: 'Clinic C',
        hasBrief: false,
        completed: false,
        cancelled: false,
      });

      // Initial state: 3 upcoming appointments
      expect(await countUpcomingAppointments()).toBe(3);

      // Complete Monday appointment
      await completeAppointment(appt1.id);
      expect(await countUpcomingAppointments()).toBe(2);

      // Cancel Wednesday appointment
      await cancelAppointment(appt2.id);
      expect(await countUpcomingAppointments()).toBe(1);

      // Next appointment should be Friday
      const next = await getNextAppointment();
      expect(next!.provider).toBe('Dr. Friday');

      // Verify all appointments still exist
      const all = await getAppointments();
      expect(all).toHaveLength(3);

      // Verify states
      const mondayAppt = all.find(a => a.id === appt1.id);
      const wednesdayAppt = all.find(a => a.id === appt2.id);
      const fridayAppt = all.find(a => a.id === appt3.id);

      expect(mondayAppt!.completed).toBe(true);
      expect(mondayAppt!.cancelled).toBe(false);

      expect(wednesdayAppt!.completed).toBe(false);
      expect(wednesdayAppt!.cancelled).toBe(true);

      expect(fridayAppt!.completed).toBe(false);
      expect(fridayAppt!.cancelled).toBe(false);
    });
  });
});
