// ============================================================================
// CARE CIRCLE SYNC INTEGRATION TEST
// Flow: Add care circle member → verify retrieval → manage list
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addCaregiver,
  getCaregivers,
  removeCaregiver,
} from '../collaborativeCare';

const defaultPermissions = {
  canView: true,
  canEdit: false,
  canMarkMedications: false,
  canScheduleAppointments: false,
  canAddNotes: false,
  canExport: false,
};

describe('Care Circle Sync Integration', () => {
  let nowValue: number;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    // Use incrementing Date.now() to ensure unique IDs for caregivers
    nowValue = 1700000000000;
    jest.spyOn(Date, 'now').mockImplementation(() => {
      nowValue += 1;
      return nowValue;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should add and retrieve a care circle member', async () => {
    await addCaregiver({
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '555-1234',
      role: 'family',
      permissions: { ...defaultPermissions },
    });

    const caregivers = await getCaregivers();
    expect(caregivers).toHaveLength(1);
    expect(caregivers[0].name).toBe('Jane Smith');
    expect(caregivers[0].email).toBe('jane@example.com');
    expect(caregivers[0].role).toBe('family');
    expect(caregivers[0].id).toBeDefined();
    expect(caregivers[0].joinedAt).toBeDefined();
  });

  it('should handle multiple care circle members', async () => {
    await addCaregiver({
      name: 'Jane Smith',
      role: 'family',
      permissions: { ...defaultPermissions },
    });

    await addCaregiver({
      name: 'Dr. Johnson',
      role: 'healthcare',
      permissions: { ...defaultPermissions, canEdit: true, canMarkMedications: true },
    });

    const caregivers = await getCaregivers();
    expect(caregivers).toHaveLength(2);

    const names = caregivers.map(c => c.name);
    expect(names).toContain('Jane Smith');
    expect(names).toContain('Dr. Johnson');
  });

  it('should remove a care circle member and verify updated list', async () => {
    await addCaregiver({
      name: 'Member One',
      role: 'family',
      permissions: { ...defaultPermissions },
    });

    await addCaregiver({
      name: 'Member Two',
      role: 'friend',
      permissions: { ...defaultPermissions },
    });

    const initial = await getCaregivers();
    expect(initial).toHaveLength(2);

    const memberToRemove = initial.find(c => c.name === 'Member One')!;
    const removed = await removeCaregiver(memberToRemove.id);
    expect(removed).toBe(true);

    const remaining = await getCaregivers();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('Member Two');
  });

  it('should return empty array when no caregivers exist', async () => {
    const caregivers = await getCaregivers();
    expect(caregivers).toHaveLength(0);
  });
});
