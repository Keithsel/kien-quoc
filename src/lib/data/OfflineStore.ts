/**
 * Offline Store
 *
 * Transactional wrapper around SolidJS stores for offline mode.
 * Provides atomic updates with rollback capability.
 */

import { createStore, produce, type SetStoreFunction } from 'solid-js/store';
import { Transaction, type TransactionExecutor, type TransactionOptions } from './Transaction';
import type { GameStateDTO } from '~/lib/core/GameMode';
import type { RegionId } from '~/config/regions';
import { INITIAL_INDICES, type IndexName } from '~/config/game';
import { REGIONS } from '~/config/regions';

// ============================================================================
// INITIAL STATE
// ============================================================================

function createInitialTeams(): GameStateDTO['teams'] {
  const teams = {} as GameStateDTO['teams'];
  for (const region of REGIONS) {
    teams[region.id] = {
      id: region.id,
      name: region.name,
      ownerId: null,
      points: 0,
      placements: {},
      submitted: false,
      connected: false,
      cumulativeAllocations: {}
    };
  }
  return teams;
}

function createInitialState(): GameStateDTO {
  return {
    mode: 'offline',
    status: 'lobby',
    currentTurn: 0,
    currentPhase: 'event',
    phaseEndTime: 0,
    nationalIndices: { ...INITIAL_INDICES },
    teams: createInitialTeams(),
    activeTeamCount: 0,
    currentEvent: null,
    project: {
      totalRP: 0,
      teamCount: 0,
      success: null
    },
    // Explicitly reset these to ensure clean state
    gameOver: undefined,
    lastTurnResult: undefined,
    turnHistory: []
  };
}

// ============================================================================
// STORE SINGLETON
// ============================================================================

const [state, setState] = createStore<GameStateDTO>(createInitialState());

// ============================================================================
// PATH UTILITIES
// ============================================================================

/**
 * Parse a dot-separated path into segments
 */
function parsePath(path: string): string[] {
  return path.split('.').filter(Boolean);
}

/**
 * Get value at path from state
 */
function getValueAtPath(obj: unknown, path: string): unknown {
  const segments = parsePath(path);
  let current = obj;
  for (const segment of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Set value at path in state using produce
 */
function setValueAtPath(set: SetStoreFunction<GameStateDTO>, path: string, value: unknown): void {
  const segments = parsePath(path);
  if (segments.length === 0) return;

  set(
    produce((draft: GameStateDTO) => {
      let current: Record<string, unknown> = draft as unknown as Record<string, unknown>;
      for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        if (current[segment] == null || typeof current[segment] !== 'object') {
          current[segment] = {};
        }
        current = current[segment] as Record<string, unknown>;
      }
      const lastSegment = segments[segments.length - 1];
      current[lastSegment] = value;
    })
  );
}

/**
 * Update (merge) value at path
 */
function updateValueAtPath(set: SetStoreFunction<GameStateDTO>, path: string, value: Record<string, unknown>): void {
  const segments = parsePath(path);

  set(
    produce((draft: GameStateDTO) => {
      let current: Record<string, unknown> = draft as unknown as Record<string, unknown>;
      for (const segment of segments) {
        if (current[segment] == null || typeof current[segment] !== 'object') {
          current[segment] = {};
        }
        current = current[segment] as Record<string, unknown>;
      }
      Object.assign(current, value);
    })
  );
}

/**
 * Delete value at path
 */
function deleteValueAtPath(set: SetStoreFunction<GameStateDTO>, path: string): void {
  const segments = parsePath(path);
  if (segments.length === 0) return;

  set(
    produce((draft: GameStateDTO) => {
      let current: Record<string, unknown> = draft as unknown as Record<string, unknown>;
      for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        if (current[segment] == null) return;
        current = current[segment] as Record<string, unknown>;
      }
      delete current[segments[segments.length - 1]];
    })
  );
}

// ============================================================================
// TRANSACTION EXECUTOR
// ============================================================================

export const offlineTransactionExecutor: TransactionExecutor = {
  async execute(transaction: Transaction, _options?: TransactionOptions): Promise<void> {
    const operations = transaction.getOperations();

    // Store previous values for potential rollback
    const previousValues: Array<{ path: string; value: unknown }> = [];

    try {
      for (const op of operations) {
        // Capture current value before change
        previousValues.push({
          path: op.path,
          value: getValueAtPath(state, op.path)
        });

        // Apply operation
        switch (op.type) {
          case 'set':
            setValueAtPath(setState, op.path, op.value);
            break;
          case 'update':
            updateValueAtPath(setState, op.path, op.value as Record<string, unknown>);
            break;
          case 'delete':
            deleteValueAtPath(setState, op.path);
            break;
        }
      }

      transaction.markCommitted();
    } catch (error) {
      // Rollback on error
      for (const { path, value } of previousValues.reverse()) {
        if (value === undefined) {
          deleteValueAtPath(setState, path);
        } else {
          setValueAtPath(setState, path, value);
        }
      }
      transaction.markRolledBack();
      throw error;
    }
  }
};

// ============================================================================
// DIRECT STATE ACCESS (for reads and simple updates)
// ============================================================================

export { state as offlineState };

/**
 * Reset state to initial
 */
export function resetOfflineState(): void {
  setState(createInitialState());
}

/**
 * Set a top-level state property
 */
export function setOfflineState<K extends keyof GameStateDTO>(key: K, value: GameStateDTO[K]): void {
  setState(key, value);
}

/**
 * Update team property
 */
export function updateTeam(teamId: RegionId, updates: Partial<GameStateDTO['teams'][RegionId]>): void {
  setState('teams', teamId, updates as GameStateDTO['teams'][RegionId]);
}

/**
 * Update national index
 */
export function updateIndex(index: IndexName, value: number): void {
  setState('nationalIndices', index, value);
}

/**
 * Update multiple state properties at once
 */
export function batchUpdate(updates: Partial<GameStateDTO>): void {
  setState(updates);
}

// ============================================================================
// PERSISTENCE
// ============================================================================

const STORAGE_KEY = 'kien-quoc-offline-game';

interface SavedGame {
  playerRegion: RegionId;
  state: Omit<GameStateDTO, 'mode'>;
  savedAt: number;
  turnHistory?: GameStateDTO['turnHistory'];
  randomModifiers?: GameStateDTO['randomModifiers'];
}

export function saveOfflineGame(): void {
  if (state.mode !== 'offline') return;
  if (state.status === 'lobby' || state.status === 'finished') return;

  const playerRegion = Object.entries(state.teams).find(([, team]) => team.ownerId === 'player')?.[0] as
    | RegionId
    | undefined;

  if (!playerRegion) return;

  const saveData: SavedGame = {
    playerRegion,
    state: {
      status: state.status,
      currentTurn: state.currentTurn,
      currentPhase: state.currentPhase,
      phaseEndTime: state.phaseEndTime,
      nationalIndices: { ...state.nationalIndices },
      teams: JSON.parse(JSON.stringify(state.teams)),
      activeTeamCount: state.activeTeamCount,
      currentEvent: state.currentEvent,
      project: { ...state.project },
      lastTurnResult: state.lastTurnResult,
      gameOver: state.gameOver,
      turnHistory: state.turnHistory,
      randomModifiers: state.randomModifiers
    },
    savedAt: Date.now()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
}

export function loadOfflineGame(): SavedGame | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as SavedGame;
  } catch {
    return null;
  }
}

export function hasSavedOfflineGame(): boolean {
  const saved = loadOfflineGame();
  return saved !== null && saved.state.status !== 'finished';
}

export function clearSavedOfflineGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear saved game:', e);
  }
}
