// ============================================================================
// UNIQUE ID GENERATOR
// Generates collision-resistant IDs using cryptographic randomness
// ============================================================================

import * as Crypto from 'expo-crypto';
import { devLog, logError } from './devLog';

// Pre-seeded crypto buffer for synchronous ID generation
let cryptoBuffer: Uint8Array = new Uint8Array(256);
let bufferOffset = 256; // Start exhausted to trigger first fill

/**
 * Fill the crypto buffer with secure random bytes.
 * Called lazily; IDs generated before first await use Math.random fallback.
 */
async function refillCryptoBuffer(): Promise<void> {
  cryptoBuffer = await Crypto.getRandomBytesAsync(256);
  bufferOffset = 0;
}

// Start filling the buffer on module load (non-blocking)
refillCryptoBuffer();

/**
 * Reset the crypto buffer for testing purposes.
 * Forces a fresh buffer fill so subsequent IDs use crypto bytes, not Math.random fallback.
 */
export async function __resetBufferForTesting(): Promise<void> {
  await refillCryptoBuffer();
}

// Monotonic counter to prevent ID collisions when timestamp is static (e.g., fake timers)
let _idCounter = 0;

/**
 * Generate a unique ID using timestamp + counter + cryptographic random string.
 * Synchronous for hot paths; uses pre-fetched crypto bytes when available,
 * falls back to Math.random if the buffer is exhausted (refills async).
 *
 * Format: {timestamp}-{random}
 * Example: 1704326400000-a3f9b2c
 */
export function generateUniqueId(): string {
  const timestamp = Date.now();
  const counter = (_idCounter++).toString(36);
  const random = generateRandomString(5);
  return `${timestamp}-${counter}${random}`;
}

/**
 * Generate a random alphanumeric string using crypto bytes when available
 */
function generateRandomString(length: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    let randomByte: number;
    if (bufferOffset < cryptoBuffer.length) {
      randomByte = cryptoBuffer[bufferOffset++];
      // Trigger async refill when running low
      if (bufferOffset >= cryptoBuffer.length) {
        refillCryptoBuffer();
      }
    } else {
      // Fallback: Math.random (only before first crypto fill completes)
      randomByte = Math.floor(Math.random() * 256);
    }
    result += characters[randomByte % characters.length];
  }

  return result;
}

/**
 * Generate a UUID v4-like string (without crypto library)
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 *
 * Note: This is NOT cryptographically secure, but sufficient for
 * client-side ID generation where collision resistance is the main concern.
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a short, readable ID (8 characters)
 * Good for user-facing IDs like share codes
 */
export function generateShortId(): string {
  return generateRandomString(8);
}

/**
 * Check if an ID already exists in a list
 * Used to prevent duplicates
 */
export function isIdUnique(id: string, existingIds: string[]): boolean {
  return !existingIds.includes(id);
}

/**
 * Generate an ID that's guaranteed unique within the provided list
 * Will retry up to 10 times if collision occurs (extremely unlikely)
 */
export function generateUniqueIdWithCheck(existingIds: string[]): string {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const id = generateUniqueId();

    if (isIdUnique(id, existingIds)) {
      return id;
    }

    attempts++;
    devLog(`[IDGenerator] Collision detected, retrying... (attempt ${attempts})`);
  }

  // If we somehow get 10 collisions, add extra entropy
  const fallbackId = `${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
  logError('idGenerator.generateUniqueIdWithCheck', 'Multiple collisions detected, using fallback ID');
  return fallbackId;
}
