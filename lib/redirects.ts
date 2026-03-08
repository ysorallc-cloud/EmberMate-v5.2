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
  'log-hydration': '/log-water',
  'daily-checkin': '/log-morning-wellness',
};
