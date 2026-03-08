// ============================================================================
// COFFEE MOMENT AI - Personalized Encouragement Engine
// V3: Context-aware caregiver support
// ============================================================================

export interface CaregiverInsights {
  // Caregiver data
  streak: number;
  daysSinceLastLogin: number;
  totalDaysUsing: number;

  // Recent events
  lastNightSleep: 'good' | 'fair' | 'poor';
  recentMoodTrend: 'improving' | 'stable' | 'declining';
  missedSelfCare: boolean;

  // Patient data
  medAdherenceThisWeek: number;
  vitalsImproving: boolean;
  symptomsTrending: 'better' | 'same' | 'worse';
  upcomingAppointment: { days: number; doctor: string } | null;
  lastNightPatientSleep: 'good' | 'fair' | 'rough';

  // Milestones
  justHitStreak: number | null; // 7, 14, 30, etc.
}

export interface Encouragement {
  priority: number;
  main: string;
  sub: string;
  type: 'celebration' | 'empathy' | 'preparation' | 'progress' | 'observation' | 'default';
}

export function getPersonalizedEncouragement(data: CaregiverInsights): Encouragement {
  const encouragements: Encouragement[] = [];

  // === MILESTONE CELEBRATIONS (Highest Priority: 100) ===
  if (data.justHitStreak === 7) {
    encouragements.push({
      priority: 100,
      main: "One whole week.",
      sub: "Seven days of showing up with love. That's not small — that's everything.",
      type: 'celebration',
    });
  }

  if (data.justHitStreak === 14) {
    encouragements.push({
      priority: 100,
      main: "Two weeks strong.",
      sub: "You've built something real here. A rhythm of care that matters.",
      type: 'celebration',
    });
  }

  if (data.justHitStreak === 30) {
    encouragements.push({
      priority: 100,
      main: "One month.",
      sub: "Thirty days of dedication. You're extraordinary.",
      type: 'celebration',
    });
  }

  // === ACKNOWLEDGING HARD MOMENTS (Priority: 80-90) ===
  if (data.lastNightPatientSleep === 'rough') {
    encouragements.push({
      priority: 90,
      main: "Last night was hard.",
      sub: "You got through it. You're here. That takes strength.",
      type: 'empathy',
    });
  }

  if (data.daysSinceLastLogin >= 3) {
    encouragements.push({
      priority: 85,
      main: "Welcome back.",
      sub: "Taking breaks is human. You're here now, and that's what counts.",
      type: 'empathy',
    });
  }

  if (data.symptomsTrending === 'worse') {
    encouragements.push({
      priority: 80,
      main: "It's been a tough stretch.",
      sub: "Hard days don't mean you're failing. You're still showing up.",
      type: 'empathy',
    });
  }

  // === CELEBRATING WINS (Priority: 65-75) ===
  if (data.medAdherenceThisWeek === 100) {
    encouragements.push({
      priority: 75,
      main: "Every dose, every day this week.",
      sub: "That consistency is making a real difference.",
      type: 'celebration',
    });
  }

  if (data.vitalsImproving) {
    encouragements.push({
      priority: 70,
      main: "The numbers are moving in the right direction.",
      sub: "Your steady care is working. Keep going.",
      type: 'celebration',
    });
  }

  if (data.symptomsTrending === 'better') {
    encouragements.push({
      priority: 65,
      main: "Things are improving.",
      sub: "Your dedication is showing in the details.",
      type: 'celebration',
    });
  }

  // === UPCOMING EVENTS (Priority: 60) ===
  if (data.upcomingAppointment && data.upcomingAppointment.days <= 2) {
    const dayText = data.upcomingAppointment.days === 0
      ? 'today'
      : data.upcomingAppointment.days === 1
        ? 'tomorrow'
        : 'in 2 days';
    encouragements.push({
      priority: 60,
      main: `${data.upcomingAppointment.doctor} visit ${dayText}.`,
      sub: "You've been preparing well. You've got this.",
      type: 'preparation',
    });
  }

  // === STREAK ACKNOWLEDGMENTS (Priority: 45-50) ===
  if (data.streak >= 3 && data.streak < 7 && !data.justHitStreak) {
    encouragements.push({
      priority: 50,
      main: `${data.streak} days in a row.`,
      sub: "You're building a rhythm. That consistency matters.",
      type: 'progress',
    });
  }

  // === DEFAULT ROTATION (Priority: 10) ===
  const defaults = [
    { main: "You're showing up with love, day after day.", sub: "That's extraordinary." },
    { main: "Caregiving is hard. And you're still here.", sub: "That takes real strength." },
    { main: "You matter just as much as the person you care for.", sub: "Don't forget that." },
    { main: "There's no perfect way to do this.", sub: "Your way is enough." },
    { main: "Rest isn't earned. It's needed.", sub: "You deserve it." },
  ];

  const dayIndex = Math.floor(Date.now() / 86400000) % defaults.length;
  encouragements.push({
    priority: 10,
    ...defaults[dayIndex],
    type: 'default',
  });

  // Return highest priority
  encouragements.sort((a, b) => b.priority - a.priority);
  return encouragements[0];
}

// Helper to get sample data for testing
export function getSampleCaregiverInsights(): CaregiverInsights {
  return {
    streak: 5,
    daysSinceLastLogin: 0,
    totalDaysUsing: 21,
    lastNightSleep: 'fair',
    recentMoodTrend: 'stable',
    missedSelfCare: false,
    medAdherenceThisWeek: 94,
    vitalsImproving: true,
    symptomsTrending: 'same',
    upcomingAppointment: { days: 1, doctor: 'Dr. Chen' },
    lastNightPatientSleep: 'fair',
    justHitStreak: null,
  };
}
