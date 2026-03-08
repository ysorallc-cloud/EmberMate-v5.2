// ============================================================================
// EMBERMATE STRING CONSTANTS
// Centralized strings to prevent incorrect baby/infant content
// ============================================================================

export const AppStrings = {
  // App identity
  appName: 'EmberMate',
  tagline: 'Caring for those who matter most',

  // Care recipient defaults
  defaultCareRecipient: 'Loved One',
  careRecipientPlaceholder: 'Loved One',

  // Roles
  roles: {
    primary: 'Primary Caregiver',
    family: 'Family',
    healthcare: 'Healthcare Provider',
    friend: 'Friend',
    aide: 'Home Health Aide',
    careRecipient: 'Care Recipient',
  },

  // Categories
  categories: {
    meds: 'Meds',
    vitals: 'Vitals',
    wellness: 'Wellness',
    sleep: 'Sleep',
    food: 'Food',
    water: 'Water',
    notes: 'Notes',
  },

  // Common actions
  actions: {
    log: 'Log',
    save: 'Save',
    cancel: 'Cancel',
    share: 'Share',
    export: 'Export',
    delete: 'Delete',
    edit: 'Edit',
  },

  // Time references
  time: {
    now: 'Just now',
    today: 'Today',
    yesterday: 'Yesterday',
    overdue: 'Overdue',
    upcoming: 'Upcoming',
  },

  // Status messages
  status: {
    peaceful: 'Peaceful',
    allGood: 'All care flows smoothly today',
    needsAttention: 'Needs attention',
    onTrack: 'On track',
  },

  // Empty states
  empty: {
    noMedications: 'No medications added yet',
    noVitals: 'No vitals recorded today',
    noInsights: 'Keep logging to discover patterns',
    noCareTeam: 'Invite family and healthcare providers',
  },

  // Onboarding
  onboarding: {
    welcome: {
      title: 'Welcome to EmberMate',
      subtitle: 'Caring for those who matter most',
    },
    track: {
      badge: 'TRACK EVERYTHING',
      title: 'One place for all health data',
      footer: 'Quick, intuitive logging designed for busy caregivers',
    },
    understand: {
      badge: 'AI-POWERED INSIGHTS',
      title: "Spot patterns you'd miss",
      footer: "Discover what matters for your loved one's health",
    },
    connect: {
      badge: 'CARE CIRCLE',
      title: 'Caring is better together',
      footer: 'Everyone stays informed, from medication schedules to doctor visits',
    },
    coffee: {
      badge: 'COFFEE MOMENT',
      title: 'Start each day grounded',
      description: 'A 2-minute ritual to start your caregiving day with intention',
    },
  },

  // Disclaimer
  disclaimer: {
    short: 'EmberMate is a personal health tracking tool, not a medical device. Your data stays on your device. Always consult your healthcare provider for medical decisions.',
    checkboxLabel: 'I understand and accept these terms',
    viewFull: 'View Full Disclaimer →',
  },

  // Insights
  insights: {
    patternDetected: 'PATTERN DETECTED',
    confidence: 'confidence',
    occurrences: 'occurrences',
  },

  // Reports
  reports: {
    clinicalSummary: 'Clinical Summary',
    medicationReport: 'Medication Report',
    vitalsOverview: 'Vitals Overview',
    visitPrep: 'Visit Prep',
  },

  // Error messages
  errors: {
    generic: 'Something went wrong. Please try again.',
    network: 'Unable to connect. Check your internet connection.',
    save: 'Unable to save. Please try again.',
  },
};

// ============================================================================
// FORBIDDEN TERMS - DO NOT USE ANYWHERE IN THE APP
// ============================================================================
//
// EmberMate is an ELDERLY CAREGIVING app, not baby/infant tracking
//
// ❌ NEVER use these terms:
// - "Little Human"
// - "baby", "infant", "newborn", "child" (in caregiving context)
// - "feeding", "nursing", "bottle", "formula" (use "medication" instead)
// - "diaper" (use "symptom" or remove)
// - "sleep-deprived parents" (use "caregivers")
// - "tummy time" (use "mobility")
// - "milestones" (use "health goals")
// - "pediatrician" (use "doctor" or "healthcare provider")
//
// ❌ NEVER use these emojis:
// - 🍼 (use 💊 for medications)
// - 👶 or 🧒 (use ❤️ or 👤 for care recipients)
// - 🚼 (use ❤️ or 🏥)
//
// ============================================================================

export default AppStrings;
