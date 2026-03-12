import * as fs from 'fs';
import * as path from 'path';

describe('No date tap on Today screen', () => {
  const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'today.tsx');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8');
  });

  it('greetingDateRow is NOT wrapped in a TouchableOpacity navigating to calendar', () => {
    // Extract ~20 lines around greetingDateRow render usage
    const lines = content.split('\n');
    const rowIndex = lines.findIndex(l => l.includes('greetingDateRow'));
    // Look within 5 lines before for navigate('/calendar')
    const nearby = lines.slice(Math.max(0, rowIndex - 5), rowIndex + 5).join('\n');
    expect(nearby).not.toContain("navigate('/calendar')");
    expect(nearby).not.toContain('navigate("/calendar")');
  });

  it('chevron character does NOT appear near greetingDate', () => {
    expect(content).not.toContain('greetingDateChevron');
  });
});
