// ============================================================================
// Status Calculation Utilities for Now + Record Pages
// ============================================================================

import { TodayData, StatusResult } from './types';
import { Colors } from '../theme/theme-tokens';

export const getMedicationStatus = (data: TodayData): StatusResult => {
  const { taken, total } = data.medications;
  const percent = total > 0 ? (taken / total) * 100 : 0;

  let statusText;
  if (total === 0) {
    statusText = { text: "No medications", done: true };
  } else if (taken === total) {
    statusText = { text: "Nothing to do \u2713", done: true };
  } else {
    const remaining = total - taken;
    statusText = { text: `${remaining} remaining`, done: false };
  }

  return {
    completed: taken,
    total,
    percent,
    status: percent === 100 ? 'complete' : percent > 0 ? 'partial' : 'empty',
    statusText,
  };
};

export const getVitalsStatus = (data: TodayData): StatusResult => {
  const { logged, total } = data.vitals;
  const percent = total > 0 ? (logged / total) * 100 : 0;

  return {
    completed: logged,
    total,
    percent,
    status: percent === 100 ? 'complete' : percent > 0 ? 'partial' : 'empty',
    statusText: logged > 0
      ? { text: "\u2713 Logged", done: true }
      : { text: "BP, heart rate, etc.", done: false },
  };
};

export const getMoodStatus = (data: TodayData): StatusResult => {
  const logged = data.mood.logged;

  return {
    completed: logged ? 1 : 0,
    total: 1,
    percent: logged ? 100 : 0,
    status: logged ? 'complete' : 'empty',
    statusText: logged
      ? { text: "\u2713 Logged", done: true }
      : { text: "Mood & energy", done: false },
  };
};

export const getMealsStatus = (data: TodayData): StatusResult => {
  const { logged, total } = data.meals;
  const percent = total > 0 ? (logged / total) * 100 : 0;

  return {
    completed: logged,
    total,
    percent,
    status: percent === 100 ? 'complete' : percent > 0 ? 'partial' : 'empty',
    statusText: logged > 0
      ? { text: `${logged}/${total}`, done: false }
      : { text: "Meals today", done: false },
  };
};

export const getWaterStatus = (data: TodayData): StatusResult => {
  const glasses = data.water.glasses;
  const goal = 8;
  const percent = (glasses / goal) * 100;

  return {
    completed: glasses,
    total: goal,
    percent: Math.min(percent, 100),
    status: glasses >= goal ? 'complete' : glasses > 0 ? 'partial' : 'empty',
    statusText: glasses > 0
      ? { text: `${glasses} glasses`, done: glasses >= goal }
      : { text: "Quick count", done: false },
  };
};

export const getSleepStatus = (data: TodayData): StatusResult => {
  const logged = data.sleep.logged;

  return {
    completed: logged ? 1 : 0,
    total: 1,
    percent: logged ? 100 : 0,
    status: logged ? 'complete' : 'empty',
    statusText: logged
      ? { text: `${data.sleep.hours}h`, done: true }
      : { text: "Quality & hours", done: false },
  };
};

export const getSymptomsStatus = (data: TodayData): StatusResult => {
  const logged = data.symptoms.logged;
  const count = data.symptoms.items.length;

  return {
    completed: logged ? 1 : 0,
    total: 1,
    percent: logged ? 100 : 0,
    status: logged ? 'complete' : 'empty',
    statusText: logged
      ? { text: `${count} logged`, done: true }
      : { text: "Symptoms", done: false },
  };
};

export const getNotesStatus = (data: TodayData): StatusResult => {
  const count = data.notes.count;

  return {
    completed: count > 0 ? 1 : 0,
    total: 1,
    percent: count > 0 ? 100 : 0,
    status: count > 0 ? 'complete' : 'empty',
    statusText: count > 0
      ? { text: "\u2713 Added", done: true }
      : { text: "Notes & observations", done: false },
  };
};

export const getStrokeColor = (status: 'complete' | 'partial' | 'empty'): string => {
  if (status === 'complete') return Colors.green;
  if (status === 'partial') return '#FFC107';
  return Colors.glassStrong;
};

export const calculateStrokeDashoffset = (percent: number, circumference: number): number => {
  return circumference * (1 - percent / 100);
};
