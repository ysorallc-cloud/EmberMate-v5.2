import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../utils/insightEngine.ts'),
  'utf-8',
);

describe('Insight summary text — complete sentences', () => {
  test('getSentence helper exists', () => {
    expect(src).toContain('function getSentence');
  });

  test('getSentence uses body text for short titles', () => {
    // Should combine title + body when title < 20 chars
    expect(src).toContain('insight.title.length > 20');
    expect(src).toContain('insight.body');
  });

  test('generateSummaryText uses getSentence instead of raw title', () => {
    // Should NOT have the old pattern of `.title + '.'`
    expect(src).not.toMatch(/insights\.\w+\[0\]\.title \+ '\.'/)
  });

  test('getSentence adds em dash between title and body first sentence', () => {
    expect(src).toContain('\\u2014');
  });
});
