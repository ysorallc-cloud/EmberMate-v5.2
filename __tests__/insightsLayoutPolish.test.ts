import * as fs from 'fs';
import * as path from 'path';

const understandSrc = fs.readFileSync(
  path.resolve(__dirname, '../app/(tabs)/understand.tsx'),
  'utf-8',
);

const calendarSrc = fs.readFileSync(
  path.resolve(__dirname, '../components/insights/InsightsCalendar.tsx'),
  'utf-8',
);

describe('Insights layout polish (Fix 5)', () => {
  test('no "Patterns and trends" subtitle', () => {
    expect(understandSrc).not.toContain('Patterns and trends');
  });

  test('no settings gear on Insights header', () => {
    expect(understandSrc).not.toContain('settingsGear');
  });

  test('segmented bar height is 4px', () => {
    expect(calendarSrc).toContain('height: 4');
  });

  test('legend has no heatmap swatches', () => {
    expect(calendarSrc).not.toContain('legendSwatch');
  });

  test('legend is fully removed (clean cells redesign)', () => {
    expect(calendarSrc).not.toContain('legendContainer');
    expect(calendarSrc).not.toContain('legendRow');
  });
});
