import * as fs from 'fs';
import * as path from 'path';

describe('Step 1E: Journal reads from event store', () => {
  const journalPath = path.resolve(
    __dirname, '../../app/(tabs)/journal.tsx'
  );

  test('journal.tsx imports useEventRange', () => {
    const content = fs.readFileSync(journalPath, 'utf8');
    expect(content).toContain('useEventRange');
  });

  test('journal.tsx imports from hooks/useEvents', () => {
    const content = fs.readFileSync(journalPath, 'utf8');
    expect(content).toMatch(/from.*hooks\/useEvents/);
  });
});
