import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

describe('Step 4D: Swipe-to-complete', () => {
  test('TimelineSection imports SwipeableTimelineItem', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'components/now/TimelineSection.tsx'), 'utf8'
    );
    expect(content).toContain('SwipeableTimelineItem');
  });

  test('transformToTimelineItem function exists', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'components/now/TimelineSection.tsx'), 'utf8'
    );
    expect(content).toContain('transformToTimelineItem');
  });
});
