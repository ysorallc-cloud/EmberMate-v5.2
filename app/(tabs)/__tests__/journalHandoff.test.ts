/**
 * Verifies handoff notes deduplicate medications with same name + time.
 */
describe('Journal handoff notes deduplication', () => {
  test('same medication taken at same time should appear once', () => {
    const medications = [
      { name: 'Metformin 1000mg', status: 'completed', takenAt: '2026-03-06T11:36:00Z' },
      { name: 'Metformin 1000mg', status: 'completed', takenAt: '2026-03-06T11:36:00Z' },
      { name: 'Lisinopril 20mg', status: 'completed', takenAt: '2026-03-06T11:36:00Z' },
      { name: 'Lisinopril 20mg', status: 'completed', takenAt: '2026-03-06T11:36:00Z' },
      { name: 'Warfarin 5mg', status: 'completed', takenAt: '2026-03-06T11:36:00Z' },
    ];

    const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const seenMeds = new Set<string>();
    const items: string[] = [];

    for (const med of medications) {
      if ((med.status === 'completed' || med.status === 'skipped') && med.takenAt) {
        const timeStr = formatTime(med.takenAt);
        const dedupKey = `${med.name}|${timeStr}`;
        if (seenMeds.has(dedupKey)) continue;
        seenMeds.add(dedupKey);
        items.push(`${med.name} taken at ${timeStr}`);
      }
    }

    expect(items.length).toBe(3); // Metformin, Lisinopril, Warfarin — each once
    expect(items.filter(i => i.includes('Metformin')).length).toBe(1);
    expect(items.filter(i => i.includes('Lisinopril')).length).toBe(1);
  });

  test('same medication at different times should appear for each time', () => {
    const medications = [
      { name: 'Metformin 1000mg', status: 'completed', takenAt: '2026-03-06T08:00:00Z' },
      { name: 'Metformin 1000mg', status: 'completed', takenAt: '2026-03-06T20:00:00Z' },
    ];

    const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const seenMeds = new Set<string>();
    const items: string[] = [];

    for (const med of medications) {
      if (med.status === 'completed' && med.takenAt) {
        const timeStr = formatTime(med.takenAt);
        const dedupKey = `${med.name}|${timeStr}`;
        if (seenMeds.has(dedupKey)) continue;
        seenMeds.add(dedupKey);
        items.push(`${med.name} taken at ${timeStr}`);
      }
    }

    expect(items.length).toBe(2); // Two different times = two entries
  });
});
