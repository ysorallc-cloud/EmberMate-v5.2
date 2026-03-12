import * as fs from 'fs';
import * as path from 'path';

describe('Insights tab integration', () => {
  const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'understand.tsx');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8');
  });

  it('imports InsightsCalendar', () => {
    expect(content).toContain('InsightsCalendar');
  });

  it('imports generateSummaryText', () => {
    expect(content).toContain('generateSummaryText');
  });

  it('default timeRange state is 7', () => {
    expect(content).toMatch(/useState.*TimeRange.*\(7\)/);
  });

  it('has insightsSummaryCalendar combined card style', () => {
    expect(content).toContain('insightsSummaryCalendar');
  });

  it('summaryRow style does NOT exist (old 3-stat layout removed)', () => {
    expect(content).not.toContain('summaryRow');
  });
});
