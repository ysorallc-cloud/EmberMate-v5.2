import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

describe('Step 4A: Inline timeline logging', () => {
  test('InlineLogForm component exists', () => {
    expect(fs.existsSync(
      path.join(ROOT, 'components/timeline/InlineLogForm.tsx')
    )).toBe(true);
  });

  test('InlineLogForm handles medication type', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'components/timeline/InlineLogForm.tsx'), 'utf8'
    );
    expect(content).toContain('medication');
    expect(content).toContain('onComplete');
    expect(content).toContain('onSkip');
  });

  test('InlineLogForm handles at least 5 task types', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'components/timeline/InlineLogForm.tsx'), 'utf8'
    );
    const types = ['medication', 'vitals', 'nutrition', 'hydration', 'mood'];
    for (const t of types) {
      expect(content).toContain(`'${t}'`);
    }
  });

  test('TimelineSection has expandedTaskId state', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'components/now/TimelineSection.tsx'), 'utf8'
    );
    expect(content).toContain('expandedTaskId');
  });

  test('TimelineSection imports InlineLogForm', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'components/now/TimelineSection.tsx'), 'utf8'
    );
    expect(content).toContain('InlineLogForm');
  });
});
