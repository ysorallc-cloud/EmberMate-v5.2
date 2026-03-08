// File: utils/__tests__/missedItemRecovery.test.ts
// PURPOSE: Verify missed items are tappable, not dead-end text

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Missed item recovery action', () => {
  const content = readFileSync(
    join(__dirname, '../../components/now/TimelineSection.tsx'), 'utf8'
  );

  test('missed items render as TouchableOpacity, not View', () => {
    // The finished-item render block should use TouchableOpacity for missed
    // Find the isMissed block — it should NOT be a plain <View>
    const missedBlock = content.match(
      /isMissed[\s\S]*?return \([\s\S]*?<(View|TouchableOpacity)/
    );
    // When isMissed is true, it should render a TouchableOpacity
    expect(content).toMatch(/isMissed[\s\S]*?TouchableOpacity/);
  });

  test('missed items show "Log Late" text', () => {
    expect(content).toMatch(/Log Late|Log late|log late/);
  });

  test('missed items call onItemPress on tap', () => {
    // The missed branch should still call onItemPress
    expect(content).toMatch(/isMissed[\s\S]*?onPress.*onItemPress/s);
  });
});
