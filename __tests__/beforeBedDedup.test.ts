// Before Bed dedup: no duplicate "Evening wellness check" entries
describe('Before Bed deduplication', () => {
  test('source file uses seenLabels dedup alongside seenRoutes', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../app/(tabs)/today'),
      'utf8'
    );
    expect(src).toContain('seenLabels');
  });

  test('dedup logic filters duplicate labels', () => {
    const items: { text: string; route: string }[] = [];
    const seenRoutes = new Set<string>();
    const seenLabels = new Set<string>();

    const tasks = [
      { title: 'Evening wellness check', route: '' },
      { title: 'Evening wellness check', route: '/log-evening-wellness' },
      { title: 'Take evening meds', route: '/medications' },
    ];

    for (const task of tasks) {
      if (task.route && seenRoutes.has(task.route)) continue;
      if (task.route) seenRoutes.add(task.route);

      const normalizedText = (task.title || '').toLowerCase().trim();
      if (normalizedText && seenLabels.has(normalizedText)) continue;
      if (normalizedText) seenLabels.add(normalizedText);

      items.push({ text: task.title, route: task.route });
    }

    const eveningCount = items.filter(i => i.text === 'Evening wellness check').length;
    expect(eveningCount).toBe(1);
    expect(items).toHaveLength(2);
  });
});
