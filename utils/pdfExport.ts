// PDF EXPORT UTILITY
// Professional report generation for provider appointments
// Colors intentionally hardcoded — PDF/HTML print context (light background)

import { Alert, Platform, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { logError } from './devLog';

export interface ReportSection {
  heading: string;
  rows?: Array<{ label: string; value: string; trend?: 'up' | 'down' | 'stable' }>;
  text?: string;
}

export interface ReportData {
  title: string;
  period: string;
  periodLabel: string;
  summary: string;
  details: Array<{
    label: string;
    value: string;
    trend?: 'up' | 'down' | 'stable';
  }>;
  sections?: ReportSection[];
  notes?: string;
  generatedAt?: Date;
}

export interface PatientInfo {
  name?: string;
  dob?: string; // DEPRECATED
  age?: string;
  id?: string;
}

// Generate HTML template for PDF
function generateHTML(data: ReportData, patient?: PatientInfo): string {
  const timestamp = data.generatedAt || new Date();
  const formattedDate = timestamp.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const detailsHTML = data.details
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">${item.label}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 600;">
          ${item.value}
          ${item.trend === 'up' ? ' ↑' : item.trend === 'down' ? ' ↓' : ''}
        </td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${data.title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1F2937;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          border-bottom: 2px solid #2D3B2D;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: 700;
          color: #2D3B2D;
          margin-bottom: 8px;
        }
        .logo span {
          color: #D4A574;
        }
        .subtitle {
          color: #6B7280;
          font-size: 14px;
        }
        .patient-info {
          background: #F9FAFB;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 30px;
        }
        .patient-info h3 {
          font-size: 12px;
          text-transform: uppercase;
          color: #6B7280;
          margin-bottom: 8px;
        }
        .patient-info p {
          margin: 4px 0;
          font-size: 14px;
        }
        .report-title {
          font-size: 28px;
          font-weight: 700;
          color: #2D3B2D;
          margin-bottom: 8px;
        }
        .report-period {
          color: #6B7280;
          font-size: 16px;
          margin-bottom: 24px;
        }
        .summary-box {
          background: linear-gradient(135deg, #2D3B2D 0%, #3D4B3D 100%);
          color: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 30px;
        }
        .summary-label {
          font-size: 14px;
          opacity: 0.8;
          margin-bottom: 8px;
        }
        .summary-value {
          font-size: 32px;
          font-weight: 700;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .details-table th {
          background: #F3F4F6;
          padding: 12px 16px;
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          color: #6B7280;
        }
        .section-heading {
          font-size: 20px;
          font-weight: 700;
          color: #2D3B2D;
          margin-top: 30px;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #E5E7EB;
        }
        .narrative {
          background: #F9FAFB;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          line-height: 1.6;
          color: #374151;
          font-size: 14px;
        }
        .notes-section {
          background: #FFFBEB;
          border-left: 4px solid #D4A574;
          padding: 16px;
          border-radius: 0 8px 8px 0;
          margin-bottom: 30px;
        }
        .notes-title {
          font-weight: 600;
          margin-bottom: 8px;
          color: #92400E;
        }
        .notes-content {
          color: #78350F;
          line-height: 1.6;
        }
        .footer {
          border-top: 1px solid #E5E7EB;
          padding-top: 20px;
          margin-top: 40px;
          font-size: 12px;
          color: #9CA3AF;
        }
        .disclaimer {
          font-style: italic;
          margin-top: 12px;
        }
        @media print {
          body { padding: 20px; }
          .summary-box { -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">Ember<span>Mate</span></div>
        <div class="subtitle">Health Tracking for Caregivers</div>
      </div>

      ${
        patient
          ? `
        <div class="patient-info">
          <h3>Patient Information</h3>
          ${patient.name ? `<p><strong>Name:</strong> ${patient.name}</p>` : ''}
          ${patient.age ? `<p><strong>Age:</strong> ${patient.age}</p>` : ''}
          ${patient.id ? `<p><strong>ID:</strong> ${patient.id}</p>` : ''}
        </div>
      `
          : ''
      }

      <h1 class="report-title">${data.title}</h1>
      <p class="report-period">${data.periodLabel}</p>

      <div class="summary-box">
        <div class="summary-label">Summary</div>
        <div class="summary-value">${data.summary}</div>
      </div>

      <table class="details-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th style="text-align: right;">Value</th>
          </tr>
        </thead>
        <tbody>
          ${detailsHTML}
        </tbody>
      </table>

      ${
        data.sections
          ? data.sections.map(section => `
        <h2 class="section-heading">${section.heading}</h2>
        ${section.rows && section.rows.length > 0 ? `
        <table class="details-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th style="text-align: right;">Value</th>
            </tr>
          </thead>
          <tbody>
            ${section.rows.map(row => `
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">${row.label}</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 600;">
                ${row.value}${row.trend === 'up' ? ' ↑' : row.trend === 'down' ? ' ↓' : ''}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>` : ''}
        ${section.text ? `<div class="narrative">${section.text}</div>` : ''}
      `).join('')
          : ''
      }

      ${
        data.notes
          ? `
        <div class="notes-section">
          <div class="notes-title">Clinical Notes</div>
          <div class="notes-content">${data.notes}</div>
        </div>
      `
          : ''
      }

      <div class="footer">
        <p><strong>CONFIDENTIAL — Protected Health Information</strong></p>
        <p>This document contains sensitive health data intended only for the named recipient. Unauthorized disclosure is prohibited.</p>
        <p style="margin-top: 8px;">Generated on ${formattedDate} at ${formattedTime} by EmberMate</p>
        <p class="disclaimer">
          This report is generated from personal tracking data for informational purposes only.
          It is not a medical record and is not a substitute for professional medical advice, diagnosis, or treatment.
        </p>
      </div>
    </body>
    </html>
  `;
}

// Generate preview text for in-app display before export
export function generatePreviewHTML(data: ReportData, patient?: PatientInfo): string {
  const lines: string[] = [];

  if (patient?.name) {
    lines.push(`Patient: ${patient.name}`);
  }

  // The summary field contains the structured report text
  if (data.summary) {
    lines.push(data.summary);
  }

  if (data.notes) {
    lines.push('');
    lines.push('Notes:');
    lines.push(data.notes);
  }

  return lines.join('\n');
}

// Generate and share PDF
export async function generateAndSharePDF(
  data: ReportData,
  patient?: PatientInfo
): Promise<boolean> {
  try {
    const html = generateHTML(data, patient);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Rename to a readable filename
    const safeName = data.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
    const newUri = `${FileSystem.cacheDirectory}${safeName}.pdf`;
    await FileSystem.moveAsync({ from: uri, to: newUri });

    // Share the PDF (no UTI — ensures full iOS share sheet with Mail, Messages, AirDrop)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${data.title}`,
      });
      return true;
    } else {
      Alert.alert('Sharing not available', 'Sharing is not available on this device.');
      return false;
    }
  } catch (error) {
    logError('pdfExport.generateAndSharePDF', error);
    Alert.alert(
      'Error',
      'Could not generate PDF. Please try again.'
    );
    return false;
  }
}

// Print PDF directly
export async function printPDF(
  data: ReportData,
  patient?: PatientInfo
): Promise<boolean> {
  try {
    const html = generateHTML(data, patient);
    await Print.printAsync({ html });
    return true;
  } catch (error) {
    logError('pdfExport.printPDF', error);
    Alert.alert('Error', 'Could not print. Please try again.');
    return false;
  }
}

// Share as text (fallback without PDF dependencies)
export async function shareAsText(
  data: ReportData,
  patient?: PatientInfo
): Promise<boolean> {
  const timestamp = new Date();
  const formattedDate = timestamp.toLocaleDateString();
  
  let text = `📋 ${data.title}\n`;
  text += `📅 ${data.periodLabel}\n\n`;
  
  if (patient?.name) {
    text += `👤 Patient: ${patient.name}\n`;
    if (patient.age) text += `Age: ${patient.age}\n`;
    text += '\n';
  }
  
  text += `📊 Summary: ${data.summary}\n\n`;
  text += `---\n\n`;
  
  data.details.forEach((item) => {
    const trend = item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '';
    text += `• ${item.label}: ${item.value} ${trend}\n`;
  });
  
  if (data.notes) {
    text += `\n---\n\n📝 Notes:\n${data.notes}\n`;
  }
  
  text += `\n---\n🔒 CONFIDENTIAL — Protected Health Information\nThis document contains sensitive health data intended only for the named recipient.\nGenerated by EmberMate on ${formattedDate}\n\n⚠️ This is personal tracking data, not a medical record. Always verify with healthcare providers.`;
  
  try {
    await Share.share({
      message: text,
      title: data.title,
    });
    return true;
  } catch (error) {
    logError('pdfExport.shareAsText', error);
    return false;
  }
}
