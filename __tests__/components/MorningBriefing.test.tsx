// ============================================================================
// MorningBriefing Component Tests
// ============================================================================

// Mock react-native minimally (node env, no JSDOM)
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: any) => styles },
  Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default },
}));

// Mock ThemeContext so useTheme() works without a provider
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#FFFFFF',
      textSecondary: '#AAAAAA',
      accent: '#6C63FF',
      accentHint: 'rgba(108,99,255,0.1)',
      background: '#000000',
      glass: 'rgba(255,255,255,0.06)',
      border: 'rgba(255,255,255,0.1)',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
    },
    themeMode: 'dark',
    resolvedTheme: 'dark',
    highContrast: false,
    setThemeMode: jest.fn(),
    setHighContrast: jest.fn(),
  }),
}));

// Mock baselineStorage
jest.mock('../../utils/baselineStorage', () => ({
  getBaselineLanguage: jest.fn((confidence: string) => ({
    adverb: confidence === 'confident' ? 'typically' : 'usually',
    verb: 'seems',
  })),
}));

// Mock caregiverWellnessStorage
jest.mock('../../utils/caregiverWellnessStorage', () => ({
  saveDailyCheck: jest.fn(() => Promise.resolve()),
  getTodayCheck: jest.fn(() => Promise.resolve(null)),
}));

// Mock carePlanGenerator
jest.mock('../../services/carePlanGenerator', () => ({
  getTodayDateString: jest.fn(() => '2026-03-08'),
}));

import React from 'react';
import renderer from 'react-test-renderer';
import { MorningBriefing, MorningBriefingProps } from '../../components/prompts/MorningBriefing';

const defaultProps: MorningBriefingProps = {
  patientName: 'Mom',
  itemCount: 3,
  lastVisitHours: 14,
  orientationMessage: '3 items pending',
  closureMessage: null,
  regulationMessage: null,
  baselineToConfirm: null,
  isFirstUse: false,
  onDismiss: jest.fn(),
  onBaselineConfirm: jest.fn(),
};

describe('MorningBriefing', () => {
  it('exports MorningBriefing component', () => {
    expect(MorningBriefing).toBeDefined();
    expect(typeof MorningBriefing).toBe('function');
  });

  it('does not render when isFirstUse is true (onboarding takes over)', () => {
    const tree = renderer.create(
      <MorningBriefing {...defaultProps} isFirstUse={true} />
    );
    expect(tree.toJSON()).toBeNull();
  });

  it('renders single card (non-null) for returning user', () => {
    const tree = renderer.create(
      <MorningBriefing {...defaultProps} />
    );
    expect(tree.toJSON()).not.toBeNull();
  });

  it('renders when isFirstUse defaults to false', () => {
    const { isFirstUse, ...propsWithoutFirstUse } = defaultProps;
    const tree = renderer.create(
      <MorningBriefing {...propsWithoutFirstUse} patientName="Dad" itemCount={0} lastVisitHours={null} orientationMessage={null} />
    );
    expect(tree.toJSON()).not.toBeNull();
  });

  it('accepts all props including baseline confirm without error', () => {
    expect(() => {
      renderer.create(
        <MorningBriefing
          {...defaultProps}
          itemCount={5}
          lastVisitHours={2}
          orientationMessage="You have 5 items pending today."
          regulationMessage="Take a moment to breathe."
          baselineToConfirm={{
            category: 'meals',
            baseline: {
              category: 'meals',
              dailyCount: 3,
              daysOfData: 7,
              confidence: 'tentative',
              confirmed: false,
              dismissed: false,
            },
          }}
          onBaselineDismiss={jest.fn()}
        />
      );
    }).not.toThrow();
  });

  it('accepts closure message prop', () => {
    const tree = renderer.create(
      <MorningBriefing
        {...defaultProps}
        itemCount={8}
        lastVisitHours={1}
        orientationMessage={null}
        closureMessage="All done for today! Great work."
      />
    );
    expect(tree.toJSON()).not.toBeNull();
  });

  it('renders the testID morning-briefing', () => {
    const tree = renderer.create(
      <MorningBriefing {...defaultProps} orientationMessage={null} />
    );
    const json = tree.toJSON() as any;
    expect(json).not.toBeNull();
    expect(json?.props?.testID).toBe('morning-briefing');
  });
});
