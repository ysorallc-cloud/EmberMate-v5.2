import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

describe('Step 4B: Window batch completion', () => {
  test('TimelineSection has batch complete logic', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'components/now/TimelineSection.tsx'), 'utf8'
    );
    expect(content).toMatch(/batch.*[Cc]omplete|[Cc]omplete.*all/);
  });

  test('TimelineSection accepts completeTask or completeInstance prop', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'components/now/TimelineSection.tsx'), 'utf8'
    );
    expect(
      content.includes('completeTask') ||
      content.includes('completeInstance')
    ).toBe(true);
  });
});
