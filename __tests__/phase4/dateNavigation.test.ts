import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

describe('Step 4C: Date navigation', () => {
  test('timeline.tsx has selectedDate state', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'app/(tabs)/timeline.tsx'), 'utf8'
    );
    expect(content).toContain('selectedDate');
  });

  test('timeline.tsx has date navigation arrows', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'app/(tabs)/timeline.tsx'), 'utf8'
    );
    expect(content).toContain('shiftDate');
  });

  test('timeline.tsx passes date to useCareTasks', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'app/(tabs)/timeline.tsx'), 'utf8'
    );
    expect(content).toMatch(
      /useCareTasks\(.*selectedDate|useCareTasks\(.*date/
    );
  });

  test('timeline.tsx disables logging for past dates', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'app/(tabs)/timeline.tsx'), 'utf8'
    );
    expect(content).toMatch(/isToday|getTodayDateString/);
  });
});
