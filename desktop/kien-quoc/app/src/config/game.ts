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
  competitive: 1.5,
  synergy: 1.5,
  independent: 1.5,
  cooperation: 2.0,
  project: 1.0
};

// Synergy formula: SYNERGY_BASE + (participants - SYNERGY_FREE_PARTICIPANTS) * SYNERGY_SCALING
// Example: 1.0 + (5 - 1) * 0.15 = 1.6x bonus for 5 teams
export const SYNERGY_BASE = 1.0; // Baseline multiplier (1.0 = no bonus for solo)
export const SYNERGY_FREE_PARTICIPANTS = 1; // Number of participants before bonus kicks in
export const SYNERGY_SCALING = 0.15; // Bonus per additional participant

// Competitive cell: losers get this multiplier instead of 0
export const COMPETITIVE_LOSER_MULTIPLIER = 0.5;

// Region specialization: bonus multiplier for investing in specialized cells
export const REGION_SPECIALIZATION_MULTIPLIER = 1.1;

export const RESOURCES_PER_TURN = 14;
export const MAX_TEAMS = 5;
export const MAX_TURNS = 8;

import { createSignal } from 'solid-js';

// Test mode signals
const [testModeSignal, setTestModeSignal] = createSignal(import.meta.env.VITE_TEST_MODE === 'true');
export const isTestMode = testModeSignal;

const [singlePlayerSignal, setSinglePlayerSignal] = createSignal(false);
export const isSinglePlayerMode = singlePlayerSignal;

// Bot-only mode (exclusive with testMode and singlePlayerMode)
const [botOnlySignal, setBotOnlySignal] = createSignal(false);
const [botCountSignal, setBotCountSignal] = createSignal(5);
export const isBotOnlyMode = botOnlySignal;
export const getBotCount = botCountSignal;
export const setBotCount = setBotCountSignal;

// Exclusive toggle logic
export function setTestMode(value: boolean) {
  if (value && isBotOnlyMode()) return; // Can't enable if botOnly is on
  setTestModeSignal(value);
  if (value) setBotOnlySignal(false);
}

export function setSinglePlayerMode(value: boolean) {
  if (value && isBotOnlyMode()) return; // Can't enable if botOnly is on
  setSinglePlayerSignal(value);
  if (value) setBotOnlySignal(false);
}

export function setBotOnlyMode(value: boolean) {
  setBotOnlySignal(value);
  if (value) {
    setTestModeSignal(false);
    setSinglePlayerSignal(false);
  }
}

export const getMinTeams = () => (isTestMode() ? 2 : 3);
export const getProjectMultiplier = () => (isTestMode() ? 0.3 : 1.0);

export type GameStatus = 'lobby' | 'playing' | 'paused' | 'finished' | 'ended';
export type GameMode = 'online' | 'offline';
export type Role = 'player' | 'host' | 'spectator';
