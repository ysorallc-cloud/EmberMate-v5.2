#!/bin/bash
# EmberMate Navigation Audit Script
# Run this to automatically find potential issues

echo "🔍 EmberMate Navigation Audit"
echo "=============================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Find files with back buttons
echo "📋 Check 1: Finding navigation files..."
echo ""
NAV_FILES=$(find app -name "*.tsx" -o -name "*.ts" | xargs grep -l "router.back\|navigation.goBack\|back.*button" 2>/dev/null)

if [ -z "$NAV_FILES" ]; then
    echo "${YELLOW}⚠️  No navigation files found${NC}"
else
    echo "${GREEN}✅ Found navigation files:${NC}"
    echo "$NAV_FILES"
fi
echo ""

# Check 2: Files missing router import
echo "📋 Check 2: Checking for missing router imports..."
echo ""
MISSING_ROUTER=0
for file in $NAV_FILES; do
    # Check for both 'router' and 'useRouter' patterns
    if ! grep -qE "import.*\{.*router.*\}.*from.*expo-router|import.*\{.*useRouter.*\}.*from.*expo-router" "$file"; then
        echo "${RED}❌ Missing router import: $file${NC}"
        MISSING_ROUTER=$((MISSING_ROUTER + 1))
    fi
done

if [ $MISSING_ROUTER -eq 0 ]; then
    echo "${GREEN}✅ All files have router import${NC}"
fi
echo ""

# Check 3: Files missing SafeAreaView
echo "📋 Check 3: Checking for missing SafeAreaView..."
echo ""
MISSING_SAFE_AREA=0
SCREEN_FILES=$(find app -name "*.tsx" | grep -v "components" | grep -v "_layout")

for file in $SCREEN_FILES; do
    if ! grep -q "SafeAreaView" "$file"; then
        echo "${YELLOW}⚠️  No SafeAreaView in: $file${NC}"
        MISSING_SAFE_AREA=$((MISSING_SAFE_AREA + 1))
    fi
done

if [ $MISSING_SAFE_AREA -eq 0 ]; then
    echo "${GREEN}✅ All screens use SafeAreaView${NC}"
fi
echo ""

# Check 4: Find small tap targets
echo "📋 Check 4: Checking for small tap targets..."
echo ""
SMALL_BUTTONS=0

for file in $NAV_FILES; do
    # Look for width/height less than 44
    if grep -A 10 "backButton\|back.*button" "$file" | grep -E "width.*:.*[0-3][0-9]|height.*:.*[0-3][0-9]" >/dev/null 2>&1; then
        echo "${YELLOW}⚠️  Potentially small button in: $file${NC}"
        SMALL_BUTTONS=$((SMALL_BUTTONS + 1))
    fi
done

if [ $SMALL_BUTTONS -eq 0 ]; then
    echo "${GREEN}✅ No obviously small buttons found${NC}"
fi
echo ""

# Check 5: Deprecated navigation methods
echo "📋 Check 5: Checking for deprecated navigation methods..."
echo ""
DEPRECATED=0

for file in $NAV_FILES; do
    if grep -q "navigation.goBack\|navigation.pop" "$file"; then
        echo "${RED}❌ Deprecated navigation method in: $file${NC}"
        DEPRECATED=$((DEPRECATED + 1))
    fi
done

if [ $DEPRECATED -eq 0 ]; then
    echo "${GREEN}✅ No deprecated navigation methods${NC}"
fi
echo ""

# Check 6: Empty onPress handlers
echo "📋 Check 6: Checking for empty onPress handlers..."
echo ""
EMPTY_HANDLERS=0

for file in $NAV_FILES; do
    if grep -q "onPress.*{.*}" "$file"; then
        echo "${YELLOW}⚠️  Potential empty handler in: $file${NC}"
        EMPTY_HANDLERS=$((EMPTY_HANDLERS + 1))
    fi
done

if [ $EMPTY_HANDLERS -eq 0 ]; then
    echo "${GREEN}✅ No empty handlers found${NC}"
fi
echo ""

# Summary
echo "=============================="
echo "📊 Audit Summary"
echo "=============================="
echo ""
echo "Total navigation files found: $(echo "$NAV_FILES" | wc -l)"
echo "Files missing router import: $MISSING_ROUTER"
echo "Files missing SafeAreaView: $MISSING_SAFE_AREA"
echo "Potentially small buttons: $SMALL_BUTTONS"
echo "Deprecated methods: $DEPRECATED"
echo "Potential empty handlers: $EMPTY_HANDLERS"
echo ""

# Calculate total issues
TOTAL_ISSUES=$((MISSING_ROUTER + MISSING_SAFE_AREA + SMALL_BUTTONS + DEPRECATED + EMPTY_HANDLERS))

if [ $TOTAL_ISSUES -eq 0 ]; then
    echo "${GREEN}✅ No issues found! Navigation looks good.${NC}"
else
    echo "${YELLOW}⚠️  Found $TOTAL_ISSUES potential issues to review${NC}"
fi
echo ""

# Priority fix list
echo "=============================="
echo "🎯 Priority Fixes"
echo "=============================="
echo ""
echo "1. Check Notification Settings: app/settings/notifications.tsx"
echo "2. Add missing router imports ($MISSING_ROUTER files)"
echo "3. Add missing SafeAreaView ($MISSING_SAFE_AREA files)"
echo "4. Fix deprecated navigation methods ($DEPRECATED files)"
echo "5. Review small buttons ($SMALL_BUTTONS files)"
echo ""

# Create detailed report
REPORT_FILE="navigation-audit-report.txt"
echo "Creating detailed report: $REPORT_FILE"

{
    echo "EmberMate Navigation Audit Report"
    echo "Generated: $(date)"
    echo ""
    echo "Navigation Files:"
    echo "$NAV_FILES"
    echo ""
    echo "Issues Summary:"
    echo "- Missing router import: $MISSING_ROUTER"
    echo "- Missing SafeAreaView: $MISSING_SAFE_AREA"
    echo "- Small buttons: $SMALL_BUTTONS"
    echo "- Deprecated methods: $DEPRECATED"
    echo "- Empty handlers: $EMPTY_HANDLERS"
} > "$REPORT_FILE"

echo "${GREEN}✅ Report saved to: $REPORT_FILE${NC}"
echo ""
echo "Next steps:"
echo "1. Review each flagged file manually"
echo "2. Fix issues using NAVIGATION_AUDIT_QUICK_REFERENCE.md"
echo "3. Test in iOS simulator"
echo "4. Re-run this script to verify fixes"
