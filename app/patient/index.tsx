import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { SubScreenHeader } from '../../components/SubScreenHeader';
import { StorageKeys } from '../../utils/storageKeys';
import { logError } from '../../utils/devLog';
import { safeGetItem, safeSetItem } from '../../utils/safeStorage';
import {
  getMedicalInfo,
  saveMedicalInfo,
  MedicalInfo,
  Diagnosis,
  Surgery,
  Hospitalization,
} from '../../utils/medicalInfo';

// ============================================================================
// DEFAULT DATA (shown before user saves anything)
// ============================================================================

const DEFAULT_INFO: MedicalInfo = {
  bloodType: '',
  allergies: [],
  diagnoses: [],
  surgeries: [],
  hospitalizations: [],
  currentMedications: [],
  emergencyNotes: undefined,
  lastUpdated: new Date(),
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PatientScreen() {
  const router = useRouter();
  const [info, setInfo] = useState<MedicalInfo>(DEFAULT_INFO);
  const [editing, setEditing] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Basic info fields
  const [patientName, setPatientName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [primaryLanguage, setPrimaryLanguage] = useState('');

  // Inline add fields
  const [newAllergy, setNewAllergy] = useState('');
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newSurgery, setNewSurgery] = useState('');
  const [newHospitalization, setNewHospitalization] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadInfo();
      loadBasicInfo();
    }, [])
  );

  const loadInfo = async () => {
    const stored = await getMedicalInfo();
    if (stored) setInfo(stored);
  };

  const loadBasicInfo = async () => {
    try {
      const [name, rel, ageVal, gen, lang] = await Promise.all([
        safeGetItem<string | null>(StorageKeys.PATIENT_NAME, null),
        safeGetItem<string | null>(StorageKeys.PATIENT_RELATIONSHIP, null),
        safeGetItem<string | null>(StorageKeys.PATIENT_AGE, null),
        safeGetItem<string | null>(StorageKeys.PATIENT_GENDER, null),
        safeGetItem<string | null>(StorageKeys.PATIENT_LANGUAGE, null),
      ]);
      if (name) setPatientName(name);
      if (rel) setRelationship(rel);
      if (ageVal) setAge(ageVal);
      if (gen) setGender(gen);
      if (lang) setPrimaryLanguage(lang);
    } catch (error) {
      logError('PatientScreen.loadBasicInfo', error);
    }
  };

  const saveBasicField = async (key: string, value: string) => {
    try {
      await safeSetItem(key, value);
    } catch (error) {
      logError('PatientScreen.saveBasicField', error);
    }
  };

  const save = async (updated: MedicalInfo) => {
    setInfo(updated);
    const { lastUpdated, ...rest } = updated;
    await saveMedicalInfo(rest);
  };

  // ---- Allergies ----
  const addAllergy = async () => {
    const text = newAllergy.trim();
    if (!text) return;
    await save({ ...info, allergies: [...info.allergies, text] });
    setNewAllergy('');
  };

  const removeAllergy = (index: number) => {
    Alert.alert('Remove Allergy', `Remove "${info.allergies[index]}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = info.allergies.filter((_, i) => i !== index);
          await save({ ...info, allergies: updated });
        },
      },
    ]);
  };

  // ---- Diagnoses ----
  const addDiagnosis = async () => {
    const text = newDiagnosis.trim();
    if (!text) return;
    const diag: Diagnosis = { condition: text, status: 'active' };
    await save({ ...info, diagnoses: [...info.diagnoses, diag] });
    setNewDiagnosis('');
  };

  const removeDiagnosis = (index: number) => {
    Alert.alert('Remove Diagnosis', `Remove "${info.diagnoses[index].condition}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = info.diagnoses.filter((_, i) => i !== index);
          await save({ ...info, diagnoses: updated });
        },
      },
    ]);
  };

  const toggleDiagnosisStatus = async (index: number) => {
    const updated = [...info.diagnoses];
    updated[index] = {
      ...updated[index],
      status: updated[index].status === 'active' ? 'resolved' : 'active',
    };
    await save({ ...info, diagnoses: updated });
  };

  // ---- Surgeries ----
  const addSurgery = async () => {
    const text = newSurgery.trim();
    if (!text) return;
    const surg: Surgery = { procedure: text };
    await save({ ...info, surgeries: [...info.surgeries, surg] });
    setNewSurgery('');
  };

  const removeSurgery = (index: number) => {
    Alert.alert('Remove Surgery', `Remove "${info.surgeries[index].procedure}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = info.surgeries.filter((_, i) => i !== index);
          await save({ ...info, surgeries: updated });
        },
      },
    ]);
  };

  // ---- Hospitalizations ----
  const addHospitalization = async () => {
    const text = newHospitalization.trim();
    if (!text) return;
    const hosp: Hospitalization = { reason: text };
    await save({ ...info, hospitalizations: [...info.hospitalizations, hosp] });
    setNewHospitalization('');
  };

  const removeHospitalization = (index: number) => {
    Alert.alert('Remove Hospitalization', `Remove "${info.hospitalizations[index].reason}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = info.hospitalizations.filter((_, i) => i !== index);
          await save({ ...info, hospitalizations: updated });
        },
      },
    ]);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const activeDiagnoses = info.diagnoses.filter(d => d.status === 'active');
  const resolvedDiagnoses = info.diagnoses.filter(d => d.status === 'resolved');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <SubScreenHeader
          title="Patient"
          emoji={'\u{1F464}'}
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={100}>
        <ScrollView style={styles.scroll}>
          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BASIC INFORMATION</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                {editing ? (
                  <TextInput
                    style={styles.inlineInput}
                    value={patientName}
                    onChangeText={setPatientName}
                    onBlur={() => saveBasicField(StorageKeys.PATIENT_NAME, patientName)}
                    placeholder="Patient name"
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel="Patient name"
                  />
                ) : (
                  <Text style={styles.infoValue}>{patientName || '\u2014'}</Text>
                )}
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Relationship</Text>
                {editing ? (
                  <TextInput
                    style={styles.inlineInput}
                    value={relationship}
                    onChangeText={setRelationship}
                    onBlur={() => saveBasicField(StorageKeys.PATIENT_RELATIONSHIP, relationship)}
                    placeholder="e.g. Mom, Dad, Spouse"
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel="Relationship to patient"
                  />
                ) : (
                  <Text style={styles.infoValue}>{relationship || '\u2014'}</Text>
                )}
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Age</Text>
                {editing ? (
                  <TextInput
                    style={styles.inlineInput}
                    value={age}
                    onChangeText={setAge}
                    onBlur={() => saveBasicField(StorageKeys.PATIENT_AGE, age)}
                    placeholder="e.g. 73"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={3}
                    accessibilityLabel="Patient age"
                  />
                ) : (
                  <Text style={styles.infoValue}>{age || '\u2014'}</Text>
                )}
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Gender</Text>
                {editing ? (
                  <TextInput
                    style={styles.inlineInput}
                    value={gender}
                    onChangeText={setGender}
                    onBlur={() => saveBasicField(StorageKeys.PATIENT_GENDER, gender)}
                    placeholder="e.g. Female"
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel="Gender"
                  />
                ) : (
                  <Text style={styles.infoValue}>{gender || '\u2014'}</Text>
                )}
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Blood Type</Text>
                <Text style={styles.infoValue}>{info.bloodType || '\u2014'}</Text>
              </View>
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Primary Language</Text>
                {editing ? (
                  <TextInput
                    style={styles.inlineInput}
                    value={primaryLanguage}
                    onChangeText={setPrimaryLanguage}
                    onBlur={() => saveBasicField(StorageKeys.PATIENT_LANGUAGE, primaryLanguage)}
                    placeholder="e.g. English"
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel="Primary language"
                  />
                ) : (
                  <Text style={styles.infoValue}>{primaryLanguage || '\u2014'}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Active Diagnoses */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ACTIVE DIAGNOSES</Text>
            <View style={styles.infoCard}>
              {activeDiagnoses.length === 0 && (
                <Text style={styles.emptyText}>No active diagnoses</Text>
              )}
              {activeDiagnoses.map((d, idx) => {
                const realIdx = info.diagnoses.indexOf(d);
                return (
                  <View key={realIdx} style={styles.listItem}>
                    <Text style={styles.bulletIcon}>{'\u2022'}</Text>
                    <Text style={styles.listText}>{d.condition}</Text>
                    {editing && (
                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          onPress={() => toggleDiagnosisStatus(realIdx)}
                          accessibilityLabel={`Resolve ${d.condition}`}
                          accessibilityRole="button"
                        >
                          <Text style={styles.resolveButton}>Resolve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeDiagnosis(realIdx)}
                          accessibilityLabel={`Remove ${d.condition}`}
                          accessibilityRole="button"
                        >
                          <Text style={styles.removeButton}>{'\u2715'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
              {editing && (
                <View style={styles.addRow}>
                  <TextInput
                    style={styles.addInput}
                    placeholder="Add diagnosis..."
                    placeholderTextColor={colors.textMuted}
                    value={newDiagnosis}
                    onChangeText={setNewDiagnosis}
                    onSubmitEditing={addDiagnosis}
                    returnKeyType="done"
                    accessibilityLabel="Add diagnosis"
                  />
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={addDiagnosis}
                    accessibilityLabel="Add diagnosis"
                    accessibilityRole="button"
                  >
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Resolved Diagnoses */}
          {resolvedDiagnoses.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>RESOLVED DIAGNOSES</Text>
              <View style={styles.infoCard}>
                {resolvedDiagnoses.map((d, idx) => {
                  const realIdx = info.diagnoses.indexOf(d);
                  return (
                    <View key={realIdx} style={styles.listItem}>
                      <Text style={styles.resolvedBullet}>{'\u2713'}</Text>
                      <Text style={styles.resolvedText}>{d.condition}</Text>
                      {editing && (
                        <View style={styles.itemActions}>
                          <TouchableOpacity
                            onPress={() => toggleDiagnosisStatus(realIdx)}
                            accessibilityLabel={`Reactivate ${d.condition}`}
                            accessibilityRole="button"
                          >
                            <Text style={styles.reactivateButton}>Reactivate</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => removeDiagnosis(realIdx)}
                            accessibilityLabel={`Remove ${d.condition}`}
                            accessibilityRole="button"
                          >
                            <Text style={styles.removeButton}>{'\u2715'}</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Allergies */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ALLERGIES</Text>
            <View style={[styles.infoCard, styles.allergyCard]}>
              {info.allergies.length === 0 && !editing && (
                <Text style={styles.emptyText}>No allergies reported</Text>
              )}
              {info.allergies.map((allergy, idx) => (
                <View key={idx} style={styles.listItem}>
                  <Text style={styles.allergyIcon}>{'\u26A0\uFE0F'}</Text>
                  <Text style={styles.allergyText}>{allergy}</Text>
                  {editing && (
                    <TouchableOpacity
                      onPress={() => removeAllergy(idx)}
                      accessibilityLabel={`Remove ${allergy}`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.removeButton}>{'\u2715'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {editing && (
                <View style={styles.addRow}>
                  <TextInput
                    style={styles.addInput}
                    placeholder="Add allergy..."
                    placeholderTextColor={colors.textMuted}
                    value={newAllergy}
                    onChangeText={setNewAllergy}
                    onSubmitEditing={addAllergy}
                    returnKeyType="done"
                    accessibilityLabel="Add allergy"
                  />
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={addAllergy}
                    accessibilityLabel="Add allergy"
                    accessibilityRole="button"
                  >
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Surgeries */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SURGICAL HISTORY</Text>
            <View style={styles.infoCard}>
              {info.surgeries.length === 0 && !editing && (
                <Text style={styles.emptyText}>No surgeries recorded</Text>
              )}
              {info.surgeries.map((s, idx) => (
                <View key={idx} style={styles.listItem}>
                  <Text style={styles.bulletIcon}>{'\u2022'}</Text>
                  <Text style={styles.listText}>
                    {s.procedure}{s.date ? ` (${s.date})` : ''}{s.notes ? ` \u2014 ${s.notes}` : ''}
                  </Text>
                  {editing && (
                    <TouchableOpacity
                      onPress={() => removeSurgery(idx)}
                      accessibilityLabel={`Remove ${s.procedure}`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.removeButton}>{'\u2715'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {editing && (
                <View style={styles.addRow}>
                  <TextInput
                    style={styles.addInput}
                    placeholder="Add surgery..."
                    placeholderTextColor={colors.textMuted}
                    value={newSurgery}
                    onChangeText={setNewSurgery}
                    onSubmitEditing={addSurgery}
                    returnKeyType="done"
                    accessibilityLabel="Add surgery"
                  />
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={addSurgery}
                    accessibilityLabel="Add surgery"
                    accessibilityRole="button"
                  >
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Hospitalizations */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>HOSPITALIZATIONS</Text>
            <View style={styles.infoCard}>
              {info.hospitalizations.length === 0 && !editing && (
                <Text style={styles.emptyText}>No hospitalizations recorded</Text>
              )}
              {info.hospitalizations.map((h, idx) => (
                <View key={idx} style={styles.listItem}>
                  <Text style={styles.bulletIcon}>{'\u2022'}</Text>
                  <Text style={styles.listText}>
                    {h.reason}{h.date ? ` (${h.date})` : ''}{h.duration ? ` \u2014 ${h.duration}` : ''}
                  </Text>
                  {editing && (
                    <TouchableOpacity
                      onPress={() => removeHospitalization(idx)}
                      accessibilityLabel={`Remove ${h.reason}`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.removeButton}>{'\u2715'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {editing && (
                <View style={styles.addRow}>
                  <TextInput
                    style={styles.addInput}
                    placeholder="Add hospitalization..."
                    placeholderTextColor={colors.textMuted}
                    value={newHospitalization}
                    onChangeText={setNewHospitalization}
                    onSubmitEditing={addHospitalization}
                    returnKeyType="done"
                    accessibilityLabel="Add hospitalization"
                  />
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={addHospitalization}
                    accessibilityLabel="Add hospitalization"
                    accessibilityRole="button"
                  >
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Edit / Done Button */}
          <TouchableOpacity
            style={[styles.editButton, editing && styles.editButtonDone]}
            onPress={() => setEditing(!editing)}
            accessibilityLabel={editing ? 'Done editing' : 'Edit medical history'}
            accessibilityRole="button"
          >
            <Text style={styles.editButtonText}>{editing ? 'Done Editing' : 'Edit Medical History'}</Text>
          </TouchableOpacity>

          {/* Clinical Care Settings Link */}
          <TouchableOpacity
            style={styles.clinicalCareLink}
            onPress={() => router.push('/patient/clinical-care')}
            activeOpacity={0.7}
            accessibilityLabel="Clinical Care Settings"
            accessibilityRole="button"
          >
            <View style={styles.clinicalCareLinkContent}>
              <View style={styles.clinicalCareLinkText}>
                <Text style={styles.clinicalCareLinkTitle}>Clinical Care Settings</Text>
                <Text style={styles.clinicalCareLinkHint}>
                  For complex care situations requiring detailed tracking and handoff reports.
                </Text>
              </View>
              <Text style={styles.clinicalCareLinkArrow}>{'\u203A'}</Text>
            </View>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  gradient: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },

  // SECTIONS
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textTertiary,
    letterSpacing: 1.2,
    marginBottom: Spacing.md,
  },

  // INFO CARDS
  infoCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  infoLabel: {
    fontSize: 14,
    color: c.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
  },
  inlineInput: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
    textAlign: 'right',
    minWidth: 140,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 6,
  },

  // LIST ITEMS
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  bulletIcon: {
    fontSize: 14,
    color: c.accent,
    width: 16,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: c.textMuted,
    paddingVertical: Spacing.sm,
  },

  // Resolved
  resolvedBullet: {
    fontSize: 14,
    color: c.textMuted,
    width: 16,
  },
  resolvedText: {
    flex: 1,
    fontSize: 14,
    color: c.textMuted,
    textDecorationLine: 'line-through',
  },

  // Item actions (edit mode)
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resolveButton: {
    fontSize: 12,
    fontWeight: '600',
    color: c.accent,
  },
  reactivateButton: {
    fontSize: 12,
    fontWeight: '600',
    color: c.amber,
  },
  removeButton: {
    fontSize: 16,
    color: c.red,
    paddingHorizontal: 4,
  },

  // Add row
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  addInput: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    backgroundColor: c.accentLight,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: c.accent,
  },

  // ALLERGY CARD
  allergyCard: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  allergyIcon: {
    fontSize: 16,
    width: 24,
  },
  allergyText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: c.redBright,
  },

  // EDIT BUTTON
  editButton: {
    backgroundColor: c.accent,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  editButtonDone: {
    backgroundColor: c.green,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.background,
  },

  // Clinical Care Link
  clinicalCareLink: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: Spacing.xl,
  },
  clinicalCareLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clinicalCareLinkText: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  clinicalCareLinkTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  clinicalCareLinkHint: {
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 18,
  },
  clinicalCareLinkArrow: {
    fontSize: 22,
    color: c.textMuted,
  },
});
