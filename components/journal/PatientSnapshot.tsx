// ============================================================================
// PATIENT SNAPSHOT
// Compact patient info card at the top of the Care Brief
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface PatientSnapshotProps {
  name: string;
  relationship?: string;
  age?: string;
  gender?: string;
  bloodType?: string;
  conditions?: string[];
  allergies?: string[];
  mobilityStatus?: string;
  cognitiveBaseline?: string;
}

export function PatientSnapshot({
  name,
  relationship,
  age,
  gender,
  bloodType,
  conditions,
  allergies,
  mobilityStatus,
  cognitiveBaseline,
}: PatientSnapshotProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const infoParts: string[] = [];
  if (age) infoParts.push(`${age}y`);
  if (gender) infoParts.push(gender);
  if (bloodType) infoParts.push(bloodType);

  return (
    <View style={styles.container} accessibilityLabel={`Patient: ${name}`}>
      <View style={styles.nameRow}>
        <Text style={styles.name}>{name}</Text>
        {relationship && <Text style={styles.relationship}>{relationship}</Text>}
      </View>

      {infoParts.length > 0 && (
        <Text style={styles.infoLine}>{infoParts.join(' \u00B7 ')}</Text>
      )}

      {conditions && conditions.length > 0 && (
        <View style={styles.tagsRow}>
          {conditions.map((c, i) => (
            <View key={i} style={styles.conditionTag}>
              <Text style={styles.conditionText}>{c}</Text>
            </View>
          ))}
        </View>
      )}

      {allergies && allergies.length > 0 && (
        <View style={styles.allergyRow}>
          <Text style={styles.allergyLabel}>Allergies:</Text>
          <Text style={styles.allergyText}>{allergies.join(', ')}</Text>
        </View>
      )}

      {(mobilityStatus || cognitiveBaseline) && (
        <View style={styles.clinicalRow}>
          {mobilityStatus && (
            <Text style={styles.clinicalText}>Mobility: {mobilityStatus}</Text>
          )}
          {cognitiveBaseline && (
            <Text style={styles.clinicalText}>Cognitive: {cognitiveBaseline}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: c.glassHover,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: c.textPrimary,
  },
  relationship: {
    fontSize: 13,
    color: c.textMuted,
  },
  infoLine: {
    fontSize: 13,
    color: c.textSecondary,
    marginBottom: Spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  conditionTag: {
    backgroundColor: c.accentLight,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.accent,
  },
  allergyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  allergyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.redBright,
  },
  allergyText: {
    fontSize: 12,
    color: c.redBright,
    flex: 1,
  },
  clinicalRow: {
    gap: 4,
  },
  clinicalText: {
    fontSize: 12,
    color: c.textSecondary,
  },
});
