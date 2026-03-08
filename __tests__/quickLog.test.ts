import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const QUICK_LOG_PATH = join(__dirname, '../app/quick-log.tsx');

describe('Quick Log (renamed from quick-log-more)', () => {
  test('quick-log.tsx exists', () => {
    expect(existsSync(QUICK_LOG_PATH)).toBe(true);
  });

  test('quick-log-more.tsx no longer exists', () => {
    expect(existsSync(join(__dirname, '../app/quick-log-more.tsx'))).toBe(false);
  });

  const src = readFileSync(QUICK_LOG_PATH, 'utf8');

  test('INLINE_CATEGORIES includes meals, sleep, symptom, bathroom', () => {
    expect(src).toContain("'meals'");
    expect(src).toContain("'sleep'");
    expect(src).toContain("'symptom'");
    expect(src).toContain("'bathroom'");
    // Verify they are in the INLINE_CATEGORIES set
    const match = src.match(/INLINE_CATEGORIES\s*=\s*new Set\(\[([^\]]+)\]\)/);
    expect(match).not.toBeNull();
    const categories = match![1];
    expect(categories).toContain('meals');
    expect(categories).toContain('sleep');
    expect(categories).toContain('symptom');
    expect(categories).toContain('bathroom');
  });

  test('imports saveMealsLog, saveSleepLog, saveSymptomLog', () => {
    expect(src).toContain('saveMealsLog');
    expect(src).toContain('saveSleepLog');
    expect(src).toContain('saveSymptomLog');
  });

  test('meals inline form has meal type buttons', () => {
    expect(src).toContain("case 'meals'");
    expect(src).toContain('Breakfast');
    expect(src).toContain('Lunch');
    expect(src).toContain('Dinner');
    expect(src).toContain('Snack');
  });

  test('sleep inline form has hours and quality', () => {
    expect(src).toContain("case 'sleep'");
    expect(src).toContain('sleepHours');
    expect(src).toContain('sleepQuality');
  });

  test('symptom inline form has text and severity', () => {
    expect(src).toContain("case 'symptom'");
    expect(src).toContain('symptomText');
    expect(src).toContain('symptomSeverity');
  });

  test('bathroom inline form uses saveNotesLog', () => {
    expect(src).toContain("case 'bathroom'");
    expect(src).toContain('Bowel Movement');
    expect(src).toContain('handleSaveBathroom');
  });

  test('all navigation references updated from quick-log-more', () => {
    const fabSrc = readFileSync(join(__dirname, '../components/now/QuickLogFAB.tsx'), 'utf8');
    expect(fabSrc).toContain('quick-log');
    expect(fabSrc).not.toContain('quick-log-more');

    const layoutSrc = readFileSync(join(__dirname, '../app/_layout.tsx'), 'utf8');
    expect(layoutSrc).toContain('"quick-log"');
    expect(layoutSrc).not.toContain('"quick-log-more"');
  });
});
