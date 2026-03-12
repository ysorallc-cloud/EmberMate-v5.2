import * as fs from 'fs';
import * as path from 'path';

describe('InsightsCalendar component', () => {
  const filePath = path.resolve(__dirname, '..', 'components', 'insights', 'InsightsCalendar.tsx');

  it('file exists', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('exports InsightsCalendar', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/export\s+(function|const)\s+InsightsCalendar/);
  });

  it('accepts timeRange and calendarDays props', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('timeRange');
    expect(content).toContain('calendarDays');
    expect(content).toContain('CalendarDay');
  });
});
