import * as fs from 'fs';
import * as path from 'path';

describe('Settings sections collapsed by default', () => {
  const filePath = path.resolve(__dirname, '..', 'app', 'settings', 'index.tsx');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8');
  });

  it('collapsedCategories initializes with all four category IDs set to true', () => {
    expect(content).toContain('profile: true');
    expect(content).toContain('appearance: true');
    expect(content).toContain('privacy: true');
    expect(content).toContain('about: true');
  });
});
