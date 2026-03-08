// ============================================================================
// STORAGE KEYS
// Centralized AsyncStorage key definitions — single source of truth.
// Every @embermate_ and @EmberMate: key in the app MUST be declared here.
// Run: bash scripts/check-storage-keys.sh to verify no raw literals remain.
// ============================================================================

/**
 * All AsyncStorage keys used in EmberMate.
 * Prefix: @embermate_ or @EmberMate:
 */
export const StorageKeys = {
  // ---- Patient ----
  CARE_MODE: '@embermate_care_mode',
  PATIENT_NAME: '@embermate_patient_name',
  PATIENT_INFO: '@embermate_patient_info',
  PATIENT_DOB: '@embermate_patient_dob',    // DEPRECATED — not stored for HIPAA compliance
  PATIENT_AGE: '@embermate_patient_age',   // Deprecated — not stored in sample data for HIPAA compliance
  PATIENT_GENDER: '@embermate_patient_gender',
  PATIENT_LANGUAGE: '@embermate_patient_language',
  PATIENT_RELATIONSHIP: '@embermate_patient_relationship',
  MEDICAL_INFO: '@embermate_medical_info',
  CAREGIVER_NAME: '@embermate_caregiver_name',

  // ---- Medications ----
  MEDICATIONS: '@embermate_medications',
  MEDICATION: '@embermate_medication',
  MEDICATION_LOGS: '@embermate_medication_logs',
  LAST_MED_RESET: '@embermate_last_med_reset',

  // ---- Appointments ----
  APPOINTMENTS: '@embermate_appointments',
  APPOINTMENTS_V2: '@embermate_appointments_v2',

  // ---- Care Team / Circle ----
  CARE_TEAM: '@embermate_care_team',
  CAREGIVERS: '@embermate_caregivers',
  CARE_CIRCLE: '@embermate_care_circle',
  SHARE_INVITES: '@embermate_share_invites',

  // ---- Care Plan ----
  CARE_PLAN: '@embermate_care_plan',
  CARE_PLAN_V1: '@embermate_care_plan_v1',
  CAREPLAN: '@embermate_careplan',
  CARE_PLAN_OVERRIDES: '@embermate_care_plan_overrides',
  CARE_PLAN_SNAPSHOT: '@embermate_care_plan_snapshot',
  CARE_ACTIVITIES: '@embermate_care_activities',
  CARE_NOTES: '@embermate_care_notes',
  FIRST_CARE_PLAN_CREATED: '@embermate_first_care_plan_created',

  // ---- Care Plan Config (dynamic prefix) ----
  CAREPLAN_CONFIG_V1_DEFAULT: '@embermate_careplan_config_v1:default',

  // ---- Central Storage (health logs) ----
  CENTRAL_MED_LOGS: '@embermate_central_med_logs',
  CENTRAL_VITALS_LOGS: '@embermate_central_vitals_logs',
  CENTRAL_MOOD_LOGS: '@embermate_central_mood_logs',
  CENTRAL_SYMPTOM_LOGS: '@embermate_central_symptom_logs',
  CENTRAL_SLEEP_LOGS: '@embermate_central_sleep_logs',
  CENTRAL_MEALS_LOGS: '@embermate_central_meals_logs',
  CENTRAL_WATER_LOGS: '@embermate_central_water_logs',
  CENTRAL_NOTES_LOGS: '@embermate_central_notes_logs',

  // ---- Vitals / Symptoms ----
  VITALS: '@embermate_vitals',
  SYMPTOMS: '@embermate_symptoms',
  CUSTOM_VITAL_THRESHOLDS: '@embermate_custom_vital_thresholds',

  // ---- Wellness Checks ----
  MORNING_WELLNESS: '@embermate_morning_wellness',
  EVENING_WELLNESS: '@embermate_evening_wellness',
  WELLNESS_MORNING: '@embermate_wellness_morning',
  WELLNESS_EVENING: '@embermate_wellness_evening',
  WELLNESS_SETTINGS: '@embermate_wellness_settings',

  // ---- Notes / Photos ----
  NOTES: '@embermate_notes',
  PHOTOS: '@embermate_photos',

  // ---- Log Events ----
  LOG_EVENTS: '@embermate_log_events',

  // ---- Daily Reset ----
  LAST_RESET_DATE: '@embermate_last_reset_date',

  // ---- Onboarding / First Use ----
  ONBOARDING_COMPLETE: '@embermate_onboarding_complete',
  DEMO_DATA_SEEDED: '@embermate_demo_data_seeded',
  FIRST_USE_DATE: '@embermate_first_use_date',

  // ---- Insights ----
  INSIGHTS_CACHE: '@embermate_insights_cache',
  DISMISSED_INSIGHTS: '@embermate_dismissed_insights',
  INSIGHT_ACTIONS: '@embermate_insight_actions',

  // ---- Settings / Preferences ----
  NOTIFICATION_SETTINGS: '@embermate_notification_settings',
  NOTIFICATION_PERMISSIONS_ASKED: '@embermate_notification_permissions_asked',
  NOTIFICATION_PROMPT_DISMISSED: '@embermate_notification_prompt_dismissed',
  NOTIFICATION_PROMPT_TRIGGERED: '@embermate_notification_prompt_triggered',
  CLOUD_BACKUP_SETTINGS: '@embermate_cloud_backup_settings',
  QUICK_LOG_SETTINGS: '@embermate_quick_log_settings',
  CLINICAL_CARE_SETTINGS: '@embermate_clinical_care_settings',
  USER_PREFERENCES: '@embermate_user_preferences',
  THEME: '@embermate_theme',
  HAPTICS_ENABLED: '@embermate_haptics_enabled',
  HAPTICS_STRENGTH: '@embermate_haptics_strength',
  HIGH_CONTRAST: '@embermate_high_contrast',
  AUTO_LOCK_TIMEOUT: '@embermate_auto_lock_timeout',
  RETENTION_POLICY: '@embermate_retention_policy',

  // ---- Biometric Auth ----
  BIOMETRIC_ENABLED: '@embermate_biometric_enabled',
  BIOMETRIC_ENROLLED: '@embermate_biometric_enrolled',

  // ---- Security / Audit ----
  AUDIT_LOG: '@embermate_audit_log',
  CURRENT_USER: '@embermate_current_user',
  LAST_ACTIVITY: '@embermate_last_activity',

  // ---- Data Management ----
  ENCRYPTION_MIGRATED_V1: '@embermate_encryption_migrated_v1',
  MIGRATION_STATUS_V1: '@embermate_migration_status_v1',
  DUPLICATE_CLEANUP_V1: '@embermate_duplicate_cleanup_v1',
  LAST_PURGE_DATE: '@embermate_last_purge_date',
  LAST_APP_OPEN: '@embermate_last_app_open',

  // ---- Sample Data ----
  SAMPLE_DATA_INITIALIZED: '@embermate_sample_data_initialized',
  SAMPLE_DATA_CLEARED: '@embermate_sample_data_cleared',
  SAMPLE_BANNER_DISMISSED: '@embermate_sample_banner_dismissed',
  SAMPLE_BANNER_MODE: '@embermate_sample_banner_mode',
  SAMPLE_CORRELATION_GENERATED: '@embermate_sample_correlation_generated',
  USER_DECLINED_SAMPLE_DATA: '@embermate_user_declined_sample_data',

  // ---- UX Prompts ----
  PROMPT_DISMISSED: '@embermate_prompt_dismissed',
  CHECKLIST_DISMISSED: '@embermate_checklist_dismissed',
  REVIEW_PROMPTED: '@embermate_review_prompted',
  TODAY_SCOPE_FIRST_TIME_BANNER_DISMISSED: '@embermate_today_scope_first_time_banner_dismissed',
  CATEGORY_USAGE: '@embermate_category_usage',

  // ---- Rhythm ----
  RHYTHM: '@embermate_rhythm',

  // ---- User Patterns ----
  USER_PATTERNS: '@embermate_user_patterns',

  // ---- Calendar ----
  CALENDAR_EVENTS: '@embermate_calendar_events',

  // ---- Emergency Contacts ----
  EMERGENCY_CONTACTS: '@embermate_emergency_contacts',

  // ---- Prep Checklists ----
  PREP_CHECKLISTS: '@embermate_prep_checklists',

  // ---- Baselines ----
  BASELINE_CONFIRMATIONS: '@embermate_baseline_confirmations',
  BASELINE_DISMISSALS: '@embermate_baseline_dismissals',

  // ============================================================================
  // @EmberMate: prefixed keys (legacy namespace)
  // ============================================================================
  SETTINGS_MODIFIED: '@EmberMate:settings_modified',
  USE_24_HOUR_TIME: '@EmberMate:use_24_hour_time',
  STREAKS: '@EmberMate:streaks',
  ACHIEVEMENTS: '@EmberMate:achievements',
  EMBERMATE_SYMPTOMS: '@EmberMate:symptoms',
} as const;

/**
 * Dynamic key prefixes — these are combined with a date or ID suffix at runtime.
 * Usage: `${StorageKeyPrefixes.DAILY_INSTANCES}${dateStr}`
 */
export const StorageKeyPrefixes = {
  DAILY_INSTANCES: '@embermate_daily_instances_',
  INSTANCES_V2: '@embermate_instances_v2:',
  LOGS_V2: '@embermate_logs_v2:',
  REGIMEN_ITEMS_V2: '@embermate_regimen_items_v2:',
  PROMPT_DISMISSED: '@embermate_prompt_dismissed_',
  EMBERMATE_NS: '@EmberMate:',
  EMBERMATE_PREFIX: '@embermate_',
} as const;

export type StorageKey = typeof StorageKeys[keyof typeof StorageKeys];

/**
 * Global keys used by storage modules (patientRegistry, subscriptionRepo)
 */
export const GlobalKeys = {
  PATIENT_REGISTRY: '@embermate_patient_registry',
  SUBSCRIPTION_STATE: '@embermate_subscription_state',
} as const;

/**
 * Scope a storage key to a specific patient.
 * Returns the base key unchanged for DEFAULT_PATIENT_ID (backward-compatible).
 * For other patients: `${base}:${patientId}`.
 */
export function scopedKey(base: string, patientId: string): string {
  return patientId === 'default' ? base : `${base}:${patientId}`;
}
