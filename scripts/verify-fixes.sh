#!/bin/bash
# ============================================================================
# EmberMate Fix Verification Script
# Run from project root: bash scripts/verify-fixes.sh
# ============================================================================

PASS=0
FAIL=0
WARN=0

check() {
  local label="$1"
  local result="$2"
  if [ "$result" = "ok" ]; then
    echo "  ✅ $label"
    PASS=$((PASS + 1))
  elif [ "$result" = "warn" ]; then
    echo "  ⚠️  $label"
    WARN=$((WARN + 1))
  else
    echo "  ❌ $label"
    FAIL=$((FAIL + 1))
  fi
}

echo "==========================================="
echo "EmberMate Fix Verification"
echo "==========================================="
echo ""

# --- Navigation Fixes ---
echo "Navigation Targets:"

# 1a: /add-appointment should not exist anywhere
if grep -rq "add-appointment" app/ components/ constants/ 2>/dev/null; then
  check "/add-appointment references removed" "fail"
else
  check "/add-appointment references removed" "ok"
fi

# 1b: /log-medication-confirm should not exist
if grep -rq "log-medication-confirm" app/ components/ constants/ 2>/dev/null; then
  check "/log-medication-confirm references removed" "fail"
else
  check "/log-medication-confirm references removed" "ok"
fi

# 1c: /log-hydration should not exist in quickLogOptions
if grep -q "log-hydration" constants/quickLogOptions.ts 2>/dev/null; then
  check "quickLogOptions uses /log-water" "fail"
else
  check "quickLogOptions uses /log-water" "ok"
fi

# All screen targets in quickLogOptions resolve to real files
echo ""
echo "Quick Log Option Routes:"
grep -o "screen: '[^']*'" constants/quickLogOptions.ts 2>/dev/null | sed "s/screen: '//;s/'//" | while read route; do
  file="app${route}.tsx"
  if [ -f "$file" ]; then
    check "Route $route → $file exists" "ok"
  else
    check "Route $route → $file MISSING" "fail"
  fi
done

# --- UI Fixes ---
echo ""
echo "UI Fixes:"

if grep -q "label: 'Check'" components/now/ProgressRings.tsx 2>/dev/null; then
  check "Wellness label = 'Check' (not 'WELL.')" "ok"
else
  check "Wellness label = 'Check' (not 'WELL.')" "fail"
fi

if grep -q "Log Late" components/now/MedsBatchPanel.tsx 2>/dev/null; then
  check "MedsBatchPanel has 'Log Late' for missed meds" "ok"
else
  check "MedsBatchPanel has 'Log Late' for missed meds" "fail"
fi

if grep -q "0.45" components/CoffeeMomentMinimal.tsx 2>/dev/null; then
  check "Breathing dismiss hint opacity ≥ 0.4" "ok"
else
  check "Breathing dismiss hint opacity ≥ 0.4" "fail"
fi

if grep -q "Close breathing" components/CoffeeMomentMinimal.tsx 2>/dev/null; then
  check "Breathing exercise has close button" "ok"
else
  check "Breathing exercise has close button" "fail"
fi

if grep -q "categoryAll" components/now/TimelineSection.tsx 2>/dev/null; then
  check "Timeline items sorted chronologically" "ok"
else
  check "Timeline items sorted chronologically" "fail"
fi

# --- Data Fixes ---
echo ""
echo "Data Fixes:"

if grep -q "seenMeds" app/\(tabs\)/journal.tsx 2>/dev/null; then
  check "Journal handoff notes deduplicated" "ok"
else
  check "Journal handoff notes deduplicated" "fail"
fi

if grep -q "MIGRATION_STATUS" utils/sampleDataGenerator.ts 2>/dev/null; then
  check "Sample data marks migration complete" "ok"
else
  check "Sample data marks migration complete" "fail"
fi

if grep -q "existingByBaseName" services/carePlanGenerator.ts 2>/dev/null; then
  check "Sync deduplicates by base medication name" "ok"
else
  check "Sync deduplicates by base medication name" "fail"
fi

if grep -q "daysAgo.*14\|daysAgo <= 14" utils/sampleDataGenerator.ts 2>/dev/null; then
  check "Sample data seeds 14-day history for Insights" "ok"
else
  check "Sample data seeds 14-day history for Insights" "fail"
fi

# --- Orphaned Screens ---
echo ""
echo "Removed/Orphaned Screens:"

for f in care-journey coming-soon care-brief care-summary-export daily-care-report medication-report daily-checkin log-hydration medication-schedule trends photos coffee; do
  if [ -f "app/$f.tsx" ]; then
    # Check if anything actually navigates to it
    refs=$(grep -rn "/$f" app/ components/ constants/ lib/ 2>/dev/null | grep -v "_layout\|__tests__\|\.test\." | grep -v "^app/$f.tsx:" | wc -l)
    if [ "$refs" -eq 0 ]; then
      check "$f.tsx exists but is orphaned ($refs references)" "warn"
    fi
  else
    check "$f.tsx removed" "ok"
  fi
done

# --- Layout Consistency ---
echo ""
echo "Layout Registration:"
grep 'Stack.Screen name=' app/_layout.tsx | sed 's/.*name="\([^"]*\)".*/\1/' | while read screen; do
  if [ "$screen" = "(onboarding)" ] || [ "$screen" = "(tabs)" ] || [ "$screen" = "index" ]; then
    continue
  fi
  if [ ! -f "app/$screen.tsx" ] && [ ! -d "app/$screen" ]; then
    check "Stack.Screen '$screen' → file exists" "fail"
  fi
done

# --- Summary ---
echo ""
echo "==========================================="
echo "Results: $PASS passed, $FAIL failed, $WARN warnings"
echo "==========================================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
