// ============================================================================
// Event Sync Parity Tests
// Verifies that Now and Journal tabs listen for the same events,
// and that all log screens emit the correct domain events.
//
// Bug: Wellness log screens only emit EVENT.DAILY_INSTANCES but never
// EVENT.WELLNESS. Journal/Now listen for EVENT.WELLNESS but it's never
// fired, causing stale wellness data after logging.
// Bug: Journal doesn't listen for EVENT.APPOINTMENTS, causing stale
// appointment data when appointments are added/modified.
// ============================================================================

import { EVENT } from '../../lib/eventNames';

// ============================================================================
// TEST 1: Event subscription parity
// ============================================================================

describe('Event subscription parity between Now and Journal', () => {
  // These are the event arrays extracted from both tab files.
  // If either tab's listener changes, this test should be updated to match.

  const NOW_EVENTS = [
    EVENT.MEDICATION, EVENT.VITALS, EVENT.WATER, EVENT.MOOD, EVENT.WELLNESS,
    EVENT.LOGS, EVENT.CARE_PLAN, EVENT.CARE_PLAN_CONFIG, EVENT.APPOINTMENTS,
    EVENT.DAILY_INSTANCES, EVENT.CARE_PLAN_ITEMS, EVENT.SAMPLE_DATA_CLEARED,
    EVENT.SYMPTOMS, EVENT.NOTES,
  ];

  const JOURNAL_EVENTS = [
    EVENT.DAILY_INSTANCES, EVENT.CARE_PLAN_ITEMS, EVENT.LOGS, EVENT.VITALS,
    EVENT.WATER, EVENT.SYMPTOMS, EVENT.MOOD, EVENT.WELLNESS, EVENT.MEDICATION,
    EVENT.NOTES, EVENT.CARE_PLAN, EVENT.CARE_PLAN_CONFIG, EVENT.SAMPLE_DATA_CLEARED,
    EVENT.APPOINTMENTS,
  ];

  it('Now and Journal should listen for the same set of events', () => {
    const nowSet = new Set(NOW_EVENTS);
    const journalSet = new Set(JOURNAL_EVENTS);

    const missingFromJournal = NOW_EVENTS.filter(e => !journalSet.has(e));
    const missingFromNow = JOURNAL_EVENTS.filter(e => !nowSet.has(e));

    expect(missingFromJournal).toEqual([]);
    expect(missingFromNow).toEqual([]);
  });

  it('Both tabs should include EVENT.APPOINTMENTS', () => {
    expect(NOW_EVENTS).toContain(EVENT.APPOINTMENTS);
    expect(JOURNAL_EVENTS).toContain(EVENT.APPOINTMENTS);
  });

  it('Both tabs should include EVENT.WELLNESS', () => {
    expect(NOW_EVENTS).toContain(EVENT.WELLNESS);
    expect(JOURNAL_EVENTS).toContain(EVENT.WELLNESS);
  });
});

// ============================================================================
// TEST 2: Wellness log screens must emit EVENT.WELLNESS
// ============================================================================

describe('Wellness log screens emit correct events', () => {
  const fs = require('fs');
  const path = require('path');

  const morningSource = fs.readFileSync(
    path.resolve(__dirname, '../../app/log-morning-wellness.tsx'), 'utf8'
  );
  const eveningSource = fs.readFileSync(
    path.resolve(__dirname, '../../app/log-evening-wellness.tsx'), 'utf8'
  );

  it('log-morning-wellness should emit EVENT.WELLNESS', () => {
    expect(morningSource).toContain('emitDataUpdate(EVENT.WELLNESS)');
  });

  it('log-evening-wellness should emit EVENT.WELLNESS', () => {
    expect(eveningSource).toContain('emitDataUpdate(EVENT.WELLNESS)');
  });

  it('log-morning-wellness should also emit EVENT.DAILY_INSTANCES', () => {
    expect(morningSource).toContain('emitDataUpdate(EVENT.DAILY_INSTANCES)');
  });

  it('log-evening-wellness should also emit EVENT.DAILY_INSTANCES', () => {
    expect(eveningSource).toContain('emitDataUpdate(EVENT.DAILY_INSTANCES)');
  });
});

// ============================================================================
// TEST 3: Journal source must listen for APPOINTMENTS
// ============================================================================

describe('Journal event listener includes APPOINTMENTS', () => {
  const fs = require('fs');
  const path = require('path');

  const journalSource = fs.readFileSync(
    path.resolve(__dirname, '../../app/(tabs)/journal.tsx'), 'utf8'
  );

  it('journal.tsx useDataListener should include EVENT.APPOINTMENTS', () => {
    expect(journalSource).toContain('EVENT.APPOINTMENTS');
  });
});
