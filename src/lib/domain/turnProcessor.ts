/**
 * Turn Processor
 *
 * Pure domain functions for turn processing logic.
 * No framework dependencies (no solid-js, no firebase).
 * Both OfflineMode and OnlineMode use these functions.
 */

import type {
  TurnProcessingInput,
  TurnProcessingResult,
  GameOverCheck,
  PreparedTurnEvent,
  NationalIndices,
  TurnHistoryEntry
} from './types';
import type { RegionId } from '~/config/regions';
import { MAINTENANCE_COST, MAX_TURNS, INDEX_NAMES } from '~/config/game';
import { TURN_EVENTS, getScaledRequirements, getTurnModifierEffect } from '~/config/events';
import { calculateTurnScores, applyProjectResult, updateIndicesFromCells } from '~/lib/scoring';

// ============================================================================
// TURN PROCESSING
// ============================================================================

/**
 * Process a complete turn: calculate scores, apply project results,
 * update indices, apply maintenance costs, and generate history.
 *
 * This is the unified logic previously duplicated in:
 * - OfflineMode.processResults()
 * - OnlineMode.processResolution()
 */
export function processTurn(input: TurnProcessingInput): TurnProcessingResult {
  const {
    turn,
    placements,
    currentIndices,
    activeTeamCount,
    cumulativePoints,
    randomModifiers,
    currentEvent,
    teams,
    isLastTurn = turn >= MAX_TURNS
  } = input;

  // Compute combined modifier effect for this turn
  const modifierEffect = getTurnModifierEffect(turn, randomModifiers);

  // Calculate turn scores (includes project check, cell scores, underdog bonus)
  const result = calculateTurnScores(
    turn,
    placements,
    currentIndices,
    activeTeamCount,
    cumulativePoints,
    modifierEffect
  );

  // Apply project result to indices
  const { newIndices: indicesAfterProject, changes: indexChanges } = applyProjectResult(
    turn,
    result.success,
    currentIndices
  );

  // Apply cell boosts
  const { newIndices: indicesAfterCells, boosts } = updateIndicesFromCells(
    placements,
    indicesAfterProject,
    modifierEffect
  );

  // Apply maintenance costs (skip on last turn since game ends)
  const finalIndices = { ...indicesAfterCells };
  if (!isLastTurn) {
    for (const [key, cost] of Object.entries(MAINTENANCE_COST)) {
      finalIndices[key as keyof NationalIndices] -= cost;
    }
  }

  // Build turn result with zone boosts included
  const turnResult = {
    ...result,
    indexChanges, // Only project changes
    zoneBoosts: boosts
  };

  // Build project state for UI
  const projectState = {
    totalRP: result.totalRP,
    teamCount: result.teamCount,
    success: result.success
  };

  // Build history entry for export
  const currentRandomMod = randomModifiers?.[turn - 1];
  const historyEntry: TurnHistoryEntry = {
    turn,
    activeTeams: Object.keys(placements) as RegionId[],
    teamFormationSummary: Object.entries(teams)
      .filter(([id]) => placements[id as RegionId])
      .map(([, t]) => `${t.name}${t.isAI ? ' (AI)' : ''}`)
      .join(', '),
    event: {
      name: currentEvent?.name || '',
      year: currentEvent?.year || 0,
      project: currentEvent?.project || ''
    },
    fixedModifier: currentEvent?.fixedModifier,
    randomModifier: currentRandomMod,
    allocations: placements as Record<string, Record<string, number>>,
    indicesSnapshot: { ...finalIndices } as Record<string, number>,
    projectSuccess: result.success,
    projectRequirements: {
      minRP: currentEvent?.minTotal || 0,
      minTeams: currentEvent?.minTeams || 0
    },
    teamPoints: result.teamPoints as Record<string, number>
  };

  return {
    finalIndices,
    turnResult,
    projectState,
    historyEntry
  };
}

// ============================================================================
// GAME OVER CHECK
// ============================================================================

/**
 * Check if any national index has reached zero or below.
 *
 * Used after turn processing to determine if the game ends early
 * due to national collapse.
 */
export function checkGameOver(indices: NationalIndices): GameOverCheck {
  for (const indexName of INDEX_NAMES) {
    if (indices[indexName] <= 0) {
      return { gameOver: true, zeroIndex: indexName };
    }
  }
  return { gameOver: false };
}

/**
 * Check if the game is complete (max turns reached).
 */
export function isGameComplete(turn: number): boolean {
  return turn >= MAX_TURNS;
}

// ============================================================================
// TURN PREPARATION
// ============================================================================

/**
 * Get the event for a turn with requirements scaled for active team count.
 *
 * Returns null if the turn is invalid (outside 1-8).
 */
export function prepareNextTurn(turn: number, activeTeamCount: number): PreparedTurnEvent | null {
  const event = TURN_EVENTS[turn - 1];
  if (!event) return null;

  const { minTotal, minTeams } = getScaledRequirements(event, activeTeamCount);

  return { ...event, minTotal, minTeams };
}

/**
 * Generate final ranking from team data.
 * Used when game ends (either by completion or index collapse).
 */
export function generateFinalRanking(
  teams: Record<RegionId, { points: number; ownerId: string | null; connected?: boolean; isAI?: boolean }>,
  additionalPoints?: Record<RegionId, number>
): Array<{ regionId: RegionId; points: number }> {
  return Object.entries(teams)
    .filter(([, t]) => (t.ownerId && t.connected !== false) || t.isAI)
    .sort((a, b) => {
      const aPoints = a[1].points + (additionalPoints?.[a[0] as RegionId] || 0);
      const bPoints = b[1].points + (additionalPoints?.[b[0] as RegionId] || 0);
      return bPoints - aPoints;
    })
    .map(([regionId, t]) => ({
      regionId: regionId as RegionId,
      points: Math.round((t.points + (additionalPoints?.[regionId as RegionId] || 0)) * 100) / 100
    }));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Fisher-Yates shuffle for randomizing modifier order.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Calculate updated team points after applying turn result.
 * Rounds to 2 decimal places.
 */
export function calculateNewTeamPoints(currentPoints: number, earnedPoints: number): number {
  return Math.round((currentPoints + earnedPoints) * 100) / 100;
}
