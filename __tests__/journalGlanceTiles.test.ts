import * as fs from 'fs';
import * as path from 'path';

describe('Journal glance tiles show recorded values', () => {
  const filePath = path.resolve(__dirname, '../app/(tabs)/journal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  test('tiles include BP reading from vitals', () => {
    expect(content).toContain("label: 'BP'");
    expect(content).toContain("bucket: 'vitals-bp'");
  });

  test('tiles include heart rate from vitals', () => {
    expect(content).toContain("bucket: 'vitals-hr'");
    expect(content).toContain("label: 'HR'");
  });

  test('ringTiles uses push pattern for value-based tiles', () => {
    // Ring tiles use push pattern with fillPct for SVG ring display
    expect(content).toContain('ringTiles.push(');
    expect(content).toContain('fillPct');
    expect(content).toContain('ValueRing');
  });
});
