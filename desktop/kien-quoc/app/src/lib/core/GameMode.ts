/**
 * Unified Game Mode Interface
 *
 * This interface defines the contract that both offline and online game modes
 * must implement. This eliminates the need for conditional mode checks throughout
 * the codebase - components just call these methods and the active mode handles it.
 */

import type { RegionId } from '~/config/regions';
import type { IndexName, PhaseName, GameStatus, GameMode as GameModeType } from '~/config/constants';

// ============================================================================
// DATA TYPES (shared between modes)
// ============================================================================

export type Placements = Record<string, number>;
export type NationalIndices = Record<IndexName, number>;

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

export interface TurnEvent {
  turn: number;
  year: number;
  name: string;
  scenario: string;
  project: string;
  minTotal: number;
  minTeams: number;
  successReward: {
    points: number;
    indices: Partial<NationalIndices>;
  };
  failurePenalty: Partial<NationalIndices>;
}

export interface TurnResult {
  success: boolean;
  totalRP: number;
  teamCount: number;
  indexChanges: Partial<NationalIndices>;
  zoneBoosts: Partial<NationalIndices>;
  teamPoints: Record<RegionId, number>;
}

export interface GameOver {
  reason: 'completed' | 'index_zero';
  zeroIndex?: IndexName;
  finalRanking: Array<{ regionId: RegionId; points: number }>;
}

export interface ProjectState {
  totalRP: number;
  teamCount: number;
  success: boolean | null;
}

// ============================================================================
// GAME STATE DTO (Data Transfer Object)
// ============================================================================

export interface GameStateDTO {
  // Meta
  mode: GameModeType;
  status: GameStatus;

  // Turn/Phase
  currentTurn: number;
  currentPhase: PhaseName;
  phaseEndTime: number;

  // Indices
  nationalIndices: NationalIndices;

  // Teams
  teams: Record<RegionId, Team>;
  activeTeamCount: number;

  // Current Event (with scaled requirements)
  currentEvent: TurnEvent | null;

  // Project State
  project: ProjectState;

  // Results
  lastTurnResult?: TurnResult;
  gameOver?: GameOver;
}

// ============================================================================
// GAME MODE INTERFACE
// ============================================================================

export interface GameInitParams {
  playerRegion?: RegionId;
  singlePlayer?: boolean;
}

export interface IGameMode {
  // ---- State Queries (sync for reactivity) ----

  /** Get current game state snapshot */
  getState(): GameStateDTO;

  /** Get specific team */
  getTeam(id: RegionId): Team | null;

  /** Get all teams */
  getAllTeams(): Record<RegionId, Team>;

  /** Get current player's team ID (null if spectator/host) */
  getMyTeamId(): RegionId | null;

  /** Check if current user can control game (advance phases, pause) */
  canControl(): boolean;

  /** Check if current user can allocate resources */
  canAllocate(): boolean;

  // ---- Actions (async for transactions) ----

  /** Submit placements for a team */
  submitPlacements(teamId: RegionId, placements: Placements): Promise<void>;

  /** Cancel submission (online only, allows re-editing) */
  cancelSubmission(teamId: RegionId): Promise<void>;

  /** Advance to next phase */
  advancePhase(): Promise<void>;

  /** Toggle pause state */
  togglePause(): Promise<void>;

  /** Extend phase timer (host only) */
  extendTime(seconds: number): Promise<void>;

  // ---- Lifecycle ----

  /** Initialize game with parameters */
  initialize(params: GameInitParams): Promise<void>;

  /** Subscribe to state changes (returns unsubscribe function) */
  subscribe(callback: (state: GameStateDTO) => void): () => void;

  /** Clean up resources */
  destroy(): void;

  // ---- Persistence (offline only) ----

  /** Save game to storage */
  save?(): void;

  /** Load game from storage */
  load?(): boolean;

  /** Check if saved game exists */
  hasSavedGame?(): boolean;

  /** Clear saved game */
  clearSavedGame?(): void;
}

// ============================================================================
// FACTORY TYPE
// ============================================================================

export type GameModeFactory = (mode: GameModeType) => IGameMode;
