// ============================================================================
// DEV LOG UTILITY
// Centralized logging — safe for production, verbose in dev
// Dev-only logging no-ops in production. Error/warning logging routes to Sentry.
// ============================================================================

import { reportError, reportWarning } from './errorReporting';

/**
 * Development-only console.log. No-ops in production.
 * Use for debug output that has no production value.
 */
export const devLog = __DEV__
  ? (...args: unknown[]) => console.log(...args)
  : (..._args: unknown[]) => {};

/**
 * Development-only console.warn. No-ops in production.
 */
export const devWarn = __DEV__
  ? (...args: unknown[]) => console.warn(...args)
  : (..._args: unknown[]) => {};

/**
 * Error logging — logs in dev, reports to Sentry in production.
 * Use instead of console.error everywhere.
 *
 * @param context - Where the error occurred (e.g., 'carePlanRepo.upsertCarePlan')
 * @param error - The error object or message
 * @param metadata - Additional context (will be scrubbed of health data)
 */
export function logError(
  context: string,
  error: unknown,
  metadata?: Record<string, string>,
): void {
  const err = error instanceof Error ? error : new Error(String(error));

  if (__DEV__) {
    console.error(`[${context}]`, err.message, metadata);
    return;
  }

  reportError(err, {
    context,
    ...metadata,
  });
}

/**
 * Warning logging — logs in dev, reports to Sentry in production.
 * Use for: unexpected states, degraded functionality, retries.
 */
export function logWarning(
  context: string,
  message: string,
  metadata?: Record<string, string>,
): void {
  if (__DEV__) {
    console.warn(`[${context}]`, message, metadata);
    return;
  }

  reportWarning(`[${context}] ${message}`, metadata);
}
