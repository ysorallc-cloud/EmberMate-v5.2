import * as fs from 'fs';
import * as path from 'path';

describe('Journal ShareReportSheet integration', () => {
  const filePath = path.resolve(__dirname, '..', 'app', '(tabs)', 'journal.tsx');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8');
  });

  it('imports ShareReportSheet', () => {
    expect(content).toContain('ShareReportSheet');
  });

  it('footerShareBtn does NOT appear in styles', () => {
    expect(content).not.toContain('footerShareBtn');
  });

  it('showDailyPreview does NOT appear as state', () => {
    expect(content).not.toContain('showDailyPreview');
  });

  it('showClinicalPreview does NOT appear as state', () => {
    expect(content).not.toContain('showClinicalPreview');
  });
});
