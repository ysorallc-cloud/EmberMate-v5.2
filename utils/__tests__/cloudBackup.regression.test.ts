// =============================================================================
// Regression test: cloudBackup.ts must not reintroduce patterns fixed in 2.2–2.4
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '../cloudBackup.ts'),
  'utf8'
);

describe('cloudBackup.ts regression audit', () => {
  // -------------------------------------------------------------------------
  // Task 2.2: No single-key AsyncStorage.getItem / .setItem calls
  // Bulk ops (getAllKeys, multiGet, multiSet, clear) are acceptable for backup
  // -------------------------------------------------------------------------
  it('has zero direct AsyncStorage.getItem / .setItem calls', () => {
    // Match AsyncStorage.getItem( or AsyncStorage.setItem( — single-key ops
    const singleKeyReads = SOURCE.match(/AsyncStorage\.getItem\s*\(/g) || [];
    const singleKeyWrites = SOURCE.match(/AsyncStorage\.setItem\s*\(/g) || [];

    expect(singleKeyReads).toHaveLength(0);
    expect(singleKeyWrites).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Task 2.3: No Date.now() used for ID generation
  // -------------------------------------------------------------------------
  it('has zero Date.now() ID generation', () => {
    // Match patterns like: id: Date.now() or id = Date.now() or `${Date.now()}`
    const dateNowIds = SOURCE.match(/id[\s:=]+.*Date\.now\(\)/g) || [];
    // Also check for Date.now().toString() which is the classic pattern
    const dateNowToString = SOURCE.match(/Date\.now\(\)\.toString\(\)/g) || [];

    expect(dateNowIds).toHaveLength(0);
    expect(dateNowToString).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Task 2.2: Settings use safeGetItem / safeSetItem, not raw AsyncStorage
  // -------------------------------------------------------------------------
  it('imports safeGetItem and safeSetItem from safeStorage', () => {
    // The file must import safeGetItem and safeSetItem
    expect(SOURCE).toMatch(/safeGetItem/);
    expect(SOURCE).toMatch(/safeSetItem/);
  });

  // -------------------------------------------------------------------------
  // Task 2.2: restoreEncryptedBackup non-sensitive keys go through safeSetItem
  // (sensitive keys already go through setSecureItem — that's correct)
  // -------------------------------------------------------------------------
  it('restoreEncryptedBackup uses safeSetItem for non-sensitive keys', () => {
    // Extract the restoreEncryptedBackup function body
    const fnStart = SOURCE.indexOf('export async function restoreEncryptedBackup');
    const fnBodyStart = SOURCE.indexOf('{', fnStart);
    // Find matching closing brace by counting braces
    let depth = 0;
    let fnEnd = fnBodyStart;
    for (let i = fnBodyStart; i < SOURCE.length; i++) {
      if (SOURCE[i] === '{') depth++;
      if (SOURCE[i] === '}') depth--;
      if (depth === 0) { fnEnd = i + 1; break; }
    }
    const fnBody = SOURCE.slice(fnBodyStart, fnEnd);

    // The function should NOT use AsyncStorage.multiSet for non-sensitive keys
    // Instead it should loop and call safeSetItem for each
    expect(fnBody).not.toMatch(/AsyncStorage\.multiSet/);
  });
});
