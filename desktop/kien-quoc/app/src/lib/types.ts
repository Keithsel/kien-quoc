import type { IndexName, PhaseName } from '~/config/game';
import type { RegionId } from '~/config/regions';

export type GameStatus = 'lobby' | 'playing' | 'paused' | 'finished' | 'ended';

export type GameMode = 'online' | 'offline';

export type Role = 'player' | 'host' | 'spectator';

export type NationalIndices = Record<IndexName, number>;

export type Placements = Record<string, number>;

export interface Team {
  id: RegionId;
  name: string;
  ownerId: string | null; // null = AI in offline mode
  points: number;
  placements: Placements;
  submitted: boolean;
  connected: boolean;
  cumulativeAllocations?: Placements; // Total allocations across all turns
}

export interface TurnResult {
  success: boolean;
  totalRP: number;
  teamCount: number;
  indexChanges: Partial<NationalIndices>; // Project success/failure changes
  zoneBoosts: Partial<NationalIndices>; // Cell placement bonus (always applied)
  teamPoints: Record<RegionId, number>;
}

export interface GameOver {
  reason: 'completed' | 'index_zero';
  zeroIndex?: IndexName;
  finalRanking: Array<{ regionId: RegionId; points: number }>;
}

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

export interface PlayerAllocation {
  total: number;
  placements: Placements;
}
