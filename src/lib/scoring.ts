import {
  CELL_MULTIPLIERS,
  SYNERGY_SCALING,
  SYNERGY_BASE,
  SYNERGY_FREE_PARTICIPANTS,
  COMPETITIVE_LOSER_MULTIPLIER,
  INDEX_BOOST_DIVISOR,
  REGION_SPECIALIZATION_MULTIPLIER,
  UNDERDOG_RP_TIER1,
  UNDERDOG_RP_TIER2,
  UNDERDOG_MULTIPLIER_TIER2,
  UNDERDOG_START_TURN_TIER1,
  UNDERDOG_START_TURN_TIER2,
  UNDERDOG_THRESHOLD,
  SOLO_PENALTY_COMPETITIVE,
  SOLO_PENALTY_SYNERGY,
  SOLO_PENALTY_COOPERATION
} from '~/config/game';
import { BOARD_CELLS, PROJECT_CELLS } from '~/config/board';
import { TURN_EVENTS, getScaledRequirements, type ModifierEffect } from '~/config/events';
import type { Placements, NationalIndices, TurnResult } from './types';
import type { RegionId } from '~/config/regions';
import { REGION_MAP } from '~/config/regions';

/**
 * Determine which teams are "underdogs" based on current rankings.
 * Underdogs are the bottom UNDERDOG_THRESHOLD% of teams.
 * Returns tier level: 0 = not underdog, 1 = tier 1 (turn 3+), 2 = tier 2 (turn 6+)
 */
export function getUnderdogTeams(teamPoints: Record<RegionId, number>, turn: number): Map<RegionId, number> {
  const underdogs = new Map<RegionId, number>();

  if (turn < UNDERDOG_START_TURN_TIER1) return underdogs;

  const sorted = Object.entries(teamPoints).sort(([, a], [, b]) => a - b);
  const underdogCount = Math.floor(sorted.length * UNDERDOG_THRESHOLD);
  const tier = turn >= UNDERDOG_START_TURN_TIER2 ? 2 : 1;

  for (let i = 0; i < underdogCount; i++) {
    underdogs.set(sorted[i][0] as RegionId, tier);
  }

  return underdogs;
}

/**
 * Calculate scores for a single cell, applying modifier effects if provided.
 * @param modifierEffect - Combined effect from fixed + random modifiers
 */
export function calculateCellScores(
  cellId: string,
  allPlacements: Partial<Record<RegionId, Placements>>,
  modifierEffect?: ModifierEffect
): Partial<Record<RegionId, number>> {
  const cell = BOARD_CELLS.find((c) => c.id === cellId);
  if (!cell) return {} as Partial<Record<RegionId, number>>;

  // Base multiplier from cell type
  let multiplier = CELL_MULTIPLIERS[cell.type];

  // Apply modifier effects
  if (modifierEffect) {
    // Global multiplier affects all cells
    if (modifierEffect.globalMultiplier) {
      multiplier *= modifierEffect.globalMultiplier;
    }
    // Cell-specific multiplier
    if (modifierEffect.cellMultipliers?.[cell.type]) {
      multiplier *= modifierEffect.cellMultipliers[cell.type]!;
    }
  }

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
      // Solo penalty: reduced reward when only 1 team invests
      const effectiveMultiplier = numParticipants === 1 ? multiplier * SOLO_PENALTY_COMPETITIVE : multiplier;
      // Winner takes all (split if tie), losers get consolation points
      const maxRes = Math.max(...entries.map(([, r]) => r));
      const winners = entries.filter(([, r]) => r === maxRes);
      for (const [teamId, res] of entries) {
        if (res === maxRes) {
          const baseScore = (res * effectiveMultiplier) / winners.length;
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
      // Solo penalty: reduced reward when only 1 team invests
      const effectiveMultiplier = numParticipants === 1 ? multiplier * SOLO_PENALTY_SYNERGY : multiplier;
      // More participants = bonus
      const synergyBonus = SYNERGY_BASE + (numParticipants - SYNERGY_FREE_PARTICIPANTS) * SYNERGY_SCALING;
      for (const [teamId, res] of entries) {
        const baseScore = res * synergyBonus * effectiveMultiplier;
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
      // Requires 2+ teams (or minCoopTeams from modifier)
      const minTeams = modifierEffect?.minCoopTeams ?? 2;
      if (numParticipants >= minTeams) {
        for (const [teamId, res] of entries) {
          const baseScore = res * multiplier;
          scores[teamId] = applySpecialization(teamId, baseScore);
        }
      } else {
        // Solo penalty: heavily reduced reward instead of 0
        for (const [teamId, res] of entries) {
          const baseScore = res * multiplier * SOLO_PENALTY_COOPERATION;
          scores[teamId] = applySpecialization(teamId, baseScore);
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
  activeTeams: number = 6,
  modifierEffect?: ModifierEffect
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

  // Apply projectRpMultiplier for success check (e.g., 1.5x makes RP count more toward threshold)
  const effectiveRP = modifierEffect?.projectRpMultiplier ? totalRP * modifierEffect.projectRpMultiplier : totalRP;
  const success = effectiveRP >= minTotal && participatingTeams.length >= minTeams;

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
  activeTeams: number = 6,
  cumulativePoints?: Record<RegionId, number>,
  modifierEffect?: ModifierEffect
): TurnResult {
  // 1. Process project with correct team count
  const { success, totalRP, participatingTeams } = processProject(turn, allPlacements, activeTeams, modifierEffect);

  // 2. Apply project result
  const { changes } = applyProjectResult(turn, success, currentIndices);

  // 3. Calculate underdog teams based on cumulative points (returns tier level)
  const underdogs = cumulativePoints ? getUnderdogTeams(cumulativePoints, turn) : new Map<RegionId, number>();

  // 4. Calculate cell scores (with modifier effects)
  const teamPoints: Record<string, number> = {};
  for (const teamId of Object.keys(allPlacements)) {
    teamPoints[teamId] = 0;
  }

  for (const cell of BOARD_CELLS) {
    if (cell.type !== 'project') {
      const cellScores = calculateCellScores(cell.id, allPlacements, modifierEffect);
      for (const [teamId, score] of Object.entries(cellScores)) {
        // Apply underdog multiplier if tier 2 (turn 6+)
        const tier = underdogs.get(teamId as RegionId) || 0;
        const finalScore = tier === 2 ? score * UNDERDOG_MULTIPLIER_TIER2 : score;
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

  // 6. Apply rpBonus from modifiers (e.g., foreign_aid +2, resource_scarcity -2)
  // This represents economic conditions affecting all teams' scoring potential
  if (modifierEffect?.rpBonus) {
    for (const teamId of Object.keys(allPlacements)) {
      teamPoints[teamId] = (teamPoints[teamId] || 0) + modifierEffect.rpBonus;
    }
  }

  // 7. Apply underdog RP bonus (tier 1: +1 RP from turn 3, tier 2: +2 RP from turn 6)
  for (const [teamId, tier] of underdogs.entries()) {
    const bonusRP = tier === 2 ? UNDERDOG_RP_TIER2 : UNDERDOG_RP_TIER1;
    teamPoints[teamId] = (teamPoints[teamId] || 0) + bonusRP;
  }

  return {
    success,
    totalRP,
    teamCount: participatingTeams.length,
    indexChanges: changes,
    zoneBoosts: {}, // Zone boosts are calculated and added separately by engine.ts
    teamPoints: teamPoints as Record<RegionId, number>,
    underdogs: Array.from(underdogs.keys())
  };
}

export function updateIndicesFromCells(
  allPlacements: Record<RegionId, Placements>,
  currentIndices: NationalIndices,
  modifierEffect?: ModifierEffect
): { newIndices: NationalIndices; boosts: Partial<NationalIndices> } {
  const boosts: Partial<NationalIndices> = {};
  const newIndices = { ...currentIndices };

  // Apply indexDivisorAdjust from modifiers (e.g., easy_indices makes it easier to gain index points)
  const effectiveDivisor = INDEX_BOOST_DIVISOR + (modifierEffect?.indexDivisorAdjust ?? 0);

  // Sum up resources per index from all cells
  const indexBoost: Record<string, number> = {};

  for (const [, placements] of Object.entries(allPlacements)) {
    for (const [cellId, resources] of Object.entries(placements)) {
      if (resources <= 0) continue;

      const cell = BOARD_CELLS.find((c) => c.id === cellId);
      if (!cell || cell.type === 'project') continue;

      // Each cell boosts its associated indices
      for (const index of cell.indices) {
        indexBoost[index] = (indexBoost[index] || 0) + Math.floor(resources / effectiveDivisor);
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
