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
  MAINTENANCE_COST,
  SYNERGY_SCALING,
  SYNERGY_BASE,
  SYNERGY_FREE_PARTICIPANTS,
  COMPETITIVE_LOSER_MULTIPLIER,
  REGION_SPECIALIZATION_MULTIPLIER,
  INDEX_BOOST_DIVISOR
} from '~/config/game';
import type { TurnHistoryEntry } from '~/lib/firebase/types';

interface ExportedGameHistory {
  exportedAt: string;
  gameMode: 'online' | 'offline';
  // Game balance config (for meta analysis)
  gameConfig: {
    cellMultipliers: Record<string, number>;
    resourcesPerTurn: number;
    maxTurns: number;
    maintenanceCost: Record<string, number>;
    initialIndices: Record<string, number>;
    regionSpecializationMultiplier: number;
    indexBoostDivisor: number;
    // Human-readable scoring formulas
    scoringRules: Record<string, string>;
  };
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

    // Debug log
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

    // Build ranking from teams
    const ranking = Object.entries(teams)
      .filter(([_, t]) => t.ownerId !== null || t.isAI)
      .sort((a, b) => b[1].points - a[1].points)
      .map(([id, t]) => ({ regionId: id, points: t.points }));

    // Enhance turn history with real-time requirements
    const enhancedTurnHistory = (state.turnHistory || []).map((turn) => {
      // In a real scenario, we'd calculate this based on event + team count at that turn
      // For now we just pass through what's in the state history
      return turn;
    });

    return {
      exportedAt: new Date().toISOString(),
      gameMode: facade.isOnline() ? 'online' : 'offline',
      gameConfig: {
        cellMultipliers: CELL_MULTIPLIERS as Record<string, number>,
        resourcesPerTurn: RESOURCES_PER_TURN,
        maxTurns: MAX_TURNS,
        maintenanceCost: MAINTENANCE_COST,
        initialIndices: INITIAL_INDICES as Record<string, number>,
        regionSpecializationMultiplier: REGION_SPECIALIZATION_MULTIPLIER,
        indexBoostDivisor: INDEX_BOOST_DIVISOR,
        scoringRules: {
          competitive: `Winner: max(RP) x ${CELL_MULTIPLIERS.competitive}. Losers: RP x ${COMPETITIVE_LOSER_MULTIPLIER}. Ties split.`,
          synergy: `All get: RP x ${CELL_MULTIPLIERS.synergy} x (${SYNERGY_BASE} + ${SYNERGY_SCALING} x (participants - ${SYNERGY_FREE_PARTICIPANTS}))`,
          independent: `Each team: RP x ${CELL_MULTIPLIERS.independent}`,
          cooperation: `If 2+ teams: RP x ${CELL_MULTIPLIERS.cooperation}. Solo = 0 points.`,
          project: `RP x ${CELL_MULTIPLIERS.project} (base points) + bonus from project success`,
          regionSpecialization: `If team invests in a cell matching their region's specialization, they get a x${REGION_SPECIALIZATION_MULTIPLIER} bonus.`,
          indexBoosts: `Every ${INDEX_BOOST_DIVISOR} RP invested in a cell gives +1 to its associated national indices.`
        }
      },
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
      turnHistory: enhancedTurnHistory
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
