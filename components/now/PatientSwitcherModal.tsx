// ============================================================================
// PATIENT INFO MODAL
// Bottom sheet showing active patient details with link to full profile
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { usePatient } from '../../contexts/PatientContext';
import { navigate } from '../../lib/navigate';
import { safeGetItem } from '../../utils/safeStorage';
import { StorageKeys } from '../../utils/storageKeys';

interface PatientSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PatientSwitcherModal({ visible, onClose }: PatientSwitcherModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { activePatient } = usePatient();

  const [age, setAge] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      Promise.all([
        safeGetItem<string | null>(StorageKeys.PATIENT_AGE, null),
        safeGetItem<string | null>(StorageKeys.PATIENT_GENDER, null),
        safeGetItem<string | null>(StorageKeys.PATIENT_LANGUAGE, null),
      ]).then(([a, g, l]) => {
        setAge(a);
        setGender(g);
        setLanguage(l);
      });
    }
  }, [visible]);

  const name = activePatient?.name || 'Patient';
  const relationship = activePatient?.relationship;

  // Build summary details
  const details: string[] = [];
  if (age) details.push(age);
  if (gender) details.push(gender);
  if (language) details.push(language);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />

          {/* Patient avatar + name */}
          <View style={styles.profileSection}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>
                {name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.patientName}>{name}</Text>
            {relationship && (
              <Text style={styles.relationship}>
                {relationship.charAt(0).toUpperCase() + relationship.slice(1)}
              </Text>
            )}
          </View>

          {/* Details row */}
          {details.length > 0 && (
            <View style={styles.detailsRow}>
              {details.map((detail, i) => (
                <View key={i} style={styles.detailChip}>
                  <Text style={styles.detailText}>{detail}</Text>
                </View>
              ))}
            </View>
          )}

          {/* View Full Profile button */}
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => { onClose(); navigate('/patient'); }}
            accessibilityLabel="View full patient profile"
            accessibilityRole="button"
          >
            <Text style={styles.profileBtnText}>View Full Profile ›</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.menuSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.glassBorder,
    alignSelf: 'center',
    marginBottom: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  patientName: {
    fontSize: 20,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 4,
  },
  relationship: {
    fontSize: 13,
    color: c.textMuted,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  detailChip: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailText: {
    fontSize: 12,
    color: c.textSecondary,
  },
  profileBtn: {
    backgroundColor: c.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  profileBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
