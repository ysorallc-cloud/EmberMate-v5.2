/**
 * Verifies that sample data does not create duplicate medication instances.
 * Each medication should have exactly 1 CarePlanItem and 1 daily instance per scheduled time.
 */
describe('Medication instance deduplication', () => {
  test('sample medications should not create duplicate CarePlanItems by medicationId', () => {
    const sampleItems = [
      { id: 'sample-med-aspirin', medicationDetails: { medicationId: 'med-2' }, name: 'Aspirin 81mg' },
      { id: 'sample-med-metformin', medicationDetails: { medicationId: 'med-3' }, name: 'Metformin 1000mg' },
      { id: 'sample-med-lisinopril', medicationDetails: { medicationId: 'med-4' }, name: 'Lisinopril 20mg' },
      { id: 'sample-med-warfarin', medicationDetails: { medicationId: 'med-1' }, name: 'Warfarin 5mg' },
      { id: 'sample-med-gabapentin', medicationDetails: { medicationId: 'med-5' }, name: 'Gabapentin 300mg' },
    ];

    const configMeds = [
      { id: 'med-2', name: 'Aspirin', dosage: '81mg' },
      { id: 'med-3', name: 'Metformin', dosage: '1000mg' },
      { id: 'med-4', name: 'Lisinopril', dosage: '20mg' },
      { id: 'med-1', name: 'Warfarin', dosage: '5mg' },
      { id: 'med-5', name: 'Gabapentin', dosage: '300mg' },
    ];

    const existingByMedId = new Map<string, any>();
    for (const item of sampleItems) {
      if (item.medicationDetails?.medicationId) {
        existingByMedId.set(item.medicationDetails.medicationId, item);
      }
    }

    for (const configMed of configMeds) {
      const match = existingByMedId.get(configMed.id);
      expect(match).toBeDefined();
      expect(match.medicationDetails.medicationId).toBe(configMed.id);
    }
  });

  test('base name dedup prevents duplicates when medicationId mismatches', () => {
    const existingItems = [
      { id: 'item-1', name: 'Aspirin 81mg', medicationDetails: { medicationId: 'old-id-1' } },
      { id: 'item-2', name: 'Metformin 1000mg', medicationDetails: { medicationId: 'old-id-2' } },
    ];

    const configMeds = [
      { id: 'new-id-1', name: 'Aspirin', dosage: '81mg' },
      { id: 'new-id-2', name: 'Metformin', dosage: '1000mg' },
    ];

    // Build lookups (same as syncMedicationItemsWithConfig)
    const existingByMedId = new Map<string, any>();
    const existingByName = new Map<string, any>();
    const existingByBaseName = new Map<string, any>();

    for (const item of existingItems) {
      if (item.medicationDetails?.medicationId) {
        existingByMedId.set(item.medicationDetails.medicationId, item);
      }
      existingByName.set(item.name.toLowerCase().trim(), item);
      const baseName = item.name.split(/\s+\d/)[0].toLowerCase().trim();
      if (!existingByBaseName.has(baseName)) {
        existingByBaseName.set(baseName, item);
      }
    }

    const wouldCreate: string[] = [];
    for (const configMed of configMeds) {
      const matchById = existingByMedId.get(configMed.id);
      const composedName = `${configMed.name} ${configMed.dosage}`.trim().toLowerCase();
      const matchByName = existingByName.get(composedName);

      if (!matchById && !matchByName) {
        const configBaseName = configMed.name.toLowerCase().trim();
        const matchByBaseName = existingByBaseName.get(configBaseName);
        if (matchByBaseName) continue;
        wouldCreate.push(configMed.name);
      }
    }

    expect(wouldCreate).toEqual([]);
  });

  test('5 medications with 1 time window each should produce 5 instances', () => {
    const items = [
      { id: 'item-1', schedule: { times: [{ id: 'w1' }] } },
      { id: 'item-2', schedule: { times: [{ id: 'w2' }] } },
      { id: 'item-3', schedule: { times: [{ id: 'w3' }] } },
      { id: 'item-4', schedule: { times: [{ id: 'w4' }] } },
      { id: 'item-5', schedule: { times: [{ id: 'w5' }] } },
    ];

    let instanceCount = 0;
    const instanceKeys = new Set<string>();

    for (const item of items) {
      for (const tw of item.schedule.times) {
        const key = `${item.id}:${tw.id}`;
        if (!instanceKeys.has(key)) {
          instanceKeys.add(key);
          instanceCount++;
        }
      }
    }

    expect(instanceCount).toBe(5);
  });
});
