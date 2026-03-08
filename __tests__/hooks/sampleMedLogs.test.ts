// ============================================================================
// Sample Medication Logs Tests
// Verifies that sample data generation creates medication logs in the correct
// storage key so Visit Prep adherence calculations work.
//
// Bug: initializeSampleData() created medication definitions but never wrote
// medication log entries. Visit Prep calls getMedicationLogs() which reads
// from scopedKey(CENTRAL_MED_LOGS) — empty. The correlation data generator
// wrote to a different key format (@medication_logs_{date}) that nothing reads.
// ============================================================================

describe('Sample medication log generation', () => {
  const fs = require('fs');
  const path = require('path');

  const generatorSource = fs.readFileSync(
    path.resolve(__dirname, '../../utils/sampleDataGenerator.ts'), 'utf8'
  );

  it('sampleDataGenerator should import scopedKey', () => {
    expect(generatorSource).toContain("import { scopedKey } from './storageKeys'");
  });

  it('sampleDataGenerator should import encryptedSetRaw', () => {
    expect(generatorSource).toContain('encryptedSetRaw');
  });

  it('sampleDataGenerator should define seedSampleMedicationLogs', () => {
    expect(generatorSource).toContain('async function seedSampleMedicationLogs');
  });

  it('seedSampleMedicationLogs should write to CENTRAL_MED_LOGS via scopedKey', () => {
    expect(generatorSource).toContain('scopedKey(StorageKeys.CENTRAL_MED_LOGS');
  });

  it('seedSampleMedicationLogs should use encryptedSetRaw (matching getMedicationLogs)', () => {
    // getMedicationLogs reads via encryptedGetRaw, so we must write via encryptedSetRaw
    expect(generatorSource).toContain('await encryptedSetRaw(key, JSON.stringify(logs))');
  });

  it('initializeSampleData should call seedSampleMedicationLogs', () => {
    expect(generatorSource).toContain('await seedSampleMedicationLogs()');
  });

  it('medication logs should be tagged with origin sample', () => {
    expect(generatorSource).toContain("origin: 'sample'");
  });

  it('should generate logs for all 3 sample medications', () => {
    expect(generatorSource).toContain("id: 'med-1'");
    expect(generatorSource).toContain("id: 'med-2'");
    expect(generatorSource).toContain("id: 'med-3'");
  });
});
