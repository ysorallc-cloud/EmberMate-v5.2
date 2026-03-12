import * as fs from 'fs';
import * as path from 'path';

describe('ShareReportSheet component', () => {
  const filePath = path.resolve(__dirname, '..', 'components', 'journal', 'ShareReportSheet.tsx');

  it('file exists', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('exports ShareReportSheet', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/export\s+(function|const)\s+ShareReportSheet/);
  });

  it('accepts visible, onClose, brief, and patientName props', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('visible');
    expect(content).toContain('onClose');
    expect(content).toContain('brief');
    expect(content).toContain('patientName');
    expect(content).toContain('CareBrief');
  });
});
