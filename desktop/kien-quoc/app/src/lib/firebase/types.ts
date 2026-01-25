/**
 * Firebase Schema for Kiến Quốc Ký Online Mode
 *
 * PRINCIPLE: Firebase is the SINGLE SOURCE OF TRUTH
 * - All computed/derived values are stored in Firebase, not computed in UI
 * - UI components ONLY read from Firebase, never compute state-dependent values
 * - Phase transitions compute and store all values atomically
 */

import type { IndexName } from '~/config/game';
import type { RegionId } from '~/config/regions';

export type OnlineGameStatus = 'waiting' | 'lobby' | 'playing' | 'paused' | 'finished' | 'ended';

/**
 * Team data stored in Firebase
 */
export interface OnlineTeam {
  // Identity
  name: string;
  ownerId: string | null; // Firebase UID, 'bot' for AI, null for unassigned
  connected: boolean;
  isAI: boolean;

  // Current turn state
  placements: Record<string, number>; // cellId -> RP allocated this turn
  submitted: boolean;

  // Accumulated state
  points: number;
  cumulativeAllocations: Record<string, number>; // cellId -> total RP all turns
}

/**
 * Current turn's event data - stored so all clients read the same values
 */
export interface OnlineTurnEvent {
  turn: number;
  year: number;
  name: string;
  scenario: string;
  project: string;

  // Pre-computed scaled requirements (based on turnActiveTeams at turn start)
  minTotal: number; // Scaled RP requirement
  minTeams: number; // Scaled team requirement

  // Original (unscaled) values for reference
  originalMinTotal: number;
  originalMinTeams: number;

  // Rewards/penalties
  successReward: {
    points: number;
    indices: Partial<Record<IndexName, number>>;
  };
  failurePenalty: Partial<Record<IndexName, number>>;
}

/**
 * Project state - updated in real-time during action phase
 */
export interface OnlineProjectState {
  // Live values (updated as teams submit during action phase)
  totalRP: number; // Sum of all team project RP
  teamCount: number; // Count of teams with project RP > 0

  // Success status
  // - null during event/action phase (not yet determined)
  // - true/false after resolution (final verdict)
  success: boolean | null;
}

/**
 * Turn result - stored after scoring is calculated
 */
export interface OnlineTurnResult {
  success: boolean;
  totalRP: number;
  teamCount: number;

  // Index changes from this turn
  indexChanges: Partial<Record<IndexName, number>>; // From project success/failure
  zoneBoosts: Partial<Record<IndexName, number>>; // From cell placements

  // Points earned by each team
  teamPoints: Record<RegionId, number>;
}

/**
 * Turn history entry - stored after each turn for export
 */
export interface TurnHistoryEntry {
  turn: number;
  activeTeams: RegionId[];
  teamFormationSummary: string;
  event: {
    name: string;
    year: number;
    project: string;
  };
  allocations: Record<RegionId, Record<string, number>>; // team -> cellId -> RP
  indicesSnapshot: Record<IndexName, number>; // Indices after turn resolution
  projectSuccess: boolean;
  projectRequirements: {
    minRP: number;
    minTeams: number;
  };
  teamPoints: Record<RegionId, number>; // Points earned this turn
}

/**
 * Game over state
 */
export interface OnlineGameOver {
  reason: 'completed' | 'index_zero';
  zeroIndex?: IndexName;
  finalRanking: Array<{ regionId: RegionId; points: number }>;
}

/**
 * Main game data structure stored in Firebase
 * Path: /games/{gameId}
 */
export interface OnlineGameData {
  // === META ===
  status: OnlineGameStatus;
  hostId: string | null;
  hostConnected: boolean;
  createdAt: number;

  // === TURN/PHASE ===
  currentTurn: number; // 1-8
  currentPhase: 'event' | 'action' | 'resolution' | 'result';
  phaseEndTime: number; // Timestamp when current phase timer expires
  pausedRemainingMs?: number; // Remaining time when paused

  // === TEAMS ===
  teams: Record<RegionId, OnlineTeam>;
  turnActiveTeams: number; // Locked at turn start, used for scaling requirements

  // === NATIONAL INDICES ===
  nationalIndices: Record<IndexName, number>;

  // === CURRENT TURN EVENT ===
  // Stored with pre-computed scaled requirements
  currentEvent: OnlineTurnEvent | null;

  // === PROJECT STATE ===
  // Updated live during action phase, finalized in result phase
  project: OnlineProjectState;

  // === RESULTS ===
  lastTurnResult: OnlineTurnResult | null; // Result of most recent completed turn
  gameOver: OnlineGameOver | null;

  // === HISTORY ===
  turnHistory: TurnHistoryEntry[]; // Per-turn snapshots for export
}

/**
 * Lifecycle of Firebase state updates:
 *
 * 1. GAME START (lobby -> event):
 *    - Lock turnActiveTeams
 *    - Compute and store currentEvent with scaled requirements
 *    - Reset project state {totalRP: 0, teamCount: 0, success: null}
 *
 * 2. EVENT -> ACTION:
 *    - Update phase and timer
 *    - No state changes needed
 *
 * 3. DURING ACTION PHASE:
 *    - When team submits: update their placements
 *    - Update project.totalRP and project.teamCount live
 *    - project.success remains null (not yet determined)
 *
 * 4. ACTION -> RESOLUTION:
 *    - Force all teams to submitted state
 *    - Update phase
 *    - project.success remains null (for resolution animation)
 *
 * 5. RESOLUTION -> RESULT:
 *    - Calculate final scores using stored scaledEvent requirements
 *    - Set project.success to true/false
 *    - Update nationalIndices with changes
 *    - Update team points
 *    - Accumulate team cumulativeAllocations
 *    - Store lastTurnResult
 *    - Check for game over
 *
 * 6. RESULT -> EVENT (next turn):
 *    - Increment turn
 *    - Clear team placements and submitted
 *    - Compute new currentEvent with scaled requirements
 *    - Reset project state for new turn
 *    - Clear lastTurnResult (or keep for reference?)
 *
 * 7. GAME END:
 *    - Set status to 'finished'
 *    - Store gameOver with final ranking
 */

export type Role = 'host' | 'player' | 'spectator';
