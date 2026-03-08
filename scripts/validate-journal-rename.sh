#!/bin/bash
# ============================================================================
# validate-journal-rename.sh
# Checks that the journal/record rename is complete and consistent
# ============================================================================

set -e

PASS=0
FAIL=0
ERRORS=""

check() {
  local desc="$1"
  local result="$2"
  if [ "$result" = "pass" ]; then
    echo "  [PASS] $desc"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $desc"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  - $desc"
  fi
}

echo "=== Journal Rename Validation ==="
echo ""

# 1. journal.tsx exists
if [ -f "app/(tabs)/journal.tsx" ]; then
  check "app/(tabs)/journal.tsx exists" "pass"
else
  check "app/(tabs)/journal.tsx exists" "fail"
fi

# 2. record.tsx does NOT exist
if [ ! -f "app/(tabs)/record.tsx" ]; then
  check "app/(tabs)/record.tsx does not exist" "pass"
else
  check "app/(tabs)/record.tsx does not exist" "fail"
fi

# 3. No stale route references to '/record' or '/(tabs)/record' in app/ source
# (Excluding node_modules, .git, and test files)
STALE_ROUTES=$(grep -rn "/(tabs)/record\b" app/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v "__tests__" || true)
if [ -z "$STALE_ROUTES" ]; then
  check "No stale '/(tabs)/record' route references in app/" "pass"
else
  check "No stale '/(tabs)/record' route references in app/" "fail"
  echo "    Found: $STALE_ROUTES"
fi

# 4. Check for stale 'record' tab name in layout (should be 'journal')
STALE_TAB=$(grep -n "name=\"record\"" app/\(tabs\)/_layout.tsx 2>/dev/null || true)
if [ -z "$STALE_TAB" ]; then
  check "No stale 'record' tab name in _layout.tsx" "pass"
else
  check "No stale 'record' tab name in _layout.tsx" "fail"
  echo "    Found: $STALE_TAB"
fi

# 5. TypeScript compilation check (only fail on errors in journal/record-related files)
echo ""
echo "  Running tsc --noEmit..."
TSC_ERRORS=$(npx tsc --noEmit 2>&1 | grep -i "journal\|record" | grep -v "node_modules" | grep -v "__tests__" || true)
if [ -z "$TSC_ERRORS" ]; then
  check "No TypeScript errors in journal/record files" "pass"
else
  check "No TypeScript errors in journal/record files" "fail"
  echo "    $TSC_ERRORS"
fi

# Summary
echo ""
echo "=== Summary ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "  Failures:$ERRORS"
  echo ""
  exit 1
else
  echo ""
  echo "  All checks passed!"
  exit 0
fi
