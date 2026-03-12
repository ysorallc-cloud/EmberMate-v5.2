import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../components/CoffeeMomentMinimal.tsx'),
  'utf-8',
);

describe('Coffee Moment — articles on pre-start screen', () => {
  test('CAREGIVER_ARTICLES appears', () => {
    expect(src).toContain('CAREGIVER_ARTICLES');
  });

  test('todayArticles appears', () => {
    expect(src).toContain('todayArticles');
  });

  test('articlesSection appears at least twice (pre-start + completion)', () => {
    const matches = src.match(/articlesSection/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});
