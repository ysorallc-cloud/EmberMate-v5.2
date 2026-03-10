import * as fs from 'fs';
import * as path from 'path';

describe('Progress Rings (restored)', () => {
  const filePath = path.resolve(__dirname, '../components/now/ProgressRings.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  test('ProgressRings component exports by same name', () => {
    expect(content).toContain('export function ProgressRings');
  });

  test('uses circular SVG rings', () => {
    expect(content).toContain('ringVal');
    expect(content).toContain('ringLabel');
    expect(content).toContain('Circle');
  });

  test('today screen uses DadOrb with ProgressRings available', () => {
    const todayPath = path.resolve(__dirname, '../app/(tabs)/today.tsx');
    const todayContent = fs.readFileSync(todayPath, 'utf-8');
    expect(todayContent).toContain('DadOrb');
    expect(todayContent).toContain('ProgressRings');
  });

  test('preserves tap-to-filter interface', () => {
    expect(content).toContain('onRingPress');
    expect(content).toContain('selectedCategory');
    expect(content).toContain('accessibilityState');
  });
});
