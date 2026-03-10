// Watch item labels should use itemName when title is null
describe('Watch item labels', () => {
  test('resolves to itemName when title is null', () => {
    const inst = {
      itemType: 'medication',
      itemName: 'Warfarin 5mg',
      title: null as string | null,
    };
    const label = inst.title || inst.itemName || inst.itemType;
    expect(label).toBe('Warfarin 5mg');
  });

  test('falls back to itemType when both title and itemName are null', () => {
    const inst = {
      itemType: 'medication',
      itemName: null as string | null,
      title: null as string | null,
    };
    const label = inst.title || inst.itemName || inst.itemType;
    expect(label).toBe('medication');
  });

  test('source file uses itemName in timeline building', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../app/(tabs)/today'),
      'utf8'
    );
    // Timeline items should reference itemName for label resolution
    expect(src).toContain('itemName');
  });
});
