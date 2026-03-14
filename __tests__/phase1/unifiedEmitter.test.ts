import * as fs from 'fs';
import * as path from 'path';

describe('Step 1C: Unified event emitter', () => {
  const emitterPath = path.resolve(__dirname, '../../utils/eventEmitter.ts');

  test('emitCareEvent is exported', () => {
    const content = fs.readFileSync(emitterPath, 'utf8');
    expect(content).toContain('export async function emitCareEvent');
  });

  test('individual emitters still exist (not deleted)', () => {
    const content = fs.readFileSync(emitterPath, 'utf8');
    const expected = [
      'emitMedicationEvent',
      'emitVitalsEvent',
      'emitMealEvent',
      'emitHydrationEvent',
      'emitSleepEvent',
      'emitSymptomEvent',
      'emitBathroomEvent',
      'emitMoodEvent',
      'emitNoteEvent',
    ];
    for (const fn of expected) {
      expect(content).toContain(`export async function ${fn}`);
    }
  });

  test('individual emitters are marked deprecated', () => {
    const content = fs.readFileSync(emitterPath, 'utf8');
    const deprecatedCount = (content.match(/@deprecated/g) || []).length;
    expect(deprecatedCount).toBeGreaterThanOrEqual(9);
  });

  test('individual emitters delegate to emitCareEvent', () => {
    const content = fs.readFileSync(emitterPath, 'utf8');
    // Each wrapper should call emitCareEvent, not the old private emit
    // Count calls to emitCareEvent (excluding the definition itself)
    const calls = content.split('emitCareEvent(').length - 1;
    // Definition is 1, wrappers should add at least 9 more
    expect(calls).toBeGreaterThanOrEqual(10);
  });
});
