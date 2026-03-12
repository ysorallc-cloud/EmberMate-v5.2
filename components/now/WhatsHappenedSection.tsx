import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { CareBrief } from '../../utils/careSummaryBuilder';

type HandoffType = 'done' | 'watch' | 'flag';
interface HandoffItem { icon: string; text: string; type: HandoffType; }

function formatTime(t: string): string {
  if (!t) return '';
  if (t.includes('T')) {
    const date = new Date(t);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  const parts = t.split(':');
  if (parts.length < 2) return t;
  const hr = parseInt(parts[0]);
  const min = parts[1];
  const period = hr >= 12 ? 'PM' : 'AM';
  return `${hr % 12 || 12}:${min} ${period}`;
}

function buildHandoffNotes(brief: CareBrief): HandoffItem[] {
  const items: HandoffItem[] = [];

  for (const med of brief.medications) {
    if ((med.status === 'completed' || med.status === 'skipped') && med.takenAt) {
      items.push({
        icon: '💊',
        text: `${med.name} taken at ${formatTime(med.takenAt)}`,
        type: 'done',
      });
    }
  }

  if (brief.attentionItems) {
    for (const ai of brief.attentionItems) {
      const text = ai.text || '';
      let type: HandoffType = 'watch';
      if (/miss|skip|overdue/i.test(text)) type = 'flag';
      const icon = type === 'flag' ? '🛑' : '👁️';
      items.push({ icon, text, type });
    }
  }

  if (brief.interpretations?.medications) {
    items.push({ icon: '💊', text: brief.interpretations.medications, type: 'watch' });
  }
  if (brief.interpretations?.vitals) {
    items.push({ icon: '🌡️', text: brief.interpretations.vitals, type: 'watch' });
  }
  if (brief.interpretations?.nutrition) {
    items.push({ icon: '🍞', text: brief.interpretations.nutrition, type: 'watch' });
  }

  return items;
}

interface WhatsHappenedSectionProps {
  brief: CareBrief;
  SectionHeaderRow: React.ComponentType<any>;
  sectionStyles: any;
}

export function WhatsHappenedSection({ brief, SectionHeaderRow, sectionStyles }: WhatsHappenedSectionProps) {
  const { colors } = useTheme();
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const handoffNotes = buildHandoffNotes(brief);

  if (handoffNotes.length === 0) return null;

  const styles = createStyles(colors);

  return (
    <>
      {historyExpanded ? (
        <>
          <SectionHeaderRow
            title="What's Happened"
            collapsed={false}
            onToggleCollapse={() => setHistoryExpanded(false)}
            styles={sectionStyles}
          />
          <View style={sectionStyles.sectionCard}>
            {handoffNotes.map((item, i) => (
              <View key={`handoff-${i}`} style={styles.handoffRow}>
                <Text style={styles.handoffIcon}>{item.icon}</Text>
                <Text style={[styles.handoffText, { color: colors.textSecondary }]}>{item.text}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <TouchableOpacity
          style={[sectionStyles.sectionCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 }]}
          onPress={() => setHistoryExpanded(true)}
          activeOpacity={0.7}
          accessibilityLabel={`${handoffNotes.length} items logged today. Tap to expand.`}
          accessibilityRole="button"
        >
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            {handoffNotes.length} item{handoffNotes.length !== 1 ? 's' : ''} logged today
          </Text>
          <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '500' }}>
            View ›
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  handoffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  handoffIcon: {
    fontSize: 16,
  },
  handoffText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
