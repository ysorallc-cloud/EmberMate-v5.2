import * as fs from 'fs';
import * as path from 'path';

function getAllFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '__tests__', '.git', '.expo'].includes(entry.name)) continue;
      results.push(...getAllFiles(fullPath, exts));
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('URL prefix check', () => {
  it('should have no bare-domain ysorallc.org URLs (without www.) in source files', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const files = getAllFiles(projectRoot, ['.ts', '.tsx', '.json']);
    const bareUrlPattern = /https:\/\/ysorallc\.org/g;
    const wwwUrlPattern = /https:\/\/www\.ysorallc\.org/g;
    const matches: { file: string; line: number; text: string }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Find bare domain URLs that are NOT www. prefixed
        const bareMatches = line.match(bareUrlPattern);
        const wwwMatches = line.match(wwwUrlPattern);
        const bareCount = bareMatches ? bareMatches.length : 0;
        const wwwCount = wwwMatches ? wwwMatches.length : 0;
        if (bareCount > wwwCount) {
          matches.push({
            file: path.relative(projectRoot, file),
            line: i + 1,
            text: line.trim(),
          });
        }
      }
    }

    const report = matches
      .map(m => `  ${m.file}:${m.line}: ${m.text}`)
      .join('\n');
    expect(matches.length).toBe(0);
    // If this fails, these URLs need www. prefix:
    // ${report}
  });
});
