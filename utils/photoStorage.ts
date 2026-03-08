// ============================================================================
// PHOTO STORAGE UTILITIES
// Manages photos for medications, wounds, and documents
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem } from './safeStorage';
import * as FileSystem from 'expo-file-system';
import { logError } from './devLog';
import { StorageKeys } from './storageKeys';

export interface Photo {
  id: string;
  uri: string;
  type: 'medication' | 'wound' | 'document' | 'other';
  relatedId?: string; // Medication ID, symptom ID, etc.
  caption?: string;
  timestamp: string;
  tags?: string[];
}

const PHOTOS_KEY = StorageKeys.PHOTOS;
const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Ensure photos directory exists
 */
async function ensurePhotosDirectory(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
    }
  } catch (error) {
    logError('photoStorage.ensurePhotosDirectory', error);
  }
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all photos
 */
export async function getPhotos(): Promise<Photo[]> {
  try {
    return await safeGetItem<Photo[]>(PHOTOS_KEY, []);
  } catch (error) {
    logError('photoStorage.getPhotos', error);
    return [];
  }
}

/**
 * Get photos by type
 */
export async function getPhotosByType(type: Photo['type']): Promise<Photo[]> {
  try {
    const photos = await getPhotos();
    return photos.filter(p => p.type === type);
  } catch (error) {
    logError('photoStorage.getPhotosByType', error);
    return [];
  }
}

/**
 * Get photos related to a specific entity (medication, symptom, etc.)
 */
export async function getPhotosForEntity(relatedId: string): Promise<Photo[]> {
  try {
    const photos = await getPhotos();
    return photos.filter(p => p.relatedId === relatedId);
  } catch (error) {
    logError('photoStorage.getPhotosForEntity', error);
    return [];
  }
}

/**
 * Save a new photo
 */
export async function savePhoto(
  sourceUri: string,
  type: Photo['type'],
  options?: {
    relatedId?: string;
    caption?: string;
    tags?: string[];
  }
): Promise<Photo> {
  try {
    await ensurePhotosDirectory();
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${type}_${timestamp}.jpg`;
    const destinationUri = `${PHOTOS_DIR}${filename}`;
    
    // Copy photo to app's document directory
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });
    
    // Create photo record
    const photo: Photo = {
      id: timestamp.toString(),
      uri: destinationUri,
      type,
      relatedId: options?.relatedId,
      caption: options?.caption,
      timestamp: new Date().toISOString(),
      tags: options?.tags || [],
    };
    
    // Save to AsyncStorage
    const photos = await getPhotos();
    photos.push(photo);
    await safeSetItem(PHOTOS_KEY, photos);

    return photo;
  } catch (error) {
    logError('photoStorage.savePhoto', error);
    throw error;
  }
}

/**
 * Update photo metadata
 */
export async function updatePhoto(
  id: string,
  updates: Partial<Pick<Photo, 'caption' | 'tags' | 'type' | 'relatedId'>>
): Promise<Photo | null> {
  try {
    const photos = await getPhotos();
    const index = photos.findIndex(p => p.id === id);
    
    if (index === -1) return null;
    
    photos[index] = { ...photos[index], ...updates };
    await safeSetItem(PHOTOS_KEY, photos);

    return photos[index];
  } catch (error) {
    logError('photoStorage.updatePhoto', error);
    return null;
  }
}

/**
 * Delete a photo
 */
export async function deletePhoto(id: string): Promise<boolean> {
  try {
    const photos = await getPhotos();
    const photo = photos.find(p => p.id === id);
    
    if (!photo) return false;
    
    // Delete file from filesystem
    try {
      await FileSystem.deleteAsync(photo.uri, { idempotent: true });
    } catch (fileError) {
      console.warn('Error deleting photo file:', fileError);
    }
    
    // Remove from metadata
    const updatedPhotos = photos.filter(p => p.id !== id);
    await safeSetItem(PHOTOS_KEY, updatedPhotos);
    
    return true;
  } catch (error) {
    logError('photoStorage.deletePhoto', error);
    return false;
  }
}

/**
 * Delete all photos for a specific entity
 */
export async function deletePhotosForEntity(relatedId: string): Promise<number> {
  try {
    const photos = await getPhotosForEntity(relatedId);
    let deletedCount = 0;
    
    for (const photo of photos) {
      const success = await deletePhoto(photo.id);
      if (success) deletedCount++;
    }
    
    return deletedCount;
  } catch (error) {
    logError('photoStorage.deletePhotosForEntity', error);
    return 0;
  }
}

/**
 * Get total photo count and storage size
 */
export async function getPhotoStats(): Promise<{
  count: number;
  sizeBytes: number;
  sizeFormatted: string;
}> {
  try {
    const photos = await getPhotos();
    let totalSize = 0;
    
    for (const photo of photos) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(photo.uri);
        if (fileInfo.exists && 'size' in fileInfo) {
          totalSize += fileInfo.size || 0;
        }
      } catch (e) {
        // Skip files that can't be accessed
      }
    }
    
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    return {
      count: photos.length,
      sizeBytes: totalSize,
      sizeFormatted: `${sizeMB} MB`,
    };
  } catch (error) {
    logError('photoStorage.getPhotoStats', error);
    return {
      count: 0,
      sizeBytes: 0,
      sizeFormatted: '0 MB',
    };
  }
}

/**
 * Clear all photos (use with caution!)
 */
export async function clearAllPhotos(): Promise<boolean> {
  try {
    const photos = await getPhotos();
    
    // Delete all files
    for (const photo of photos) {
      try {
        await FileSystem.deleteAsync(photo.uri, { idempotent: true });
      } catch (e) {
        console.warn('Error deleting photo file:', e);
      }
    }
    
    // Clear metadata
    await AsyncStorage.removeItem(PHOTOS_KEY);
    
    return true;
  } catch (error) {
    logError('photoStorage.clearAllPhotos', error);
    return false;
  }
}
