// ============================================================================
// Understand Tab — Bucket Gating Tests
// Verifies menu items and correlation cards filter by enabled buckets
// ============================================================================

// These tests verify the filtering logic used in understand.tsx
// without requiring a full React render (node test env)

import type { BucketType } from '../../types/carePlanConfig';

describe('Understand tab bucket gating', () => {
  // Replicate the filtering logic from understand.tsx menuItems
  interface MenuItem {
    id: string;
    title: string;
    requiredBuckets: BucketType[];
  }

  const ALL_MENU_ITEMS: MenuItem[] = [
    { id: 'visit-prep', title: 'Visit Prep', requiredBuckets: [] },
    { id: 'care-report', title: 'Care Report', requiredBuckets: [] },
    { id: 'patterns', title: 'Patterns Detected', requiredBuckets: [] },
    { id: 'vitals-trends', title: 'Vital Signs Trends', requiredBuckets: ['vitals'] },
  ];

  function filterMenuItems(items: MenuItem[], enabledBuckets: BucketType[]): MenuItem[] {
    return items.filter(item =>
      item.requiredBuckets.length === 0 ||
      item.requiredBuckets.some(b => enabledBuckets.includes(b))
    );
  }

  it('hides Vital Signs Trends when vitals bucket disabled', () => {
    const filtered = filterMenuItems(ALL_MENU_ITEMS, ['meds']);
    const titles = filtered.map(i => i.title);
    expect(titles).not.toContain('Vital Signs Trends');
    expect(titles).toContain('Care Report');
    expect(titles).toContain('Patterns Detected');
  });

  it('shows all items when all buckets enabled', () => {
    const allBuckets: BucketType[] = ['meds', 'vitals', 'meals', 'water', 'sleep', 'activity', 'wellness', 'appointments'];
    const filtered = filterMenuItems(ALL_MENU_ITEMS, allBuckets);
    expect(filtered).toHaveLength(ALL_MENU_ITEMS.length);
  });

  it('shows Vital Signs Trends when vitals bucket is enabled', () => {
    const filtered = filterMenuItems(ALL_MENU_ITEMS, ['meds', 'vitals']);
    const titles = filtered.map(i => i.title);
    expect(titles).toContain('Vital Signs Trends');
  });

  it('Visit Prep and Care Report always visible', () => {
    const filtered = filterMenuItems(ALL_MENU_ITEMS, []);
    const titles = filtered.map(i => i.title);
    expect(titles).toContain('Visit Prep');
    expect(titles).toContain('Care Report');
    expect(titles).toContain('Patterns Detected');
  });

  it('meds-only config shows 3 items (no Vital Signs Trends)', () => {
    const filtered = filterMenuItems(ALL_MENU_ITEMS, ['meds']);
    expect(filtered).toHaveLength(3);
  });

  // Correlation card filtering logic
  describe('correlation card filtering', () => {
    const CARD_BUCKET_KEYWORDS: Record<string, BucketType[]> = {
      sleep: ['sleep'], mood: ['wellness'], hydration: ['water'],
      energy: ['wellness'], meal: ['meals'], med: ['meds'],
      vital: ['vitals'], activity: ['activity'],
    };

    interface CorrelationCard {
      id: string;
      title: string;
    }

    function filterCards(cards: CorrelationCard[], enabledBuckets: BucketType[]): CorrelationCard[] {
      return cards.filter(card => {
        const titleLower = card.title.toLowerCase();
        const relatedBuckets = Object.entries(CARD_BUCKET_KEYWORDS)
          .filter(([keyword]) => titleLower.includes(keyword))
          .flatMap(([, buckets]) => buckets);
        return relatedBuckets.length === 0 || relatedBuckets.some(b => enabledBuckets.includes(b));
      });
    }

    it('filters out sleep card when sleep bucket disabled', () => {
      const cards = [
        { id: '1', title: 'Sleep & Mood' },
        { id: '2', title: 'Hydration & Energy' },
      ];
      const filtered = filterCards(cards, ['meds', 'vitals']);
      expect(filtered).toHaveLength(0);
    });

    it('shows sleep card when sleep or wellness bucket enabled', () => {
      const cards = [
        { id: '1', title: 'Sleep & Mood' },
      ];
      // Sleep keyword maps to 'sleep' bucket, Mood maps to 'wellness'
      const filtered = filterCards(cards, ['sleep']);
      expect(filtered).toHaveLength(1);
    });

    it('shows all cards when all buckets enabled', () => {
      const cards = [
        { id: '1', title: 'Sleep & Mood' },
        { id: '2', title: 'Hydration & Energy' },
      ];
      const allBuckets: BucketType[] = ['meds', 'vitals', 'meals', 'water', 'sleep', 'activity', 'wellness', 'appointments'];
      const filtered = filterCards(cards, allBuckets);
      expect(filtered).toHaveLength(2);
    });

    it('shows generic cards with no bucket keywords', () => {
      const cards = [
        { id: '1', title: 'Overall Trend' },
      ];
      const filtered = filterCards(cards, []);
      expect(filtered).toHaveLength(1);
    });
  });
});
