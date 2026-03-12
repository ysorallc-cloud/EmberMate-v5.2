import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../app/(tabs)/understand.tsx'),
  'utf-8',
);

describe('Insights – combined summary + calendar card', () => {
  test('has insightsSummaryCalendar combined container style', () => {
    expect(src).toContain('insightsSummaryCalendar');
  });

  test('summaryText and InsightsCalendar are inside the same container', () => {
    const cardStart = src.indexOf('insightsSummaryCalendar');
    const summaryInCard = src.indexOf('summaryText', cardStart);
    const calendarInCard = src.indexOf('InsightsCalendar', summaryInCard);
    expect(summaryInCard).toBeGreaterThan(cardStart);
    expect(calendarInCard).toBeGreaterThan(summaryInCard);
  });

  test('old separate insightSummaryCard style is removed', () => {
    expect(src).not.toContain('insightSummaryCard');
  });

  test('combined card has green left border accent', () => {
    expect(src).toContain('borderLeftColor: c.accent');
  });
});
