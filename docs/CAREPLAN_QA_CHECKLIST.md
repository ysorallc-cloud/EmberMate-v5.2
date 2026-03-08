# CarePlan System QA Checklist

This checklist covers testing for the regimen-based CarePlan system implementation.

## Phase 0-3: Core Infrastructure

### Types & Storage
- [ ] `types/carePlan.ts` exports all types correctly
- [ ] `storage/carePlanRepo.ts` CRUD operations work:
  - [ ] `createCarePlan()` creates a new plan
  - [ ] `getActiveCarePlan()` returns active plan
  - [ ] `upsertCarePlanItem()` creates/updates items
  - [ ] `listCarePlanItems()` returns all items
  - [ ] `archiveCarePlanItem()` sets active=false
  - [ ] `deleteCarePlanItem()` removes item

### Daily Instance Generation
- [ ] `ensureDailyInstances()` generates instances for a date
- [ ] Instances are correctly grouped by time window
- [ ] Instance `scheduledTime` is computed from CarePlanItem schedule
- [ ] `windowLabel` is correctly assigned (morning/afternoon/evening/night)

### Logging
- [ ] `logInstanceCompletion()` creates immutable LogEntry
- [ ] LogEntry links to DailyCareInstance via `dailyInstanceId`
- [ ] Instance status updates to 'completed' after logging
- [ ] Cannot undo completed items (immutable)

---

## Phase 4: Record Tab

### DailyInstancesPanel Component
- [ ] Shows "Next Up" card with first pending instance
- [ ] Displays time windows in order: Morning, Afternoon, Evening, Night
- [ ] Each window shows completion count (e.g., "2/4 done")
- [ ] Instance rows show: emoji, name, status text, chevron
- [ ] Long-press reveals action sheet (Mark done / Skip)
- [ ] Tapping instance navigates to appropriate screen

### Dual System Support
- [ ] Falls back to old CarePlan panel if no regimen instances
- [ ] `hasRegimenInstances` correctly detects new vs old system
- [ ] Progress calculations use regimen data when available

---

## Phase 5: Now Tab

### Stats Ring Integration
- [ ] Meds ring shows completed/total from instances
- [ ] Vitals ring shows completed/total from instances
- [ ] Meals ring shows completed/total from instances
- [ ] Mood ring shows completed/total from instances

### Next Up Card
- [ ] Shows next pending instance with emoji and name
- [ ] Tapping navigates to correct screen
- [ ] Hidden when all instances complete

### Timeline
- [ ] Shows instances grouped by time window
- [ ] Appointments appear in timeline
- [ ] Completed items show checkmark

---

## Phase 6: Understand Tab (Insights)

### Adherence Calculations
- [ ] Overall adherence percentage is accurate
- [ ] Per-item adherence tracks completion rate
- [ ] Per-window adherence shows morning vs evening patterns

### Pattern Detection
- [ ] Identifies missed patterns (e.g., "Evening items often missed")
- [ ] Detects positive streaks
- [ ] Suggests improvements based on data

### Statistics
- [ ] Daily completion counts are correct
- [ ] Weekly/monthly aggregations work
- [ ] Data ranges filter correctly

---

## Phase 7: Care Plan Setup

### Manager Screen (`app/care-plan/manage.tsx`)
- [ ] Quick add buttons create items correctly
- [ ] Add modal shows all fields
- [ ] Edit modal pre-fills existing data
- [ ] Delete removes item (with confirmation)
- [ ] Items grouped by type
- [ ] Active toggle works

### Medication Integration
- [ ] Creating medication also creates CarePlanItem
- [ ] Updating medication updates CarePlanItem
- [ ] TimeSlot maps correctly to TimeWindow
- [ ] Repeat option maps to schedule frequency

---

## Phase 8: Migration

### Detection
- [ ] `detectMigrationNeeded()` finds medications without items
- [ ] Returns false after migration complete

### Execution
- [ ] `migrateMedicationsToCarePlan()` converts all medications
- [ ] Creates CarePlan if none exists
- [ ] Does not duplicate items on re-run
- [ ] Preserves medication metadata (time, dosage, notes)

### App Startup
- [ ] Migration runs silently on app load
- [ ] No visible UI during migration
- [ ] Errors logged but don't crash app

---

## Edge Cases

### Empty States
- [ ] No CarePlan: Shows setup CTA
- [ ] No items today: Shows "Nothing scheduled"
- [ ] All complete: Shows celebration state

### Time Boundaries
- [ ] Midnight rollover generates new instances
- [ ] Past window items remain accessible
- [ ] Future items show as "upcoming"

### Data Integrity
- [ ] Deleting CarePlanItem doesn't delete past logs
- [ ] Changing schedule doesn't affect past instances
- [ ] Archiving item stops future generation

---

## Performance

- [ ] Instance generation < 100ms for 10 items
- [ ] List rendering smooth with 50+ instances
- [ ] Storage operations don't block UI

---

## Regression Testing

- [ ] Old medication tracking still works
- [ ] Existing logs accessible
- [ ] Rhythm system doesn't conflict
- [ ] All log screens create proper entries

---

## Test Data Scenarios

1. **New User**: No medications, no care plan
   - Expected: Empty state, setup prompts

2. **Existing User**: Has medications, no CarePlan
   - Expected: Migration creates CarePlan and items

3. **Active User**: Has CarePlan with items
   - Expected: Daily instances generated, tracking works

4. **Complex Schedule**: Multiple items per window
   - Expected: All items shown, progress accurate
