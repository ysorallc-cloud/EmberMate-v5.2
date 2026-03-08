// ============================================================================
// INSIGHTS UTILITY
// Generates actionable insights for caregivers (P2.1, P2.2)
// ============================================================================

import { Medication, getMedicationLogs, MedicationLog } from './medicationStorage';
import { getTimeSlot } from './time';
import { logError } from './devLog';

export interface Insight {
  id: string;
  type: 'refill_risk' | 'missed_window' | 'adherence';
  title: string;
  description: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

/**
 * Generate refill risk insight (P2.2)
 * Derives from meds with daysRemaining <= 7
 */
export function getRefillRiskInsight(medications: Medication[]): Insight | null {
  const atRisk = medications.filter(m => 
    m.active && 
    m.daysSupply !== undefined && 
    m.daysSupply <= 7
  );
  
  if (atRisk.length === 0) return null;
  
  const medNames = atRisk.map(m => m.name).join(', ');
  const urgentCount = atRisk.filter(m => (m.daysSupply ?? 0) <= 3).length;
  
  return {
    id: 'refill_risk',
    type: 'refill_risk',
    title: 'Refill Risk',
    description: urgentCount > 0 
      ? `${urgentCount} medication${urgentCount !== 1 ? 's' : ''} running very low. ${medNames} need${atRisk.length === 1 ? 's' : ''} refill within 7 days.`
      : `${atRisk.length} medication${atRisk.length !== 1 ? 's' : ''} may need refill soon: ${medNames}.`,
    action: 'Contact pharmacy to refill',
    priority: urgentCount > 0 ? 'high' : 'medium',
    icon: '💊',
  };
}

/**
 * Analyze medication time windows (P2.2)
 * Buckets doses not logged into morning/afternoon/evening
 */
export async function getMissedWindowInsight(medications: Medication[]): Promise<Insight | null> {
  try {
    const logs = await getMedicationLogs();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get logs not taken from last 30 days
    const recentLogs = logs.filter(log => 
      new Date(log.timestamp) >= thirtyDaysAgo && !log.taken
    );
    
    if (recentLogs.length < 3) return null; // Not enough data
    
    // Bucket by time slot
    const buckets: Record<string, number> = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
    };
    
    // Get medication times to bucket doses
    const medTimeMap = new Map<string, string>();
    medications.forEach(m => {
      if (m.time) medTimeMap.set(m.id, m.time);
    });
    
    recentLogs.forEach(log => {
      const medTime = medTimeMap.get(log.medicationId);
      if (medTime) {
        const slot = getTimeSlot(medTime);
        buckets[slot]++;
      }
    });
    
    // Find most frequently not logged window
    const entries = Object.entries(buckets).filter(([_, count]) => count > 0);
    if (entries.length === 0) return null;
    
    entries.sort((a, b) => b[1] - a[1]);
    const [mostMissed, count] = entries[0];
    
    if (count < 2) return null; // Not significant
    
    const slotLabels: Record<string, string> = {
      morning: 'Morning (before noon)',
      afternoon: 'Afternoon (12-5 PM)',
      evening: 'Evening (5-9 PM)',
      night: 'Night (after 9 PM)',
    };
    
    return {
      id: 'missed_window',
      type: 'missed_window',
      title: 'Pattern Detected',
      description: `${slotLabels[mostMissed]} doses not yet logged most often (${count} times in last 30 days).`,
      action: 'Consider setting a reminder for this time',
      priority: count >= 5 ? 'high' : 'medium',
      icon: '⏰',
    };
  } catch (error) {
    logError('insights.getMissedWindowInsight', error);
    return null;
  }
}

/**
 * Calculate 7-day consistency rate (P2.1)
 * Neutral tone - no praise or shame
 */
export async function getAdherenceInsight(medications: Medication[]): Promise<Insight | null> {
  try {
    const logs = await getMedicationLogs();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const activeMedIds = medications.filter(m => m.active).map(m => m.id);
    if (activeMedIds.length === 0) return null;
    
    const recentLogs = logs.filter(log => 
      new Date(log.timestamp) >= sevenDaysAgo && 
      activeMedIds.includes(log.medicationId)
    );
    
    const takenCount = recentLogs.filter(log => log.taken).length;
    const expectedDoses = activeMedIds.length * 7; // 1 dose per med per day
    
    if (expectedDoses === 0) return null;
    
    const adherenceRate = Math.round((takenCount / expectedDoses) * 100);
    
    // Neutral description - no evaluative language
    const description = `${adherenceRate}% of doses logged in the last 7 days.`;
    
    return {
      id: 'adherence',
      type: 'adherence',
      title: 'Consistency (Beta)',
      description,
      priority: 'low',
      icon: adherenceRate >= 80 ? '✓' : '◐',
    };
  } catch (error) {
    logError('insights.getAdherenceInsight', error);
    return null;
  }
}

/**
 * Get all insights for display
 */
export async function getAllInsights(medications: Medication[]): Promise<Insight[]> {
  const insights: Insight[] = [];
  
  // Refill risk (sync)
  const refillInsight = getRefillRiskInsight(medications);
  if (refillInsight) insights.push(refillInsight);
  
  // Missed window (async)
  const missedInsight = await getMissedWindowInsight(medications);
  if (missedInsight) insights.push(missedInsight);
  
  // Adherence (async)
  const adherenceInsight = await getAdherenceInsight(medications);
  if (adherenceInsight) insights.push(adherenceInsight);
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return insights;
}
