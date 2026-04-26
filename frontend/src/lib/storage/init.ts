/**
 * Storage Initialization
 * Basic storage utilities for database-driven system
 * 
 * Note: Seed data functionality removed - system is now fully database-driven
 */

import { STORAGE_KEYS, isStorageInitialized } from './storage';

/**
 * Check if storage is initialized
 * Returns true if basic storage structure exists
 */
export function initializeStorage(): void {
  if (typeof window === 'undefined') return;

  // Skip if already initialized
  if (isStorageInitialized()) {
    return;
  }

  try {
    // Initialize empty storage structure for database-driven system
  } catch (error) {
    console.error('Failed to initialize storage:', error);
  }
}

/**
 * Reset storage (for development/testing)
 * Clears all storage keys
 */
export function resetStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    // Clear all storage keys
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

  } catch (error) {
    console.error('Failed to reset storage:', error);
  }
}
