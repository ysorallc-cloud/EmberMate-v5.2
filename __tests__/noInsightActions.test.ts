import * as fs from 'fs';
import * as path from 'path';

const generatorSrc = fs.readFileSync(
  path.resolve(__dirname, '../utils/insightTextGenerator.ts'),
  'utf-8',
);

const cardSrc = fs.readFileSync(
  path.resolve(__dirname, '../components/insights/InsightCard.tsx'),
  'utf-8',
);

describe('No action buttons on insight cards', () => {
  test('actions: does NOT appear in generator', () => {
    expect(generatorSrc).not.toContain('actions:');
  });

  test('actionsRow does NOT appear in InsightCard', () => {
    expect(cardSrc).not.toContain('actionsRow');
  });

  test('actionChip does NOT appear in InsightCard', () => {
    expect(cardSrc).not.toContain('actionChip');
  });
});
