/**
 * Domain Types
 *
 * Canonical domain types for the game. These are pure TypeScript types
 * with no framework dependencies (no solid-js, no firebase).
 *
 * Re-exports from config where appropriate for convenience.
 */

import type { IndexName, PhaseName, GameStatus, GameMode } from '~/config/game';
import type { RegionId } from '~/config/regions';
import type { TurnEvent, RandomModifierId } from '~/config/events';

// Re-export config types for consumer convenience
export type { IndexName, PhaseName, GameStatus, GameMode, CellType } from '~/config/game';
export type { RegionId } from '~/config/regions';
export type { TurnEvent, RandomModifierId, ModifierEffect } from '~/config/events';

// ============================================================================
// CORE DOMAIN TYPES
// ============================================================================

/** Resource placements per cell */
export type Placements = Record<string, number>;

/** National indices record */
export type NationalIndices = Record<IndexName, number>;

/** Team data - unified for both online and offline modes */
export interface Team {
  id: RegionId;
  name: string;
  ownerId: string | null;
  points: number;
  placements: Placements;
  submitted: boolean;
  connected: boolean;
  isAI?: boolean;
  cumulativeAllocations?: Placements;
}

/** Result of a single turn */
export interface TurnResult {
  success: boolean;
  totalRP: number;
  teamCount: number;
  indexChanges: Partial<NationalIndices>;
  zoneBoosts: Partial<NationalIndices>;
  teamPoints: Record<RegionId, number>;
  underdogs?: RegionId[];
}

/** Game over state */
export interface GameOver {
  reason: 'completed' | 'index_zero';
  zeroIndex?: IndexName;
  finalRanking: Array<{ regionId: RegionId; points: number }>;
}

/** Project contribution state */
export interface ProjectState {
  totalRP: number;
  teamCount: number;
  success: boolean | null;
}

/** Turn history entry for export */
export interface TurnHistoryEntry {
  turn: number;
  activeTeams: RegionId[];
  teamFormationSummary: string;
  event: {
    name: string;
    year: number;
    project: string;
  };
  fixedModifier?: string;
  randomModifier?: RandomModifierId;
  allocations: Record<string, Record<string, number>>;
  indicesSnapshot: Record<string, number>;
  projectSuccess: boolean;
  projectRequirements: {
    minRP: number;
    minTeams: number;
  };
  teamPoints: Record<string, number>;
}

// ============================================================================
// TURN PROCESSING TYPES
// ============================================================================

/** Input for turn processing */
export interface TurnProcessingInput {
  turn: number;
  placements: Record<RegionId, Placements>;
  currentIndices: NationalIndices;
  activeTeamCount: number;
  cumulativePoints: Record<RegionId, number>;
  randomModifiers?: RandomModifierId[];
  currentEvent: TurnEvent | null;
  teams: Record<RegionId, { name: string; isAI?: boolean }>;
  isLastTurn?: boolean;
}

/** Output from turn processing */
export interface TurnProcessingResult {
  /** Updated national indices after all effects */
  finalIndices: NationalIndices;
  /** Turn result with scores and project outcome */
  turnResult: TurnResult;
  /** Project state for UI display */
  projectState: ProjectState;
  /** Turn history entry for export */
  historyEntry: TurnHistoryEntry;
}

/** Game over check result */
export interface GameOverCheck {
  gameOver: boolean;
  zeroIndex?: IndexName;
}

/** Prepared next turn event with scaled requirements */
// minTotal and minTeams are already in TurnEvent - this type just signals they've been scaled
export type PreparedTurnEvent = TurnEvent;

// ============================================================================
// FULL GAME STATE (for legacy compatibility)
// ============================================================================

/** Full game state - used by engine.ts */
export interface GameState {
  // Meta
  mode: GameMode;
  status: GameStatus;

  // Turn/Phase
  currentTurn: number; // 1-8
  currentPhase: PhaseName;
  phaseEndTime: number; // timestamp

  // Indices
  nationalIndices: NationalIndices;

  // Teams
  teams: Record<RegionId, Team>;

  // Project aggregation
  projectRP: number;
  projectTeams: number;

  // Results
  lastTurnResult?: TurnResult;
  gameOver?: GameOver;
}
