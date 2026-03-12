// ============================================================================
// SAVE DESTINATIONS
// Maps log types to where their data appears in the app
// ============================================================================

export const SAVE_DESTINATIONS = {
  note: [
    { icon: '📋', text: 'Appears in Handoff Report' },
    { icon: '📖', text: 'Saved to Journal for today' },
  ],
  vitals: [
    { icon: '📖', text: 'Saved to Journal' },
    { icon: '🩺', text: 'Available in Provider Visit Prep' },
    { icon: '📊', text: 'Updates Vitals Trends' },
  ],
  meal: [
    { icon: '📖', text: 'Saved to Journal' },
    { icon: '💡', text: 'Feeds Nutrition Insights' },
  ],
  medication: [
    { icon: '✅', text: 'Updated on Today\'s Schedule' },
    { icon: '📊', text: 'Tracks Adherence History' },
  ],
  mood: [
    { icon: '📖', text: 'Saved to Journal' },
    { icon: '💡', text: 'Contributes to Mood Trends' },
  ],
  sleep: [
    { icon: '📖', text: 'Saved to Journal' },
    { icon: '💡', text: 'Feeds Wellness Insights' },
  ],
  pain: [
    { icon: '📖', text: 'Saved to Journal' },
    { icon: '🩺', text: 'Available in Provider Visit Prep' },
  ],
  symptom: [
    { icon: '📖', text: 'Saved to Journal' },
    { icon: '🩺', text: 'Available in Provider Visit Prep' },
  ],
  wellness: [
    { icon: '✅', text: 'Updated on Today\'s Schedule' },
    { icon: '💡', text: 'Feeds Wellness Trends' },
  ],
};
