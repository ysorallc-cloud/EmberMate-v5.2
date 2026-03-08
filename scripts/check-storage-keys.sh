#!/usr/bin/env bash
# ============================================================================
# CI check: verify no raw @embermate_ / @EmberMate: string literals
# exist outside storageKeys.ts and test files.
# Usage: bash scripts/check-storage-keys.sh
# Exit 0 = clean, Exit 1 = raw literals found
# ============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Search for raw storage key literals in source files,
# excluding storageKeys.ts, test files, node_modules, and .git
HITS=$(grep -rn "'@embermate_\|'@EmberMate:" \
  --include='*.ts' --include='*.tsx' \
  "$ROOT" \
  2>/dev/null \
  | grep -v 'node_modules' \
  | grep -v '__tests__' \
  | grep -v '\.test\.' \
  | grep -v 'storageKeys\.ts' \
  || true)

if [ -z "$HITS" ]; then
  echo "✅ All storage keys use StorageKeys.* constants. No raw literals found."
  exit 0
else
  COUNT=$(echo "$HITS" | wc -l | tr -d ' ')
  echo "❌ Found $COUNT raw storage key literal(s) outside storageKeys.ts:"
  echo ""
  echo "$HITS" | sed "s|$ROOT/||g"
  echo ""
  echo "Fix: import { StorageKeys } from 'utils/storageKeys' and use the constant."
  exit 1
fi
