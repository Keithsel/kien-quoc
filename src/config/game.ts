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

// How many RP needed on a cell to give +1 to its indices (lower = easier to maintain)
export const INDEX_BOOST_DIVISOR = 7;

export const PHASE_DURATIONS = {
  event: 15,
  action: 60,
  resolution: 3,
  result: 15
} as const;

export type PhaseName = keyof typeof PHASE_DURATIONS;
export const PHASE_ORDER: PhaseName[] = ['event', 'action', 'resolution', 'result'];

export const CELL_TYPES = ['competitive', 'synergy', 'independent', 'cooperation', 'project'] as const;
export type CellType = (typeof CELL_TYPES)[number];

export const CELL_MULTIPLIERS: Record<CellType, number> = {
  competitive: 1.75,
  synergy: 1.5,
  independent: 1.5,
  cooperation: 2.0,
  project: 1.0
};

// Synergy formula: SYNERGY_BASE + (participants - SYNERGY_FREE_PARTICIPANTS) * SYNERGY_SCALING
// Example: 1.0 + (6 - 1) * 0.15 = 1.75x bonus for 6 teams
export const SYNERGY_BASE = 1.0; // Baseline multiplier (1.0 = no bonus for solo)
export const SYNERGY_FREE_PARTICIPANTS = 1; // Number of participants before bonus kicks in
export const SYNERGY_SCALING = 0.15; // Bonus per additional participant

// Competitive cell: losers get this multiplier instead of 0
export const COMPETITIVE_LOSER_MULTIPLIER = 0.5;

// Region specialization: bonus multiplier for investing in specialized cells
export const REGION_SPECIALIZATION_MULTIPLIER = 1.1;

export const RESOURCES_PER_TURN = 14;
export const MAX_TEAMS = 6;
export const MAX_TURNS = 8;

// Late Game Catch-up: Underdog Bonus (tiered system)
export const UNDERDOG_RP_TIER1 = 1; // +1 RP from turn 3
export const UNDERDOG_RP_TIER2 = 2; // +2 RP from turn 6
export const UNDERDOG_MULTIPLIER_TIER2 = 1.05; // 5% score bonus from turn 6
export const UNDERDOG_START_TURN_TIER1 = 3; // Turn when tier 1 activates
export const UNDERDOG_START_TURN_TIER2 = 6; // Turn when tier 2 activates
export const UNDERDOG_THRESHOLD = 0.4; // Bottom 40% of teams qualify

// Solo allocation penalties (when only 1 team invests in non-independent cells)
export const SOLO_PENALTY_COMPETITIVE = 0.75;
export const SOLO_PENALTY_SYNERGY = 0.5;
export const SOLO_PENALTY_COOPERATION = 0.25;

// Minimum teams required to start game
export const MIN_TEAMS = 2;

export type GameStatus = 'lobby' | 'playing' | 'paused' | 'finished' | 'ended';
export type GameMode = 'online' | 'offline';
