/**
 * Central redirect map for deprecated routes.
 * Old routes that were previously individual stub files
 * are now consolidated here.
 */
export const REDIRECTS: Record<string, string> = {
  'care-brief': '/care-report?scope=handoff',
  'care-summary-export': '/care-report?scope=full',
  'daily-care-report': '/care-report?scope=today',
  'medication-report': '/care-report?scope=today',
  'coming-soon': '/(tabs)/today',
  'log-hydration': '/quick-log?expand=hydration',
  'daily-checkin': '/log-morning-wellness',
  'log-bathroom': '/quick-log?expand=bathroom',
  'log-mood': '/quick-log?expand=wellness',
  'log-note': '/quick-log?expand=note',
  'log-symptom': '/quick-log?expand=symptom',
  'log-activity': '/quick-log?expand=activity',
  'log-sleep': '/quick-log?expand=sleep',
  'log-water': '/quick-log?expand=hydration',
  'log-pain': '/quick-log?expand=pain',
  'log-vitals': '/quick-log?expand=vitals',
};
