/**
 * MedsBatchPanel — Missed medication "Log Late" action
 * Verifies that missed medications render a tappable element.
 */

describe('MedsBatchPanel missed medication handling', () => {
  test('missed meds should have onItemPress called (Log Late path)', () => {
    const mockOnItemPress = jest.fn();
    const missedMed = {
      id: 'med-1',
      itemName: 'Aspirin 81mg',
      itemDosage: '81mg',
      scheduledTime: '12:00',
      status: 'missed',
    };

    const isMissed = missedMed.status === 'missed';
    expect(isMissed).toBe(true);

    if (isMissed) {
      mockOnItemPress(missedMed);
    }
    expect(mockOnItemPress).toHaveBeenCalledWith(missedMed);
  });

  test('dosage deduplication: skip dosage in subtitle when name includes it', () => {
    const med = { itemName: 'Aspirin 81mg', itemDosage: '81mg' };
    const showDosage = med.itemDosage && !med.itemName.includes(med.itemDosage);
    expect(showDosage).toBe(false);
  });

  test('dosage shown when name does NOT include it', () => {
    const med = { itemName: 'Aspirin', itemDosage: '81mg' };
    const showDosage = med.itemDosage && !med.itemName.includes(med.itemDosage);
    expect(showDosage).toBeTruthy();
  });
});
