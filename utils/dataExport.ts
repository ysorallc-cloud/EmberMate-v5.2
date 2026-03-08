// ============================================================================
// DATA EXPORT UTILITY
// Export user data in various formats (JSON, CSV)
// ============================================================================

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import Constants from 'expo-constants';
import { logError } from './devLog';
import { getTodayDateString } from '../services/carePlanGenerator';
import { StorageKeys } from './storageKeys';
import { safeGetItem } from './safeStorage';

/**
 * Export all data as JSON
 */
export async function exportDataAsJSON(): Promise<void> {
  try {
    // Get all data
    const keys = await AsyncStorage.getAllKeys();
    const userDataKeys = keys.filter(
      (key) => !key.startsWith('system_') && !key.startsWith('app_')
    );

    const data: { [key: string]: any } = {};

    for (const key of userDataKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    }

    // Create export object
    const appVersion = Constants.expoConfig?.version || '1.0.0';
    const exportData = {
      exportDate: new Date().toISOString(),
      appVersion,
      dataCount: userDataKeys.length,
      data,
    };

    // Generate filename
    const timestamp = getTodayDateString();
    const filename = `embermate-export-${timestamp}.json`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    // Write file
    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(exportData, null, 2)
    );

    // Share file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export EmberMate Data',
      });
    } else {
      Alert.alert(
        'Export Complete',
        `Data exported to: ${filename}\n\nYou can find it in your device's documents folder.`
      );
    }
  } catch (error) {
    logError('dataExport.exportDataAsJSON', error);
    Alert.alert('Export Failed', 'Unable to export data. Please try again.');
  }
}

/**
 * Export data as CSV (simplified - medications and vitals)
 */
export async function exportDataAsCSV(): Promise<void> {
  try {
    // Get medication and vitals data
    const medications = await safeGetItem<any[] | null>(StorageKeys.MEDICATIONS, null);
    const vitals = await safeGetItem<any[] | null>('@vitals_readings', null);
    const dailyTracking = await AsyncStorage.getAllKeys().then(async (keys) => {
      const trackingKeys = keys.filter((k) => k.startsWith('@daily_tracking_'));
      const data = [];
      for (const key of trackingKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) data.push(JSON.parse(value));
      }
      return data;
    });

    let csv = 'Type,Date,Name,Value,Notes\n';

    // Add medications
    if (medications) {
      for (const med of medications) {
        const notes = (med.notes || '').replace(/"/g, '""');
        csv += `Medication,${med.createdAt || ''},${med.name},${med.dosage},"${notes}"\n`;
      }
    }

    // Add vitals
    if (vitals) {
      for (const vital of vitals) {
        const notes = (vital.notes || '').replace(/"/g, '""');
        csv += `Vital,${vital.timestamp || ''},${vital.type},${vital.value} ${vital.unit || ''},"${notes}"\n`;
      }
    }

    // Add daily tracking
    for (const tracking of dailyTracking) {
      if (tracking.mood !== null) {
        csv += `Mood,${tracking.date},,${tracking.mood},\n`;
      }
      if (tracking.sleep !== null) {
        csv += `Sleep,${tracking.date},,${tracking.sleep} hours,\n`;
      }
      if (tracking.hydration !== null) {
        csv += `Hydration,${tracking.date},,${tracking.hydration} glasses,\n`;
      }
    }

    // Generate filename
    const timestamp = getTodayDateString();
    const filename = `embermate-export-${timestamp}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    // Write file
    await FileSystem.writeAsStringAsync(fileUri, csv);

    // Share file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export EmberMate Data',
      });
    } else {
      Alert.alert(
        'Export Complete',
        `Data exported to: ${filename}\n\nYou can find it in your device's documents folder.`
      );
    }
  } catch (error) {
    logError('dataExport.exportDataAsCSV', error);
    Alert.alert('Export Failed', 'Unable to export data. Please try again.');
  }
}

/**
 * Generate a health summary PDF-ready data object
 * (Actual PDF generation would require additional libraries)
 */
export async function generateHealthSummary(): Promise<{
  medicationCount: number;
  vitalCount: number;
  trackingDays: number;
  dateRange: { start: string; end: string };
}> {
  try {
    const medications = await safeGetItem<any[] | null>(StorageKeys.MEDICATIONS, null);
    const vitals = await safeGetItem<any[] | null>('@vitals_readings', null);
    const trackingKeys = (await AsyncStorage.getAllKeys()).filter((k) =>
      k.startsWith('@daily_tracking_')
    );

    const medCount = medications ? medications.length : 0;
    const vitalCount = vitals ? vitals.length : 0;

    // Get date range from tracking keys
    const dates = trackingKeys
      .map((k) => k.replace('@daily_tracking_', ''))
      .sort();
    const startDate = dates[0] || getTodayDateString();
    const endDate =
      dates[dates.length - 1] || getTodayDateString();

    return {
      medicationCount: medCount,
      vitalCount: vitalCount,
      trackingDays: trackingKeys.length,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    };
  } catch (error) {
    logError('dataExport.generateHealthSummary', error);
    return {
      medicationCount: 0,
      vitalCount: 0,
      trackingDays: 0,
      dateRange: {
        start: getTodayDateString(),
        end: getTodayDateString(),
      },
    };
  }
}
