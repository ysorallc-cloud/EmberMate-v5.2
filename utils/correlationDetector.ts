// ============================================================================
// CORRELATION DETECTOR
// 100% local processing - no database, no cloud, no network
// Uses Pearson correlation to detect patterns in tracked data
// ============================================================================

import { sampleCorrelation } from 'simple-statistics';
import { getMedicationLogs } from './medicationStorage';
import { getSymptoms, SymptomLog } from './symptomStorage';
import { getDailyTrackingLogs, DailyTrackingLog } from './dailyTrackingStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem } from './safeStorage';
import { logError } from './devLog';
import { getTodayDateString, toLocalDateString } from '../services/carePlanGenerator';

export interface CorrelationDataPoint {
  date: string;
  // Symptoms (0-10)
  pain: number | null;
  fatigue: number | null;
  nausea: number | null;
  dizziness: number | null;
  // Daily tracking
  hydration: number | null; // Cups
  mood: number | null; // 0-10
  sleep: number | null; // Hours
  // Vitals
  systolic: number | null; // mmHg
  diastolic: number | null; // mmHg
  heartRate: number | null; // bpm
  // Medication adherence
  medicationAdherence: number | null; // 0-100 percentage
}

export interface DetectedPattern {
  id: string;
  variable1: string;
  variable2: string;
  coefficient: number; // Pearson correlation coefficient (-1 to 1)
  confidence: 'low' | 'moderate' | 'high';
  dataPoints: number; // Number of days used
  insight: string; // Qualified language description
  action: string; // Tracking-focused suggestion
}

const CORRELATION_THRESHOLD = 0.3; // Minimum |coefficient| to report
const CACHE_KEY = '@correlation_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if there's sufficient data for correlation analysis
 */
export async function hasSufficientData(): Promise<boolean> {
  try {
    const endDate = getTodayDateString();
    const startDate = toLocalDateString(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000));

    const data = await loadCorrelationData(startDate, endDate);
    
    // Need at least 14 days with at least 2 different categories tracked
    const daysWithData = data.filter(d => {
      const categories = [
        d.pain, d.fatigue, d.nausea, d.hydration, 
        d.mood, d.sleep, d.medicationAdherence
      ].filter(v => v !== null);
      return categories.length >= 2;
    });
    
    return daysWithData.length >= 14;
  } catch (error) {
    logError('correlationDetector.hasSufficientData', error);
    return false;
  }
}

/**
 * Load correlation data from local storage (AsyncStorage only)
 */
async function loadCorrelationData(
  startDate: string,
  endDate: string
): Promise<CorrelationDataPoint[]> {
  try {
    // Load all tracking data from AsyncStorage (no network)
    const allSymptomLogs = await getSymptoms();
    const symptomLogs = allSymptomLogs.filter(log => {
      const logDate = log.timestamp.split('T')[0];
      return logDate >= startDate && logDate <= endDate;
    });
    const dailyLogs = await getDailyTrackingLogs(startDate, endDate);
    
    // Merge data by date
    const dataMap = new Map<string, CorrelationDataPoint>();
    
    // Initialize all dates in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = toLocalDateString(d);
      dataMap.set(dateStr, {
        date: dateStr,
        pain: null,
        fatigue: null,
        nausea: null,
        dizziness: null,
        hydration: null,
        mood: null,
        sleep: null,
        systolic: null,
        diastolic: null,
        heartRate: null,
        medicationAdherence: null,
      });
    }
    
    // Merge symptom logs - map symptom names to specific fields
    symptomLogs.forEach(log => {
      const dateStr = log.date || log.timestamp.split('T')[0];
      const existing = dataMap.get(dateStr);
      if (existing) {
        const symptomName = log.symptom.toLowerCase();
        if (symptomName.includes('pain')) existing.pain = log.severity;
        else if (symptomName.includes('fatigue') || symptomName.includes('tired')) existing.fatigue = log.severity;
        else if (symptomName.includes('nausea')) existing.nausea = log.severity;
        else if (symptomName.includes('dizz')) existing.dizziness = log.severity;
      }
    });
    
    // Merge daily tracking logs
    dailyLogs.forEach(log => {
      const existing = dataMap.get(log.date);
      if (existing) {
        existing.hydration = log.hydration;
        existing.mood = log.mood;
        existing.sleep = log.sleep;
      }
    });
    
    // Calculate medication adherence per day (optimized: single pass with pre-built lookup)
    const medLogs = await getMedicationLogs();

    // Build a lookup map by date in a single pass (avoids nested filter loops)
    const medLogsByDate = new Map<string, { taken: number; total: number }>();
    for (const log of medLogs) {
      const logDate = log.timestamp.split('T')[0];
      if (logDate >= startDate && logDate <= endDate) {
        const existing = medLogsByDate.get(logDate) || { taken: 0, total: 0 };
        existing.total++;
        if (log.taken) existing.taken++;
        medLogsByDate.set(logDate, existing);
      }
    }

    // Apply adherence from the lookup map
    for (const [dateStr, counts] of medLogsByDate) {
      const existing = dataMap.get(dateStr);
      if (existing && counts.total > 0) {
        existing.medicationAdherence = (counts.taken / counts.total) * 100;
      }
    }
    
    return Array.from(dataMap.values());
  } catch (error) {
    logError('correlationDetector.loadCorrelationData', error);
    return [];
  }
}

/**
 * Calculate Pearson correlation between two variables
 */
function calculateCorrelation(
  data: CorrelationDataPoint[],
  var1: keyof CorrelationDataPoint,
  var2: keyof CorrelationDataPoint
): { coefficient: number; dataPoints: number } | null {
  try {
    // Extract paired data points (both non-null)
    const pairs: Array<[number, number]> = [];
    
    data.forEach(point => {
      const val1 = point[var1];
      const val2 = point[var2];
      if (val1 !== null && val2 !== null && typeof val1 === 'number' && typeof val2 === 'number') {
        pairs.push([val1, val2]);
      }
    });
    
    // Need at least 7 paired data points
    if (pairs.length < 7) {
      return null;
    }
    
    // Calculate Pearson correlation
    const x = pairs.map(p => p[0]);
    const y = pairs.map(p => p[1]);
    const coefficient = sampleCorrelation(x, y);
    
    // Check for NaN (can happen with no variance)
    if (isNaN(coefficient)) {
      return null;
    }
    
    return { coefficient, dataPoints: pairs.length };
  } catch (error) {
    logError('correlationDetector.calculateCorrelation', error);
    return null;
  }
}

/**
 * Get confidence level based on data points
 */
function getConfidence(dataPoints: number): 'low' | 'moderate' | 'high' {
  if (dataPoints >= 20) return 'high';
  if (dataPoints >= 14) return 'moderate';
  return 'low';
}

/**
 * Generate qualified insight text (never causal language)
 */
function generateInsight(var1: string, var2: string, coefficient: number): string {
  const relationship = coefficient > 0 ? 'associated with higher' : 'associated with lower';
  const strength = Math.abs(coefficient) > 0.6 ? 'strongly' : 'may be';
  
  return `${formatVariable(var1)} ${strength} ${relationship} ${formatVariable(var2)}.`;
}

/**
 * Generate tracking-focused action (not prescriptive)
 */
function generateAction(var1: string, var2: string): string {
  return `Consider tracking ${formatVariable(var1)} and ${formatVariable(var2)} consistently to monitor this pattern.`;
}

/**
 * Format variable name for display
 */
function formatVariable(variable: string): string {
  const nameMap: Record<string, string> = {
    pain: 'pain levels',
    fatigue: 'fatigue',
    nausea: 'nausea',
    dizziness: 'dizziness',
    hydration: 'hydration',
    mood: 'mood',
    sleep: 'sleep quality',
    systolic: 'systolic BP',
    diastolic: 'diastolic BP',
    heartRate: 'heart rate',
    medicationAdherence: 'medication adherence',
  };
  return nameMap[variable] || variable;
}

/**
 * Detect all significant correlations
 */
export async function detectCorrelations(): Promise<DetectedPattern[]> {
  try {
    // Check cache first (24-hour cache)
    const cached = await getCachedCorrelations();
    if (cached) {
      return cached;
    }
    
    // Load last 30 days of data from AsyncStorage
    const endDate = getTodayDateString();
    const startDate = toLocalDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const data = await loadCorrelationData(startDate, endDate);
    
    if (data.length < 14) {
      return [];
    }
    
    const patterns: DetectedPattern[] = [];
    
    // Define variable pairs to test
    const variablePairs: Array<[keyof CorrelationDataPoint, keyof CorrelationDataPoint]> = [
      ['pain', 'hydration'],
      ['pain', 'sleep'],
      ['pain', 'medicationAdherence'],
      ['fatigue', 'sleep'],
      ['fatigue', 'hydration'],
      ['mood', 'sleep'],
      ['mood', 'medicationAdherence'],
      ['nausea', 'medicationAdherence'],
      ['dizziness', 'systolic'],
      ['heartRate', 'medicationAdherence'],
    ];
    
    // Calculate correlations for each pair
    variablePairs.forEach(([var1, var2]) => {
      const result = calculateCorrelation(data, var1, var2);
      
      if (result && Math.abs(result.coefficient) >= CORRELATION_THRESHOLD) {
        patterns.push({
          id: `${var1}-${var2}`,
          variable1: var1 as string,
          variable2: var2 as string,
          coefficient: result.coefficient,
          confidence: getConfidence(result.dataPoints),
          dataPoints: result.dataPoints,
          insight: generateInsight(var1 as string, var2 as string, result.coefficient),
          action: generateAction(var1 as string, var2 as string),
        });
      }
    });
    
    // Sort by coefficient strength
    patterns.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
    
    // Cache results
    await cacheCorrelations(patterns);
    
    return patterns;
  } catch (error) {
    logError('correlationDetector.detectCorrelations', error);
    return [];
  }
}

/**
 * Get cached correlations if still valid
 */
async function getCachedCorrelations(): Promise<DetectedPattern[] | null> {
  try {
    const cached = await safeGetItem<{ timestamp: number; patterns: DetectedPattern[] } | null>(CACHE_KEY, null);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;

    if (age < CACHE_DURATION) {
      return cached.patterns;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Cache correlations for 24 hours
 */
async function cacheCorrelations(patterns: DetectedPattern[]): Promise<void> {
  try {
    const cache = {
      timestamp: Date.now(),
      patterns,
    };
    await safeSetItem(CACHE_KEY, cache);
  } catch (error) {
    logError('correlationDetector.cacheCorrelations', error);
  }
}

/**
 * Clear correlation cache (force refresh)
 */
export async function clearCorrelationCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (error) {
    logError('correlationDetector.clearCorrelationCache', error);
  }
}
