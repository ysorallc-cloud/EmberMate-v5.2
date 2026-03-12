// ============================================================================
// SHARE REPORT SHEET — Bottom sheet for sharing Daily Summary or Clinical Report
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { CareBrief } from '../../utils/careSummaryBuilder';
import { buildDailySummaryReport, buildClinicalReportData } from '../../utils/reportBuilders';
import { generateAndSharePDF } from '../../utils/pdfExport';

interface GlanceStat {
  label: string;
  value: string;
  color?: string;
}

interface HandoffNote {
  icon: string;
  text: string;
  type: string;
}

interface ShareReportSheetProps {
  visible: boolean;
  onClose: () => void;
  brief: CareBrief;
  patientName: string;
  patientAge?: string;
  glanceStats: GlanceStat[];
  handoffNotes: HandoffNote[];
}

export function ShareReportSheet({
  visible,
  onClose,
  brief,
  patientName,
  patientAge,
  glanceStats,
  handoffNotes,
}: ShareReportSheetProps) {
  const { colors: c } = useTheme();
  const [reportType, setReportType] = useState<'daily' | 'clinical'>('daily');
  const [exporting, setExporting] = useState(false);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

  const reportData = useMemo(() => {
    if (!brief) return null;
    if (reportType === 'daily') {
      return buildDailySummaryReport(brief, dateStr, dayName, glanceStats, handoffNotes);
    } else {
      return buildClinicalReportData(brief);
    }
  }, [reportType, brief, dateStr, dayName, glanceStats, handoffNotes]);

  const previewLines = reportData?.previewLines ?? [];

  async function handleShare() {
    if (!reportData) return;
    setExporting(true);
    try {
      await generateAndSharePDF(reportData.reportData, {
        name: patientName,
        age: patientAge,
      });
      onClose();
    } catch (err) {
      Alert.alert('Export Error', 'Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const s = useMemo(() => createStyles(c), [c]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={s.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Share Report</Text>

          {/* Report type selector */}
          <View style={s.typeRow}>
            <TouchableOpacity
              style={[s.typeCard, reportType === 'daily' && s.typeCardActive]}
              onPress={() => setReportType('daily')}
              accessibilityLabel="Daily Summary report"
              accessibilityRole="button"
            >
              <Text style={s.typeIcon}>📋</Text>
              <Text style={[s.typeLabel, reportType === 'daily' && s.typeLabelActive]}>
                Daily Summary
              </Text>
              <Text style={s.typeSubtitle}>
                Today's care overview for the next caregiver
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.typeCard, reportType === 'clinical' && s.typeCardActive]}
              onPress={() => setReportType('clinical')}
              accessibilityLabel="Clinical report"
              accessibilityRole="button"
            >
              <Text style={s.typeIcon}>🩺</Text>
              <Text style={[s.typeLabel, reportType === 'clinical' && s.typeLabelActive]}>
                Clinical
              </Text>
              <Text style={s.typeSubtitle}>
                Full medical history for providers
              </Text>
            </TouchableOpacity>
          </View>

          {/* Preview */}
          {previewLines.length > 0 && (
            <View style={s.previewBox}>
              {previewLines.slice(0, 8).map((line, i) => (
                <Text key={i} style={s.previewLine} numberOfLines={1}>
                  {line}
                </Text>
              ))}
            </View>
          )}

          {/* Privacy note */}
          <View style={s.privacyRow}>
            <Text style={s.privacyIcon}>🔒</Text>
            <Text style={s.privacyText}>
              {reportType === 'daily'
                ? 'Generated on-device. You control who receives this.'
                : 'Contains full medical history. Share only with providers.'}
            </Text>
          </View>

          {/* Share button */}
          <TouchableOpacity
            style={s.shareBtn}
            onPress={handleShare}
            disabled={exporting || !reportData}
            accessibilityLabel="Share as PDF"
            accessibilityRole="button"
          >
            {exporting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.shareBtnText}>Share as PDF</Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function createStyles(c: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 36,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.glassBorder,
      alignSelf: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
      textAlign: 'center',
      marginBottom: 16,
    },
    typeRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    typeCard: {
      flex: 1,
      backgroundColor: c.glass,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.glassBorder,
      padding: 14,
      alignItems: 'center',
    },
    typeCardActive: {
      borderColor: c.accent,
      backgroundColor: c.accentGlow || 'rgba(91,138,106,0.15)',
    },
    typeIcon: {
      fontSize: 24,
      marginBottom: 6,
    },
    typeLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      marginBottom: 4,
      textAlign: 'center',
    },
    typeLabelActive: {
      color: c.textPrimary,
    },
    typeSubtitle: {
      fontSize: 10,
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 14,
    },
    previewBox: {
      backgroundColor: c.glass,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.glassBorder,
      padding: 12,
      marginBottom: 12,
    },
    previewLine: {
      fontSize: 11,
      color: c.textSecondary,
      lineHeight: 16,
    },
    privacyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    privacyIcon: {
      fontSize: 12,
    },
    privacyText: {
      fontSize: 11,
      color: c.textMuted,
      flex: 1,
      lineHeight: 16,
    },
    shareBtn: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    shareBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
