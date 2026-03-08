// ============================================================================
// WELLNESS SETTINGS HOOK
// Manages daily wellness check configuration
// ============================================================================

import { useState, useEffect } from 'react';
import { logError } from '../utils/devLog';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import {
  WellnessSettings,
  DEFAULT_WELLNESS_SETTINGS,
} from '../types/wellnessSettings';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { StorageKeys } from '../utils/storageKeys';

const STORAGE_KEY = StorageKeys.WELLNESS_SETTINGS;

export const useWellnessSettings = () => {
  const [settings, setSettings] = useState<WellnessSettings>(
    DEFAULT_WELLNESS_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const parsed = await safeGetItem<any>(STORAGE_KEY, null);
      if (parsed) {
        // Migration merge: ensure optionalChecks defaults exist for old stored data
        const merged: WellnessSettings = {
          ...DEFAULT_WELLNESS_SETTINGS,
          ...parsed,
          morning: {
            ...DEFAULT_WELLNESS_SETTINGS.morning,
            ...(parsed.morning || {}),
            optionalChecks: {
              ...DEFAULT_WELLNESS_SETTINGS.morning.optionalChecks,
              ...(parsed.morning?.optionalChecks || {}),
            },
          },
          evening: {
            ...DEFAULT_WELLNESS_SETTINGS.evening,
            ...(parsed.evening || {}),
            optionalChecks: {
              ...DEFAULT_WELLNESS_SETTINGS.evening.optionalChecks,
              ...(parsed.evening?.optionalChecks || {}),
            },
          },
          vitals: {
            ...DEFAULT_WELLNESS_SETTINGS.vitals,
            ...(parsed.vitals || {}),
          },
        };
        setSettings(merged);
      }
    } catch (error) {
      logError('useWellnessSettings.loadSettings', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: WellnessSettings) => {
    try {
      await safeSetItem(STORAGE_KEY, newSettings);
      setSettings(newSettings);
      // Notify all subscribers (log screens, Now page) that wellness config changed
      emitDataUpdate(EVENT.WELLNESS);
    } catch (error) {
      logError('useWellnessSettings.saveSettings', error);
    }
  };

  return {
    settings,
    wellnessChecks: {
      morning: settings.morning,
      evening: settings.evening,
    },
    vitalsCheck: settings.vitals,
    isLoading,
    updateSettings: saveSettings,
  };
};
