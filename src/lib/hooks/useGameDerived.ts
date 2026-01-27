/**
 * Derived Game State Hooks
 *
 * Reusable hooks for computed game state that are used across multiple components.
 * These extract common derived state patterns to avoid duplication.
 */
import { createMemo } from 'solid-js';
import { useGame } from '~/lib/game/context';
import { INDEX_NAMES, UNDERDOG_START_TURN_TIER1, UNDERDOG_THRESHOLD, MAINTENANCE_COST, MAX_TURNS } from '~/config/game';
import { BOARD_CELLS } from '~/config/board';
import type { IndexName, CellType } from '~/config/game';
import type { RegionId } from '~/config/regions';
import type { Placements } from '~/lib/types';

// ============================================================================
// Phase Checks
// ============================================================================

/**
 * Hook for phase-related checks
 * Returns memoized booleans for common phase conditions
 */
export function usePhaseChecks() {
  const game = useGame();

  const isEventPhase = createMemo(() => game.currentPhase() === 'event');
  const isActionPhase = createMemo(() => game.currentPhase() === 'action');
  const isResolutionPhase = createMemo(() => game.currentPhase() === 'resolution');
  const isResultPhase = createMemo(() => game.currentPhase() === 'result');

  return {
    isEventPhase: () => isEventPhase(),
    isActionPhase: () => isActionPhase(),
    isResolutionPhase: () => isResolutionPhase(),
    isResultPhase: () => isResultPhase()
  };
}

// ============================================================================
// Index Health
// ============================================================================

/** Threshold for danger level */
const DANGER_THRESHOLD = 3;

export interface IndexHealth {
  /** Indices at or below danger threshold */
  dangerIndices: () => IndexName[];
  /** Check if specific index is in danger */
  isInDanger: (index: IndexName) => boolean;
  /** Get combined index changes (indexChanges + zoneBoosts) from last turn result */
  indexChanges: () => Record<string, number>;
  /** Check if any index is in danger */
  hasDanger: () => boolean;
}

/**
 * Hook for national indices health monitoring
 * Tracks danger levels and changes from turn results
 */
export function useIndexHealth(): IndexHealth {
  const game = useGame();

  const dangerIndices = createMemo(() => INDEX_NAMES.filter((idx) => game.nationalIndices()[idx] <= DANGER_THRESHOLD));

  const indexChanges = createMemo(() => {
    if (game.currentPhase() !== 'result') return {};
    const result = game.lastTurnResult();
    if (!result) return {};

    const changes: Record<string, number> = {};

    // Add project success/failure changes
    if (result.indexChanges) {
      for (const [k, v] of Object.entries(result.indexChanges)) {
        changes[k] = (changes[k] || 0) + v;
      }
    }

    // Add zone boosts from cell placements
    if (result.zoneBoosts) {
      for (const [k, v] of Object.entries(result.zoneBoosts)) {
        changes[k] = (changes[k] || 0) + v;
      }
    }

    // Subtract maintenance costs (except on last turn)
    const currentTurn = game.currentTurn();
    if (currentTurn < MAX_TURNS) {
      for (const [k, cost] of Object.entries(MAINTENANCE_COST)) {
        changes[k] = (changes[k] || 0) - cost;
      }
    }

    return changes;
  });

  return {
    dangerIndices: () => dangerIndices(),
    isInDanger: (index: IndexName) => game.nationalIndices()[index] <= DANGER_THRESHOLD,
    indexChanges: () => indexChanges(),
    hasDanger: () => dangerIndices().length > 0
  };
}

// ============================================================================
// Leaderboard & Rankings
// ============================================================================

export interface RankedTeam {
  id: RegionId;
  name: string;
  points: number;
  pointsChange: number;
  rank: number;
  submitted: boolean;
  connected: boolean;
  isAI?: boolean;
  ownerId: string | null;
  placements: Placements;
  cumulativeAllocations?: Placements;
}

export interface LeaderboardData {
  /** Sorted teams with rankings */
  leaderboard: () => RankedTeam[];
  /** Set of team IDs that are underdogs (bottom 40% from turn 3+) */
  underdogTeams: () => Set<RegionId>;
  /** Check if a specific team is an underdog */
  isUnderdog: (teamId: RegionId) => boolean;
}

/**
 * Hook for leaderboard and underdog calculations
 * Used in RightSidebar, TeamPanel, and game over screens
 */
export function useLeaderboard(): LeaderboardData {
  const game = useGame();

  const leaderboard = createMemo(() => {
    const result = game.lastTurnResult();
    const sorted = Object.values(game.teams())
      // Include teams that are either: connected humans OR AI
      .filter((t) => (t.ownerId !== null && t.connected) || t.isAI)
      .map((t) => {
        const pointsChange = result?.teamPoints[t.id] || 0;
        return { ...t, pointsChange };
      })
      .sort((a, b) => b.points - a.points);

    return sorted.map((t, i) => ({ ...t, rank: i + 1 }));
  });

  const underdogTeams = createMemo(() => {
    const turn = game.currentTurn();
    if (turn < UNDERDOG_START_TURN_TIER1) return new Set<RegionId>();
    const teams = leaderboard();
    const underdogCount = Math.floor(teams.length * UNDERDOG_THRESHOLD);
    return new Set(teams.slice(-underdogCount).map((t) => t.id as RegionId));
  });

  return {
    leaderboard: () => leaderboard(),
    underdogTeams: () => underdogTeams(),
    isUnderdog: (teamId: RegionId) => underdogTeams().has(teamId)
  };
}

// ============================================================================
// Allocation Analysis
// ============================================================================

export interface AllocationByType {
  type: CellType;
  rp: number;
  percentage: number;
}

/**
 * Calculate allocation distribution by cell type from placements
 */
export function getAllocationsByType(placements: Placements): AllocationByType[] {
  const byType: Record<CellType, number> = {
    project: 0,
    synergy: 0,
    competitive: 0,
    cooperation: 0,
    independent: 0
  };

  for (const cell of BOARD_CELLS) {
    const rp = placements[cell.id] || 0;
    if (rp > 0) {
      byType[cell.type] += rp;
    }
  }

  const total = Object.values(byType).reduce((s, v) => s + v, 0);

  // Fixed order: project first, competitive last (to separate similar red colors)
  const typeOrder: CellType[] = ['project', 'synergy', 'cooperation', 'independent', 'competitive'];

  return typeOrder
    .filter((type) => byType[type] > 0)
    .map((type) => ({
      type,
      rp: byType[type],
      percentage: total > 0 ? (byType[type] / total) * 100 : 0
    }));
}

/**
 * Merge two placement objects (for cumulative calculations)
 */
export function mergePlacements(a: Placements, b: Placements): Placements {
  const result = { ...a };
  for (const [cellId, rp] of Object.entries(b)) {
    result[cellId] = (result[cellId] || 0) + rp;
  }
  return result;
}

/**
 * Calculate total RP from placements
 */
export function getTotalRP(placements: Placements): number {
  return Object.values(placements).reduce((sum, v) => sum + v, 0);
}
