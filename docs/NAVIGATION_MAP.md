# EmberMate Navigation Map

## Last Audit: 2026-01-31

---

## Screens with Back Buttons

### Settings Stack

| Screen | File | Back To | SafeAreaView | Status |
|--------|------|---------|--------------|--------|
| Settings | `app/settings/index.tsx` | Previous screen | Yes | ✅ Working |
| Notification Settings | `app/notification-settings.tsx` | Settings | Yes | ✅ Working |
| Backup Settings | `app/settings/backup.tsx` | Settings | Yes | ✅ Working |
| Security Settings | `app/settings/security.tsx` | Settings | Yes | ✅ Working |

### Medical Stack

| Screen | File | Back To | SafeAreaView | Status |
|--------|------|---------|--------------|--------|
| Medications | `app/medications.tsx` | Previous | Yes | ✅ Working |
| Medication Form | `app/medication-form.tsx` | Medications | Yes | ✅ Working |
| Medication Schedule | `app/medication-schedule.tsx` | Medications | Yes | ✅ Working |
| Appointments | `app/appointments.tsx` | Previous | Yes | ✅ Working |
| Appointment Form | `app/appointment-form.tsx` | Appointments | Yes | ✅ Working |
| Appointment Confirmation | `app/appointment-confirmation.tsx` | Dynamic | Yes | ✅ Fixed |

### Logging Stack

| Screen | File | Back To | SafeAreaView | Status |
|--------|------|---------|--------------|--------|
| Daily Check-in | `app/daily-checkin.tsx` | Previous | Yes | ✅ Working |
| Quick Check-in | `app/quick-checkin.tsx` | Previous | Yes | ✅ Working |
| Complete Check-in | `app/complete-checkin.tsx` | Previous | Yes | ✅ Working |
| Log Activity | `app/log-activity.tsx` | Previous | Yes | ✅ Working |
| Log Meal | `app/log-meal.tsx` | Previous | Yes | ✅ Working |
| Log Sleep | `app/log-sleep.tsx` | Previous | Yes | ✅ Working |
| Log Vitals | `app/log-vitals.tsx` | Previous | Yes | ✅ Working |
| Log Mood | `app/log-mood.tsx` | Previous | Yes | ✅ Working |
| Log Water | `app/log-water.tsx` | Previous | Yes | ✅ Working |
| Log Symptom | `app/log-symptom.tsx` | Previous | Yes | ✅ Working |
| Log Note | `app/log-note.tsx` | Previous | Yes | ✅ Working |

### Care Team Stack

| Screen | File | Back To | SafeAreaView | Status |
|--------|------|---------|--------------|--------|
| Family Sharing | `app/family-sharing.tsx` | Support | Yes | ✅ Working |
| Caregiver Management | `app/caregiver-management.tsx` | Support | Yes | ✅ Working |
| Family Activity | `app/family-activity.tsx` | Support | Yes | ✅ Working |
| Emergency | `app/emergency.tsx` | Support | Yes | ✅ Working |

### Reports Stack

| Screen | File | Back To | SafeAreaView | Status |
|--------|------|---------|--------------|--------|
| Reports Hub | `app/hub/reports.tsx` | Understand | Yes | ✅ Working |
| Correlation Report | `app/hub/reports/correlation.tsx` | Reports | Yes | ✅ Working |
| Medication Report | `app/hub/reports/medication.tsx` | Reports | Yes | ✅ Working |
| Care Brief | `app/care-brief.tsx` | Previous | Yes | ✅ Working |

---

## Root Tab Screens (No Back Button)

| Tab | File | SafeAreaView | Status |
|-----|------|--------------|--------|
| Now | `app/(tabs)/now.tsx` | Yes | ✅ Working |
| Record | `app/(tabs)/record.tsx` | Yes | ✅ Working |
| Understand | `app/(tabs)/understand.tsx` | Yes | ✅ Working |
| Support | `app/(tabs)/support.tsx` | Yes | ✅ Working |

---

## Redirect Screens (No SafeAreaView Needed)

| Screen | File | Redirects To |
|--------|------|--------------|
| Vitals | `app/vitals.tsx` | `/vitals-log` |
| Symptoms | `app/symptoms.tsx` | `/symptoms-log` |
| Index | `app/index.tsx` | `/(tabs)/now` or `/(onboarding)` |

---

## Onboarding Screens

Onboarding screens are managed by a parent FlatList/ScrollView wrapper in `app/(onboarding)/index.tsx`. Individual screens don't need SafeAreaView as the parent handles it.

| Screen | File | Status |
|--------|------|--------|
| Welcome | `screens/WelcomeScreen.tsx` | ✅ OK (parent handles) |
| Problem | `screens/ProblemScreen.tsx` | ✅ OK (parent handles) |
| Solution | `screens/SolutionScreen.tsx` | ✅ OK (parent handles) |
| Features | `screens/FeaturesScreen.tsx` | ✅ OK (parent handles) |
| Privacy | `screens/PrivacyScreen.tsx` | ✅ OK (parent handles) |
| Ready | `screens/ReadyToStartScreen.tsx` | ✅ OK (parent handles) |

---

## Navigation Patterns

### Back Button Implementation

All screens use the standard pattern:

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

<TouchableOpacity onPress={() => router.back()}>
  <Text>←</Text>
</TouchableOpacity>
```

### Safe Area Implementation

All screens use:

```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView edges={['top', 'left', 'right']}>
  {/* Content */}
</SafeAreaView>
```

For modals, use all edges:

```typescript
<SafeAreaView edges={['top', 'bottom', 'left', 'right']}>
```

---

## Audit Checklist

### Functionality
- [x] All back buttons navigate correctly
- [x] No console errors when navigating
- [x] Navigation stack works properly

### Placement
- [x] No overlap with screen titles
- [x] No overlap with status bar
- [x] No overlap with notch/Dynamic Island
- [x] Proper spacing between elements

### iOS Compliance
- [x] SafeAreaView on all screens
- [x] Minimum 44×44pt tap targets
- [x] Status bar styled correctly

### Code Quality
- [x] Consistent styling across screens
- [x] Proper imports (expo-router)
- [x] No deprecated navigation methods

---

## Testing Commands

```bash
# Run navigation audit script
bash scripts/audit-navigation.sh

# Run navigation tests
npm test __tests__/navigation.test.tsx

# Run on iOS simulator
npx expo start --ios
```

---

## Files Fixed in This Audit

1. `app/appointment-confirmation.tsx` - Added SafeAreaView
2. `app/index.tsx` - Added SafeAreaView to loading state
3. Created `__tests__/navigation.test.tsx`
4. Created `scripts/audit-navigation.sh`
5. Created this documentation

---

**Audit completed: 2026-01-31**
