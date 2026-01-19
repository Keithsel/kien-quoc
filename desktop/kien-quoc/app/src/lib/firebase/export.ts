/**
 * Game History Export Functions
 * Allows host to export game data as JSON for analysis
 */

import { onlineGame } from '~/lib/firebase/store';
import type { TurnHistoryEntry } from '~/lib/firebase/types';
import type { RegionId } from '~/config/regions';

interface ExportedGameHistory {
  exportedAt: string;
  gameId: string;
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
 */
export function exportGameHistory(): ExportedGameHistory | null {
  const game = onlineGame();
  if (!game) return null;

  const teamsMap: ExportedGameHistory['teams'] = {};
  for (const [regionId, team] of Object.entries(game.teams || {})) {
    teamsMap[regionId] = {
      name: team.name,
      isAI: team.isAI,
      totalPoints: team.points
    };
  }

  return {
    exportedAt: new Date().toISOString(),
    gameId: 'online-game',
    meta: {
      totalTurns: game.currentTurn,
      status: game.status,
      gameOver: game.gameOver
        ? {
            reason: game.gameOver.reason,
            zeroIndex: game.gameOver.zeroIndex
          }
        : null
    },
    teams: teamsMap,
    finalRanking: game.gameOver?.finalRanking || [],
    finalIndices: game.nationalIndices || {},
    turnHistory: (game as { turnHistory?: TurnHistoryEntry[] }).turnHistory || []
  };
}

/**
 * Download game history as a JSON file
 */
export function downloadGameHistoryAsJSON(filename?: string): void {
  const history = exportGameHistory();
  if (!history) {
    console.warn('No game history to export');
    return;
  }

  const json = JSON.stringify(history, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `kien-quoc-game-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
