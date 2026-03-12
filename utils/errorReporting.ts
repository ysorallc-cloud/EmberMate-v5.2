// ============================================================================
// ERROR REPORTING
// Centralized error reporting — wraps Sentry so the app doesn't couple to it
// ============================================================================

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { StorageKeyPrefixes } from './storageKeys';

// Read DSN from environment variable (EAS builds), app.json extra config, or placeholder
const SENTRY_DSN = process.env.SENTRY_DSN
  || Constants.expoConfig?.extra?.sentryDsn
  || 'YOUR_DSN_HERE';

let initialized = false;

/**
 * Initialize error reporting. Call once in appStartup.ts.
 * Safe to call multiple times — idempotent.
 */
export function initErrorReporting(): void {
  if (initialized) return;

  // Skip initialization if DSN is not configured
  if (!SENTRY_DSN || SENTRY_DSN === 'YOUR_DSN_HERE') {
    initialized = true;
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,

    // Only send errors in production
    enabled: !__DEV__,

    // Sample rate: 1.0 = 100% of errors. Lower if volume is high.
    sampleRate: 1.0,

    // Performance monitoring sample rate (0.2 = 20% of transactions)
    tracesSampleRate: 0.2,

    // Don't send PII — health app, be cautious
    sendDefaultPii: false,

    // Attach stack traces to all events
    attachStacktrace: true,

    // Scrub sensitive data from breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Strip AsyncStorage keys that might contain health data
      if (breadcrumb.category === 'console' && breadcrumb.message) {
        if (breadcrumb.message.includes(StorageKeyPrefixes.EMBERMATE_PREFIX)) {
          breadcrumb.message = '[REDACTED - health data key]';
        }
      }
      return breadcrumb;
    },

    // Scrub sensitive data from error events
    beforeSend(event) {
      // Remove any health data from error context
      if (event.extra) {
        for (const key of Object.keys(event.extra)) {
          if (
            key.includes('medication') ||
            key.includes('vital') ||
            key.includes('symptom') ||
            key.includes('diagnosis')
          ) {
            event.extra[key] = '[REDACTED]';
          }
        }
      }
      return event;
    },
  });

  initialized = true;
}

/**
 * Report a non-fatal error. Use for caught exceptions that should be tracked.
 *
 * @param error - The error object
 * @param context - Additional context (will be scrubbed of health data)
 */
export function reportError(error: Error, context?: Record<string, string>): void {
  if (__DEV__) {
    console.error('[ErrorReporting]', error.message, context);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      // Only attach safe context — no health data
      const safeContext: Record<string, string> = {};
      for (const [key, value] of Object.entries(context)) {
        if (
          !key.includes('medication') &&
          !key.includes('vital') &&
          !key.includes('symptom') &&
          !key.includes('diagnosis')
        ) {
          safeContext[key] = value;
        }
      }
      scope.setExtras(safeContext);
    }
    Sentry.captureException(error);
  });
}

/**
 * Report a warning-level message (not a crash, but worth tracking).
 * Use for: failed storage writes, data inconsistencies, unexpected states.
 */
export function reportWarning(message: string, context?: Record<string, string>): void {
  if (__DEV__) {
    console.warn('[ErrorReporting]', message, context);
    return;
  }

  Sentry.withScope((scope) => {
    scope.setLevel('warning');
    if (context) scope.setExtras(context);
    Sentry.captureMessage(message);
  });
}

/**
 * Set user context (non-PII). Use patient tier, not name.
 */
export function setUserContext(tier: string, patientCount: number): void {
  Sentry.setUser({
    // No PII — just tier and count for debugging
    subscription: tier,
    patientCount: String(patientCount),
  } as Record<string, string>);
}

/**
 * Wrap a function with automatic error reporting.
 * Use for top-level async operations that might fail silently.
 */
export function withErrorReporting<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string,
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), {
        operation: operationName,
      });
      throw error; // Re-throw so callers can still handle it
    }
  }) as T;
}
