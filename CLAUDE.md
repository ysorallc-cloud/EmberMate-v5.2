# EmberMate — Claude Code Project Guide

## Git safety — MANDATORY

1. NEVER modify more than 3 files without committing first
2. Before ANY file deletion, run: git add -A && git commit -m "checkpoint before [task]"
3. After completing any task, run: git add -A && git commit -m "[description]" && git push origin main
4. NEVER proceed to the next step of a multi-step task without committing and pushing
5. If a test fails, STOP. Do not attempt to fix cascading failures. Commit what works, report what failed.
6. NEVER run more than one phase or step from an instructions document in a single session
7. When asked to execute a multi-step document, execute ONLY the first step, commit, push, and stop. Wait for explicit approval before proceeding to the next step.

## Stack
- **Framework:** React Native 0.76.9 with Expo SDK 52 (expo-router v4)
- **Language:** TypeScript (strict mode)
- **State:** AsyncStorage + SecureStore, reactive event bus (`lib/events.ts`)
- **Navigation:** File-based routing via `app/` directory (expo-router)
- **Build:** EAS Build (`eas.json` configured for dev/preview/production)
- **Testing:** Jest 30 + ts-jest (run: `npx jest`)

## Directory Layout
```
app/                  # Screens (file-based routing)
  (tabs)/             # 3 tabs: today.tsx, journal.tsx, understand.tsx
  (onboarding)/       # 4-screen onboarding flow
  care-plan/          # Care plan bucket screens (meds, vitals, meals, etc.)
  hub/reports/        # Reports hub with sub-reports
  settings/           # Settings screens
  patient/            # Patient profile screens
components/           # Reusable UI components
  now/                # Now tab components (ProgressRings, TimelineSection, MedsBatchPanel, etc.)
  common/             # Shared components (SampleDataBanner, BackButton, etc.)
constants/            # Static config (quickLogOptions, carePlanTemplates, etc.)
contexts/             # React contexts (PatientContext, ThemeContext)
hooks/                # Custom hooks (useCarePlan, useDailyCareInstances, etc.)
lib/                  # Utilities (events, navigation helpers)
services/             # Business logic (carePlanGenerator, migrationService, appStartup)
storage/              # Data layer (carePlanRepo, subscriptionRepo, etc.)
theme/                # Design tokens (dark, light, high-contrast)
types/                # TypeScript interfaces
utils/                # Utility functions (80+ files)
```

## Key Architecture Patterns

### Data Flow
1. `carePlanGenerator.ts` → `ensureDailyInstances()` creates daily task instances from CarePlanItems
2. `useDailyCareInstances.ts` hook → provides instances + `completeInstance()` to screens
3. `lib/events.ts` → `emitDataUpdate()` / `useDataListener()` keep all screens in sync
4. `safeStorage.ts` → routes sensitive health keys to encrypted SecureStore automatically

### Navigation
- Use `navigate()` from `lib/navigate.ts` (wraps expo-router with safety checks)
- Route names must match filenames in `app/` directory exactly
- Query params: `navigate('/medication-form?id=${id}')`

### Care Plan System
- `CarePlanConfig` (storage/carePlanConfigRepo.ts) = user's bucket preferences
- `CarePlanItem` (storage/carePlanRepo.ts) = individual scheduled items
- `DailyCareInstance` = daily occurrences generated from items by `ensureDailyInstances()`
- `syncMedicationItemsWithConfig()` keeps CarePlanItems in sync with config medications

### Sample Data
- `utils/sampleDataGenerator.ts` → `initializeSampleData()` creates full demo dataset
- Creates: patient profile, medications (5), care plan config, daily instances, 14-day history
- BOTH old-format medications (medicationStorage) AND new CarePlanItems are created
- Migration is pre-marked complete to prevent duplication

## Critical Rules

### Before Modifying Files
1. **Check the file exists first** — several screens were recently removed (care-journey, coming-soon, care-brief, etc.)
2. **Navigation targets must match `app/` filenames** — no file = crash on tap
3. **Test navigation changes:** `grep -rn "your-route" app/ components/` to find all references

### Expo Configuration
- `usesNonExemptEncryption` goes directly under `ios`, NOT under `ios.config`
- EAS uses remote version source (`appVersionSource: "remote"`)
- Build numbers auto-increment via EAS

### When Editing Components
- Theme colors: use `useTheme()` hook → `colors.accent`, `colors.textPrimary`, etc.
- Never hardcode colors — always reference theme tokens
- Emit `emitDataUpdate(EVENT.X)` after any storage write so other screens refresh

### Testing
```bash
npx jest                           # Run all tests
npx jest path/to/file.test.ts      # Run specific test
npx jest --coverage                # Coverage report
```

## Known Issues Being Tracked

### Medication Instance Duplication
The sample data system creates medications in two places. Current mitigations are in place but if duplicates reappear, check:
- `services/carePlanGenerator.ts` lines 570-680 (ensureDailyInstances)
- `services/carePlanGenerator.ts` lines 131-230 (syncMedicationItemsWithConfig)
- `utils/sampleDataGenerator.ts` line 696 (migration status pre-marking)

### File Size Alerts
These screens exceed 1000 lines and should be decomposed when possible:
- `medication-form.tsx` (1,676 lines)
- `(tabs)/today.tsx` (1,560 lines)
- `care-report.tsx` (1,338 lines)
- `(tabs)/understand.tsx` (1,321 lines)
- `(tabs)/journal.tsx` (1,307 lines)
