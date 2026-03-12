import * as fs from 'fs';
import * as path from 'path';

const LOG_SCREENS = [
  'app/log-note.tsx',
  'app/log-vitals.tsx',
  'app/log-meal.tsx',
  'app/log-mood.tsx',
  'app/log-sleep.tsx',
  'app/log-pain.tsx',
  'app/log-symptom.tsx',
  'app/log-morning-wellness.tsx',
  'app/log-evening-wellness.tsx',
  'app/log-medication-plan-item.tsx',
  'app/medication-confirm.tsx',
];

describe('Log screen confirmations', () => {
  const projectRoot = path.resolve(__dirname, '..');

  LOG_SCREENS.forEach(screenPath => {
    it(`${screenPath} should import SaveConfirmation`, () => {
      const filePath = path.join(projectRoot, screenPath);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('SaveConfirmation');
    });
  });
});
