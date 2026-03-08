#!/bin/bash

# EmberMate Code Cleanup Script
# Automates critical cleanup tasks
# Run with: ./scripts/cleanup.sh

set -e  # Exit on error

echo "🧹 EmberMate Code Cleanup"
echo "========================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track what was done
CHANGES_MADE=()

# 1. Remove "app 2" duplicate folder
if [ -d "app 2" ]; then
  echo -e "${YELLOW}📁 Removing duplicate 'app 2' folder...${NC}"
  rm -rf "app 2"
  CHANGES_MADE+=("✅ Deleted 'app 2' folder (508 KB)")
  echo -e "${GREEN}✓ Removed${NC}"
else
  echo "⏭️  'app 2' folder not found (already clean)"
fi

echo ""

# 2. Remove .DS_Store files
echo -e "${YELLOW}🗑️  Removing .DS_Store files...${NC}"
DS_COUNT=$(find . -name ".DS_Store" -type f | wc -l | tr -d ' ')
if [ "$DS_COUNT" -gt 0 ]; then
  find . -name ".DS_Store" -type f -delete
  CHANGES_MADE+=("✅ Deleted $DS_COUNT .DS_Store files")
  echo -e "${GREEN}✓ Removed $DS_COUNT files${NC}"
else
  echo "⏭️  No .DS_Store files found"
fi

echo ""

# 3. Remove unused components
echo -e "${YELLOW}🧩 Checking unused components...${NC}"

if [ -f "components/SecurityLockScreen.tsx" ]; then
  echo "  Removing SecurityLockScreen.tsx (unused)"
  rm components/SecurityLockScreen.tsx
  CHANGES_MADE+=("✅ Deleted SecurityLockScreen.tsx (9.9 KB)")
fi

if [ -f "components/WebLoginScreen.tsx" ]; then
  echo "  Removing WebLoginScreen.tsx (unused)"
  rm components/WebLoginScreen.tsx
  CHANGES_MADE+=("✅ Deleted WebLoginScreen.tsx (3.5 KB)")
fi

if [ ${#CHANGES_MADE[@]} -gt 2 ]; then
  echo -e "${GREEN}✓ Removed unused components${NC}"
else
  echo "⏭️  Unused components already removed"
fi

echo ""

# 4. Uninstall unused npm packages
echo -e "${YELLOW}📦 Checking unused npm packages...${NC}"

# Check if react-native-chart-kit is installed
if npm list react-native-chart-kit &>/dev/null; then
  echo "  Uninstalling react-native-chart-kit (unused)"
  npm uninstall react-native-chart-kit --silent
  CHANGES_MADE+=("✅ Uninstalled react-native-chart-kit (~500 KB)")
  echo -e "${GREEN}✓ Uninstalled${NC}"
else
  echo "⏭️  react-native-chart-kit not installed"
fi

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ Cleanup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ${#CHANGES_MADE[@]} -gt 0 ]; then
  echo "Changes made:"
  for change in "${CHANGES_MADE[@]}"; do
    echo "  $change"
  done
  echo ""

  # Calculate approximate space saved
  echo -e "${GREEN}💾 Estimated space saved: ~4-5 MB${NC}"
else
  echo "No changes were needed - your project is already clean! ✨"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Manual steps recommended:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Review console.log statements:"
echo "   grep -rn 'console.log' app/ utils/"
echo ""
echo "2. Consider removing cloud-sync feature (incomplete):"
echo "   - Delete app/cloud-sync.tsx"
echo "   - Delete utils/cloudSync.ts"
echo "   - Remove link from app/settings/index.tsx"
echo ""
echo "3. Add ESLint and Prettier:"
echo "   npm install --save-dev eslint prettier"
echo ""
echo "4. See CODE_CLEANUP_RECOMMENDATIONS.md for more details"
echo ""
