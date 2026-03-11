import * as fs from 'fs';
import * as path from 'path';

describe('Journal no longer shows ValueRing tiles (moved to Today)', () => {
  const filePath = path.resolve(__dirname, '../app/(tabs)/journal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  test('ValueRing component removed from journal', () => {
    expect(content).not.toContain('function ValueRing');
    expect(content).not.toContain('ringTiles.push(');
  });

  test('reportGlanceTiles still exists for share/report builders', () => {
    expect(content).toContain('reportGlanceTiles');
  });

  test('narrative is used instead of ring tiles', () => {
    expect(content).toContain('generateEnhancedNarrative');
  });
});
