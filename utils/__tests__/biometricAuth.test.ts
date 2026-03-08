import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  setupPIN,
  verifyPIN,
  hasPIN,
  clearSession,
  hasActiveSession,
  isBiometricEnabled,
  disableBiometricAuth,
  updateLastActivity,
  getTimeSinceLastActivity,
  shouldLockSession,
  getPINLockoutInfo,
} from '../biometricAuth';
import { safeSetItem } from '../safeStorage';

// biometricAuth imports secureStorage which wraps expo-secure-store (already mocked in jest.setup.js)
// expo-crypto is also mocked in jest.setup.js with deterministic hashing

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
}));

describe('biometricAuth', () => {
  describe('PIN setup and verification', () => {
    it('should set up a PIN and verify it', async () => {
      const result = await setupPIN('1234');
      expect(result).toBe(true);

      const verified = await verifyPIN('1234');
      expect(verified).toBe(true);
    });

    it('should reject wrong PIN', async () => {
      await setupPIN('1234');
      const verified = await verifyPIN('9999');
      expect(verified).toBe(false);
    });

    it('should reject PIN shorter than 4 digits', async () => {
      const result = await setupPIN('123');
      expect(result).toBe(false);
    });

    it('should reject PIN longer than 6 digits', async () => {
      const result = await setupPIN('1234567');
      expect(result).toBe(false);
    });

    it('should reject non-numeric PIN', async () => {
      const result = await setupPIN('abcd');
      expect(result).toBe(false);
    });

    it('should accept 6-digit PIN', async () => {
      const result = await setupPIN('123456');
      expect(result).toBe(true);

      const verified = await verifyPIN('123456');
      expect(verified).toBe(true);
    });

    it('should store salt in keychain', async () => {
      await setupPIN('1234');

      // Salt should be stored via setKeychainItem -> SecureStore.setItemAsync
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'embermate_pin_salt',
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should store hash in keychain', async () => {
      await setupPIN('1234');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'embermate_pin_hash',
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('hasPIN', () => {
    it('should return false when no PIN is set', async () => {
      const result = await hasPIN();
      expect(result).toBe(false);
    });

    it('should return true after PIN setup', async () => {
      await setupPIN('1234');
      const result = await hasPIN();
      expect(result).toBe(true);
    });
  });

  describe('session management', () => {
    it('should have active session after PIN verification', async () => {
      await setupPIN('1234');
      await verifyPIN('1234');

      const active = await hasActiveSession();
      expect(active).toBe(true);
    });

    it('should clear session', async () => {
      await setupPIN('1234');
      await verifyPIN('1234');

      await clearSession();

      const active = await hasActiveSession();
      expect(active).toBe(false);
    });

    it('clearSession calls removeKeychainItem (not empty string)', async () => {
      await setupPIN('1234');
      await verifyPIN('1234');

      await clearSession();

      // Should call deleteItemAsync, not setItemAsync with empty string
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('embermate_session_token');
    });
  });

  describe('biometric enable/disable', () => {
    it('should report disabled by default', async () => {
      const enabled = await isBiometricEnabled();
      expect(enabled).toBe(false);
    });

    it('should disable biometric auth', async () => {
      await safeSetItem('@embermate_biometric_enabled', 'true');
      expect(await isBiometricEnabled()).toBe(true);

      await disableBiometricAuth();
      expect(await isBiometricEnabled()).toBe(false);
    });
  });

  describe('PIN lockout and rate limiting', () => {
    it('should start with no lockout and 3 attempts remaining', async () => {
      const info = await getPINLockoutInfo();
      expect(info.locked).toBe(false);
      expect(info.attemptsRemaining).toBe(3);
      expect(info.lockoutSeconds).toBe(0);
    });

    it('should decrement attempts on wrong PIN', async () => {
      await setupPIN('1234');

      await verifyPIN('0000'); // fail 1
      let info = await getPINLockoutInfo();
      expect(info.attemptsRemaining).toBe(2);

      await verifyPIN('0000'); // fail 2
      info = await getPINLockoutInfo();
      expect(info.attemptsRemaining).toBe(1);
    });

    it('should lock after 3 failed attempts', async () => {
      await setupPIN('1234');

      await verifyPIN('0000'); // fail 1
      await verifyPIN('0000'); // fail 2
      await verifyPIN('0000'); // fail 3

      const info = await getPINLockoutInfo();
      expect(info.locked).toBe(true);
      expect(info.attemptsRemaining).toBe(0);
      expect(info.lockoutSeconds).toBeGreaterThan(0);
      expect(info.lockoutSeconds).toBeLessThanOrEqual(30);
    });

    it('should reject verification when locked out', async () => {
      await setupPIN('1234');

      await verifyPIN('0000'); // fail 1
      await verifyPIN('0000'); // fail 2
      await verifyPIN('0000'); // fail 3

      // Even correct PIN should be rejected during lockout
      const result = await verifyPIN('1234');
      expect(result).toBe(false);
    });

    it('should reset attempts on successful verification', async () => {
      await setupPIN('1234');

      await verifyPIN('0000'); // fail 1
      await verifyPIN('0000'); // fail 2

      // Correct PIN
      await verifyPIN('1234');

      const info = await getPINLockoutInfo();
      expect(info.locked).toBe(false);
      expect(info.attemptsRemaining).toBe(3);
    });

    it('should escalate lockout duration on repeated lockouts', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
      await setupPIN('1234');

      // First lockout (3 fails → 30s)
      await verifyPIN('0000');
      await verifyPIN('0000');
      await verifyPIN('0000');
      let info = await getPINLockoutInfo();
      expect(info.lockoutSeconds).toBeLessThanOrEqual(30);

      // Advance past the lockout
      jest.setSystemTime(new Date('2025-01-15T10:01:00.000Z'));

      // Second lockout (4th fail → 60s)
      await verifyPIN('0000');
      info = await getPINLockoutInfo();
      expect(info.locked).toBe(true);
      expect(info.lockoutSeconds).toBeLessThanOrEqual(60);

      jest.useRealTimers();
    });
  });

  describe('activity tracking', () => {
    it('should track last activity', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));

      await updateLastActivity();
      const timeSince = await getTimeSinceLastActivity();
      expect(timeSince).toBe(0);

      jest.useRealTimers();
    });

    it('should return Infinity when no activity recorded', async () => {
      const timeSince = await getTimeSinceLastActivity();
      expect(timeSince).toBe(Infinity);
    });

    it('should lock session after timeout', async () => {
      // No activity recorded -> should lock
      const shouldLock = await shouldLockSession(300);
      expect(shouldLock).toBe(true);
    });

    it('should not lock session within timeout', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
      await updateLastActivity();

      const shouldLock = await shouldLockSession(300);
      expect(shouldLock).toBe(false);

      jest.useRealTimers();
    });
  });
});
