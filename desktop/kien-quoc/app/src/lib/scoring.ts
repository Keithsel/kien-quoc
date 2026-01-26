import {
  CELL_MULTIPLIERS,
  SYNERGY_SCALING,
  SYNERGY_BASE,
  SYNERGY_FREE_PARTICIPANTS,
  COMPETITIVE_LOSER_MULTIPLIER,
  INDEX_BOOST_DIVISOR,
  REGION_SPECIALIZATION_MULTIPLIER,
  UNDERDOG_MULTIPLIER,
  UNDERDOG_START_TURN,
  UNDERDOG_THRESHOLD
} from '~/config/game';
import { BOARD_CELLS, PROJECT_CELLS } from '~/config/board';
import { TURN_EVENTS, getScaledRequirements } from '~/config/events';
import type { Placements, NationalIndices, TurnResult } from './types';
import type { RegionId } from '~/config/regions';
import { REGION_MAP } from '~/config/regions';

/**
 * Determine which teams are "underdogs" based on current rankings.
 * Underdogs are the bottom UNDERDOG_THRESHOLD% of teams.
 */
export function getUnderdogTeams(teamPoints: Record<RegionId, number>, turn: number): Set<RegionId> {
  if (turn < UNDERDOG_START_TURN) return new Set();

  const sorted = Object.entries(teamPoints).sort(([, a], [, b]) => a - b);
  const underdogCount = Math.floor(sorted.length * UNDERDOG_THRESHOLD);

  return new Set(sorted.slice(0, underdogCount).map(([id]) => id as RegionId));
}

export function calculateCellScores(
  cellId: string,
  allPlacements: Partial<Record<RegionId, Placements>>
): Partial<Record<RegionId, number>> {
  const cell = BOARD_CELLS.find((c) => c.id === cellId);
  if (!cell) return {} as Partial<Record<RegionId, number>>;

  const multiplier = CELL_MULTIPLIERS[cell.type];

  // Gather team resources on this cell
  const teamResources: Partial<Record<RegionId, number>> = {};
  for (const [teamId, placements] of Object.entries(allPlacements)) {
    const amount = placements[cellId] || 0;
    if (amount > 0) {
      teamResources[teamId as RegionId] = amount;
    }
  }

  const entries = Object.entries(teamResources) as [RegionId, number][];
  if (entries.length === 0) return {} as Partial<Record<RegionId, number>>;

  const totalResources = entries.reduce((sum, [, r]) => sum + r, 0);
  const numParticipants = entries.length;

  const scores: Record<string, number> = {};

  // Apply specialization bonus to each team's contribution if applicable
  const applySpecialization = (teamId: RegionId, baseScore: number) => {
    const region = REGION_MAP[teamId];
    if (!region) return baseScore;
    const isSpecialized = cell.indices.some((idx) => region.specializedIndices.includes(idx));
    return isSpecialized ? baseScore * REGION_SPECIALIZATION_MULTIPLIER : baseScore;
  };

  switch (cell.type) {
    case 'competitive': {
      // Winner takes all (split if tie), losers get consolation points
      const maxRes = Math.max(...entries.map(([, r]) => r));
      const winners = entries.filter(([, r]) => r === maxRes);
      for (const [teamId, res] of entries) {
        if (res === maxRes) {
          const baseScore = (res * multiplier) / winners.length;
          scores[teamId] = applySpecialization(teamId, baseScore);
        } else {
          // Losers get consolation points
          const baseScore = res * COMPETITIVE_LOSER_MULTIPLIER;
          scores[teamId] = applySpecialization(teamId, baseScore);
        }
      }
      break;
    }

    case 'synergy': {
      // More participants = bonus
      const synergyBonus = SYNERGY_BASE + (numParticipants - SYNERGY_FREE_PARTICIPANTS) * SYNERGY_SCALING;
      for (const [teamId, res] of entries) {
        const baseScore = res * synergyBonus * multiplier;
        scores[teamId] = applySpecialization(teamId, baseScore);
      }
      break;
    }

    case 'independent': {
      // Simple multiplier
      for (const [teamId, res] of entries) {
        const baseScore = res * multiplier;
        scores[teamId] = applySpecialization(teamId, baseScore);
      }
      break;
    }

    case 'cooperation': {
      // Requires 2+ teams
      if (numParticipants >= 2) {
        for (const [teamId, res] of entries) {
          const baseScore = res * multiplier;
          scores[teamId] = applySpecialization(teamId, baseScore);
        }
      } else {
        for (const [teamId] of entries) {
          scores[teamId] = 0;
        }
      }
      break;
    }

    case 'project': {
      // Project cells give base points (x1.0) regardless of project success
      for (const [teamId, res] of entries) {
        scores[teamId] = res * multiplier;
      }
      break;
    }
  }

  return scores as Record<RegionId, number>;
}

export function processProject(
  turn: number,
  allPlacements: Record<RegionId, Placements>,
  activeTeams: number = 5
): {
  success: boolean;
  totalRP: number;
  participatingTeams: RegionId[];
  scaledMinTotal: number;
  scaledMinTeams: number;
} {
  const event = TURN_EVENTS[turn - 1];
  if (!event) throw new Error(`Invalid turn: ${turn}`);

  const { minTotal, minTeams } = getScaledRequirements(event, activeTeams);

  let totalRP = 0;
  const participatingTeams: RegionId[] = [];

  for (const [teamId, placements] of Object.entries(allPlacements)) {
    const teamProjectRP = PROJECT_CELLS.reduce((sum, cell) => sum + (placements[cell.id] || 0), 0);
    if (teamProjectRP > 0) {
      totalRP += teamProjectRP;
      participatingTeams.push(teamId as RegionId);
    }
  }

  const success = totalRP >= minTotal && participatingTeams.length >= minTeams;

  return { success, totalRP, participatingTeams, scaledMinTotal: minTotal, scaledMinTeams: minTeams };
}

export function applyProjectResult(
  turn: number,
  success: boolean,
  currentIndices: NationalIndices
): { newIndices: NationalIndices; changes: Partial<NationalIndices> } {
  const event = TURN_EVENTS[turn - 1];
  const newIndices = { ...currentIndices };
  const changes: Partial<NationalIndices> = {};

  if (success) {
    for (const [key, value] of Object.entries(event.successReward.indices)) {
      const indexKey = key as keyof NationalIndices;
      changes[indexKey] = value;
      newIndices[indexKey] += value;
    }
  } else {
    for (const [key, value] of Object.entries(event.failurePenalty)) {
      const indexKey = key as keyof NationalIndices;
      changes[indexKey] = value;
      newIndices[indexKey] += value;
    }
  }

  return { newIndices, changes };
}

export function calculateTurnScores(
  turn: number,
  allPlacements: Record<RegionId, Placements>,
  currentIndices: NationalIndices,
  activeTeams: number = 5,
  cumulativePoints?: Record<RegionId, number>
): TurnResult {
  // 1. Process project with correct team count
  const { success, totalRP, participatingTeams } = processProject(turn, allPlacements, activeTeams);

  // 2. Apply project result
  const { changes } = applyProjectResult(turn, success, currentIndices);

  // 3. Calculate underdog teams based on cumulative points
  const underdogs = cumulativePoints ? getUnderdogTeams(cumulativePoints, turn) : new Set<RegionId>();

  // 4. Calculate cell scores
  const teamPoints: Record<string, number> = {};
  for (const teamId of Object.keys(allPlacements)) {
    teamPoints[teamId] = 0;
  }

  for (const cell of BOARD_CELLS) {
    if (cell.type !== 'project') {
      const cellScores = calculateCellScores(cell.id, allPlacements);
      for (const [teamId, score] of Object.entries(cellScores)) {
        // Apply underdog multiplier if applicable
        const finalScore = underdogs.has(teamId as RegionId) ? score * UNDERDOG_MULTIPLIER : score;
        teamPoints[teamId] = (teamPoints[teamId] || 0) + finalScore;
      }
    }
  }

  // 5. Add bonus points from successful project
  if (success) {
    const event = TURN_EVENTS[turn - 1];
    const bonusPoints = event.successReward.points;

    // Distribute proportionally to project contributors
    for (const teamId of participatingTeams) {
      const placements = allPlacements[teamId];
      const teamProjectRP = PROJECT_CELLS.reduce((sum, cell) => sum + (placements[cell.id] || 0), 0);
      const share = totalRP > 0 ? teamProjectRP / totalRP : 0;
      teamPoints[teamId] = (teamPoints[teamId] || 0) + Math.floor(bonusPoints * share);
    }
  }

  return {
    success,
    totalRP,
    teamCount: participatingTeams.length,
    indexChanges: changes,
    zoneBoosts: {}, // Zone boosts are calculated and added separately by engine.ts
    teamPoints: teamPoints as Record<RegionId, number>,
    underdogs: Array.from(underdogs)
  };
}

export function updateIndicesFromCells(
  allPlacements: Record<RegionId, Placements>,
  currentIndices: NationalIndices
): { newIndices: NationalIndices; boosts: Partial<NationalIndices> } {
  const boosts: Partial<NationalIndices> = {};
  const newIndices = { ...currentIndices };

  // Sum up resources per index from all cells
  const indexBoost: Record<string, number> = {};

  for (const [, placements] of Object.entries(allPlacements)) {
    for (const [cellId, resources] of Object.entries(placements)) {
      if (resources <= 0) continue;

      const cell = BOARD_CELLS.find((c) => c.id === cellId);
      if (!cell || cell.type === 'project') continue;

      // Each cell boosts its associated indices
      for (const index of cell.indices) {
        indexBoost[index] = (indexBoost[index] || 0) + Math.floor(resources / INDEX_BOOST_DIVISOR);
      }
    }
  }

  // Apply boosts
  for (const [index, boost] of Object.entries(indexBoost)) {
    if (boost > 0) {
      const indexKey = index as keyof NationalIndices;
      boosts[indexKey] = boost;
      newIndices[indexKey] += boost;
    }
  }

  return { newIndices, boosts };
}
