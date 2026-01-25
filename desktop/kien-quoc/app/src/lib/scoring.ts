import {
  CELL_MULTIPLIERS,
  SYNERGY_SCALING,
  SYNERGY_BASE,
  SYNERGY_FREE_PARTICIPANTS,
  COMPETITIVE_LOSER_MULTIPLIER
} from '~/config/game';
import { BOARD_CELLS, PROJECT_CELLS } from '~/config/board';
import { TURN_EVENTS, getScaledRequirements } from '~/config/events';
import type { Placements, NationalIndices, TurnResult } from './types';
import type { RegionId } from '~/config/regions';

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

  switch (cell.type) {
    case 'competitive': {
      // Winner takes all (split if tie), losers get consolation points
      const maxRes = Math.max(...entries.map(([, r]) => r));
      const winners = entries.filter(([, r]) => r === maxRes);
      for (const [teamId, res] of entries) {
        if (res === maxRes) {
          scores[teamId] = (res * multiplier) / winners.length;
        } else {
          // Losers get consolation points
          scores[teamId] = res * COMPETITIVE_LOSER_MULTIPLIER;
        }
      }
      break;
    }

    case 'synergy': {
      // More participants = bonus
      const synergyBonus = SYNERGY_BASE + (numParticipants - SYNERGY_FREE_PARTICIPANTS) * SYNERGY_SCALING;
      for (const [teamId, res] of entries) {
        scores[teamId] = res * synergyBonus * multiplier;
      }
      break;
    }

    case 'independent': {
      // Simple multiplier
      for (const [teamId, res] of entries) {
        scores[teamId] = res * multiplier;
      }
      break;
    }

    case 'cooperation': {
      // Requires 2+ teams
      if (numParticipants >= 2) {
        for (const [teamId, res] of entries) {
          scores[teamId] = res * multiplier;
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
  activeTeams: number = 5
): TurnResult {
  // 1. Process project with correct team count
  const { success, totalRP, participatingTeams } = processProject(turn, allPlacements, activeTeams);

  // 2. Apply project result
  const { changes } = applyProjectResult(turn, success, currentIndices);

  // 3. Calculate cell scores
  const teamPoints: Record<string, number> = {};
  for (const teamId of Object.keys(allPlacements)) {
    teamPoints[teamId] = 0;
  }

  for (const cell of BOARD_CELLS) {
    if (cell.type !== 'project') {
      const cellScores = calculateCellScores(cell.id, allPlacements);
      for (const [teamId, score] of Object.entries(cellScores)) {
        teamPoints[teamId] = (teamPoints[teamId] || 0) + score;
      }
    }
  }

  // 4. Add bonus points from successful project
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
    teamPoints: teamPoints as Record<RegionId, number>
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
        indexBoost[index] = (indexBoost[index] || 0) + Math.floor(resources / 8);
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
