/**
 * Game History Export Functions
 * Allows host to export game data as JSON for analysis
 */

import { getGameFacade } from '~/lib/core/GameFacade';
import {
  CELL_MULTIPLIERS,
  RESOURCES_PER_TURN,
  INITIAL_INDICES,
  MAX_TURNS,
  MIN_TEAMS,
  MAX_TEAMS,
  MAINTENANCE_COST,
  SYNERGY_SCALING,
  SYNERGY_BASE,
  SYNERGY_FREE_PARTICIPANTS,
  COMPETITIVE_LOSER_MULTIPLIER,
  REGION_SPECIALIZATION_MULTIPLIER,
  INDEX_BOOST_DIVISOR,
  UNDERDOG_RP_TIER1,
  UNDERDOG_RP_TIER2,
  UNDERDOG_MULTIPLIER_TIER2,
  UNDERDOG_START_TURN_TIER1,
  UNDERDOG_START_TURN_TIER2,
  UNDERDOG_THRESHOLD
} from '~/config/game';
import { TURN_EVENTS, FIXED_MODIFIERS, RANDOM_MODIFIERS } from '~/config/events';
import { BOARD_CELLS } from '~/config/board';
import { REGIONS } from '~/config/regions';
import type { TurnHistoryEntry } from '~/lib/firebase/types';

// ============================================================================
// Export Type Definitions
// ============================================================================

interface ExportedGameHistory {
  exportedAt: string;
  gameMode: 'online' | 'offline';

  // Game rules - all formulas and constants needed to replicate the game
  gameRules: {
    // Core game parameters
    parameters: {
      maxTurns: number;
      minTeams: number;
      maxTeams: number;
      resourcesPerTurn: number;
      initialIndexValue: number;
      maintenanceCostPerTurn: number;
    };

    // Cell scoring formulas (English, with constants)
    cellScoring: {
      multipliers: Record<string, number>;
      formulas: Record<string, string>;
      synergyConstants: {
        base: number;
        scaling: number;
        freeParticipants: number;
      };
      competitiveLoserMultiplier: number;
    };

    // Index mechanics
    indexMechanics: {
      boostDivisor: number;
      formula: string;
    };

    // Region specialization
    regionSpecialization: {
      multiplier: number;
      formula: string;
      regions: Array<{ id: string; specializedIndices: string[] }>;
    };

    // Underdog catch-up mechanics (tiered)
    underdogMechanics: {
      tier1: {
        startTurn: number;
        bonusRP: number;
      };
      tier2: {
        startTurn: number;
        bonusRP: number;
        scoreMultiplier: number;
      };
      threshold: number;
      formula: string;
    };

    // Modifier system rules
    modifierSystem: {
      description: string;
      effectMerging: Record<string, string>;
      fixedModifiers: Array<{
        id: string;
        turn: number;
        effect: Record<string, unknown>;
      }>;
      randomModifiers: Array<{
        id: string;
        effect: Record<string, unknown>;
      }>;
    };

    // Project requirements per turn (base values, scaled by team count)
    projectRequirements: {
      scalingFormula: string;
      minTeamsFormula: string;
      events: Array<{
        turn: number;
        minTotal: number;
        minTeams: number;
        successReward: { points: number; indices: Record<string, number> };
        failurePenalty: Record<string, number>;
        fixedModifier: string;
      }>;
    };

    // Board layout
    board: {
      size: { rows: number; cols: number };
      cells: Array<{
        id: string;
        row: number;
        col: number;
        type: string;
        indices: string[];
      }>;
    };
  };

  // Game session data
  meta: {
    totalTurns: number;
    status: string;
    gameOver: {
      reason: string;
      zeroIndex?: string;
    } | null;
  };

  teams: Record<
    string,
    {
      name: string;
      isAI: boolean;
      totalPoints: number;
    }
  >;

  finalRanking: Array<{ regionId: string; points: number }>;
  finalIndices: Record<string, number>;
  turnHistory: TurnHistoryEntry[];
}

// ============================================================================
// Builder Functions
// ============================================================================

function buildGameRules(): ExportedGameHistory['gameRules'] {
  return {
    parameters: {
      maxTurns: MAX_TURNS,
      minTeams: MIN_TEAMS,
      maxTeams: MAX_TEAMS,
      resourcesPerTurn: RESOURCES_PER_TURN,
      initialIndexValue: INITIAL_INDICES.economy, // All start the same
      maintenanceCostPerTurn: MAINTENANCE_COST.economy // All same
    },

    cellScoring: {
      multipliers: CELL_MULTIPLIERS as Record<string, number>,
      formulas: {
        competitive: `Winner: max(RP) x ${CELL_MULTIPLIERS.competitive}. Losers: RP x ${COMPETITIVE_LOSER_MULTIPLIER}. Ties split winner pool.`,
        synergy: `All: RP x ${CELL_MULTIPLIERS.synergy} x (${SYNERGY_BASE} + (participants - ${SYNERGY_FREE_PARTICIPANTS}) x ${SYNERGY_SCALING})`,
        independent: `Each: RP x ${CELL_MULTIPLIERS.independent}`,
        cooperation: `If participants >= 2: RP x ${CELL_MULTIPLIERS.cooperation}. Else: 0`,
        project: `RP x ${CELL_MULTIPLIERS.project} (base) + proportional share of success bonus`
      },
      synergyConstants: {
        base: SYNERGY_BASE,
        scaling: SYNERGY_SCALING,
        freeParticipants: SYNERGY_FREE_PARTICIPANTS
      },
      competitiveLoserMultiplier: COMPETITIVE_LOSER_MULTIPLIER
    },

    indexMechanics: {
      boostDivisor: INDEX_BOOST_DIVISOR,
      formula: `floor(totalRPOnCell / ${INDEX_BOOST_DIVISOR}) → +1 to associated indices`
    },

    regionSpecialization: {
      multiplier: REGION_SPECIALIZATION_MULTIPLIER,
      formula: `If cell.indices ∩ region.specializedIndices ≠ ∅: score x ${REGION_SPECIALIZATION_MULTIPLIER}`,
      regions: REGIONS.map((r) => ({
        id: r.id,
        specializedIndices: r.specializedIndices
      }))
    },

    underdogMechanics: {
      tier1: {
        startTurn: UNDERDOG_START_TURN_TIER1,
        bonusRP: UNDERDOG_RP_TIER1
      },
      tier2: {
        startTurn: UNDERDOG_START_TURN_TIER2,
        bonusRP: UNDERDOG_RP_TIER2,
        scoreMultiplier: UNDERDOG_MULTIPLIER_TIER2
      },
      threshold: UNDERDOG_THRESHOLD,
      formula: `Turn ${UNDERDOG_START_TURN_TIER1}+: bottom ${UNDERDOG_THRESHOLD * 100}% get +${UNDERDOG_RP_TIER1} RP. Turn ${UNDERDOG_START_TURN_TIER2}+: +${UNDERDOG_RP_TIER2} RP and score x ${UNDERDOG_MULTIPLIER_TIER2}`
    },

    modifierSystem: {
      description: 'Each turn has 1 fixed modifier (historical) + 1 random modifier (shuffled at game start)',
      effectMerging: {
        globalMultiplier: 'Multiply together',
        cellMultipliers: 'Multiply per cell type',
        rpBonus: 'Add together',
        minCoopTeams: 'Take maximum',
        projectRpMultiplier: 'Multiply together',
        indexDivisorAdjust: 'Add together (negative = easier index gains)'
      },
      fixedModifiers: Object.values(FIXED_MODIFIERS).map((m) => ({
        id: m.id,
        turn: TURN_EVENTS.findIndex((e) => e.fixedModifier === m.id) + 1,
        effect: m.effect as Record<string, unknown>
      })),
      randomModifiers: Object.values(RANDOM_MODIFIERS).map((m) => ({
        id: m.id,
        effect: m.effect as Record<string, unknown>
      }))
    },

    projectRequirements: {
      scalingFormula: 'scaledMinTotal = ceil(baseMinTotal x (activeTeams / 6))',
      minTeamsFormula: 'scaledMinTeams = max(1, baseMinTeams - (6 - activeTeams))',
      events: TURN_EVENTS.map((e) => ({
        turn: e.turn,
        minTotal: e.minTotal,
        minTeams: e.minTeams,
        successReward: {
          points: e.successReward.points,
          indices: e.successReward.indices as Record<string, number>
        },
        failurePenalty: e.failurePenalty as Record<string, number>,
        fixedModifier: e.fixedModifier
      }))
    },

    board: {
      size: { rows: 4, cols: 4 },
      cells: BOARD_CELLS.map((c) => ({
        id: c.id,
        row: c.row,
        col: c.col,
        type: c.type,
        indices: c.indices
      }))
    }
  };
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export the current game history as a structured object
 * Works for both online and offline modes
 */
export function exportGameHistory(): ExportedGameHistory | null {
  const facade = getGameFacade();

  try {
    const state = facade.getState();
    if (!state) {
      console.warn('Export failed: getState() returned null');
      return null;
    }

    console.log('Exporting game:', { mode: facade.getModeType(), turn: state.currentTurn, status: state.status });

    const teams = facade.getAllTeams();
    const teamsMap: ExportedGameHistory['teams'] = {};

    for (const [regionId, team] of Object.entries(teams)) {
      teamsMap[regionId] = {
        name: team.name,
        isAI: team.isAI || false,
        totalPoints: team.points
      };
    }

    const ranking = Object.entries(teams)
      .filter(([_, t]) => t.ownerId !== null || t.isAI)
      .sort((a, b) => b[1].points - a[1].points)
      .map(([id, t]) => ({ regionId: id, points: t.points }));

    return {
      exportedAt: new Date().toISOString(),
      gameMode: facade.isOnline() ? 'online' : 'offline',
      gameRules: buildGameRules(),
      meta: {
        totalTurns: state.currentTurn,
        status: state.status,
        gameOver: state.gameOver
          ? {
              reason: state.gameOver.reason,
              zeroIndex: state.gameOver.zeroIndex
            }
          : null
      },
      teams: teamsMap,
      finalRanking: state.gameOver?.finalRanking || ranking,
      finalIndices: state.nationalIndices || {},
      turnHistory: state.turnHistory || []
    };
  } catch {
    console.warn('Failed to export game history');
    return null;
  }
}

/**
 * Download game history as a JSON file
 * Returns the filename if successful, null if failed
 */
export function downloadGameHistoryAsJSON(filename?: string): string | null {
  const history = exportGameHistory();
  if (!history) {
    console.warn('No game history to export');
    return null;
  }

  const json = JSON.stringify(history, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const downloadFilename = filename || `kien-quoc-game-${Date.now()}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = downloadFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return downloadFilename;
}
