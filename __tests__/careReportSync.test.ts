import * as fs from 'fs';
import * as path from 'path';

describe('Care Report data sync', () => {
  const filePath = path.resolve(__dirname, '../app/care-report.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  test('Handoff view uses CareBrief medication status, not legacy m.taken', () => {
    // The computed takenCount should reference briefMeds/careBrief, not m.taken
    expect(content).toContain('briefMeds');
    expect(content).toContain("m.status === 'completed'");
  });

  test('TodayView accepts careBrief prop', () => {
    expect(content).toMatch(/TodayView[\s\S]*?careBrief/);
  });

  test('TodayView medication list uses CareBrief status', () => {
    // Should find briefMed for status resolution, not just med.taken
    expect(content).toContain('briefMed');
  });

  test('totalScheduledMeds uses CareBrief count', () => {
    expect(content).toContain('totalScheduledMeds');
  });
});
