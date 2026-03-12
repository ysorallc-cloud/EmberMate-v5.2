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
      // Exclude devLog.ts, errorReporting.ts, and test files
      if (['devLog.ts', 'errorReporting.ts', 'test-encryption.js'].includes(entry.name)) continue;
      results.push(fullPath);
    }
  }
  return results;
}

describe('No raw console statements in production code', () => {
  it('should not have unguarded console.log/warn/error outside of __DEV__ blocks', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const files = getAllFiles(projectRoot, ['.ts', '.tsx']);
    const consolePattern = /\bconsole\.(log|warn|error)\b/;
    const devGuardPattern = /if\s*\(\s*__DEV__\s*\)/;
    const matches: { file: string; line: number; text: string }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!consolePattern.test(line)) continue;

        // Check if this line itself has __DEV__ guard
        if (devGuardPattern.test(line)) continue;

        // Check if the previous non-empty lines have an if (__DEV__) block
        let guarded = false;
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          if (devGuardPattern.test(lines[j])) {
            guarded = true;
            break;
          }
        }
        if (guarded) continue;

        matches.push({
          file: path.relative(projectRoot, file),
          line: i + 1,
          text: line.trim(),
        });
      }
    }

    if (matches.length > 0) {
      const report = matches
        .map(m => `  ${m.file}:${m.line}: ${m.text}`)
        .join('\n');
      expect(matches).toEqual([]); // Will show the matches in the error
    }
  });
});
