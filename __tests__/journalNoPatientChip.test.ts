import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../app/(tabs)/journal.tsx'),
  'utf-8',
);

describe('Journal – no patient chip in header', () => {
  test('headerPatientChip style is removed', () => {
    expect(src).not.toContain('headerPatientChip');
  });

  test('headerPatientAvatar style is removed', () => {
    expect(src).not.toContain('headerPatientAvatar');
  });

  test('headerAllergyBadge style is removed', () => {
    expect(src).not.toContain('headerAllergyBadge');
  });

  test('no patient chip TouchableOpacity in header', () => {
    expect(src).not.toContain('showPatientCard');
  });

  test('Share button still exists', () => {
    expect(src).toContain('headerShareBtn');
    expect(src).toContain('Share daily summary');
  });
});
