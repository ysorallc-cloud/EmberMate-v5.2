import * as fs from 'fs';
import * as path from 'path';

describe('Quick Add Sheet (Chunk 11)', () => {
  test('QuickAddSheet component exists', () => {
    const filePath = path.resolve(__dirname, '../components/today/QuickAddSheet.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('QuickAddSheet only offers symptom, note, bathroom', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../components/today/QuickAddSheet.tsx'),
      'utf-8'
    );
    // Should have these 3 types
    expect(content).toContain("'symptom'");
    expect(content).toContain("'note'");
    expect(content).toContain("'bathroom'");
    // Should NOT have scheduled types
    expect(content).not.toContain("'meds'");
    expect(content).not.toContain("'meals'");
    expect(content).not.toContain("'vitals'");
    expect(content).not.toContain("'hydration'");
  });

  test('Today screen header says Today not Now', () => {
    const todayPath = path.resolve(__dirname, '../app/(tabs)/today.tsx');
    const content = fs.readFileSync(todayPath, 'utf-8');
    expect(content).toContain('title="Today"');
    expect(content).not.toMatch(/title=["']Now["']/);
  });

  test('Today screen does not contain Visit Prep / provider-prep', () => {
    const todayPath = path.resolve(__dirname, '../app/(tabs)/today.tsx');
    const content = fs.readFileSync(todayPath, 'utf-8');
    expect(content).not.toContain('provider-prep');
    expect(content).not.toContain('upcomingPrepAppointment');
    expect(content).not.toContain('UPCOMING THIS WEEK');
  });

  test('Today screen does not import QuickLogCard', () => {
    const todayPath = path.resolve(__dirname, '../app/(tabs)/today.tsx');
    const content = fs.readFileSync(todayPath, 'utf-8');
    expect(content).not.toContain('QuickLogCard');
  });

  test('Today screen does not import QuickLogFAB', () => {
    const todayPath = path.resolve(__dirname, '../app/(tabs)/today.tsx');
    const content = fs.readFileSync(todayPath, 'utf-8');
    expect(content).not.toContain('QuickLogFAB');
  });

  test('Today screen imports QuickAddSheet', () => {
    const todayPath = path.resolve(__dirname, '../app/(tabs)/today.tsx');
    const content = fs.readFileSync(todayPath, 'utf-8');
    expect(content).toContain('QuickAddSheet');
  });

  test('+ button opens QuickAddSheet not navigation', () => {
    const todayPath = path.resolve(__dirname, '../app/(tabs)/today.tsx');
    const content = fs.readFileSync(todayPath, 'utf-8');
    expect(content).not.toContain("navigate('/quick-log')");
    expect(content).not.toContain("navigate('/quick-log-more')");
    expect(content).toContain('showQuickAdd');
  });
});
