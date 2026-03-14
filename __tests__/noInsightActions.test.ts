import * as fs from 'fs';
import * as path from 'path';

const generatorSrc = fs.readFileSync(
  path.resolve(__dirname, '../utils/insightEngine.ts'),
  'utf-8',
);

const cardSrc = fs.readFileSync(
  path.resolve(__dirname, '../components/insights/InsightCard.tsx'),
  'utf-8',
);

describe('No action buttons on insight cards', () => {
  test('generateAllInsights results do not include actions field', () => {
    // The Now-tab insight generator (generateAllInsights) should not add actions
    // Note: insightEngine also contains understand-tab code that uses actions internally
    const generateAllFn = generatorSrc.match(/async function generateAllInsights[\s\S]*?^}/m);
    if (generateAllFn) {
      expect(generateAllFn[0]).not.toContain('actions:');
    }
  });

  test('actionsRow does NOT appear in InsightCard', () => {
    expect(cardSrc).not.toContain('actionsRow');
  });

  test('actionChip does NOT appear in InsightCard', () => {
    expect(cardSrc).not.toContain('actionChip');
  });
});
