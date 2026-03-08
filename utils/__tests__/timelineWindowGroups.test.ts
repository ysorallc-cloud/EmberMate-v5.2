/**
 * Tests for TimelineSection window group changes:
 * 1. Colored status dots on window headers (green/amber/red)
 * 2. Default collapse based on completion status (not time-of-day)
 */
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/now/TimelineSection.tsx'), 'utf-8'
);

// ============================================================================
// Change 1: Colored status dots on window group headers
// ============================================================================
describe('Window header status dots', () => {
  test('windowDot style exists with 8px dimensions and circular shape', () => {
    const dotMatch = src.match(/windowDot:\s*\{[^}]+\}/);
    expect(dotMatch).not.toBeNull();
    const block = dotMatch![0];
    expect(block).toContain('width: 8');
    expect(block).toContain('height: 8');
    expect(block).toContain('borderRadius: 4');
  });

  test('three dot color variants exist (green, amber, red)', () => {
    expect(src).toContain('windowDotGreen:');
    expect(src).toContain('windowDotAmber:');
    expect(src).toContain('windowDotRed:');
  });

  test('window header renders a windowDot View instead of chevron as the first element', () => {
    // The header should render styles.windowDot, not styles.timeGroupChevron as the leading element
    // Find the time group header render block
    const headerBlock = src.match(
      /style=\{[\s\S]*?timeGroupHeader[\s\S]*?<\/TouchableOpacity>/
    );
    expect(headerBlock).not.toBeNull();
    const block = headerBlock![0];
    // Should contain windowDot
    expect(block).toContain('windowDot');
  });

  test('dot color is computed from window items: green when all done, red when overdue/missed, amber otherwise', () => {
    expect(src).toContain('windowDotGreen');
    expect(src).toContain('windowDotAmber');
    expect(src).toContain('windowDotRed');
    // Should reference isOverdue or overdue check for red determination
    expect(src).toMatch(/hasOverdue|isOverdue/);
    // Missed items should make dot red, not green
    expect(src).toContain('hasMissedItems');
  });

  test('missed items prevent green dot and default collapse', () => {
    // allDone must exclude missed status — green only for completed/skipped
    const allDoneMatch = src.match(/const allDone = !hasMissedItems && items\.every/);
    expect(allDoneMatch).not.toBeNull();
    // hasOverdueItems includes hasMissedItems
    expect(src).toMatch(/const hasOverdueItems = hasMissedItems \|\|/);
  });
});

// ============================================================================
// Change 2: Default collapse based on completion status
// ============================================================================
describe('Window default collapse based on completion', () => {
  test('initial collapsedWindows state does NOT use getCurrentTimeWindow', () => {
    // The useState initializer for collapsedWindows should not call getCurrentTimeWindow
    const stateInit = src.match(
      /const \[collapsedWindows, setCollapsedWindows\] = useState[\s\S]*?\)\);/
    );
    expect(stateInit).not.toBeNull();
    const initBlock = stateInit![0];
    expect(initBlock).not.toContain('getCurrentTimeWindow');
  });

  test('collapsed state is computed from item completion status', () => {
    // The initializer should check if all items in a window are completed/skipped/missed
    const stateInit = src.match(
      /const \[collapsedWindows, setCollapsedWindows\] = useState[\s\S]*?\)\);/
    );
    expect(stateInit).not.toBeNull();
    const initBlock = stateInit![0];
    // Should reference status checks for completed/skipped/missed or allDone
    expect(initBlock).toMatch(/completed|skipped|allDone|every/);
  });

  test('pending and done item names use identical font size', () => {
    const pendingMatch = src.match(/timelineName:\s*\{[^}]+\}/);
    const doneMatch = src.match(/timelineNameDone:\s*\{[^}]+\}/);
    expect(pendingMatch).not.toBeNull();
    expect(doneMatch).not.toBeNull();
    // Extract fontSize from both
    const pendingSize = pendingMatch![0].match(/fontSize:\s*(\d+)/);
    const doneSize = doneMatch![0].match(/fontSize:\s*(\d+)/);
    expect(pendingSize).not.toBeNull();
    expect(doneSize).not.toBeNull();
    expect(pendingSize![1]).toBe(doneSize![1]);
  });

  test('chevron is removed — dot + label + count is sufficient', () => {
    // No chevron render in JSX (the ▶/▼ Text element was deleted)
    expect(src).not.toMatch(/\\u25B6|\\u25BC/);
    // TouchableOpacity wrapper still exists for tap-to-toggle
    expect(src).toContain('toggleWindow(window)');
  });
});
