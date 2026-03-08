// ============================================================================
// EMERGENCY CONTACTS STORAGE
// Manages emergency contacts for quick access in critical situations
// ============================================================================

import { safeGetItem, safeSetItem } from './safeStorage';
import * as Linking from 'expo-linking';
import * as Localization from 'expo-localization';
import { Alert } from 'react-native';
import { generateUniqueId } from './idGenerator';
import { logError } from './devLog';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
  type: 'family' | 'friend' | 'doctor' | 'caregiver';
}

const EMERGENCY_CONTACTS_KEY = 'emergency_contacts';

/**
 * Get all emergency contacts
 */
export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  try {
    const contacts = await safeGetItem<EmergencyContact[]>(EMERGENCY_CONTACTS_KEY, []);

    // Sort by primary first, then by name
    return contacts.sort((a: EmergencyContact, b: EmergencyContact) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    logError('emergencyContacts.getEmergencyContacts', error);
    return [];
  }
}

/**
 * Save emergency contact
 */
export async function saveEmergencyContact(
  contact: Omit<EmergencyContact, 'id'>
): Promise<void> {
  try {
    const contacts = await getEmergencyContacts();

    const newContact: EmergencyContact = {
      ...contact,
      id: generateUniqueId(),
    };

    contacts.push(newContact);

    await safeSetItem(EMERGENCY_CONTACTS_KEY, contacts);
  } catch (error) {
    logError('emergencyContacts.saveEmergencyContact', error);
    throw error;
  }
}

/**
 * Update emergency contact
 */
export async function updateEmergencyContact(
  contact: EmergencyContact
): Promise<void> {
  try {
    const contacts = await getEmergencyContacts();
    const index = contacts.findIndex(c => c.id === contact.id);

    if (index === -1) {
      throw new Error('Contact not found');
    }

    contacts[index] = contact;

    await safeSetItem(EMERGENCY_CONTACTS_KEY, contacts);
  } catch (error) {
    logError('emergencyContacts.updateEmergencyContact', error);
    throw error;
  }
}

/**
 * Delete emergency contact
 */
export async function deleteEmergencyContact(id: string): Promise<void> {
  try {
    const contacts = await getEmergencyContacts();
    const filtered = contacts.filter(c => c.id !== id);

    await safeSetItem(EMERGENCY_CONTACTS_KEY, filtered);
  } catch (error) {
    logError('emergencyContacts.deleteEmergencyContact', error);
    throw error;
  }
}

/**
 * Make a phone call
 */
export async function makePhoneCall(phoneNumber: string): Promise<void> {
  try {
    // Remove any formatting from phone number
    const cleaned = phoneNumber.replace(/\D/g, '');
    const url = `tel:${cleaned}`;

    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        'Cannot Make Call',
        'Your device does not support phone calls.',
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    logError('emergencyContacts.makePhoneCall', error);
    Alert.alert(
      'Call Failed',
      'Unable to initiate call. Please dial manually.',
      [{ text: 'OK' }]
    );
  }
}

/**
 * Emergency numbers by region code
 */
const EMERGENCY_NUMBERS: Record<string, string> = {
  US: '911', CA: '911', MX: '911',
  GB: '999', IE: '999',
  AU: '000', NZ: '111',
  JP: '119', KR: '119', CN: '120',
  IN: '112', BR: '190',
  // EU/EEA countries use 112
  DEFAULT: '112',
};

/**
 * Get the emergency number for the user's region
 */
export function getEmergencyNumber(): string {
  try {
    const regionCode = Localization.getLocales()?.[0]?.regionCode ?? '';
    return EMERGENCY_NUMBERS[regionCode] || EMERGENCY_NUMBERS.DEFAULT;
  } catch {
    return '911'; // Safe fallback
  }
}

/**
 * Call emergency services (locale-aware)
 */
export async function callEmergencyServices(): Promise<void> {
  const number = getEmergencyNumber();
  Alert.alert(
    `Call ${number}`,
    'This will call emergency services immediately.',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Call Now',
        style: 'destructive',
        onPress: () => makePhoneCall(number),
      },
    ]
  );
}

/**
 * @deprecated Use callEmergencyServices() instead
 */
export const call911 = callEmergencyServices;

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX for US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Format as +X (XXX) XXX-XXXX for 11-digit numbers
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return original if not standard format
  return phone;
}
