/**
 * Tater Identity System
 *
 * Generates anonymous identities for collaborative annotation sharing.
 * Format: {adjective}-tater-{noun}
 * Examples: "swift-tater-falcon", "gentle-tater-crystal"
 */

import { uniqueUsernameGenerator, adjectives, nouns } from 'unique-username-generator';

const STORAGE_KEY = 'plannotator-identity';

/**
 * Generate a new tater identity
 */
export function generateIdentity(): string {
  // Use a unique separator to split adjective from noun, avoiding issues
  // with compound words that contain hyphens (e.g., "behind-the-scenes")
  const generated = uniqueUsernameGenerator({
    dictionaries: [adjectives, nouns],
    separator: '|||',
    style: 'lowerCase',
    randomDigits: 0,
    length: 50, // Prevent word truncation (default is too short)
  });

  const [adjective, noun] = generated.split('|||');
  return `${adjective}-${noun}-tater`;
}

/**
 * Get current identity from localStorage, or generate one if none exists
 */
export function getIdentity(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }
  } catch (e) {
    // localStorage not available
  }

  const identity = generateIdentity();
  saveIdentity(identity);
  return identity;
}

/**
 * Save identity to localStorage
 */
export function saveIdentity(identity: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, identity);
  } catch (e) {
    // localStorage not available
  }
}

/**
 * Regenerate identity and save to localStorage
 */
export function regenerateIdentity(): string {
  const identity = generateIdentity();
  saveIdentity(identity);
  return identity;
}

/**
 * Check if an identity belongs to the current user
 */
export function isCurrentUser(author: string | undefined): boolean {
  if (!author) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === author;
  } catch (e) {
    return false;
  }
}
