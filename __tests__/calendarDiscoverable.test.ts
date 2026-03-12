import * as fs from 'fs';
import * as path from 'path';

describe('Calendar discoverability (moved to Insights)', () => {
  const todayPath = path.resolve(__dirname, '..', 'app', '(tabs)', 'today.tsx');
  const insightsPath = path.resolve(__dirname, '..', 'app', '(tabs)', 'understand.tsx');

  it('Today screen has a greetingDateRow as static text', () => {
    const content = fs.readFileSync(todayPath, 'utf-8');
    expect(content).toContain('greetingDateRow');
    // Should NOT navigate to calendar
    const lines = content.split('\n');
    const rowIdx = lines.findIndex(l => l.includes('greetingDateRow'));
    const nearby = lines.slice(Math.max(0, rowIdx - 5), rowIdx + 5).join('\n');
    expect(nearby).not.toContain("navigate('/calendar')");
  });

  it('Insights tab imports InsightsCalendar', () => {
    const content = fs.readFileSync(insightsPath, 'utf-8');
    expect(content).toContain('InsightsCalendar');
  });
});
