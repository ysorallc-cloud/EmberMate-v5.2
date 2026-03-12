import * as fs from 'fs';
import * as path from 'path';

describe('No Export Summary in settings', () => {
  const filePath = path.resolve(__dirname, '..', 'app', 'settings', 'index.tsx');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8');
  });

  it('export-summary does NOT appear in the file', () => {
    expect(content).not.toContain('export-summary');
  });
});
