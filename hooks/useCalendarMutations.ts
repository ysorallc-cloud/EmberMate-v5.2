// ============================================================================
// USE CALENDAR MUTATIONS HOOK
// React hook for creating/updating/deleting calendar items
// ============================================================================

import { useState } from 'react';
import { Appointment, CalendarEvent } from '../types/calendar';
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
  createEvent,
  updateEvent,
  deleteEvent,
  CreateAppointmentInput,
  CreateEventInput,
} from '../utils/calendarService';

export function useCalendarMutations() {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Appointments
  const handleCreateAppointment = async (input: CreateAppointmentInput): Promise<Appointment> => {
    setIsCreating(true);
    try {
      const appointment = await createAppointment(input);
      return appointment;
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateAppointment = async (id: string, updates: Partial<Appointment>): Promise<Appointment | null> => {
    setIsUpdating(true);
    try {
      const appointment = await updateAppointment(id, updates);
      return appointment;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAppointment = async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    try {
      const success = await deleteAppointment(id);
      return success;
    } finally {
      setIsDeleting(false);
    }
  };

  // Events
  const handleCreateEvent = async (input: CreateEventInput): Promise<CalendarEvent> => {
    setIsCreating(true);
    try {
      const event = await createEvent(input);
      return event;
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateEvent = async (id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> => {
    setIsUpdating(true);
    try {
      const event = await updateEvent(id, updates);
      return event;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteEvent = async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    try {
      const success = await deleteEvent(id);
      return success;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    // Appointments
    createAppointment: handleCreateAppointment,
    updateAppointment: handleUpdateAppointment,
    deleteAppointment: handleDeleteAppointment,
    // Events
    createEvent: handleCreateEvent,
    updateEvent: handleUpdateEvent,
    deleteEvent: handleDeleteEvent,
    // States
    isCreating,
    isUpdating,
    isDeleting,
  };
}
