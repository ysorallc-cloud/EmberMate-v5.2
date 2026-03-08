// ============================================================================
// COLLABORATIVE CARE UTILITIES
// Family sharing, activity feed, and care coordination
// ============================================================================

import { safeGetItem, safeSetItem } from './safeStorage';
import { getMedications, Medication } from './medicationStorage';
import { getAppointments, Appointment } from './appointmentStorage';
import { getCareTeam, CareTeamMember } from './careTeamStorage';
import { logError } from './devLog';
import { generateUniqueId } from './idGenerator';
import { StorageKeys } from './storageKeys';

// ============================================================================
// TYPES
// ============================================================================

export interface ShareInvite {
  id: string;
  code: string; // 6-digit code to share
  patientName: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
  usedBy?: string;
  permissions: SharePermissions;
}

export interface SharePermissions {
  canView: boolean;
  canEdit: boolean;
  canMarkMedications: boolean;
  canScheduleAppointments: boolean;
  canAddNotes: boolean;
  canExport: boolean;
}

export interface CareActivity {
  id: string;
  type: 'medication_taken' | 'medication_missed' | 'appointment_scheduled' | 
        'appointment_completed' | 'note_added' | 'vital_logged' | 'symptom_logged' |
        'photo_added' | 'caregiver_joined';
  performedBy: string; // User/caregiver name
  performedById: string; // User ID
  timestamp: string;
  details: any; // Activity-specific data
  patientName?: string;
}

export interface CareNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: string;
  priority: 'normal' | 'important' | 'urgent';
  category?: string;
  attachments?: string[]; // Photo IDs
  readBy: string[]; // Array of user IDs who have read it
}

export interface CaregiverProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'primary' | 'family' | 'professional' | 'friend' | 'healthcare';
  permissions: SharePermissions;
  joinedAt: string;
  lastActive?: string;
  avatarColor: string;
  invitedAt?: string;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const SHARE_INVITES_KEY = StorageKeys.SHARE_INVITES;
const CARE_ACTIVITIES_KEY = StorageKeys.CARE_ACTIVITIES;
const CARE_NOTES_KEY = StorageKeys.CARE_NOTES;
const CAREGIVERS_KEY = StorageKeys.CAREGIVERS;
const CURRENT_USER_KEY = StorageKeys.CURRENT_USER;

// ============================================================================
// SHARE INVITE SYSTEM
// ============================================================================

/**
 * Generate a share code for family/caregiver access
 */
export async function generateShareCode(
  patientName: string,
  createdBy: string,
  permissions: SharePermissions = getDefaultPermissions()
): Promise<ShareInvite> {
  try {
    const invites = await getShareInvites();
    
    const invite: ShareInvite = {
      id: generateUniqueId(),
      code: generateSixDigitCode(),
      patientName,
      createdBy,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      used: false,
      permissions,
    };
    
    invites.push(invite);
    await safeSetItem(SHARE_INVITES_KEY, invites);

    // Log activity
    await logActivity({
      type: 'caregiver_joined',
      performedBy: createdBy,
      performedById: 'system',
      timestamp: new Date().toISOString(),
      details: { action: 'invite_created', code: invite.code },
    });
    
    return invite;
  } catch (error) {
    logError('collaborativeCare.generateShareCode', error);
    throw error;
  }
}

/**
 * Validate and use a share code
 */
export async function useShareCode(
  code: string,
  caregiverName: string,
  caregiverEmail?: string
): Promise<CaregiverProfile | null> {
  try {
    const invites = await getShareInvites();
    const invite = invites.find(i => i.code === code && !i.used);
    
    if (!invite) {
      return null; // Invalid or already used
    }
    
    // Check expiration
    if (new Date(invite.expiresAt) < new Date()) {
      return null; // Expired
    }
    
    // Mark invite as used
    invite.used = true;
    invite.usedBy = caregiverName;
    await safeSetItem(SHARE_INVITES_KEY, invites);

    // Create caregiver profile
    const caregiver = await addCaregiver({
      name: caregiverName,
      email: caregiverEmail,
      role: 'family',
      permissions: invite.permissions,
    });
    
    // Log activity
    await logActivity({
      type: 'caregiver_joined',
      performedBy: caregiverName,
      performedById: caregiver.id,
      timestamp: new Date().toISOString(),
      details: { inviteCode: code },
    });
    
    return caregiver;
  } catch (error) {
    logError('collaborativeCare.useShareCode', error);
    return null;
  }
}

/**
 * Get all share invites
 */
export async function getShareInvites(): Promise<ShareInvite[]> {
  try {
    return await safeGetItem<ShareInvite[]>(SHARE_INVITES_KEY, []);
  } catch (error) {
    logError('collaborativeCare.getShareInvites', error);
    return [];
  }
}

/**
 * Generate a random 6-digit code
 */
function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get default permissions (view-only)
 */
function getDefaultPermissions(): SharePermissions {
  return {
    canView: true,
    canEdit: false,
    canMarkMedications: false,
    canScheduleAppointments: false,
    canAddNotes: true,
    canExport: false,
  };
}

// ============================================================================
// CAREGIVER MANAGEMENT
// ============================================================================

/**
 * Add a new caregiver
 */
export async function addCaregiver(
  data: Omit<CaregiverProfile, 'id' | 'joinedAt' | 'avatarColor'>
): Promise<CaregiverProfile> {
  try {
    const caregivers = await getCaregivers();
    
    const caregiver: CaregiverProfile = {
      ...data,
      id: generateUniqueId(),
      joinedAt: new Date().toISOString(),
      avatarColor: getRandomColor(),
    };
    
    caregivers.push(caregiver);
    await safeSetItem(CAREGIVERS_KEY, caregivers);

    return caregiver;
  } catch (error) {
    logError('collaborativeCare.addCaregiver', error);
    throw error;
  }
}

/**
 * Get all caregivers
 */
export async function getCaregivers(): Promise<CaregiverProfile[]> {
  try {
    return await safeGetItem<CaregiverProfile[]>(CAREGIVERS_KEY, []);
  } catch (error) {
    logError('collaborativeCare.getCaregivers', error);
    return [];
  }
}

/**
 * Remove a caregiver
 */
export async function removeCaregiver(caregiverId: string): Promise<boolean> {
  try {
    const caregivers = await getCaregivers();
    const filtered = caregivers.filter(c => c.id !== caregiverId);
    await safeSetItem(CAREGIVERS_KEY, filtered);
    return true;
  } catch (error) {
    logError('collaborativeCare.removeCaregiver', error);
    return false;
  }
}

// ============================================================================
// ACTIVITY FEED
// ============================================================================

/**
 * Log a care activity
 */
export async function logActivity(activity: Omit<CareActivity, 'id'>): Promise<void> {
  try {
    const activities = await getCareActivities();
    
    const newActivity: CareActivity = {
      ...activity,
      id: generateUniqueId(),
    };
    
    activities.unshift(newActivity); // Add to beginning
    
    // Keep only last 500 activities
    const trimmed = activities.slice(0, 500);
    
    await safeSetItem(CARE_ACTIVITIES_KEY, trimmed);
  } catch (error) {
    logError('collaborativeCare.logActivity', error);
  }
}

/**
 * Get recent care activities
 */
export async function getCareActivities(limit: number = 50): Promise<CareActivity[]> {
  try {
    const activities = await safeGetItem<CareActivity[]>(CARE_ACTIVITIES_KEY, []);
    return activities.slice(0, limit);
  } catch (error) {
    logError('collaborativeCare.getCareActivities', error);
    return [];
  }
}

/**
 * Get activities by type
 */
export async function getActivitiesByType(
  type: CareActivity['type'],
  limit: number = 20
): Promise<CareActivity[]> {
  try {
    const activities = await getCareActivities(500);
    return activities.filter(a => a.type === type).slice(0, limit);
  } catch (error) {
    logError('collaborativeCare.getActivitiesByType', error);
    return [];
  }
}

// ============================================================================
// CARE NOTES / MESSAGING
// ============================================================================

/**
 * Add a care note
 */
export async function addCareNote(
  note: Omit<CareNote, 'id' | 'timestamp' | 'readBy'>
): Promise<CareNote> {
  try {
    const notes = await getCareNotes();
    
    const newNote: CareNote = {
      ...note,
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
      readBy: [note.authorId], // Author has read it
    };
    
    notes.unshift(newNote);
    await safeSetItem(CARE_NOTES_KEY, notes);

    // Log activity
    await logActivity({
      type: 'note_added',
      performedBy: note.authorName,
      performedById: note.authorId,
      timestamp: newNote.timestamp,
      details: {
        priority: note.priority,
        preview: note.content.substring(0, 50),
      },
    });
    
    return newNote;
  } catch (error) {
    logError('collaborativeCare.addCareNote', error);
    throw error;
  }
}

/**
 * Get all care notes
 */
export async function getCareNotes(): Promise<CareNote[]> {
  try {
    return await safeGetItem<CareNote[]>(CARE_NOTES_KEY, []);
  } catch (error) {
    logError('collaborativeCare.getCareNotes', error);
    return [];
  }
}

/**
 * Mark note as read
 */
export async function markNoteAsRead(noteId: string, userId: string): Promise<void> {
  try {
    const notes = await getCareNotes();
    const note = notes.find(n => n.id === noteId);
    
    if (note && !note.readBy.includes(userId)) {
      note.readBy.push(userId);
      await safeSetItem(CARE_NOTES_KEY, notes);
    }
  } catch (error) {
    logError('collaborativeCare.markNoteAsRead', error);
  }
}

/**
 * Get unread note count for user
 */
export async function getUnreadNoteCount(userId: string): Promise<number> {
  try {
    const notes = await getCareNotes();
    return notes.filter(n => !n.readBy.includes(userId)).length;
  } catch (error) {
    logError('collaborativeCare.getUnreadNoteCount', error);
    return 0;
  }
}

// ============================================================================
// CURRENT USER
// ============================================================================

/**
 * Set current user (caregiver using the app)
 */
export async function setCurrentUser(caregiver: CaregiverProfile): Promise<void> {
  try {
    await safeSetItem(CURRENT_USER_KEY, caregiver);
  } catch (error) {
    logError('collaborativeCare.setCurrentUser', error);
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<CaregiverProfile | null> {
  try {
    return await safeGetItem<CaregiverProfile | null>(CURRENT_USER_KEY, null);
  } catch (error) {
    logError('collaborativeCare.getCurrentUser', error);
    return null;
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get random avatar color
 */
function getRandomColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Format activity for display
 */
export function formatActivityMessage(activity: CareActivity): string {
  switch (activity.type) {
    case 'medication_taken':
      return `${activity.performedBy} logged ${activity.details?.medicationName || 'medication'}`;
    case 'medication_missed':
      return `${activity.performedBy} marked ${activity.details?.medicationName || 'medication'} as missed`;
    case 'appointment_scheduled':
      return `${activity.performedBy} scheduled an appointment`;
    case 'appointment_completed':
      return `${activity.performedBy} completed an appointment`;
    case 'note_added':
      return `${activity.performedBy} added a note`;
    case 'vital_logged':
      return `${activity.performedBy} logged vitals`;
    case 'symptom_logged':
      return `${activity.performedBy} logged symptoms`;
    case 'photo_added':
      return `${activity.performedBy} added a photo`;
    case 'caregiver_joined':
      return `${activity.performedBy} joined the care team`;
    default:
      return `${activity.performedBy} updated care information`;
  }
}
