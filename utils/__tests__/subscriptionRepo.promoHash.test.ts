// =============================================================================
// Task 4.1: Promo codes are hashed — no plaintext codes in source
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// Override expo-crypto mock to use real SHA-256 so hashed promo codes match
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(async (_algo: string, data: string) => {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  getRandomBytesAsync: jest.fn(async (length: number) => new Uint8Array(length)),
}));

import { activatePromoCode } from '../../storage/subscriptionRepo';
import * as fs from 'fs';
import * as path from 'path';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Task 4.1: Hashed promo codes', () => {
  it('activatePromoCode("EMBER2026") returns true', async () => {
    const result = await activatePromoCode('EMBER2026');
    expect(result).toBe(true);
  });

  it('activatePromoCode("INVALID") returns false', async () => {
    const result = await activatePromoCode('INVALID');
    expect(result).toBe(false);
  });

  it('activatePromoCode("ember2026") returns true (case insensitive)', async () => {
    const result = await activatePromoCode('ember2026');
    expect(result).toBe(true);
  });

  it('no plaintext promo codes appear in subscriptionRepo.ts source', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../storage/subscriptionRepo.ts'),
      'utf8'
    );
    expect(source).not.toContain('EMBER2026');
    expect(source).not.toContain('CAREGIVER');
    expect(source).not.toContain('BETAUSER');
  });
});
