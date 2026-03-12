import * as fs from 'fs';
import * as path from 'path';

describe('Medical disclaimer', () => {
  it('should contain "not a medical device" in settings screen', () => {
    const filePath = path.resolve(__dirname, '..', 'app', 'settings', 'index.tsx');
    const content = fs.readFileSync(filePath, 'utf-8').toLowerCase();

    expect(content).toContain('not a medical device');
  });
});
