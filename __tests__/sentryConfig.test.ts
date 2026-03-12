import * as fs from 'fs';
import * as path from 'path';

describe('Sentry config', () => {
  it('should not have a hardcoded Sentry DSN in app.json', () => {
    const filePath = path.resolve(__dirname, '..', 'app.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    const appJson = JSON.parse(content);
    const sentryDsn = appJson.expo?.extra?.sentryDsn ?? '';

    expect(sentryDsn).not.toContain('ingest.us.sentry.io');
  });
});
