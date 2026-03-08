# Calm Urgency Implementation

## Overview

This document describes the "Calm Urgency" update to EmberMate's Now page, designed to reduce caregiver stress by limiting "red/overdue" signaling to truly time-critical items.

## Core Principle

> **Mood and other non-clinical tasks never show "Overdue" or red styling.**
> Red is reserved for clinically critical items that exceed the overdue threshold.

## 3-Tier Urgency Model

| Tier | Tone | Condition | Label | Color |
|------|------|-----------|-------|-------|
| **CRITICAL** | `danger` | Clinical item 30+ min overdue | "Late" | Red (#EF4444) |
| **ATTENTION** | `warn` | Due soon, pending, or non-critical overdue | "Pending", "Due soon" | Amber (#F59E0B) |
| **INFO** | `neutral` | Later today, optional, flexible | "Later today", "Whenever you're ready" | Gray |

## Category Classification

### Clinical-Critical Categories
Items that CAN escalate to CRITICAL tier when 30+ minutes overdue:
- `medication` / `meds`
- `nutrition` / `meals`

### Non-Clinical Categories
Items that should NEVER show red/overdue styling:
- `mood`
- `hydration`
- `sleep`
- `activity`
- `custom`

### Neutral Logging Categories
Informational items, default to ATTENTION at most:
- `vitals`

## Key Files Modified

### New Files
- `utils/urgency.ts` - Single source of truth for urgency calculation

### Modified Files
- `app/(tabs)/now.tsx` - Now page with calm urgency integration
- `theme/theme-tokens.ts` - Added tone colors (toneDanger, toneWarn, toneNeutral)
- `constants/microcopy.ts` - Added supportive status labels

## Above-Fold Constraint

**Rule:** Maximum 1 red/danger element above the fold (top of Now screen).

Implementation:
1. Compute if Next Up card is critical
2. If Next Up is critical, suppress critical styling on progress tiles
3. Progress tiles show amber "Pending" instead of red "Late"

```typescript
// Track above-fold state
const aboveFoldState = {
  hasCriticalNextUp: boolean,
  criticalTileCount: number,
  maxCriticalTiles: hasCriticalNextUp ? 0 : 1
};
```

## Supportive Copy Rules

**Primary Labels (NO time deltas in headers):**

| Scenario | Old Copy | New Copy |
|----------|----------|----------|
| Non-critical overdue | "Pending (1h 29m)" | "Due earlier today" |
| Clinical 30+ min overdue | "Pending (1h 29m)" | "Late" (with time in secondary) |
| Due within 60 min | "Due soon" | "Still to do today" |
| Scheduled later | "Later today" | "Later today" |
| No schedule | N/A | "Available anytime" |

**Key Rule:** Time deltas like "1h 29m" only appear as small secondary text in Today's Plan list, never in Next Up card or progress tiles.

**Section Headers:**

| Context | Label |
|---------|-------|
| Non-critical items due earlier | "Still To Do" |
| Critical clinical items overdue | "Overdue" |

**Progress Tile Status Labels:**

| Old | New |
|-----|-----|
| "pending" | "due earlier" |
| "due soon" | "still to do" |
| "overdue" | "late" (critical only) |
| "not logged yet" | "available" |

**Care Insight:** Only shown when it adds unique value beyond Next Up card. Generic "Medications ready to log" insights are removed.

## Visual Styling

### Next Up Card
- **Critical:** Red border/accent + "Late" label
- **Attention:** Amber/coral accent + "Pending" label
- **Info:** Neutral accent

### Progress Tiles
- **Complete:** Green ring (#10B981)
- **Critical overdue:** Red ring (#EF4444) - only if above-fold constraint allows
- **Attention/Pending:** Amber ring (#F59E0B)
- **Inactive:** Neutral gray

### Timeline Items
- **Critical overdue:** Red left border + red time text
- **Non-critical overdue:** Amber left border + amber time text (new "Pending" style)
- **Completed:** Green left border + reduced opacity

## Constants

```typescript
// Threshold before clinical items become CRITICAL
const CRITICAL_OVERDUE_MINUTES = 30;

// Window for "Due soon" status
const UPCOMING_WINDOW_MINUTES = 60;

// Maximum red elements above fold
const MAX_RED_ABOVE_FOLD = 1;
```

## API Reference

### calculateItemUrgency(params)
Calculate urgency for a single care item.

```typescript
function calculateItemUrgency(params: {
  category: CarePlanItemType;
  dueAt: Date | string | null;
  now?: Date;
  isCompleted?: boolean;
  isOptional?: boolean;
  forceNonCritical?: boolean;
}): ItemUrgency
```

### calculateCategoryUrgency(params)
Calculate overall urgency for a category (for progress tiles).

```typescript
function calculateCategoryUrgency(params: {
  category: CarePlanItemType;
  items: Array<{ dueAt: Date | string | null; isCompleted: boolean }>;
  now?: Date;
}): ItemUrgency
```

### applyAboveFoldConstraint(urgency, state)
Apply above-fold constraint to suppress critical styling when needed.

```typescript
function applyAboveFoldConstraint(
  urgency: ItemUrgency,
  aboveFoldState: AboveFoldUrgencyState
): ItemUrgency
```

## Testing Scenarios

1. **Mood overdue by 2 hours**
   - Expected: Next Up should NOT be red, no "overdue" text
   - Label: "Pending (2h 0m)"

2. **Med overdue by 45 minutes**
   - Expected: Next Up can be red, "Late" allowed
   - Label: "Late by 45m"

3. **Meals overdue by 10 minutes**
   - Expected: Attention tier (threshold not met)
   - Label: "Pending (10m)"

4. **Multiple items overdue**
   - Expected: Only one red element above fold

5. **Nothing overdue**
   - Expected: Screen should feel calm, no warning colors dominating

## Acceptance Criteria

- [x] Mood and other non-clinical tasks never show "Overdue" by default
- [x] Red is reserved for clinically critical items that exceed the overdue threshold
- [x] Above the fold: maximum one red/danger-styled element
- [x] UI still clearly communicates what to do next, but without shame language
- [x] Supportive copy used throughout ("Pending", "Not yet", "Still to do")

## Migration Notes

The implementation maintains backward compatibility with the legacy `UrgencyStatus` type while introducing the new `ItemUrgency` type. The `getUrgencyStatus` function now returns both legacy and new urgency information.

---

*Implemented: February 2026*
*Based on: EmberMate Now Page "Calm Urgency" Update Spec*
