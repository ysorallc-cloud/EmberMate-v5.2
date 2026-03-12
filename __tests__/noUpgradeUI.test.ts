import * as fs from 'fs';
import * as path from 'path';

describe('No upgrade UI placeholders', () => {
  it('should not contain IAP placeholder language in upgrade.tsx', () => {
    const filePath = path.resolve(__dirname, '..', 'app', 'upgrade.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).not.toContain('Coming Soon');
    expect(content).not.toContain('Purchases.purchaseProduct');
    expect(content).not.toContain('handleSubscribe');
  });
});
