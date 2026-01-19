/**
 * HostBoard Component
 * Reuses PlayBoard layout and BoardCell/ProjectCell styling
 * Shows all team allocations in view-only mode
 */
import { For, createMemo } from 'solid-js';
import { BOARD_CELLS, PROJECT_CELLS, type BoardCell as BoardCellType } from '~/config/board';
import { useGame } from '~/lib/game/context';
import BoardCell from '~/components/game/play/BoardCell';
import ProjectCell from '~/components/game/play/ProjectCell';

interface HostBoardProps {
  animations: {
    phaseTimer: () => number;
    revealedTiles: () => string[];
    showingResults: () => boolean;
  };
}

export default function HostBoard(props: HostBoardProps) {
  const game = useGame();

  // Separate project cells from regular cells
  const regularCells = createMemo(() => BOARD_CELLS.filter((c) => c.type !== 'project'));
  const projectCell = createMemo(() => PROJECT_CELLS[0]);

  // Create a 4x4 grid map for positioning (same as PlayBoard)
  const gridMap = createMemo(() => {
    const map: (BoardCellType | null)[][] = [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null]
    ];
    for (const cell of regularCells()) {
      map[cell.row][cell.col] = cell;
    }
    return map;
  });

  // For host, always show allocations (pretend all tiles are revealed)
  const revealedTiles = createMemo(() => {
    // Show all allocations in action phase for host
    if (game.currentPhase() === 'action') {
      return BOARD_CELLS.map((c) => c.id);
    }
    // Otherwise use animation state
    return props.animations.revealedTiles();
  });

  // For host, we show permanent view - not interactive
  const isActionPhase = () => false; // Never interactive for host

  return (
    <div class="h-full p-3 relative">
      {/* 4x4 Grid - same structure as PlayBoard */}
      <div class="grid grid-cols-4 grid-rows-4 gap-2 h-full">
        {/* Row 0 */}
        <For each={gridMap()[0]}>
          {(cell) =>
            cell && (
              <BoardCell
                cell={cell}
                currentPhase={game.currentPhase()}
                isActionPhase={isActionPhase()}
                isRevealed={revealedTiles().includes(cell.id)}
                draftPlacement={0}
                teams={game.teams()}
                onClick={() => {}}
                hostMode={true}
              />
            )
          }
        </For>

        {/* Row 1: first cell, then project spans 2x2, then last cell */}
        {gridMap()[1][0] && (
          <BoardCell
            cell={gridMap()[1][0]!}
            currentPhase={game.currentPhase()}
            isActionPhase={isActionPhase()}
            isRevealed={revealedTiles().includes(gridMap()[1][0]!.id)}
            draftPlacement={0}
            teams={game.teams()}
            onClick={() => {}}
            hostMode={true}
          />
        )}

        {/* Project Cell - spans 2 columns and 2 rows */}
        <ProjectCell onClick={() => {}} draftRP={0} />

        {gridMap()[1][3] && (
          <BoardCell
            cell={gridMap()[1][3]!}
            currentPhase={game.currentPhase()}
            isActionPhase={isActionPhase()}
            isRevealed={revealedTiles().includes(gridMap()[1][3]!.id)}
            draftPlacement={0}
            teams={game.teams()}
            onClick={() => {}}
            hostMode={true}
          />
        )}

        {/* Row 2: first cell, project continues, then last cell */}
        {gridMap()[2][0] && (
          <BoardCell
            cell={gridMap()[2][0]!}
            currentPhase={game.currentPhase()}
            isActionPhase={isActionPhase()}
            isRevealed={revealedTiles().includes(gridMap()[2][0]!.id)}
            draftPlacement={0}
            teams={game.teams()}
            onClick={() => {}}
            hostMode={true}
          />
        )}
        {/* Project continues here (already placed above with row-span-2) */}
        {gridMap()[2][3] && (
          <BoardCell
            cell={gridMap()[2][3]!}
            currentPhase={game.currentPhase()}
            isActionPhase={isActionPhase()}
            isRevealed={revealedTiles().includes(gridMap()[2][3]!.id)}
            draftPlacement={0}
            teams={game.teams()}
            onClick={() => {}}
            hostMode={true}
          />
        )}

        {/* Row 3 */}
        <For each={gridMap()[3]}>
          {(cell) =>
            cell && (
              <BoardCell
                cell={cell}
                currentPhase={game.currentPhase()}
                isActionPhase={isActionPhase()}
                isRevealed={revealedTiles().includes(cell.id)}
                draftPlacement={0}
                teams={game.teams()}
                onClick={() => {}}
                hostMode={true}
              />
            )
          }
        </For>
      </div>
    </div>
  );
}
