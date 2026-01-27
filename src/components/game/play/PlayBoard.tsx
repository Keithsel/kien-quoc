/**
 * PlayBoard Component
 * 4x4 game board with merged 2x2 project in center, wrapped in styled container
 */
import { For, Show, createMemo } from 'solid-js';
import { Pause } from 'lucide-solid';
import { BOARD_CELLS, PROJECT_CELLS, type BoardCell as BoardCellType } from '~/config/board';
import type { Team, TurnResult, Placements } from '~/lib/types';
import type { RegionId } from '~/config/regions';
import type { TurnEvent, ModifierEffect } from '~/config/events';
import type { IndexName } from '~/config/game';
import BoardCell from './BoardCell';
import ProjectCell from './ProjectCell';

interface PlayBoardProps {
  currentPhase: 'event' | 'action' | 'resolution' | 'result';
  teams: Record<RegionId, Team>;
  event: TurnEvent | null;
  projectRP: number;
  projectTeams: number;
  lastTurnResult: TurnResult | undefined;
  draftPlacements: Placements;
  revealedTiles: string[];
  showingResults: boolean;
  phaseTimer: number;
  isActionPhase: boolean;
  onCellClick: (cell: BoardCellType) => void;
  isPaused?: boolean;
  specializedIndices?: IndexName[]; // Player's regional advantage
  modifierEffect?: ModifierEffect;
}

export default function PlayBoard(props: PlayBoardProps) {
  // Separate project cells from regular cells
  const regularCells = createMemo(() => BOARD_CELLS.filter((c) => c.type !== 'project'));

  // Get first project cell for modal (all project cells contribute to same project)
  const projectCell = createMemo(() => PROJECT_CELLS[0]);

  // Draft placement on project (sum all project cells)
  const projectDraftPlacement = createMemo(() => {
    return PROJECT_CELLS.reduce((sum, cell) => sum + (props.draftPlacements[cell.id] || 0), 0);
  });

  // Create a 4x4 grid map for positioning
  // Project cells occupy row 1-2, col 1-2 (0-indexed)
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

  return (
    <div class="col-span-8 bg-white/95 backdrop-blur-sm rounded-xl shadow-sm p-3 relative">
      {/* Pause overlay - only covers the map */}
      <Show when={props.isPaused}>
        <div class="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-xl">
          <div class="text-xl font-bold text-white animate-pulse flex items-center gap-2">
            <Pause class="w-6 h-6" /> TẠM DỪNG
          </div>
        </div>
      </Show>

      <div class="grid grid-cols-4 grid-rows-4 gap-2 h-full">
        {/* Row 0 */}
        <For each={gridMap()[0]}>
          {(cell) =>
            cell && (
              <BoardCell
                cell={cell}
                currentPhase={props.currentPhase}
                isActionPhase={props.isActionPhase}
                isRevealed={props.revealedTiles.includes(cell.id)}
                draftPlacement={props.draftPlacements[cell.id] || 0}
                teams={props.teams}
                onClick={() => props.onCellClick(cell)}
                specializedIndices={props.specializedIndices}
                modifierEffect={props.modifierEffect}
              />
            )
          }
        </For>

        {/* Row 1: first cell, then project spans 2x2 (skip cols 1,2), then last cell */}
        {gridMap()[1][0] && (
          <BoardCell
            cell={gridMap()[1][0]!}
            currentPhase={props.currentPhase}
            isActionPhase={props.isActionPhase}
            isRevealed={props.revealedTiles.includes(gridMap()[1][0]!.id)}
            draftPlacement={props.draftPlacements[gridMap()[1][0]!.id] || 0}
            teams={props.teams}
            onClick={() => props.onCellClick(gridMap()[1][0]!)}
            specializedIndices={props.specializedIndices}
            modifierEffect={props.modifierEffect}
          />
        )}

        {/* Project Cell - spans 2 columns and 2 rows, uses context directly */}
        <ProjectCell
          onClick={() => projectCell() && props.onCellClick(projectCell()!)}
          draftRP={PROJECT_CELLS.reduce((sum, c) => sum + (props.draftPlacements[c.id] || 0), 0)}
        />

        {gridMap()[1][3] && (
          <BoardCell
            cell={gridMap()[1][3]!}
            currentPhase={props.currentPhase}
            isActionPhase={props.isActionPhase}
            isRevealed={props.revealedTiles.includes(gridMap()[1][3]!.id)}
            draftPlacement={props.draftPlacements[gridMap()[1][3]!.id] || 0}
            teams={props.teams}
            onClick={() => props.onCellClick(gridMap()[1][3]!)}
            specializedIndices={props.specializedIndices}
          />
        )}

        {/* Row 2: first cell (project continues), skip middle 2, then last cell */}
        {gridMap()[2][0] && (
          <BoardCell
            cell={gridMap()[2][0]!}
            currentPhase={props.currentPhase}
            isActionPhase={props.isActionPhase}
            isRevealed={props.revealedTiles.includes(gridMap()[2][0]!.id)}
            draftPlacement={props.draftPlacements[gridMap()[2][0]!.id] || 0}
            teams={props.teams}
            onClick={() => props.onCellClick(gridMap()[2][0]!)}
            specializedIndices={props.specializedIndices}
          />
        )}
        {/* Project continues here (already placed above with row-span-2) */}
        {gridMap()[2][3] && (
          <BoardCell
            cell={gridMap()[2][3]!}
            currentPhase={props.currentPhase}
            isActionPhase={props.isActionPhase}
            isRevealed={props.revealedTiles.includes(gridMap()[2][3]!.id)}
            draftPlacement={props.draftPlacements[gridMap()[2][3]!.id] || 0}
            teams={props.teams}
            onClick={() => props.onCellClick(gridMap()[2][3]!)}
            specializedIndices={props.specializedIndices}
          />
        )}

        {/* Row 3 */}
        <For each={gridMap()[3]}>
          {(cell) =>
            cell && (
              <BoardCell
                cell={cell}
                currentPhase={props.currentPhase}
                isActionPhase={props.isActionPhase}
                isRevealed={props.revealedTiles.includes(cell.id)}
                draftPlacement={props.draftPlacements[cell.id] || 0}
                teams={props.teams}
                onClick={() => props.onCellClick(cell)}
                specializedIndices={props.specializedIndices}
              />
            )
          }
        </For>
      </div>
    </div>
  );
}
