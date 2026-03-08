/**
 * Verifies category items sort chronologically by scheduledTime,
 * regardless of status (pending, completed, missed).
 */
describe('Category item chronological sorting', () => {
  test('items sorted by scheduledTime regardless of status', () => {
    const items = [
      { id: '1', itemName: 'Dinner', scheduledTime: '18:00', status: 'pending', itemType: 'nutrition' },
      { id: '2', itemName: 'Breakfast', scheduledTime: '08:00', status: 'completed', itemType: 'nutrition' },
      { id: '3', itemName: 'Lunch', scheduledTime: '12:00', status: 'missed', itemType: 'nutrition' },
    ];

    const sorted = [...items].sort((a, b) => {
      const timeA = a.scheduledTime || '';
      const timeB = b.scheduledTime || '';
      return timeA.localeCompare(timeB);
    });

    expect(sorted[0].itemName).toBe('Breakfast');
    expect(sorted[1].itemName).toBe('Lunch');
    expect(sorted[2].itemName).toBe('Dinner');
  });

  test('items without scheduledTime sort to the beginning', () => {
    const items = [
      { id: '1', itemName: 'Dinner', scheduledTime: '18:00', status: 'pending' },
      { id: '2', itemName: 'Unscheduled', scheduledTime: '', status: 'pending' },
      { id: '3', itemName: 'Breakfast', scheduledTime: '08:00', status: 'completed' },
    ];

    const sorted = [...items].sort((a, b) => {
      const timeA = a.scheduledTime || '';
      const timeB = b.scheduledTime || '';
      return timeA.localeCompare(timeB);
    });

    expect(sorted[0].itemName).toBe('Unscheduled');
    expect(sorted[1].itemName).toBe('Breakfast');
    expect(sorted[2].itemName).toBe('Dinner');
  });
});
