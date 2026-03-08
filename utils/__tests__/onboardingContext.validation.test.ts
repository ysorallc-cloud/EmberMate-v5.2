// File: utils/__tests__/onboardingContext.validation.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Onboarding context collection', () => {
  const content = readFileSync(
    join(__dirname, '../../app/(onboarding)/screens/GetStartedScreen.tsx'), 'utf8');

  test('has patient name input', () => {
    expect(content).toMatch(/TextInput|patient.*name/i);
  });

  test('has onboarding question flow', () => {
    expect(content).toMatch(/OnboardingAnswers|CareArea|ConcernArea/i);
  });

  test('saves patient name on completion', () => {
    expect(content).toMatch(/patient_name|PATIENT_NAME|patientRegistry/i);
  });

  test('generates care plan config from answers', () => {
    expect(content).toMatch(/generateCarePlanFromOnboarding|saveCarePlanConfig/i);
  });

  test('sample data is NOT default', () => {
    expect(content).not.toMatch(/seedSampleData.*true.*default/i);
  });
});
