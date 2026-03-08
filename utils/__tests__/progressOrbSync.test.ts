// ============================================================================
// PROGRESS ORB ↔ DETAIL CARD SYNC TEST
// 
// Bug: Progress orbs (Today's Progress) show different counts than the
// expanded detail cards (Today's Schedule) for the same category.
//
// Root causes:
// 1. todayStats counts only status==='completed' but detail cards show
//    completed+skipped+missed as "resolved" items, creating visual mismatch.
// 2. MedsBatchPanel renders missed items with green checkmark and "Done" 
//    text instead of showing "Missed" status.
//
// The orb numerator should count completed+skipped (items the user handled),
// matching how the detail cards present resolved items. Missed items should
// NOT count as completed in the orb (they were not handled).
// ============================================================================

// ============================================================================
// HELPER: Simulates the todayStats computation from now.tsx
// This is the ORIGINAL buggy version for comparison
// ============================================================================

interface TestInstance {
  id: string;
  itemType: string;
  itemName: string;
  status: string;
  scheduledTime: string;
  itemDosage?: string;
}

function computeTodayStats_BUGGY(instances: TestInstance[]) {
  const getTypeStats = (itemType: string) => {
    const typeInstances = instances.filter((i: TestInstance) => i.itemType === itemType);
    // BUG: Only counts 'completed', ignoring 'skipped'
    const completed = typeInstances.filter((i: TestInstance) => i.status === 'completed').length;
    return { completed, total: typeInstances.length };
  };

  return {
    meds: getTypeStats('medication'),
    vitals: getTypeStats('vitals'),
    meals: getTypeStats('nutrition'),
    wellness: getTypeStats('wellness'),
  };
}

// ============================================================================
// HELPER: Simulates the FIXED todayStats computation
// ============================================================================

function computeTodayStats_FIXED(instances: TestInstance[]) {
  const getTypeStats = (itemType: string) => {
    const typeInstances = instances.filter((i: TestInstance) => i.itemType === itemType);
    // FIX: Count completed + skipped as "handled"
    const completed = typeInstances.filter(
      (i: TestInstance) => i.status === 'completed' || i.status === 'skipped'
    ).length;
    return { completed, total: typeInstances.length };
  };

  return {
    meds: getTypeStats('medication'),
    vitals: getTypeStats('vitals'),
    meals: getTypeStats('nutrition'),
    wellness: getTypeStats('wellness'),
  };
}

// ============================================================================
// HELPER: Simulates todayTimeline.completed from now.tsx
// This is what the detail cards display as "resolved" items
// ============================================================================

function getTimelineCompleted(instances: TestInstance[]) {
  return instances.filter(
    (i: TestInstance) => i.status === 'completed' || i.status === 'skipped' || i.status === 'missed'
  );
}

// ============================================================================
// HELPER: Simulates MedsBatchPanel status text rendering
// ============================================================================

function getMedStatusText_BUGGY(status: string) {
  // BUG: Only checks for 'skipped', everything else (including 'missed') shows "Done"
  return status === 'skipped' ? 'Skipped' : 'Done';
}

function getMedStatusText_FIXED(status: string) {
  // FIX: Properly handle missed status
  if (status === 'missed') return 'Missed';
  if (status === 'skipped') return 'Skipped';
  return 'Done';
}

// ============================================================================
// TEST DATA: Matches the screenshots
// ============================================================================

const SCREENSHOT_INSTANCES = [
  // Meds: 2 instances, both appear "Done" in detail but orb shows 1/2
  { id: 'med-1', itemType: 'medication', itemName: 'Amlodipine 2.5mg', status: 'completed', scheduledTime: '13:00', itemDosage: '2.5mg' },
  { id: 'med-2', itemType: 'medication', itemName: 'Amlodipine 2.5mg', status: 'missed',    scheduledTime: '13:00', itemDosage: '2.5mg' },

  // Meals: 3 instances, 0 completed, Breakfast missed, Lunch/Dinner pending
  { id: 'meal-1', itemType: 'nutrition', itemName: 'Breakfast', status: 'missed',  scheduledTime: '08:00' },
  { id: 'meal-2', itemType: 'nutrition', itemName: 'Lunch',     status: 'pending', scheduledTime: '12:00' },
  { id: 'meal-3', itemType: 'nutrition', itemName: 'Dinner',    status: 'pending', scheduledTime: '18:00' },

  // Wellness: 2 instances, both missed
  { id: 'well-1', itemType: 'wellness', itemName: 'Morning wellness check',   status: 'missed', scheduledTime: '07:00' },
  { id: 'well-2', itemType: 'wellness', itemName: 'Afternoon wellness check', status: 'missed', scheduledTime: '13:00' },
];

// ============================================================================
// TESTS
// ============================================================================

describe('Progress Orb ↔ Detail Card Sync', () => {

  describe('Bug reproduction: todayStats vs detail card counts', () => {

    test('BUGGY: Meds orb shows 1/2 but detail card shows 2 "Done" items', () => {
      const stats = computeTodayStats_BUGGY(SCREENSHOT_INSTANCES);
      const completedMeds = getTimelineCompleted(
        SCREENSHOT_INSTANCES.filter(i => i.itemType === 'medication')
      );

      // Orb shows 1/2 (only counts status==='completed')
      expect(stats.meds.completed).toBe(1);
      expect(stats.meds.total).toBe(2);

      // Detail card shows 2 resolved items (completed + missed)
      expect(completedMeds.length).toBe(2);

      // MISMATCH: orb says 1 done, detail shows 2 "Done" items
      // This is confusing because MedsBatchPanel shows missed as "Done"
      const detailDoneCount = completedMeds.filter(
        (m: TestInstance) => getMedStatusText_BUGGY(m.status) === 'Done'
      ).length;
      expect(detailDoneCount).toBe(2); // Both show "Done" (bug!)
      expect(stats.meds.completed).not.toBe(detailDoneCount); // MISMATCH!
    });

    test('BUGGY: Wellness orb shows 0/2 and detail correctly shows 2 "Missed"', () => {
      const stats = computeTodayStats_BUGGY(SCREENSHOT_INSTANCES);
      // Wellness orb: 0/2 — correct since both are missed
      expect(stats.wellness.completed).toBe(0);
      expect(stats.wellness.total).toBe(2);
    });

    test('BUGGY: Meals orb shows 0/3 — correct since 2 pending + 1 missed', () => {
      const stats = computeTodayStats_BUGGY(SCREENSHOT_INSTANCES);
      expect(stats.meals.completed).toBe(0);
      expect(stats.meals.total).toBe(3);
    });
  });

  describe('Fix verification: MedsBatchPanel status text', () => {

    test('BUGGY: missed med renders as "Done"', () => {
      expect(getMedStatusText_BUGGY('missed')).toBe('Done'); // Wrong!
    });

    test('FIXED: missed med renders as "Missed"', () => {
      expect(getMedStatusText_FIXED('missed')).toBe('Missed');
    });

    test('FIXED: completed med still renders as "Done"', () => {
      expect(getMedStatusText_FIXED('completed')).toBe('Done');
    });

    test('FIXED: skipped med still renders as "Skipped"', () => {
      expect(getMedStatusText_FIXED('skipped')).toBe('Skipped');
    });
  });

  describe('Fix verification: todayStats includes skipped in completed count', () => {

    test('FIXED: skipped items count as completed in orb', () => {
      const instancesWithSkipped = [
        { id: 'med-1', itemType: 'medication', itemName: 'Med A', status: 'completed', scheduledTime: '08:00' },
        { id: 'med-2', itemType: 'medication', itemName: 'Med B', status: 'skipped',   scheduledTime: '08:00' },
        { id: 'med-3', itemType: 'medication', itemName: 'Med C', status: 'pending',    scheduledTime: '20:00' },
      ];

      const buggyStats = computeTodayStats_BUGGY(instancesWithSkipped);
      const fixedStats = computeTodayStats_FIXED(instancesWithSkipped);

      // Buggy: only counts completed (1/3)
      expect(buggyStats.meds.completed).toBe(1);

      // Fixed: counts completed + skipped (2/3)
      expect(fixedStats.meds.completed).toBe(2);
      expect(fixedStats.meds.total).toBe(3);
    });

    test('FIXED: missed items do NOT count as completed in orb', () => {
      const stats = computeTodayStats_FIXED(SCREENSHOT_INSTANCES);

      // Meds: 1 completed + 1 missed → orb should show 1/2
      expect(stats.meds.completed).toBe(1);
      expect(stats.meds.total).toBe(2);

      // Wellness: 0 completed, 2 missed → orb should show 0/2
      expect(stats.wellness.completed).toBe(0);
      expect(stats.wellness.total).toBe(2);

      // Meals: 0 completed, 1 missed, 2 pending → orb should show 0/3
      expect(stats.meals.completed).toBe(0);
      expect(stats.meals.total).toBe(3);
    });
  });

  describe('Orb and detail card consistency after fix', () => {

    test('Meds orb completed count matches detail "Done" count (not "Missed")', () => {
      const stats = computeTodayStats_FIXED(SCREENSHOT_INSTANCES);
      const completedMeds = getTimelineCompleted(
        SCREENSHOT_INSTANCES.filter(i => i.itemType === 'medication')
      );

      // With the fix, the detail card properly shows 1 "Done" + 1 "Missed"
      const detailDoneCount = completedMeds.filter(
        (m: TestInstance) => getMedStatusText_FIXED(m.status) === 'Done'
      ).length;
      const detailMissedCount = completedMeds.filter(
        (m: TestInstance) => getMedStatusText_FIXED(m.status) === 'Missed'
      ).length;

      expect(detailDoneCount).toBe(1);
      expect(detailMissedCount).toBe(1);

      // Now orb (1/2) matches: 1 "Done" in detail
      expect(stats.meds.completed).toBe(detailDoneCount);
    });

    test('All-skipped scenario: orb shows full completion', () => {
      const allSkipped = [
        { id: 'w-1', itemType: 'wellness', itemName: 'Morning check', status: 'skipped', scheduledTime: '07:00' },
        { id: 'w-2', itemType: 'wellness', itemName: 'Evening check', status: 'skipped', scheduledTime: '19:00' },
      ];

      const stats = computeTodayStats_FIXED(allSkipped);
      expect(stats.wellness.completed).toBe(2);
      expect(stats.wellness.total).toBe(2);
    });

    test('Mixed scenario: completed + skipped + missed + pending', () => {
      const mixed = [
        { id: 'm1', itemType: 'medication', itemName: 'Med A', status: 'completed', scheduledTime: '08:00' },
        { id: 'm2', itemType: 'medication', itemName: 'Med B', status: 'skipped',   scheduledTime: '12:00' },
        { id: 'm3', itemType: 'medication', itemName: 'Med C', status: 'missed',    scheduledTime: '08:00' },
        { id: 'm4', itemType: 'medication', itemName: 'Med D', status: 'pending',   scheduledTime: '20:00' },
      ];

      const stats = computeTodayStats_FIXED(mixed);
      // completed(1) + skipped(1) = 2 handled out of 4 total
      expect(stats.meds.completed).toBe(2);
      expect(stats.meds.total).toBe(4);
    });
  });
});
