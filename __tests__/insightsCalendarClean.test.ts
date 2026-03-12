import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../components/insights/InsightsCalendar.tsx'),
  'utf-8',
);

describe('InsightsCalendar — clean cells redesign', () => {
  test('SegBar does NOT appear', () => {
    expect(src).not.toContain('SegBar');
  });

  test('cellPct does NOT appear', () => {
    expect(src).not.toContain('cellPct');
  });

  test('getDayCategoryColors is NOT imported', () => {
    expect(src).not.toContain('getDayCategoryColors');
  });

  test('CAT_COLORS is NOT imported', () => {
    expect(src).not.toContain('CAT_COLORS');
  });

  test('legendContainer does NOT appear', () => {
    expect(src).not.toContain('legendContainer');
  });

  test('has appointment dot style', () => {
    expect(src).toContain('apptDot');
  });

  test('has cellToday style', () => {
    expect(src).toContain('cellToday');
  });
});
