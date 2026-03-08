# Known Test Failures — Pre-v5.5 Baseline

Captured: 2026-03-08
Suite count: **36 failing** / 71 passing / 107 total
Test count: **124 failing** / 955 passing / 1079 total

Use this file to distinguish pre-existing failures from regressions introduced during v5.5 work.

---

## Category A: Encrypted Storage Mismatch (8 suites, ~25 tests)

Tests read directly from AsyncStorage and `JSON.parse()` the result, but `safeStorage` now writes encrypted `v3:...` data. Fix: update tests to read through `safeStorage` or mock at the decryption layer.

| Suite | Failing tests | Reason |
|-------|--------------|--------|
| `utils/__tests__/medicationStorage.test.ts` | 1 | `resetDailyMedicationStatus` reads encrypted `v3:...` string, not valid JSON |
| `utils/__tests__/medicationFlow.integration.test.ts` | 1 | Same encrypted storage issue in add->take->adherence flow |
| `utils/__tests__/medicationNowSync.integration.test.ts` | 1 | Same encrypted storage issue in medication completion sync |
| `utils/__tests__/appointmentFlow.integration.test.ts` | 1 | Same encrypted storage issue in appointment sort/filter |
| `utils/__tests__/wellnessCheckStorage.test.ts` | 1 | `JSON.parse` on encrypted morning wellness record |
| `utils/__tests__/userFlows.dataConsistency.test.ts` | 2 | Medication + appointment consistency checks hit encrypted data |
| `utils/__tests__/careSummaryBuilder.test.ts` | 4 | Med adherence + flagged items read through encrypted storage |
| `utils/__tests__/handoffDataFlow.integration.test.ts` | 1 | Aggregation hits encrypted wellness/med data |

## Category B: Stale Source-Shape Assertions (18 suites, ~60 tests)

Tests use `fs.readFileSync` + regex to assert UI structure, styles, or imports that have since changed. These are effectively broken snapshot tests.

| Suite | Failing tests | Reason |
|-------|--------------|--------|
| `utils/__tests__/journalRedesign.test.ts` | 14 | Expects "Today's Summary"/"Details"/"Tomorrow" sections; journal restructured |
| `utils/__tests__/errorBoundary.perScreen.test.ts` | 15 | Expects `import ErrorBoundary` in all screens; not yet added |
| `utils/__tests__/insightsRedesign.test.ts` | 9 | Expects Scorecard, computeCategoryTrends, PatternCard; all removed |
| `utils/__tests__/carePlanRedesign.test.ts` | 8 | Expects "Tracking"/"Daily Schedule"/"Available" sections; care-plan redesigned |
| `utils/__tests__/insightsQuickActions.test.ts` | 3 | Expects "All Trends" link and quickActionsGrid style; removed |
| `utils/__tests__/journalBadgeActions.test.ts` | 2 | Expects `dataRowDot` style and `/care-report` link; removed |
| `utils/__tests__/nowScreenSections.validation.test.ts` | 2 | Expects max 3 SectionHeaders (now 5) and no SampleDataBanner |
| `utils/__tests__/nowDeadImports.test.ts` | 2 | Expects SampleDataBanner NOT imported; it still is |
| `utils/__tests__/nowRefinedCards.test.ts` | 2 | Expects `zoneDivider` style and no emoji icon props |
| `utils/__tests__/freemiumRebalance.validation.test.ts` | 2 | Expects `free.maxPatients === 1`; now 10 |
| `utils/__tests__/insightsQuickActionsCompact.test.ts` | 1 | Expects `quickActionCard` with `flexDirection: 'row'`; style removed |
| `utils/__tests__/insightsTrendsInline.test.ts` | 1 | Expects `vitalsSectionHeader` style; renamed/removed |
| `utils/__tests__/quickLogFAB.validation.test.ts` | 1 | Expects `QuickLogFAB` in now.tsx source; not present |
| `utils/__tests__/journalQuickLog.test.ts` | 1 | Expects share action in journal; removed |
| `utils/__tests__/onboardingCleanup.validation.test.ts` | 1 | Expects exactly 3 onboarding screens; now 4 (WhoIsThisFor added) |
| `utils/__tests__/userFlows.navigation.test.ts` | 3 | Reads `app/hub/reports.tsx` which no longer exists (ENOENT) |
| `__tests__/hooks/sampleDataWiring.test.ts` | 4 | Expects 3 sample medications, 2 appointments; generator now creates more |
| `utils/__tests__/vitalThresholds.test.ts` | 5 | Status color changed from `#10B981` to `#34D399` |

## Category C: Logic / Behavior Regressions (6 suites, ~25 tests)

Actual business logic mismatches — the app behavior changed but tests weren't updated.

| Suite | Failing tests | Reason |
|-------|--------------|--------|
| `utils/__tests__/carePlanSync.integration.test.ts` | 12 | `getActiveCarePlan()` returns null; auto-creation + syncLogToInstance bridge broken |
| `utils/__tests__/nowRecordFlow.integration.test.ts` | 5 | `ensureDailyInstances()` returns 0 instances; time-window grouping fails |
| `utils/__tests__/dataIntegrity.dualwrite.test.ts` | 8 | Dual-write divergence tests expect rejections that now resolve; ID collision logic changed |
| `utils/__tests__/insightRules.test.ts` | 2 | `med-symptom-correlation` insight not generated; rule logic changed |
| `utils/__tests__/sprint1DataEnrichment.integration.test.ts` | 2 | Same med-symptom-correlation insight; enrichment depends on changed rule |
| `utils/__tests__/secureStorage.test.ts` | 1 | Invalid encrypted data returns raw string instead of falling back to default |

## Category D: Render / Environment Issues (2 suites, ~6 tests)

Tests that render full screen components in node environment; missing mocks for screen-level dependencies.

| Suite | Failing tests | Reason |
|-------|--------------|--------|
| `__tests__/navigation.test.tsx` | 5 | `require()` of full screens fails; components import unmocked native modules |
| `utils/__tests__/cloudBackup.test.ts` | 1 | Backup version expected `3.0.0`, now `3.1.0` |

## Category E: TypeScript Compilation Errors (2 suites)

Test files don't compile due to type mismatches with current interfaces.

| Suite | Reason |
|-------|--------|
| `__tests__/hooks/sampleDataRanges.test.ts` | `energy` and `pain` properties don't exist on mood type; `mood` is now `string` not `number` |
| `utils/__tests__/progressOrbSync.test.ts` | 15 implicit `any` type errors (strict mode) |

---

## Recommended Fix Schedule

| Category | When to fix | Phase |
|----------|-------------|-------|
| A: Encrypted storage | Standalone fix — update test mocks to go through safeStorage | Any time |
| B: Stale assertions | Delete or rewrite alongside the relevant v5.5 phase | Per-phase |
| C: Logic regressions | Investigate root cause; update tests to match current behavior | Any time |
| D: Render/environment | Fix with Phase 1 (navigation) or add proper screen mocks | Phase 1 |
| E: TypeScript errors | Quick fix — update types to match current interfaces | Any time |
