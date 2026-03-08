// ============================================================================
// APPOINTMENT TYPES CONSTANTS
// Available appointment categories with icons and labels
// ============================================================================

export const APPOINTMENT_TYPES = [
  { id: 'doctor', icon: '🩺', label: 'Doctor' },
  { id: 'lab', icon: '🧪', label: 'Lab' },
  { id: 'pharmacy', icon: '💊', label: 'Pharmacy' },
  { id: 'hospital', icon: '🏥', label: 'Hospital' },
  { id: 'therapy', icon: '🧠', label: 'Therapy' },
  { id: 'other', icon: '📋', label: 'Other' },
] as const;
