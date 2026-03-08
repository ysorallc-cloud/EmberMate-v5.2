import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getEmergencyContacts,
  saveEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  getEmergencyNumber,
  formatPhoneNumber,
} from '../emergencyContacts';

// Mock expo-localization with configurable locale
const mockGetLocales = jest.fn();
jest.mock('expo-localization', () => ({
  getLocales: () => mockGetLocales(),
}));

// expo-linking is used by makePhoneCall but not by functions we're testing
jest.mock('expo-linking', () => ({
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  openURL: jest.fn(() => Promise.resolve()),
}));

describe('emergencyContacts', () => {
  describe('getEmergencyNumber', () => {
    it('should return 911 for US region', () => {
      mockGetLocales.mockReturnValue([{ regionCode: 'US' }]);
      expect(getEmergencyNumber()).toBe('911');
    });

    it('should return 911 for Canada', () => {
      mockGetLocales.mockReturnValue([{ regionCode: 'CA' }]);
      expect(getEmergencyNumber()).toBe('911');
    });

    it('should return 999 for UK', () => {
      mockGetLocales.mockReturnValue([{ regionCode: 'GB' }]);
      expect(getEmergencyNumber()).toBe('999');
    });

    it('should return 000 for Australia', () => {
      mockGetLocales.mockReturnValue([{ regionCode: 'AU' }]);
      expect(getEmergencyNumber()).toBe('000');
    });

    it('should return 111 for New Zealand', () => {
      mockGetLocales.mockReturnValue([{ regionCode: 'NZ' }]);
      expect(getEmergencyNumber()).toBe('111');
    });

    it('should return 119 for Japan', () => {
      mockGetLocales.mockReturnValue([{ regionCode: 'JP' }]);
      expect(getEmergencyNumber()).toBe('119');
    });

    it('should return 120 for China', () => {
      mockGetLocales.mockReturnValue([{ regionCode: 'CN' }]);
      expect(getEmergencyNumber()).toBe('120');
    });

    it('should return 112 for EU countries (default)', () => {
      mockGetLocales.mockReturnValue([{ regionCode: 'DE' }]);
      expect(getEmergencyNumber()).toBe('112');
    });

    it('should return 112 for unknown region', () => {
      mockGetLocales.mockReturnValue([{ regionCode: 'ZZ' }]);
      expect(getEmergencyNumber()).toBe('112');
    });

    it('should return 911 when getLocales throws', () => {
      mockGetLocales.mockImplementation(() => { throw new Error('fail'); });
      expect(getEmergencyNumber()).toBe('911');
    });

    it('should return 112 when regionCode is empty', () => {
      mockGetLocales.mockReturnValue([{ regionCode: '' }]);
      expect(getEmergencyNumber()).toBe('112');
    });

    it('should return 112 when locales array is empty', () => {
      mockGetLocales.mockReturnValue([]);
      // getLocales()?.[0]?.regionCode will be undefined
      expect(getEmergencyNumber()).toBe('112');
    });
  });

  describe('contact CRUD', () => {
    it('should return empty array with no contacts', async () => {
      const contacts = await getEmergencyContacts();
      expect(contacts).toEqual([]);
    });

    it('should save and retrieve a contact', async () => {
      await saveEmergencyContact({
        name: 'Dr. Smith',
        relationship: 'Primary Care',
        phone: '555-0100',
        isPrimary: true,
        type: 'doctor',
      });

      const contacts = await getEmergencyContacts();
      expect(contacts).toHaveLength(1);
      expect(contacts[0].name).toBe('Dr. Smith');
      expect(contacts[0].id).toBeDefined();
    });

    it('should sort primary contacts first', async () => {
      await saveEmergencyContact({
        name: 'Bob',
        relationship: 'Friend',
        phone: '555-0200',
        isPrimary: false,
        type: 'friend',
      });
      await saveEmergencyContact({
        name: 'Alice',
        relationship: 'Daughter',
        phone: '555-0300',
        isPrimary: true,
        type: 'family',
      });

      const contacts = await getEmergencyContacts();
      expect(contacts[0].name).toBe('Alice'); // primary first
      expect(contacts[1].name).toBe('Bob');
    });

    it('should update a contact', async () => {
      await saveEmergencyContact({
        name: 'Dr. Smith',
        relationship: 'Primary Care',
        phone: '555-0100',
        isPrimary: true,
        type: 'doctor',
      });

      const contacts = await getEmergencyContacts();
      const updated = { ...contacts[0], phone: '555-9999' };
      await updateEmergencyContact(updated);

      const after = await getEmergencyContacts();
      expect(after[0].phone).toBe('555-9999');
    });

    it('should delete a contact', async () => {
      await saveEmergencyContact({
        name: 'Dr. Smith',
        relationship: 'Primary Care',
        phone: '555-0100',
        isPrimary: true,
        type: 'doctor',
      });

      const contacts = await getEmergencyContacts();
      await deleteEmergencyContact(contacts[0].id);

      const after = await getEmergencyContacts();
      expect(after).toHaveLength(0);
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 10-digit US number', () => {
      expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
    });

    it('should format 11-digit number with country code', () => {
      expect(formatPhoneNumber('15551234567')).toBe('+1 (555) 123-4567');
    });

    it('should return non-standard numbers unchanged', () => {
      expect(formatPhoneNumber('123')).toBe('123');
    });

    it('should strip formatting before reformatting', () => {
      expect(formatPhoneNumber('(555) 123-4567')).toBe('(555) 123-4567');
    });
  });
});
