/**
 * Core Configuration Constants
 * All immutable game parameters in one place
 */

// ============================================================================
// INDEX CONFIGURATION
// ============================================================================

export const INDEX_NAMES = ['economy', 'society', 'culture', 'integration', 'environment', 'science'] as const;
export type IndexName = (typeof INDEX_NAMES)[number];

export const INDEX_LABELS: Record<IndexName, string> = {
  economy: 'Kinh tế',
  society: 'Xã hội',
  culture: 'Văn hóa',
  integration: 'Hội nhập',
  environment: 'Môi trường',
  science: 'Khoa học'
};

export const INITIAL_INDICES: Record<IndexName, number> = {
  economy: 10,
  society: 10,
  culture: 10,
  integration: 10,
  environment: 10,
  science: 10
};

export const MAINTENANCE_COST: Record<IndexName, number> = {
  economy: 1,
  society: 1,
  culture: 1,
  integration: 1,
  environment: 1,
  science: 1
};

// ============================================================================
// PHASE CONFIGURATION
// ============================================================================

export const PHASE_DURATIONS = {
  event: 15,
  action: 60,
  resolution: 3,
  result: 15
} as const;

export type PhaseName = keyof typeof PHASE_DURATIONS;
export const PHASE_ORDER: PhaseName[] = ['event', 'action', 'resolution', 'result'];

// ============================================================================
// CELL CONFIGURATION
// ============================================================================

export const CELL_TYPES = ['competitive', 'synergy', 'independent', 'cooperation', 'project'] as const;
export type CellType = (typeof CELL_TYPES)[number];

export const CELL_MULTIPLIERS: Record<CellType, number> = {
  competitive: 1.5,
  synergy: 1.8,
  independent: 1.5,
  cooperation: 2.5,
  project: 1.0
};

// ============================================================================
// GAME LIMITS
// ============================================================================

export const RESOURCES_PER_TURN = 14;
export const MAX_TEAMS = 5;
export const MIN_TEAMS = 2;
export const MAX_TURNS = 8;

// ============================================================================
// STATUS & MODE TYPES
// ============================================================================

export type GameStatus = 'lobby' | 'playing' | 'paused' | 'finished' | 'ended';
export type GameMode = 'online' | 'offline';
export type Role = 'player' | 'host' | 'spectator';
