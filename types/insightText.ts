export type InsightSeverity = 'info' | 'watch' | 'good';

export type InsightCategory = 'watch' | 'improving' | 'missing' | 'pattern';

export interface InsightText {
  id: string;
  icon: string;
  category: InsightCategory;
  title: string;
  body: string;
  severity: InsightSeverity;
  relatedTypes?: string[];
  dateRange?: { start: string; end: string };
}
