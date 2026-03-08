// ============================================================================
// AUDIT LOGGING SERVICE
// Track security-sensitive operations
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { devLog, logError } from './devLog';
import { StorageKeys } from './storageKeys';
import { safeGetItem, safeSetItem } from './safeStorage';

const AUDIT_LOG_KEY = StorageKeys.AUDIT_LOG;
const MAX_LOG_ENTRIES = 1000; // Keep last 1000 entries

export enum AuditEventType {
  // Authentication
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  BIOMETRIC_ENABLED = 'BIOMETRIC_ENABLED',
  BIOMETRIC_DISABLED = 'BIOMETRIC_DISABLED',
  PIN_CHANGED = 'PIN_CHANGED',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',

  // Data Operations
  MEDICATION_CREATED = 'MEDICATION_CREATED',
  MEDICATION_UPDATED = 'MEDICATION_UPDATED',
  MEDICATION_DELETED = 'MEDICATION_DELETED',
  MEDICATION_TAKEN = 'MEDICATION_TAKEN',
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_UPDATED = 'APPOINTMENT_UPDATED',
  APPOINTMENT_DELETED = 'APPOINTMENT_DELETED',
  APPOINTMENT_COMPLETED = 'APPOINTMENT_COMPLETED',

  // Patient Data
  PATIENT_INFO_UPDATED = 'PATIENT_INFO_UPDATED',
  CARE_TEAM_UPDATED = 'CARE_TEAM_UPDATED',

  // Data Management
  DATA_EXPORTED = 'DATA_EXPORTED',
  DATA_IMPORTED = 'DATA_IMPORTED',
  DATA_BACKUP_CREATED = 'DATA_BACKUP_CREATED',
  DATA_BACKUP_RESTORED = 'DATA_BACKUP_RESTORED',
  DATA_RESTORED = 'DATA_RESTORED',
  DATA_RESTORE_FAILED = 'DATA_RESTORE_FAILED',
  DATA_CLEARED = 'DATA_CLEARED',

  // Security Events
  SECURITY_BREACH_ATTEMPT = 'SECURITY_BREACH_ATTEMPT',
  ENCRYPTION_KEY_ROTATED = 'ENCRYPTION_KEY_ROTATED',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',

  // Access
  SCREEN_ACCESSED = 'SCREEN_ACCESSED',
  SENSITIVE_DATA_VIEWED = 'SENSITIVE_DATA_VIEWED',

  // Care Brief
  CARE_BRIEF_VIEWED = 'CARE_BRIEF_VIEWED',
  CARE_BRIEF_SHARED = 'CARE_BRIEF_SHARED',
  CARE_BRIEF_EXPORTED = 'CARE_BRIEF_EXPORTED',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  description: string;
  metadata?: Record<string, any>;
  userId?: string;
  ipAddress?: string;
  deviceInfo?: string;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  eventType: AuditEventType,
  description: string,
  severity: AuditSeverity = AuditSeverity.INFO,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const logs = await getAuditLogs();

    const entry: AuditLogEntry = {
      id: generateLogId(),
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      description,
      metadata: sanitizeMetadata(metadata),
    };

    logs.push(entry);

    // Keep only the most recent entries
    const trimmedLogs = logs.slice(-MAX_LOG_ENTRIES);

    // Audit logs are operational metadata (sanitized, no PHI) — plain storage
    // avoids decrypt-all/re-encrypt-all overhead on every event
    await safeSetItem(AUDIT_LOG_KEY, trimmedLogs);

    // Log to console in development
    devLog(`[AUDIT] ${severity} - ${eventType}: ${description}`, metadata);
  } catch (error) {
    logError('auditLog.logAuditEvent', error);
    // Don't throw - logging failure shouldn't break app
  }
}

/**
 * Get all audit logs
 */
export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  try {
    return await safeGetItem<AuditLogEntry[]>(AUDIT_LOG_KEY, []);
  } catch (error) {
    logError('auditLog.getAuditLogs', error);
    return [];
  }
}

/**
 * Get audit logs by event type
 */
export async function getAuditLogsByType(
  eventType: AuditEventType
): Promise<AuditLogEntry[]> {
  try {
    const logs = await getAuditLogs();
    return logs.filter(log => log.eventType === eventType);
  } catch (error) {
    logError('auditLog.getAuditLogsByType', error);
    return [];
  }
}

/**
 * Get audit logs by severity
 */
export async function getAuditLogsBySeverity(
  severity: AuditSeverity
): Promise<AuditLogEntry[]> {
  try {
    const logs = await getAuditLogs();
    return logs.filter(log => log.severity === severity);
  } catch (error) {
    logError('auditLog.getAuditLogsBySeverity', error);
    return [];
  }
}

/**
 * Get audit logs within date range
 */
export async function getAuditLogsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<AuditLogEntry[]> {
  try {
    const logs = await getAuditLogs();
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  } catch (error) {
    logError('auditLog.getAuditLogsByDateRange', error);
    return [];
  }
}

/**
 * Get recent audit logs
 */
export async function getRecentAuditLogs(count: number = 50): Promise<AuditLogEntry[]> {
  try {
    const logs = await getAuditLogs();
    return logs.slice(-count).reverse(); // Most recent first
  } catch (error) {
    logError('auditLog.getRecentAuditLogs', error);
    return [];
  }
}

/**
 * Clear all audit logs
 */
export async function clearAuditLogs(): Promise<boolean> {
  try {
    await logAuditEvent(
      AuditEventType.DATA_CLEARED,
      'Audit logs cleared',
      AuditSeverity.WARNING
    );

    await AsyncStorage.removeItem(AUDIT_LOG_KEY);
    return true;
  } catch (error) {
    logError('auditLog.clearAuditLogs', error);
    return false;
  }
}

/**
 * Export audit logs
 */
export async function exportAuditLogs(): Promise<string> {
  try {
    const logs = await getAuditLogs();

    await logAuditEvent(
      AuditEventType.DATA_EXPORTED,
      'Audit logs exported',
      AuditSeverity.INFO
    );

    return JSON.stringify(logs, null, 2);
  } catch (error) {
    logError('auditLog.exportAuditLogs', error);
    throw error;
  }
}

/**
 * Get audit statistics
 */
export async function getAuditStatistics(): Promise<{
  total: number;
  byType: Record<AuditEventType, number>;
  bySeverity: Record<AuditSeverity, number>;
  criticalEvents: number;
  recentActivity: AuditLogEntry[];
}> {
  try {
    const logs = await getAuditLogs();

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    logs.forEach(log => {
      byType[log.eventType] = (byType[log.eventType] || 0) + 1;
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
    });

    const criticalEvents = logs.filter(
      log => log.severity === AuditSeverity.CRITICAL
    ).length;

    const recentActivity = logs.slice(-10).reverse();

    return {
      total: logs.length,
      byType: byType as Record<AuditEventType, number>,
      bySeverity: bySeverity as Record<AuditSeverity, number>,
      criticalEvents,
      recentActivity,
    };
  } catch (error) {
    logError('auditLog.getAuditStatistics', error);
    return {
      total: 0,
      byType: {} as Record<AuditEventType, number>,
      bySeverity: {} as Record<AuditSeverity, number>,
      criticalEvents: 0,
      recentActivity: [],
    };
  }
}

/**
 * Generate unique log ID
 */
function generateLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize metadata to prevent sensitive data leakage
 */
function sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
  if (!metadata) return undefined;

  const sanitized = { ...metadata };

  // Remove sensitive fields
  const sensitiveFields = ['password', 'pin', 'token', 'key', 'secret', 'ssn'];

  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Convenience functions for common events
 */

export async function logLogin(success: boolean, method: string): Promise<void> {
  await logAuditEvent(
    success ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_FAILURE,
    `Login ${success ? 'successful' : 'failed'} via ${method}`,
    success ? AuditSeverity.INFO : AuditSeverity.WARNING,
    { method }
  );
}

export async function logDataAccess(screenName: string): Promise<void> {
  await logAuditEvent(
    AuditEventType.SCREEN_ACCESSED,
    `Accessed ${screenName}`,
    AuditSeverity.INFO,
    { screen: screenName }
  );
}

export async function logDataModification(
  type: 'medication' | 'appointment' | 'patient',
  action: 'created' | 'updated' | 'deleted',
  itemId: string
): Promise<void> {
  const eventTypeMap: Record<string, AuditEventType> = {
    'medication-created': AuditEventType.MEDICATION_CREATED,
    'medication-updated': AuditEventType.MEDICATION_UPDATED,
    'medication-deleted': AuditEventType.MEDICATION_DELETED,
    'appointment-created': AuditEventType.APPOINTMENT_CREATED,
    'appointment-updated': AuditEventType.APPOINTMENT_UPDATED,
    'appointment-deleted': AuditEventType.APPOINTMENT_DELETED,
    'patient-updated': AuditEventType.PATIENT_INFO_UPDATED,
  };

  const eventType = eventTypeMap[`${type}-${action}`];

  if (eventType) {
    await logAuditEvent(
      eventType,
      `${type} ${action}: ${itemId}`,
      AuditSeverity.INFO,
      { type, action, itemId }
    );
  }
}

export async function logSecurityEvent(
  description: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent(
    AuditEventType.SECURITY_BREACH_ATTEMPT,
    description,
    AuditSeverity.CRITICAL,
    metadata
  );
}
