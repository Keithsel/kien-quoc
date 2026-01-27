/**
 * Atomic Firebase Operations
 *
 * Centralized, typed wrappers for all Firebase database operations.
 * Provides consistent error handling and type safety.
 */

import { ref, set, get, update, onValue, onDisconnect } from 'firebase/database';
import { db } from './client';
import type { OnlineGameData, OnlineTeam } from './types';
import type { RegionId } from '~/config/regions';

// === CONSTANTS ===

const GAME_PATH = 'game';

// === ERROR HANDLING ===

export class FirebaseOperationError extends Error {
  constructor(
    operation: string,
    public readonly cause?: Error
  ) {
    super(`Firebase operation failed: ${operation}${cause ? ` - ${cause.message}` : ''}`);
    this.name = 'FirebaseOperationError';
  }
}

function assertDb(): void {
  if (!db) {
    throw new FirebaseOperationError('Database not initialized');
  }
}

// === GAME OPERATIONS ===

/**
 * Read the current game data from Firebase
 * @returns The game data or null if no game exists
 */
export async function readGame(): Promise<OnlineGameData | null> {
  assertDb();
  try {
    const snapshot = await get(ref(db!, GAME_PATH));
    return snapshot.exists() ? (snapshot.val() as OnlineGameData) : null;
  } catch (error) {
    throw new FirebaseOperationError('readGame', error instanceof Error ? error : undefined);
  }
}

/**
 * Read game data, throwing if no game exists
 * @param context Description of why we're reading (for error messages)
 * @returns The game data
 * @throws FirebaseOperationError if no game exists
 */
export async function readGameOrThrow(context: string): Promise<OnlineGameData> {
  const game = await readGame();
  if (!game) {
    throw new FirebaseOperationError(`${context}: No game exists`);
  }
  return game;
}

/**
 * Partially update the game data
 * @param updates Partial game data to merge
 */
export async function updateGame(updates: Partial<OnlineGameData> | Record<string, unknown>): Promise<void> {
  assertDb();
  try {
    await update(ref(db!, GAME_PATH), updates);
  } catch (error) {
    throw new FirebaseOperationError('updateGame', error instanceof Error ? error : undefined);
  }
}

/**
 * Set the entire game data (overwrites)
 * @param data The complete game data to write
 */
export async function setGame(data: OnlineGameData): Promise<void> {
  assertDb();
  try {
    await set(ref(db!, GAME_PATH), data);
  } catch (error) {
    throw new FirebaseOperationError('setGame', error instanceof Error ? error : undefined);
  }
}

// === TEAM OPERATIONS ===

/**
 * Update a single team's data
 * @param regionId The team's region
 * @param updates Partial team data to merge
 */
export async function updateTeam(regionId: RegionId, updates: Partial<OnlineTeam>): Promise<void> {
  assertDb();
  try {
    await update(ref(db!, `${GAME_PATH}/teams/${regionId}`), updates);
  } catch (error) {
    throw new FirebaseOperationError(`updateTeam(${regionId})`, error instanceof Error ? error : undefined);
  }
}

/**
 * Update multiple teams/paths in a single atomic operation
 * @param updates Object with relative paths as keys (e.g., "teams/north/points": 10)
 */
export async function updateMultipleTeams(updates: Record<string, unknown>): Promise<void> {
  assertDb();
  try {
    await update(ref(db!, GAME_PATH), updates);
  } catch (error) {
    throw new FirebaseOperationError('updateMultipleTeams', error instanceof Error ? error : undefined);
  }
}

// === DISCONNECT HANDLERS ===

/**
 * Set up disconnect handler for host
 * When host disconnects, hostConnected will be set to false
 */
export function setupHostDisconnect(): void {
  assertDb();
  onDisconnect(ref(db!, `${GAME_PATH}/hostConnected`)).set(false);
}

/**
 * Set up disconnect handler for a team
 * When team disconnects, their connected status will be set to false
 * @param regionId The team's region
 */
export function setupTeamDisconnect(regionId: RegionId): void {
  assertDb();
  onDisconnect(ref(db!, `${GAME_PATH}/teams/${regionId}/connected`)).set(false);
}

// === SUBSCRIPTION ===

/**
 * Subscribe to game data changes
 * @param callback Called whenever game data changes
 * @returns Unsubscribe function
 */
export function subscribeGame(callback: (game: OnlineGameData | null) => void): () => void {
  if (!db) return () => {};

  const gameRef = ref(db, GAME_PATH);
  const unsubscribe = onValue(gameRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as OnlineGameData) : null);
  });

  return unsubscribe;
}
