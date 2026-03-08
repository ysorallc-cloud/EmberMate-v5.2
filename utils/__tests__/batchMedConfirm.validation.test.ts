// File: utils/__tests__/batchMedConfirm.validation.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Batch med confirm elevation', () => {
  const now = readFileSync(
    join(__dirname, '../../app/(tabs)/today.tsx'), 'utf8');

  test('MorningMedsBanner renders before TimelineSection', () => {
    const bannerPos = now.indexOf('MorningMedsBanner');
    const timelinePos = now.indexOf('TimelineSection');
    expect(bannerPos).toBeGreaterThan(-1);
    expect(bannerPos).toBeLessThan(timelinePos);
  });

  test('MorningMedsBanner component exists', () => {
    expect(() => readFileSync(
      join(__dirname, '../../components/now/MorningMedsBanner.tsx')
    )).not.toThrow();
  });

  test('banner has batch confirm handler', () => {
    const b = readFileSync(
      join(__dirname, '../../components/now/MorningMedsBanner.tsx'), 'utf8');
    expect(b).toMatch(/onConfirmAll|handleBatchMed|batchConfirm/i);
  });
});
