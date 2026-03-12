import * as fs from 'fs';
import * as path from 'path';

function getAllTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '__tests__' && entry.name !== 'node_modules') {
      results.push(...getAllTsxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx') && entry.name !== 'care-report.tsx') {
      results.push(fullPath);
    }
  }
  return results;
}

describe('No /care-report navigation references', () => {
  const projectRoot = path.resolve(__dirname, '..');

  it('no .tsx file (except care-report.tsx) references /care-report', () => {
    const appFiles = getAllTsxFiles(path.join(projectRoot, 'app'));
    const componentFiles = getAllTsxFiles(path.join(projectRoot, 'components'));
    const allFiles = [...appFiles, ...componentFiles];

    const matches: string[] = [];
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('/care-report')) {
        matches.push(path.relative(projectRoot, file));
      }
    }

    expect(matches).toEqual([]);
  });
});
