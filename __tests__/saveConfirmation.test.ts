import * as fs from 'fs';
import * as path from 'path';

describe('SaveConfirmation component', () => {
  const componentPath = path.resolve(__dirname, '..', 'components', 'common', 'SaveConfirmation.tsx');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(componentPath, 'utf-8');
  });

  it('exports SaveConfirmation', () => {
    expect(content).toContain('export const SaveConfirmation');
  });

  it('renders the title prop as a Text element', () => {
    expect(content).toContain('{title}');
  });

  it('renders destination texts via allDestinations map', () => {
    expect(content).toContain('allDestinations.map');
    expect(content).toContain('{dest.text}');
  });

  it('always appends "Stored locally on your device" destination', () => {
    expect(content).toContain('Stored locally on your device');
  });

  it('calls onDismiss after auto-dismiss timer', () => {
    expect(content).toContain('AUTO_DISMISS_MS');
    expect(content).toContain('setTimeout');
    expect(content).toContain('onDismiss()');
  });

  it('returns null when not visible', () => {
    expect(content).toContain('if (!visible) return null');
  });
});
