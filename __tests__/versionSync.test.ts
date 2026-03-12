import * as fs from 'fs';
import * as path from 'path';

describe('Version sync', () => {
  it('should have matching versions in app.json and package.json', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const appJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf-8'));
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));

    const appVersion = appJson.expo.version;
    const pkgVersion = packageJson.version;

    expect(appVersion).toBe(pkgVersion);
  });
});
