// ============================================================================
// STREAKS & GAMIFICATION TYPES
// ============================================================================

export interface StreakData {
  wellnessCheck: {
    current: number;
    longest: number;
    lastDate: string; // YYYY-MM-DD
  };
  medication: {
    current: number;
    longest: number;
    lastDate: string;
  };
  vitals: {
    current: number;
    longest: number;
    lastDate: string;
  };
  selfCare: {
    current: number;
    longest: number;
    lastDate: string;
  };
}

export interface Achievement {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export const ACHIEVEMENTS = {
  // Wellness Check Streaks
  WELLNESS_3: { name: '3-Day Streak', icon: '🌱', tier: 'bronze' as const, description: '3 days of wellness checks' },
  WELLNESS_7: { name: 'Week Warrior', icon: '🌿', tier: 'silver' as const, description: '7 days of wellness checks' },
  WELLNESS_14: { name: 'Two Week Champion', icon: '🌳', tier: 'gold' as const, description: '14 days of wellness checks' },
  WELLNESS_30: { name: 'Month Master', icon: '🏆', tier: 'platinum' as const, description: '30 days of wellness checks' },

  // Medication Adherence Streaks
  MEDICATION_3: { name: 'Medication Starter', icon: '💊', tier: 'bronze' as const, description: '3 days of 100% adherence' },
  MEDICATION_7: { name: 'Medication Pro', icon: '💯', tier: 'silver' as const, description: '7 days of 100% adherence' },
  MEDICATION_14: { name: 'Medication Expert', icon: '⭐', tier: 'gold' as const, description: '14 days of 100% adherence' },
  MEDICATION_30: { name: 'Medication Legend', icon: '👑', tier: 'platinum' as const, description: '30 days of 100% adherence' },

  // Vitals Tracking
  VITALS_3: { name: 'Vital Starter', icon: '❤️', tier: 'bronze' as const, description: '3 days of vitals logging' },
  VITALS_7: { name: 'Vital Tracker', icon: '💝', tier: 'silver' as const, description: '7 days of vitals logging' },
  VITALS_14: { name: 'Vital Guardian', icon: '💖', tier: 'gold' as const, description: '14 days of vitals logging' },
  VITALS_30: { name: 'Vital Champion', icon: '💗', tier: 'platinum' as const, description: '30 days of vitals logging' },

  // Self-Care
  SELFCARE_3: { name: 'Self-Care Beginner', icon: '☕', tier: 'bronze' as const, description: '3 days of self-care breaks' },
  SELFCARE_7: { name: 'Self-Care Advocate', icon: '🧘', tier: 'silver' as const, description: '7 days of self-care breaks' },
  SELFCARE_14: { name: 'Self-Care Master', icon: '🌟', tier: 'gold' as const, description: '14 days of self-care breaks' },
  SELFCARE_30: { name: 'Self-Care Champion', icon: '✨', tier: 'platinum' as const, description: '30 days of self-care breaks' },
};

export const DEFAULT_STREAK_DATA: StreakData = {
  wellnessCheck: {
    current: 0,
    longest: 0,
    lastDate: '',
  },
  medication: {
    current: 0,
    longest: 0,
    lastDate: '',
  },
  vitals: {
    current: 0,
    longest: 0,
    lastDate: '',
  },
  selfCare: {
    current: 0,
    longest: 0,
    lastDate: '',
  },
};
