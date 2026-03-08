// ============================================================================
// CARE PLAN REPOSITORY
// Storage layer for CarePlan, DailyCareInstance, and LogEntry
// Uses AsyncStorage with indexed keys for fast lookups
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { generateUniqueId } from '../utils/idGenerator';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { withKeyLock } from '../utils/keyLock';
import {
  CarePlan,
  CarePlanItem,
  DailyCareInstance,
  LogEntry,
  LogOutcome,
  LogEntryData,
  LogSource,
  DailySchedule,
  TimeWindowLabel,
} from '../types/carePlan';
import { DEFAULT_PATIENT_ID } from '../types/patient';

// Re-export for consumers that import from here
export { DEFAULT_PATIENT_ID };

// ============================================================================
// STORAGE KEYS
// ============================================================================

const KEYS = {
  // CarePlan (one active per patient)
  CARE_PLAN: (patientId: string) => `@embermate_regimen_v2:${patientId}`,
  CARE_PLAN_ITEMS: (carePlanId: string) => `@embermate_regimen_items_v2:${carePlanId}`,

  // Daily Instances (indexed by patient + date for fast daily lookups)
  DAILY_INSTANCES: (patientId: string, date: string) => `@embermate_instances_v2:${patientId}:${date}`,
  DAILY_INSTANCES_INDEX: (patientId: string) => `@embermate_instances_index_v2:${patientId}`,

  // Logs (indexed by patient + date)
  LOGS: (patientId: string, date: string) => `@embermate_logs_v2:${patientId}:${date}`,
  LOGS_INDEX: (patientId: string) => `@embermate_logs_index_v2:${patientId}`,
  ALL_LOGS: (patientId: string) => `@embermate_all_logs_v2:${patientId}`,
};

// ============================================================================
// CARE PLAN OPERATIONS
// ============================================================================

/**
 * Get the active CarePlan for a patient
 */
export async function getActiveCarePlan(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<CarePlan | null> {
  const plan = await safeGetItem<CarePlan | null>(KEYS.CARE_PLAN(patientId), null);
  if (plan && plan.status === 'active') {
    return plan;
  }
  return null;
}

/**
 * Get CarePlan by ID (regardless of status)
 */
export async function getCarePlanById(
  patientId: string,
  carePlanId: string
): Promise<CarePlan | null> {
  const plan = await safeGetItem<CarePlan | null>(KEYS.CARE_PLAN(patientId), null);
  if (plan && plan.id === carePlanId) {
    return plan;
  }
  return null;
}

/**
 * Create or update a CarePlan
 */
export async function upsertCarePlan(plan: CarePlan): Promise<CarePlan> {
  const now = new Date().toISOString();
  const existing = await getCarePlanById(plan.patientId, plan.id);

  const updatedPlan: CarePlan = {
    ...plan,
    version: existing ? existing.version + 1 : 1,
    updatedAt: now,
    createdAt: existing?.createdAt || now,
  };

  const ok = await safeSetItem(KEYS.CARE_PLAN(plan.patientId), updatedPlan);
  if (ok) emitDataUpdate(EVENT.CARE_PLAN);
  return updatedPlan;
}

/**
 * Create a new CarePlan with defaults
 */
export async function createCarePlan(
  patientId: string = DEFAULT_PATIENT_ID,
  timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): Promise<CarePlan> {
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  const plan: CarePlan = {
    id: generateUniqueId(),
    patientId,
    timezone,
    startDate: today,
    status: 'active',
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  const ok = await safeSetItem(KEYS.CARE_PLAN(patientId), plan);
  if (ok) emitDataUpdate(EVENT.CARE_PLAN);
  return plan;
}

/**
 * Archive a CarePlan (soft delete)
 */
export async function archiveCarePlan(
  patientId: string,
  carePlanId: string
): Promise<void> {
  const plan = await getCarePlanById(patientId, carePlanId);
  if (plan) {
    await upsertCarePlan({ ...plan, status: 'archived' });
  }
}

// ============================================================================
// CARE PLAN ITEM OPERATIONS
// ============================================================================

/**
 * List all items for a CarePlan
 */
export async function listCarePlanItems(
  carePlanId: string,
  options: { activeOnly?: boolean } = {}
): Promise<CarePlanItem[]> {
  const items = await safeGetItem<CarePlanItem[]>(KEYS.CARE_PLAN_ITEMS(carePlanId), []);

  if (options.activeOnly) {
    return items.filter(item => item.active);
  }
  return items;
}

/**
 * Get a single CarePlanItem by ID
 */
export async function getCarePlanItem(
  carePlanId: string,
  itemId: string
): Promise<CarePlanItem | null> {
  const items = await listCarePlanItems(carePlanId);
  return items.find(item => item.id === itemId) || null;
}

/**
 * Create or update a CarePlanItem
 */
export async function upsertCarePlanItem(item: CarePlanItem): Promise<CarePlanItem> {
  const now = new Date().toISOString();
  const items = await listCarePlanItems(item.carePlanId);

  const existingIndex = items.findIndex(i => i.id === item.id);
  const updatedItem: CarePlanItem = {
    ...item,
    updatedAt: now,
    createdAt: existingIndex >= 0 ? items[existingIndex].createdAt : now,
  };

  if (existingIndex >= 0) {
    items[existingIndex] = updatedItem;
  } else {
    items.push(updatedItem);
  }

  const ok = await safeSetItem(KEYS.CARE_PLAN_ITEMS(item.carePlanId), items);
  if (ok) emitDataUpdate(EVENT.CARE_PLAN_ITEMS);
  return updatedItem;
}

/**
 * Archive a CarePlanItem (sets active=false)
 */
export async function archiveCarePlanItem(
  carePlanId: string,
  itemId: string
): Promise<void> {
  const item = await getCarePlanItem(carePlanId, itemId);
  if (item) {
    await upsertCarePlanItem({ ...item, active: false });
  }
}

/**
 * Delete a CarePlanItem permanently
 */
export async function deleteCarePlanItem(
  carePlanId: string,
  itemId: string
): Promise<void> {
  const items = await listCarePlanItems(carePlanId);
  const filtered = items.filter(i => i.id !== itemId);
  const ok = await safeSetItem(KEYS.CARE_PLAN_ITEMS(carePlanId), filtered);
  if (ok) emitDataUpdate(EVENT.CARE_PLAN_ITEMS);
}

// ============================================================================
// DAILY CARE INSTANCE OPERATIONS
// ============================================================================

/**
 * List all instances for a patient on a specific date
 */
export async function listDailyInstances(
  patientId: string,
  date: string
): Promise<DailyCareInstance[]> {
  return safeGetItem<DailyCareInstance[]>(KEYS.DAILY_INSTANCES(patientId, date), []);
}

/**
 * Get a single instance by ID
 */
export async function getDailyInstance(
  patientId: string,
  date: string,
  instanceId: string
): Promise<DailyCareInstance | null> {
  const instances = await listDailyInstances(patientId, date);
  return instances.find(i => i.id === instanceId) || null;
}

/**
 * Bulk upsert daily instances
 */
export async function upsertDailyInstances(
  patientId: string,
  date: string,
  instances: DailyCareInstance[]
): Promise<DailyCareInstance[]> {
  const lockKey = KEYS.DAILY_INSTANCES(patientId, date);
  return withKeyLock(lockKey, async () => {
    const now = new Date().toISOString();
    const existing = await listDailyInstances(patientId, date);
    const existingMap = new Map(existing.map(i => [i.id, i]));

    const result: DailyCareInstance[] = [];

    for (const instance of instances) {
      const existingInstance = existingMap.get(instance.id);
      const updatedInstance: DailyCareInstance = {
        ...instance,
        updatedAt: now,
        createdAt: existingInstance?.createdAt || now,
      };
      existingMap.set(instance.id, updatedInstance);
      result.push(updatedInstance);
    }

    const ok = await safeSetItem(KEYS.DAILY_INSTANCES(patientId, date), Array.from(existingMap.values()));
    if (!ok) return result;

    // Update index
    await updateInstanceIndex(patientId, date);

    emitDataUpdate(EVENT.DAILY_INSTANCES);
    return result;
  });
}

/**
 * Update a single instance's status
 */
export async function updateDailyInstanceStatus(
  patientId: string,
  date: string,
  instanceId: string,
  status: DailyCareInstance['status'],
  logId?: string
): Promise<DailyCareInstance | null> {
  const lockKey = KEYS.DAILY_INSTANCES(patientId, date);
  return withKeyLock(lockKey, async () => {
    const instances = await listDailyInstances(patientId, date);
    const index = instances.findIndex(i => i.id === instanceId);

    if (index === -1) return null;

    const now = new Date().toISOString();
    instances[index] = {
      ...instances[index],
      status,
      logId,
      updatedAt: now,
    };

    const ok = await safeSetItem(KEYS.DAILY_INSTANCES(patientId, date), instances);
    if (ok) emitDataUpdate(EVENT.DAILY_INSTANCES);
    return instances[index];
  });
}

/**
 * Remove instances that don't match valid item IDs (cleanup stale data)
 * Called when Care Plan items are deleted or deactivated
 */
export async function removeStaleInstances(
  patientId: string,
  date: string,
  validItemIds: Set<string>
): Promise<number> {
  const lockKey = KEYS.DAILY_INSTANCES(patientId, date);
  return withKeyLock(lockKey, async () => {
    const instances = await listDailyInstances(patientId, date);
    const validInstances = instances.filter(i => validItemIds.has(i.carePlanItemId));
    const removedCount = instances.length - validInstances.length;

    if (removedCount > 0) {
      const ok = await safeSetItem(KEYS.DAILY_INSTANCES(patientId, date), validInstances);
      if (ok) emitDataUpdate(EVENT.DAILY_INSTANCES);
    }

    return removedCount;
  });
}

/**
 * Update instance index (tracks which dates have instances)
 */
async function updateInstanceIndex(patientId: string, date: string): Promise<void> {
  const index = await safeGetItem<string[]>(KEYS.DAILY_INSTANCES_INDEX(patientId), []);
  if (!index.includes(date)) {
    index.push(date);
    index.sort();
    // Keep only last 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const filtered = index.filter(d => d >= cutoffStr);
    await safeSetItem(KEYS.DAILY_INSTANCES_INDEX(patientId), filtered);
  }
}

/**
 * Get instances for a date range
 */
export async function listDailyInstancesRange(
  patientId: string,
  startDate: string,
  endDate: string
): Promise<DailyCareInstance[]> {
  const index = await safeGetItem<string[]>(KEYS.DAILY_INSTANCES_INDEX(patientId), []);
  const relevantDates = index.filter(d => d >= startDate && d <= endDate);

  const allInstances: DailyCareInstance[] = [];
  for (const date of relevantDates) {
    const instances = await listDailyInstances(patientId, date);
    allInstances.push(...instances);
  }

  return allInstances.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

// ============================================================================
// LOG ENTRY OPERATIONS
// ============================================================================

/**
 * Create a new log entry (immutable - no updates allowed)
 */
export async function createLogEntry(
  log: Omit<LogEntry, 'id' | 'createdAt' | 'immutable'>
): Promise<LogEntry> {
  const now = new Date().toISOString();
  const date = log.date || log.timestamp.split('T')[0];

  const newLog: LogEntry = {
    ...log,
    id: generateUniqueId(),
    date,
    immutable: true,
    createdAt: now,
  };

  // Store in daily bucket — bail early if this fails
  const dailyLogs = await listLogsByDate(log.patientId, date);
  dailyLogs.push(newLog);
  const dailyOk = await safeSetItem(KEYS.LOGS(log.patientId, date), dailyLogs);
  if (!dailyOk) return newLog;

  // Update index
  await updateLogIndex(log.patientId, date);

  // Also store in append-only all-logs
  const allLogs = await safeGetItem<LogEntry[]>(KEYS.ALL_LOGS(log.patientId), []);
  allLogs.push(newLog);
  // Keep only last 5000 logs
  const trimmed = allLogs.slice(-5000);
  await safeSetItem(KEYS.ALL_LOGS(log.patientId), trimmed);

  emitDataUpdate(EVENT.LOGS);
  return newLog;
}

/**
 * List logs for a specific date
 */
export async function listLogsByDate(
  patientId: string,
  date: string
): Promise<LogEntry[]> {
  return safeGetItem<LogEntry[]>(KEYS.LOGS(patientId, date), []);
}

/**
 * List logs for a date range
 */
export async function listLogsInRange(
  patientId: string,
  startDate: string,
  endDate: string,
  options: { itemId?: string } = {}
): Promise<LogEntry[]> {
  const index = await safeGetItem<string[]>(KEYS.LOGS_INDEX(patientId), []);
  const relevantDates = index.filter(d => d >= startDate && d <= endDate);

  const allLogs: LogEntry[] = [];
  for (const date of relevantDates) {
    const logs = await listLogsByDate(patientId, date);
    allLogs.push(...logs);
  }

  let filtered = allLogs;
  if (options.itemId) {
    filtered = filtered.filter(log => log.carePlanItemId === options.itemId);
  }

  return filtered.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Get log by ID
 */
export async function getLogById(
  patientId: string,
  date: string,
  logId: string
): Promise<LogEntry | null> {
  const logs = await listLogsByDate(patientId, date);
  return logs.find(l => l.id === logId) || null;
}

/**
 * Update log index (tracks which dates have logs)
 */
async function updateLogIndex(patientId: string, date: string): Promise<void> {
  const index = await safeGetItem<string[]>(KEYS.LOGS_INDEX(patientId), []);
  if (!index.includes(date)) {
    index.push(date);
    index.sort();
    // Keep only last 365 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const filtered = index.filter(d => d >= cutoffStr);
    await safeSetItem(KEYS.LOGS_INDEX(patientId), filtered);
  }
}

// ============================================================================
// COMBINED OPERATIONS
// ============================================================================

/**
 * Log completion of a daily instance
 */
export async function logInstanceCompletion(
  patientId: string,
  date: string,
  instanceId: string,
  outcome: LogOutcome,
  data?: LogEntryData,
  options: {
    notes?: string;
    source?: LogSource;
    caregiverName?: string;
  } = {}
): Promise<{ instance: DailyCareInstance; log: LogEntry } | null> {
  const instance = await getDailyInstance(patientId, date, instanceId);
  if (!instance) return null;

  // Create the log entry
  const log = await createLogEntry({
    patientId,
    carePlanId: instance.carePlanId,
    carePlanItemId: instance.carePlanItemId,
    dailyInstanceId: instanceId,
    timestamp: new Date().toISOString(),
    date,
    outcome,
    notes: options.notes,
    data,
    source: options.source || 'record',
    caregiverName: options.caregiverName,
  });

  // Update the instance
  const statusMap: Record<LogOutcome, DailyCareInstance['status']> = {
    taken: 'completed',
    completed: 'completed',
    skipped: 'skipped',
    partial: 'partial',
    missed: 'missed',
  };

  const updatedInstance = await updateDailyInstanceStatus(
    patientId,
    date,
    instanceId,
    statusMap[outcome],
    log.id
  );

  if (!updatedInstance) return null;

  return { instance: updatedInstance, log };
}

/**
 * Get daily schedule with all computed stats
 */
export async function getDailySchedule(
  patientId: string,
  date: string
): Promise<DailySchedule> {
  const instances = await listDailyInstances(patientId, date);

  // Sort by scheduled time
  const sorted = [...instances].sort((a, b) =>
    a.scheduledTime.localeCompare(b.scheduledTime)
  );

  // Group by window
  const byWindow: DailySchedule['byWindow'] = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };

  for (const instance of sorted) {
    const windowKey = instance.windowLabel as keyof typeof byWindow;
    if (byWindow[windowKey]) {
      byWindow[windowKey].push(instance);
    }
  }

  // Calculate stats
  const stats = {
    total: instances.length,
    pending: instances.filter(i => i.status === 'pending').length,
    completed: instances.filter(i => i.status === 'completed').length,
    skipped: instances.filter(i => i.status === 'skipped').length,
    missed: instances.filter(i => i.status === 'missed').length,
  };

  // Find next pending
  const now = new Date().toISOString();
  const nextPending = sorted.find(
    i => i.status === 'pending' && i.scheduledTime >= now
  ) || sorted.find(i => i.status === 'pending') || null;

  return {
    date,
    instances: sorted,
    byWindow,
    stats,
    nextPending,
  };
}

// ============================================================================
// CLEANUP OPERATIONS
// ============================================================================

/**
 * Clear all data for a patient (for testing/reset)
 */
export async function clearAllPatientData(patientId: string): Promise<void> {
  const plan = await getActiveCarePlan(patientId);
  const results: boolean[] = [];
  if (plan) {
    results.push(await safeSetItem(KEYS.CARE_PLAN_ITEMS(plan.id), []));
  }
  results.push(await safeSetItem(KEYS.CARE_PLAN(patientId), null));
  results.push(await safeSetItem(KEYS.DAILY_INSTANCES_INDEX(patientId), []));
  results.push(await safeSetItem(KEYS.LOGS_INDEX(patientId), []));
  results.push(await safeSetItem(KEYS.ALL_LOGS(patientId), []));
  const anySuccess = results.some(r => r);
  if (anySuccess) {
    emitDataUpdate(EVENT.CARE_PLAN);
    emitDataUpdate(EVENT.DAILY_INSTANCES);
    emitDataUpdate(EVENT.LOGS);
  }
}
