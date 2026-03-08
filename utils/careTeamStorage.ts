// ============================================================================
// CARE TEAM STORAGE UTILITIES
// AsyncStorage CRUD operations for care team members
// ============================================================================

import { safeGetItem, safeSetItem } from './safeStorage';
import { logError } from './devLog';
import { StorageKeys, scopedKey } from './storageKeys';
import { generateUniqueId } from './idGenerator';

const DEFAULT_PATIENT_ID = 'default';

export interface CareTeamMember {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  isEmergencyContact: boolean;
  availableHours?: string;
  contactPreference?: 'call' | 'text' | 'email';
  notes?: string;
  createdAt: string;
  avatarColor?: string; // For UI display
}

const CARE_TEAM_KEY = StorageKeys.CARE_TEAM;

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all care team members
 */
export async function getCareTeam(patientId: string = DEFAULT_PATIENT_ID): Promise<CareTeamMember[]> {
  try {
    const data = await safeGetItem<CareTeamMember[] | null>(scopedKey(CARE_TEAM_KEY, patientId), null);
    if (!data) {
      return getDefaultCareTeam();
    }
    return data;
  } catch (error) {
    logError('careTeamStorage.getCareTeam', error);
    return getDefaultCareTeam();
  }
}

/**
 * Get a single care team member by ID
 */
export async function getCareTeamMember(id: string, patientId: string = DEFAULT_PATIENT_ID): Promise<CareTeamMember | null> {
  try {
    const team = await getCareTeam(patientId);
    return team.find(m => m.id === id) || null;
  } catch (error) {
    logError('careTeamStorage.getCareTeamMember', error);
    return null;
  }
}

/**
 * Get emergency contacts only
 */
export async function getEmergencyContacts(patientId: string = DEFAULT_PATIENT_ID): Promise<CareTeamMember[]> {
  try {
    const team = await getCareTeam(patientId);
    return team
      .filter(m => m.isEmergencyContact && m.phone)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    logError('careTeamStorage.getEmergencyContacts', error);
    return [];
  }
}

/**
 * Create a new care team member
 */
export async function createCareTeamMember(
  member: Omit<CareTeamMember, 'id' | 'createdAt'>,
  patientId: string = DEFAULT_PATIENT_ID
): Promise<CareTeamMember> {
  try {
    const team = await getCareTeam(patientId);
    const newMember: CareTeamMember = {
      ...member,
      id: generateUniqueId(),
      createdAt: new Date().toISOString(),
      avatarColor: getRandomAvatarColor(),
    };
    team.push(newMember);
    await safeSetItem(scopedKey(CARE_TEAM_KEY, patientId), team);
    return newMember;
  } catch (error) {
    logError('careTeamStorage.createCareTeamMember', error);
    throw error;
  }
}

/**
 * Update a care team member
 */
export async function updateCareTeamMember(
  id: string,
  updates: Partial<CareTeamMember>,
  patientId: string = DEFAULT_PATIENT_ID
): Promise<CareTeamMember | null> {
  try {
    const team = await getCareTeam(patientId);
    const index = team.findIndex(m => m.id === id);

    if (index === -1) {
      return null;
    }

    team[index] = { ...team[index], ...updates };
    await safeSetItem(scopedKey(CARE_TEAM_KEY, patientId), team);
    return team[index];
  } catch (error) {
    logError('careTeamStorage.updateCareTeamMember', error);
    return null;
  }
}

/**
 * Delete a care team member
 */
export async function deleteCareTeamMember(id: string, patientId: string = DEFAULT_PATIENT_ID): Promise<boolean> {
  try {
    const team = await getCareTeam(patientId);
    const filtered = team.filter(m => m.id !== id);

    if (filtered.length === team.length) {
      return false; // Nothing was deleted
    }

    await safeSetItem(scopedKey(CARE_TEAM_KEY, patientId), filtered);
    return true;
  } catch (error) {
    logError('careTeamStorage.deleteCareTeamMember', error);
    return false;
  }
}

/**
 * Reorder care team members (for emergency contact priority)
 */
export async function reorderCareTeam(orderedIds: string[], patientId: string = DEFAULT_PATIENT_ID): Promise<boolean> {
  try {
    const team = await getCareTeam(patientId);
    const reordered = orderedIds
      .map(id => team.find(m => m.id === id))
      .filter(Boolean) as CareTeamMember[];

    // Add any members not in the ordered list at the end
    const remaining = team.filter(m => !orderedIds.includes(m.id));
    const final = [...reordered, ...remaining];

    await safeSetItem(scopedKey(CARE_TEAM_KEY, patientId), final);
    return true;
  } catch (error) {
    logError('careTeamStorage.reorderCareTeam', error);
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');

  // US format: (123) 456-7890
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // International or other formats
  return phone;
}

/**
 * Validate phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
}

/**
 * Get random avatar color for new members
 */
function getRandomAvatarColor(): string {
  const colors = [
    '#8BA888', // Sage
    '#C9A86C', // Copper
    '#3498DB', // Blue
    '#9B59B6', // Purple
    '#E67E22', // Orange
    '#1ABC9C', // Teal
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ============================================================================
// RESET & DEFAULTS
// ============================================================================

/**
 * Reset care team to default
 */
export async function resetCareTeam(patientId: string = DEFAULT_PATIENT_ID): Promise<void> {
  try {
    const defaults = getDefaultCareTeam();
    await safeSetItem(scopedKey(CARE_TEAM_KEY, patientId), defaults);
  } catch (error) {
    logError('careTeamStorage.resetCareTeam', error);
  }
}

/**
 * Default care team for initial setup
 */
function getDefaultCareTeam(): CareTeamMember[] {
  const now = new Date().toISOString();
  return [
    {
      id: '1',
      name: 'Sarah (Daughter)',
      role: 'Family',
      phone: '555-0123',
      email: 'sarah@example.com',
      isEmergencyContact: true,
      availableHours: 'Anytime',
      contactPreference: 'call',
      createdAt: now,
      avatarColor: '#8BA888',
      notes: 'Primary contact for emergencies',
    },
    {
      id: '2',
      name: 'Dr. Chen',
      role: 'Cardiologist',
      phone: '555-0456',
      email: 'chen@cardiology.com',
      isEmergencyContact: false,
      availableHours: 'Mon-Fri 9am-5pm',
      contactPreference: 'call',
      createdAt: now,
      avatarColor: '#3498DB',
    },
    {
      id: '3',
      name: 'Valley Home Health',
      role: 'Nursing',
      phone: '555-0789',
      email: 'info@valleyhealth.com',
      isEmergencyContact: true,
      availableHours: '24/7 On-call',
      contactPreference: 'call',
      createdAt: now,
      avatarColor: '#1ABC9C',
      notes: 'Emergency nursing support',
    },
  ];
}

/**
 * Count emergency contacts
 */
export async function countEmergencyContacts(patientId: string = DEFAULT_PATIENT_ID): Promise<number> {
  try {
    const contacts = await getEmergencyContacts(patientId);
    return contacts.length;
  } catch (error) {
    logError('careTeamStorage.countEmergencyContacts', error);
    return 0;
  }
}
