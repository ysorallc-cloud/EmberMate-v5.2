// =============================================================================
// Task 4.2: PBKDF2 iteration upgrade with backward compatibility
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '../cloudBackup.ts'),
  'utf8'
);

describe('Task 4.2: PBKDF2 iteration upgrade', () => {
  it('PBKDF2_ITERATIONS >= 100000', () => {
    const match = SOURCE.match(/const PBKDF2_ITERATIONS\s*=\s*([\d_]+)/);
    expect(match).not.toBeNull();
    const iterations = parseInt(match![1].replace(/_/g, ''), 10);
    expect(iterations).toBeGreaterThanOrEqual(100000);
  });

  it('BACKUP_VERSION is 3.1.0 or higher', () => {
    const match = SOURCE.match(/const BACKUP_VERSION\s*=\s*'([^']+)'/);
    expect(match).not.toBeNull();
    const [major, minor] = match![1].split('.').map(Number);
    expect(major * 100 + minor).toBeGreaterThanOrEqual(301);
  });

  it('EncryptedBackup type includes iterations field', () => {
    // Should have iterations?: number in the interface
    expect(SOURCE).toMatch(/iterations\??:\s*number/);
  });

  it('deriveKey accepts an iterations parameter', () => {
    // deriveKey should have an iterations param (with default)
    const match = SOURCE.match(/async function deriveKey\([^)]*iterations/);
    expect(match).not.toBeNull();
  });

  it('restoreEncryptedBackup uses backup.iterations for v3.0.0 (10k fallback)', () => {
    // The restore path should read iterations from backup metadata
    // and fall back to 10000 for old v3.0.0 backups
    expect(SOURCE).toMatch(/10000|10_000/);
    // Should reference backup.iterations somewhere in restore
    expect(SOURCE).toMatch(/backup\.iterations/);
  });

  it('createEncryptedBackup stores iterations in backup metadata', () => {
    // The backup object should include iterations: PBKDF2_ITERATIONS
    expect(SOURCE).toMatch(/iterations:\s*PBKDF2_ITERATIONS/);
  });
});
