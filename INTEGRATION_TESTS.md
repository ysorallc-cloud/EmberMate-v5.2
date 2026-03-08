# EmberMate Integration Test Modules

Last updated: 2026-02-08

## Running Tests

```bash
# Run all tests
npx jest

# Run only integration tests
npx jest --testPathPattern=integration

# Run a specific test file
npx jest utils/__tests__/carePlanSync.integration.test.ts

# Run with coverage
npx jest --coverage
```

---

## Test Module Index

| Module | File | Status | Focus |
|--------|------|--------|-------|
| Care Plan Sync | `utils/__tests__/carePlanSync.integration.test.ts` | Current | Config → regimen → instances → completion |
| Medication Flow | `utils/__tests__/medicationFlow.integration.test.ts` | Current | Add → Take → Adherence lifecycle |
| Medication → Now Sync | `utils/__tests__/medicationNowSync.integration.test.ts` | Current | Log medication → task state reflection |
| Appointment Flow | `utils/__tests__/appointmentFlow.integration.test.ts` | Current | Create → Complete → Verify lifecycle |
| Vitals → Understand | `utils/__tests__/vitalsUnderstandSync.integration.test.ts` | Current | Log vitals → centralStorage retrieval |
| Notification System | `utils/__tests__/notificationIntegration.test.ts` | Current | Settings persistence, medication integration |
| Care Circle Sync | `utils/__tests__/careCircleSync.integration.test.ts` | Current | Add → retrieve → remove caregivers |
| Navigation Audit | `__tests__/navigation.test.tsx` | Current | Back buttons, SafeAreaView, tap targets |
| Now Page Helpers | `utils/__tests__/nowHelpers.test.ts` | **New** | Time windows, grouping, display range |
| Now → Record Flow | `utils/__tests__/nowRecordFlow.integration.test.ts` | **New** | Status on Now tab, clean entry on Record |

---

## Module Details

### 1. Care Plan Sync (`carePlanSync.integration.test.ts`)

Tests the full Care Plan ↔ Now Page sync pipeline.

**Covered scenarios:**
- Auto-creation of CarePlan regimen from config (no pre-existing regimen)
- Empty result when no config and no regimen exist
- Inactive vitals/mood/meals items re-activation when bucket re-enabled
- Medication inactive item re-activation with name matching
- `syncLogToInstance` bridge: vitals, mood, specific meal by name
- No double-completion of already-completed instances
- Full end-to-end: config → instances → log each type → all completed
- Bucket toggle off → on cycle: deactivate → re-activate without duplication
- Notification scheduling guard for past-time items

**Key assertions:**
- `ensureDailyInstances()` auto-creates regimen from config
- Inactive items become active when their bucket is re-enabled
- `syncLogToInstance()` marks exactly one pending instance as completed
- Toggling a bucket off then on produces exactly 1 item (no duplicates)

---

### 2. Medication Flow (`medicationFlow.integration.test.ts`)

Tests medication management from creation through daily tracking.

**Covered scenarios:**
- Add medication → take → verify adherence percentage
- Skip day → verify adherence drops
- Low supply → refill → verify supply count
- Duplicate medication rejection
- Multiple medications with daily slot-specific timing

---

### 3. Medication → Now Sync (`medicationNowSync.integration.test.ts`)

Tests that medication log events correctly update task state.

**Covered scenarios:**
- Create medication → mark taken → verify log created
- Multiple medications with mixed completion (1 of 2 taken)
- Undo (untake) medication → verify state reverts

---

### 4. Appointment Flow (`appointmentFlow.integration.test.ts`)

Tests appointment lifecycle from creation to resolution.

**Covered scenarios:**
- Create → complete → verify status
- Create → cancel → verify filtered out
- Multiple appointments sorted by date
- Upcoming vs past distinction
- Date-based filtering
- Mixed state calendar management

---

### 5. Vitals → Understand Sync (`vitalsUnderstandSync.integration.test.ts`)

Tests that vitals logged via `centralStorage` are correctly retrievable.

**Covered scenarios:**
- Save and retrieve complete vitals log
- Vitals reflected in `getTodayLogStatus()`
- Data shape compatibility with Understand page
- Partial vitals (blood pressure only, no heart rate)

---

### 6. Notification System (`notificationIntegration.test.ts`)

Tests notification settings and medication notification scheduling.

**Covered scenarios:**
- Notification service exports exist
- Default notification settings structure and types
- Save and retrieve custom notification settings
- Integration with medication storage (scheduling from med list)

---

### 7. Care Circle Sync (`careCircleSync.integration.test.ts`)

Tests the collaborative care member management.

**Covered scenarios:**
- Add and retrieve a single caregiver
- Multiple caregivers with different roles
- Remove caregiver → verify updated list
- Empty state returns empty array

---

### 8. Navigation Audit (`navigation.test.tsx`)

Tests navigation patterns across screens.

**Covered scenarios:**
- Notification Settings back button calls `router.back()`
- Settings screen back button
- Appointment confirmation navigates to `/appointments`
- SafeAreaView compliance on key screens
- Back navigation error-free
- Tap target minimum 44x44pt (conceptual)

---

### 9. Now Page Helpers (`nowHelpers.test.ts`) — NEW

Tests pure utility functions used by the Now dashboard and CurrentBlockCard.

**Covered scenarios:**
- `getTimeWindow()`: maps ISO timestamps to correct window
- `getCurrentTimeWindow()`: returns correct window for system time
- `getTimeWindowDisplayRange()`: formats "5:00 AM – 12:00 PM" etc.
- `groupByTimeWindow()`: groups instances into windows, sorts by time
- `isOverdue()`: grace period logic, invalid date handling
- `isFuture()`: future vs past distinction
- `parseTimeForDisplay()`: ISO and HH:mm formats, NaN protection
- `formatTime()`: 24hr to 12hr conversion, edge cases

---

### 10. Now → Record Flow (`nowRecordFlow.integration.test.ts`) — NEW

Tests the separation of concerns between Now (status) and Record (entry).

**Covered scenarios:**
- Care Plan instances appear on Now page timeline with urgency
- Record page loads without `useCareTasks` dependency
- Record page renders category cards without status text
- Record page Symptoms card retains "Log concerns" subtitle
- Last Action bar shows most recent vitals timestamp
- Category card press records usage frequency
- Optional Logs section expands/collapses correctly

---

## Recent Changes Requiring Test Updates

### Now Dashboard Redesign (2026-02-07)

| Change | Impact on Tests |
|--------|----------------|
| NextUpCard → CurrentBlockCard | New component shows time-block status, not individual items. Tests should verify `getTimeWindowDisplayRange()` and current-block item filtering. |
| ProgressRings made view-only | Removed `onTileTap` — no navigation on ring tap. No tap handler to test. Rings render correct stroke color based on urgency. |
| TimelineSection redesigned | Overdue items in time groups (not separate section). All items get Log buttons. `groupByTimeWindow()` is the key function. |
| Scroll-to-timeline behavior | `now.tsx` has `scrollToTimeGroup()` — UI behavior, not unit-testable. |

### Record Page Simplification (2026-02-08)

| Change | Impact on Tests |
|--------|----------------|
| Removed `useCareTasks` from Record | Record no longer depends on task state. Removed `getBucketStatus()`, `getBucketCounts()`, `getStatusInfo()`. |
| Category cards show only icon + name + chevron | No status text, no checkmarks, no completion colors. Cards are purely navigational. |
| Kept Last Action bar | Still loads `getTodayVitalsLog()` for timestamp. Covered by vitals sync test. |
| Removed completion feedback banner | `allComplete` computation removed. No "All scheduled items logged" banner. |

### Medication Side Effects Multi-Select (2026-02-07)

| Change | Impact on Tests |
|--------|----------------|
| `sideEffect: string` → `sideEffects: string[]` | Medication log now stores array. Existing tests that check log shape may need array assertion. |
| "None" clears array | Toggle behavior: selecting "None" clears other selections. |

---

## Test Infrastructure

### Mock Setup (`jest.setup.js`)

Global mocks available in all tests:

| Mock | Helper Methods |
|------|---------------|
| `AsyncStorage` | `__getStore()`, `__setStore(obj)`, `__resetStore()` |
| `expo-secure-store` | `__resetStore()` |
| `expo-crypto` | Deterministic hash/random generation |
| `expo-file-system` | Mock file storage |
| `expo-notifications` | Mock scheduling |

### Global Helpers

```javascript
global.resetAllMockStores()  // Reset all storage mocks
global.mockDate(dateString)  // Set fake system time
global.restoreDate()         // Restore real time
```

### Test Patterns

1. **Fake timers**: All integration tests set system time to a fixed point (e.g., `2025-06-15T10:00:00.000Z`)
2. **Precondition → Act → Assert**: Tests verify initial state before performing the action
3. **Builder functions**: `buildConfig()` in carePlanSync creates CarePlanConfig with specified buckets
4. **Unique IDs**: `generateUniqueId()` for deterministic but unique records

---

## Coverage Thresholds

From `jest.config.js`:

| Metric | Threshold |
|--------|-----------|
| Branches | 60% |
| Functions | 70% |
| Lines | 70% |
| Statements | 70% |

Coverage collected from `utils/**/*.ts` (excluding test files).
