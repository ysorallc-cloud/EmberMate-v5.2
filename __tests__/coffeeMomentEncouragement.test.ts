import { getPersonalizedEncouragement, CaregiverInsights } from '../utils/coffee-moment';

describe('Coffee Moment encouragement engine', () => {
  test('returns celebration for 7-day streak with 100% adherence', () => {
    const insights: CaregiverInsights = {
      streak: 7,
      daysSinceLastLogin: 0,
      totalDaysUsing: 7,
      lastNightSleep: 'good',
      recentMoodTrend: 'stable',
      missedSelfCare: false,
      medAdherenceThisWeek: 100,
      vitalsImproving: false,
      symptomsTrending: 'same',
      upcomingAppointment: null,
      lastNightPatientSleep: 'fair',
      justHitStreak: 7,
    };

    const result = getPersonalizedEncouragement(insights);
    expect(result.type).toBe('celebration');
    expect(result.priority).toBe(100);
    expect(result.main).toBeTruthy();
    expect(result.sub).toBeTruthy();
    expect(typeof result.main).toBe('string');
    expect(typeof result.sub).toBe('string');
  });
});
