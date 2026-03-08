// ============================================================================
// CALENDAR SERVICE
// Unified service for appointments and events calendar data
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem } from './safeStorage';
import { generateUniqueId } from './idGenerator';
import { Appointment, CalendarEvent, CalendarItem, AppointmentType, ReminderTime } from '../types/calendar';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { logError } from './devLog';
import { StorageKeys } from './storageKeys';

const APPOINTMENTS_KEY = StorageKeys.APPOINTMENTS_V2;
const EVENTS_KEY = StorageKeys.CALENDAR_EVENTS;

// ============================================================================
// APPOINTMENT OPERATIONS
// ============================================================================

export interface CreateAppointmentInput {
  type: AppointmentType;
  providerName: string;
  title?: string;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  location?: string;
  notes?: string;
  reminderEnabled: boolean;
  reminderTimes: ReminderTime[];
  status: 'upcoming' | 'completed' | 'cancelled';
}

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const now = new Date().toISOString();
  const appointment: Appointment = {
    id: generateUniqueId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  const appointments = await getAppointments();
  appointments.push(appointment);
  await safeSetItem(APPOINTMENTS_KEY, appointments);

  return appointment;
}

export async function getAppointments(): Promise<Appointment[]> {
  try {
    return await safeGetItem<Appointment[]>(APPOINTMENTS_KEY, []);
  } catch (error) {
    logError('calendarService.getAppointments', error);
    return [];
  }
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const appointments = await getAppointments();
  return appointments.find(a => a.id === id) || null;
}

export async function updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
  const appointments = await getAppointments();
  const index = appointments.findIndex(a => a.id === id);

  if (index === -1) return null;

  appointments[index] = {
    ...appointments[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await safeSetItem(APPOINTMENTS_KEY, appointments);
  return appointments[index];
}

export async function deleteAppointment(id: string): Promise<boolean> {
  const appointments = await getAppointments();
  const filtered = appointments.filter(a => a.id !== id);

  if (filtered.length === appointments.length) return false;

  await safeSetItem(APPOINTMENTS_KEY, filtered);
  return true;
}

// ============================================================================
// EVENT OPERATIONS
// ============================================================================

export interface CreateEventInput {
  title: string;
  date: string; // yyyy-MM-dd
  time?: string; // HH:mm (optional for all-day events)
  endTime?: string; // HH:mm (optional)
  location?: string;
  notes?: string;
  reminderEnabled: boolean;
  reminderTimes: ReminderTime[];
  status: 'upcoming' | 'completed' | 'cancelled';
}

export async function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  const now = new Date().toISOString();
  const event: CalendarEvent = {
    id: generateUniqueId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  const events = await getEvents();
  events.push(event);
  await safeSetItem(EVENTS_KEY, events);

  return event;
}

export async function getEvents(): Promise<CalendarEvent[]> {
  try {
    return await safeGetItem<CalendarEvent[]>(EVENTS_KEY, []);
  } catch (error) {
    logError('calendarService.getEvents', error);
    return [];
  }
}

export async function getEvent(id: string): Promise<CalendarEvent | null> {
  const events = await getEvents();
  return events.find(e => e.id === id) || null;
}

export async function updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
  const events = await getEvents();
  const index = events.findIndex(e => e.id === id);

  if (index === -1) return null;

  events[index] = {
    ...events[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await safeSetItem(EVENTS_KEY, events);
  return events[index];
}

export async function deleteEvent(id: string): Promise<boolean> {
  const events = await getEvents();
  const filtered = events.filter(e => e.id !== id);

  if (filtered.length === events.length) return false;

  await safeSetItem(EVENTS_KEY, filtered);
  return true;
}

// ============================================================================
// COMBINED CALENDAR OPERATIONS
// ============================================================================

export async function getCalendarItems(startDate: Date, endDate: Date): Promise<CalendarItem[]> {
  const [appointments, events] = await Promise.all([
    getAppointments(),
    getEvents(),
  ]);

  const start = startOfDay(startDate);
  const end = endOfDay(endDate);

  const appointmentItems: CalendarItem[] = appointments
    .filter(a => {
      const date = parseISO(a.date);
      return isWithinInterval(date, { start, end }) && a.status !== 'cancelled';
    })
    .map(a => ({ type: 'appointment' as const, data: a }));

  const eventItems: CalendarItem[] = events
    .filter(e => {
      const date = parseISO(e.date);
      return isWithinInterval(date, { start, end }) && e.status !== 'cancelled';
    })
    .map(e => ({ type: 'event' as const, data: e }));

  return [...appointmentItems, ...eventItems];
}

export async function getCalendarItemsForDate(date: Date): Promise<CalendarItem[]> {
  const dateStr = format(date, 'yyyy-MM-dd');
  const [appointments, events] = await Promise.all([
    getAppointments(),
    getEvents(),
  ]);

  const appointmentItems: CalendarItem[] = appointments
    .filter(a => a.date === dateStr && a.status !== 'cancelled')
    .map(a => ({ type: 'appointment' as const, data: a }));

  const eventItems: CalendarItem[] = events
    .filter(e => e.date === dateStr && e.status !== 'cancelled')
    .map(e => ({ type: 'event' as const, data: e }));

  // Sort by time
  const allItems = [...appointmentItems, ...eventItems];
  allItems.sort((a, b) => {
    const timeA = a.type === 'appointment' ? a.data.time : a.data.time || '23:59';
    const timeB = b.type === 'appointment' ? b.data.time : b.data.time || '23:59';
    return timeA.localeCompare(timeB);
  });

  return allItems;
}

export async function getUpcomingAppointments(limit?: number): Promise<Appointment[]> {
  const appointments = await getAppointments();
  const now = new Date();

  const upcoming = appointments
    .filter(a => a.status === 'upcoming')
    .filter(a => parseISO(a.date) >= now)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

  return limit ? upcoming.slice(0, limit) : upcoming;
}
