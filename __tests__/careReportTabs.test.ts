import * as fs from 'fs';
import * as path from 'path';

describe('Care Report tabs', () => {
  const filePath = path.resolve(__dirname, '..', 'app', 'care-report.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  it('should have exactly 2 scope options', () => {
    // Extract the SCOPE_OPTIONS array content
    const match = content.match(/const SCOPE_OPTIONS[^=]*=\s*\[([\s\S]*?)\];/);
    expect(match).not.toBeNull();
    // Count the number of { id: entries
    const idMatches = match![1].match(/id:\s*'/g);
    expect(idMatches).not.toBeNull();
    expect(idMatches!.length).toBe(2);
  });

  it('should not have visit as a scope id', () => {
    const match = content.match(/const SCOPE_OPTIONS[^=]*=\s*\[([\s\S]*?)\];/);
    expect(match).not.toBeNull();
    expect(match![1]).not.toContain("id: 'visit'");
  });

  it('should have Summary as a scope label', () => {
    const match = content.match(/const SCOPE_OPTIONS[^=]*=\s*\[([\s\S]*?)\];/);
    expect(match).not.toBeNull();
    expect(match![1]).toContain('Summary');
  });
});
