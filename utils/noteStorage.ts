// ============================================================================
// NOTE STORAGE UTILITIES
// AsyncStorage operations for note logging
// ============================================================================

import { safeGetItem, safeSetItem } from './safeStorage';
import { logError } from './devLog';
import { StorageKeys, scopedKey } from './storageKeys';
import { generateUniqueId } from './idGenerator';

const DEFAULT_PATIENT_ID = 'default';

export interface NoteLog {
  id: string;
  content: string;
  timestamp: string; // ISO datetime
  date: string; // ISO date (YYYY-MM-DD)
}

const STORAGE_KEY = StorageKeys.NOTES;

export async function saveNote(note: Omit<NoteLog, 'id'>, patientId: string = DEFAULT_PATIENT_ID): Promise<void> {
  try {
    const notes = await getNotes(patientId);
    const newNote: NoteLog = {
      ...note,
      id: generateUniqueId(),
    };
    notes.push(newNote);
    await safeSetItem(scopedKey(STORAGE_KEY, patientId), notes);
  } catch (error) {
    logError('noteStorage.saveNote', error);
    throw error;
  }
}

export async function getNotes(patientId: string = DEFAULT_PATIENT_ID): Promise<NoteLog[]> {
  try {
    return await safeGetItem<NoteLog[]>(scopedKey(STORAGE_KEY, patientId), []);
  } catch (error) {
    logError('noteStorage.getNotes', error);
    return [];
  }
}

export async function getNotesByDate(date: string, patientId: string = DEFAULT_PATIENT_ID): Promise<NoteLog[]> {
  try {
    const notes = await getNotes(patientId);
    return notes.filter(n => n.date === date);
  } catch (error) {
    logError('noteStorage.getNotesByDate', error);
    return [];
  }
}

export async function deleteNote(id: string, patientId: string = DEFAULT_PATIENT_ID): Promise<boolean> {
  try {
    const notes = await getNotes(patientId);
    const filtered = notes.filter(n => n.id !== id);
    if (filtered.length === notes.length) {
      return false; // Note not found
    }
    await safeSetItem(scopedKey(STORAGE_KEY, patientId), filtered);
    return true;
  } catch (error) {
    logError('noteStorage.deleteNote', error);
    return false;
  }
}
