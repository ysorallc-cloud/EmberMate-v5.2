// ============================================================================
// REPORT BUILDERS
// Build ReportData + preview lines for Daily Summary and Clinical Report
// ============================================================================

import { CareBrief } from './careSummaryBuilder';
import { ReportData, ReportSection } from './pdfExport';

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

interface DailyReportResult {
  reportData: ReportData;
  previewLines: string[];
}

// ============================================================================
// DAILY SUMMARY REPORT
// ============================================================================

export function buildDailySummaryReport(
  brief: CareBrief,
  dateStr: string,
  dayName: string,
  glanceStats: GlanceStat[],
  handoffNotes: HandoffNote[],
): DailyReportResult {
  const previewLines: string[] = [];
  const sections: ReportSection[] = [];

  // Patient info
  if (brief.patient.name) {
    previewLines.push(`[HEADER] Patient: ${brief.patient.name}`);
    if (brief.patient.age) previewLines.push(`Age: ${brief.patient.age}`);
    if (brief.patient.conditions?.length) {
      previewLines.push(`Conditions: ${brief.patient.conditions.join(', ')}`);
    }
    if (brief.patient.allergies?.length) {
      previewLines.push(`Allergies: ${brief.patient.allergies.join(', ')}`);
    }
    previewLines.push('');
  }

  // Narrative
  previewLines.push(`[HEADER] ${brief.handoffNarrative || brief.statusNarrative}`);
  previewLines.push('');

  // Handoff notes
  if (handoffNotes.length > 0) {
    previewLines.push('[SECTION] Handoff Notes');
    const handoffRows: ReportSection['rows'] = [];
    for (const note of handoffNotes) {
      previewLines.push(`  ${note.icon} ${note.text}`);
      handoffRows.push({ label: `${note.icon} ${note.text}`, value: '' });
    }
    sections.push({ heading: 'Handoff Notes', rows: handoffRows });
    previewLines.push('');
  }

  // Day at a glance
  previewLines.push('[SECTION] Day at a Glance');
  const glanceRows: ReportSection['rows'] = [];
  for (const stat of glanceStats) {
    previewLines.push(`  \u2022 ${stat.label}: ${stat.value}`);
    glanceRows.push({ label: stat.label, value: stat.value });
  }
  sections.push({ heading: 'Day at a Glance', rows: glanceRows });
  previewLines.push('');

  // Guidance from interpretations
  const guidanceParts: string[] = [];
  if (brief.interpretations?.vitals) guidanceParts.push(brief.interpretations.vitals);
  if (brief.interpretations?.nutrition) guidanceParts.push(brief.interpretations.nutrition);
  if (brief.interpretations?.medications) guidanceParts.push(brief.interpretations.medications);

  let notes: string | undefined;
  if (guidanceParts.length > 0) {
    const guidanceText = guidanceParts.join(' ');
    previewLines.push('[SECTION] Guidance');
    previewLines.push(guidanceText);
    sections.push({ heading: 'Guidance', text: guidanceText });
    notes = guidanceText;
  }

  // Build flat details for backward-compat PDF rendering
  const details: ReportData['details'] = glanceStats.map(s => ({
    label: s.label,
    value: s.value,
  }));

  const reportData: ReportData = {
    title: `Daily Journal \u2014 ${dayName}, ${dateStr}`,
    period: dateStr,
    periodLabel: "Today's care summary",
    summary: brief.statusNarrative || brief.handoffNarrative || '',
    details,
    sections,
    notes,
    generatedAt: new Date(),
  };

  return { reportData, previewLines };
}

// ============================================================================
// CLINICAL REPORT (30-DAY)
// ============================================================================

export function buildClinicalReportData(brief: CareBrief): DailyReportResult {
  const previewLines: string[] = [];
  const sections: ReportSection[] = [];

  // Patient info
  previewLines.push(`[HEADER] Patient: ${brief.patient.name || 'Patient'}`);
  if (brief.patient.age) previewLines.push(`Age: ${brief.patient.age}`);
  if (brief.patient.gender) previewLines.push(`Gender: ${brief.patient.gender}`);
  previewLines.push('');

  // Narrative
  previewLines.push(`[HEADER] ${brief.handoffNarrative || brief.statusNarrative}`);
  previewLines.push('');

  // Medical history section
  const historyRows: ReportSection['rows'] = [];
  previewLines.push('[SECTION] Medical History');

  const conditions = brief.patient.conditions?.length
    ? brief.patient.conditions.join(', ')
    : 'None recorded';
  previewLines.push(`  \u2022 Conditions: ${conditions}`);
  historyRows.push({ label: 'Conditions', value: conditions });

  const allergies = brief.patient.allergies?.length
    ? brief.patient.allergies.join(', ')
    : 'None recorded';
  previewLines.push(`  \u2022 Allergies: ${allergies}`);
  historyRows.push({ label: 'Allergies', value: allergies });

  if (brief.patient.bloodType) {
    previewLines.push(`  \u2022 Blood Type: ${brief.patient.bloodType}`);
    historyRows.push({ label: 'Blood Type', value: brief.patient.bloodType });
  }

  if (brief.medicalInfo?.surgeries?.length) {
    const surgeryList = brief.medicalInfo.surgeries
      .map(s => `${s.procedure}${s.date ? ` (${s.date})` : ''}`)
      .join(', ');
    previewLines.push(`  \u2022 Surgeries: ${surgeryList}`);
    historyRows.push({ label: 'Surgeries', value: surgeryList });
  }

  sections.push({ heading: 'Medical History', rows: historyRows });
  previewLines.push('');

  // Medication adherence
  if (brief.medications.length > 0) {
    previewLines.push('[SECTION] Medications');
    const medRows: ReportSection['rows'] = [];
    for (const med of brief.medications) {
      const statusText = `${med.dosage || 'No dosage'} \u2014 ${med.status}`;
      previewLines.push(`  \u2022 ${med.name}: ${statusText}`);
      medRows.push({ label: med.name, value: statusText });
    }
    if (brief.interpretations?.medications) {
      previewLines.push(`  ${brief.interpretations.medications}`);
    }
    sections.push({
      heading: 'Medications',
      rows: medRows,
      text: brief.interpretations?.medications,
    });
    previewLines.push('');
  }

  // Vitals
  if (brief.vitals.recorded && brief.vitals.readings) {
    previewLines.push('[SECTION] Vitals');
    const vitalsRows: ReportSection['rows'] = [];
    const r = brief.vitals.readings;
    if (r.systolic != null && r.diastolic != null) {
      const bp = `${r.systolic}/${r.diastolic} mmHg`;
      previewLines.push(`  \u2022 Blood Pressure: ${bp}`);
      vitalsRows.push({ label: 'Blood Pressure', value: bp });
    }
    if (r.heartRate != null) {
      previewLines.push(`  \u2022 Heart Rate: ${r.heartRate} bpm`);
      vitalsRows.push({ label: 'Heart Rate', value: `${r.heartRate} bpm` });
    }
    if (r.oxygen != null) {
      previewLines.push(`  \u2022 O2 Saturation: ${r.oxygen}%`);
      vitalsRows.push({ label: 'O2 Saturation', value: `${r.oxygen}%` });
    }
    if (r.glucose != null) {
      previewLines.push(`  \u2022 Glucose: ${r.glucose} mg/dL`);
      vitalsRows.push({ label: 'Glucose', value: `${r.glucose} mg/dL` });
    }
    if (r.weight != null) {
      previewLines.push(`  \u2022 Weight: ${r.weight} lbs`);
      vitalsRows.push({ label: 'Weight', value: `${r.weight} lbs` });
    }
    if (brief.interpretations?.vitals) {
      previewLines.push(`  ${brief.interpretations.vitals}`);
    }
    sections.push({
      heading: 'Vitals',
      rows: vitalsRows,
      text: brief.interpretations?.vitals,
    });
    previewLines.push('');
  }

  // Attention items + guidance
  const notesParts: string[] = [];
  if (brief.attentionItems.length > 0) {
    previewLines.push('[SECTION] Attention Items');
    for (const item of brief.attentionItems) {
      const line = item.detail ? `${item.text} \u2014 ${item.detail}` : item.text;
      previewLines.push(`  \u2022 ${line}`);
    }
    notesParts.push(
      'Attention Items:\n' +
        brief.attentionItems.map(a => `- ${a.text}${a.detail ? ' - ' + a.detail : ''}`).join('\n'),
    );
    previewLines.push('');
  }

  // Caregiver guidance
  const guidanceParts: string[] = [];
  if (brief.interpretations?.vitals) guidanceParts.push(brief.interpretations.vitals);
  if (brief.interpretations?.nutrition) guidanceParts.push(brief.interpretations.nutrition);
  if (brief.interpretations?.medications) guidanceParts.push(brief.interpretations.medications);
  if (guidanceParts.length > 0) {
    const guidanceText = guidanceParts.join(' ');
    previewLines.push('[SECTION] Caregiver Guidance');
    previewLines.push(guidanceText);
    notesParts.push(guidanceText);
    sections.push({ heading: 'Caregiver Guidance', text: guidanceText });
  }

  // Build flat details for backward-compat
  const details: ReportData['details'] = [];
  details.push({ label: 'Patient', value: brief.patient.name || 'Not recorded' });
  if (brief.patient.age) details.push({ label: 'Age', value: brief.patient.age });
  details.push({ label: 'Conditions', value: conditions });
  details.push({ label: 'Allergies', value: allergies });

  const reportData: ReportData = {
    title: 'Clinical Summary \u2014 30 Days',
    period: '30-day period',
    periodLabel: `Prepared for ${brief.nextAppointment?.provider || 'Healthcare Provider'}`,
    summary: brief.handoffNarrative || brief.statusNarrative || '',
    details,
    sections,
    notes: notesParts.length > 0 ? notesParts.join('\n\n') : undefined,
    generatedAt: new Date(),
  };

  return { reportData, previewLines };
}
