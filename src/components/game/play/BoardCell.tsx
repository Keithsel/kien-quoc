/**
 * Individual Board Cell Component
 * Renders a single non-project cell on the game board
 * Supports background images with overlay info tiles
 */
import { Show, For, createMemo } from 'solid-js';
import type { BoardCell as BoardCellType } from '~/config/board';
import type { Team } from '~/lib/types';
import type { RegionId } from '~/config/regions';
import type { IndexName } from '~/config/game';
import type { ModifierEffect } from '~/config/events';
import { REGIONS } from '~/config/regions';
import { INDEX_LABELS } from '~/config/game';
import { calculateCellScores } from '~/lib/scoring';
import { getCellBackground } from '~/config/tile-backgrounds';
import { cellTypeIcons } from './shared/icons';
import { cellTypeLabels, cellColors } from './shared/labels';

interface BoardCellProps {
  cell: BoardCellType;
  isActionPhase: boolean;
  isRevealed: boolean;
  currentPhase: 'event' | 'action' | 'resolution' | 'result';
  draftPlacement: number;
  teams: Record<RegionId, Team>;
  onClick: () => void;
  hostMode?: boolean;
  specializedIndices?: IndexName[]; // Player's regional advantage indices
  modifierEffect?: ModifierEffect;
}

export default function BoardCell(props: BoardCellProps) {
  const CellIcon = cellTypeIcons[props.cell.type];
  const bgImage = getCellBackground(props.cell.id);

  // Get teams that placed resources on this cell
  const teamsOnTile = createMemo(() => {
    // For host mode during action phase, always show allocations
    if (props.hostMode && props.currentPhase === 'action') {
      return Object.values(props.teams).filter((team) => {
        const placement = team.placements[props.cell.id];
        return placement && placement > 0;
      });
    }
    if (!props.isRevealed) return [];
    return Object.values(props.teams).filter((team) => {
      const placement = team.placements[props.cell.id];
      return placement && placement > 0;
    });
  });

  // Calculate cell scores for result phase
  const cellScores = createMemo(() => {
    if (props.currentPhase !== 'result') return {};
    const allPlacements: Partial<Record<RegionId, Record<string, number>>> = {};
    for (const team of Object.values(props.teams)) {
      if (team.ownerId !== null) {
        allPlacements[team.id] = team.placements;
      }
    }
    return calculateCellScores(
      props.cell.id,
      allPlacements as Record<RegionId, Record<string, number>>,
      props.modifierEffect
    );
  });

  // Check if in reveal state (resolution/result with revealed, or host action phase)
  const isRevealState = () => {
    // Host sees live allocations during action phase (without dark overlay)
    if (props.hostMode && props.currentPhase === 'action' && teamsOnTile().length > 0) {
      return true;
    }
    return props.isRevealed && (props.currentPhase === 'resolution' || props.currentPhase === 'result');
  };

  // Show dark overlay only during resolution/result phases
  const showDarkOverlay = () =>
    props.isRevealed && (props.currentPhase === 'resolution' || props.currentPhase === 'result');

  return (
    <button
      class={`rounded-xl shadow-sm transition-all flex flex-col text-white text-left relative overflow-hidden ${
        props.isActionPhase ? 'cursor-pointer hover:scale-[1.02] hover:shadow-md' : 'cursor-default'
      } ${props.isRevealed && props.currentPhase === 'resolution' ? 'ring-2 ring-white/50 scale-[1.02]' : ''}`}
      onClick={props.onClick}
    >
      {/* Background: either image or gradient */}
      <Show when={bgImage} fallback={<div class={`absolute inset-0 bg-linear-to-br ${cellColors[props.cell.type]}`} />}>
        {/* Image background */}
        <img src={bgImage} alt={props.cell.name} class="absolute inset-0 w-full h-full object-fill" />
      </Show>

      {/* Dim overlay during resolution/result phase (not during host action phase) */}
      <Show when={showDarkOverlay()}>
        <div class="absolute inset-0 bg-black/60 z-10" />
      </Show>

      {/* Cell type badge - ALWAYS visible in all phases (top left, absolute) */}
      <div
        class={`absolute top-2 left-2 z-30 flex items-center gap-1 rounded-md px-1.5 py-0.5 bg-linear-to-r ${cellColors[props.cell.type]}`}
      >
        <CellIcon class="w-3 h-3 opacity-90" />
        <span class="text-[10px] uppercase font-bold opacity-90">{cellTypeLabels[props.cell.type]}</span>
      </div>

      {/* Content overlay - always show in host mode, hide during resolution/result for players */}
      <Show when={props.hostMode || !isRevealState()}>
        <div
          class={`relative z-20 p-2 flex flex-col h-full ${bgImage ? 'bg-linear-to-b from-black/60 via-transparent to-black/60' : ''}`}
        >
          {/* Spacer for the absolute badge */}
          <div class="h-5" />

          {/* Cell name */}
          <h3 class={`font-bold text-sm leading-tight flex-1 mt-1 ${bgImage ? 'drop-shadow-lg' : ''}`}>
            {props.cell.name}
          </h3>

          {/* Affected indices - bottom right */}
          <div class="flex flex-wrap gap-1 mt-auto justify-end">
            <For each={props.cell.indices}>
              {(idx) => {
                const isAdvantage = props.specializedIndices?.includes(idx);
                return (
                  <span
                    class={`text-[10px] px-1 py-0.5 rounded font-medium ${bgImage ? 'bg-black/50 backdrop-blur-sm' : 'bg-black/20'} ${isAdvantage ? 'ring-1 ring-white' : ''}`}
                  >
                    {INDEX_LABELS[idx]}
                  </span>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      {/* Draft placement badge - top right, no animation */}
      <Show when={props.draftPlacement > 0}>
        <div class="absolute top-1 right-1 bg-white text-gray-800 font-bold text-xs px-1.5 py-0.5 rounded-full shadow z-30">
          +{props.draftPlacement}
        </div>
      </Show>

      {/* Reveal overlay during resolution/result - dynamic 2x2 grid layout */}
      <Show when={isRevealState() && teamsOnTile().length > 0}>
        <div class="absolute inset-0 flex flex-col items-center justify-center p-2 z-30">
          {/* Dynamic grid: 1=centered, 2-4=2x2 */}
          {(() => {
            const teams = teamsOnTile();
            const count = teams.length;

            const gridClass = count === 1 ? 'flex justify-center' : 'grid grid-cols-2 gap-1';

            return (
              <div class={gridClass}>
                <For each={teams}>
                  {(team, idx) => {
                    const region = REGIONS.find((r) => r.id === team.id);
                    const RegionIcon = region?.icon || REGIONS[0].icon;
                    const investedRP = team.placements[props.cell.id] || 0;
                    const earnedPoints = (cellScores() as Record<string, number>)[team.id] || 0;
                    const isResultPhase = props.currentPhase === 'result';

                    const isLastOdd = count > 1 && count % 2 === 1 && idx() === count - 1;

                    const item = (
                      <div
                        class={`flex items-center gap-1 px-2 py-1 rounded-lg ${region?.colorClass || 'bg-gray-400'} shadow-sm justify-center`}
                      >
                        <RegionIcon class="w-4 h-4 text-white" />
                        <Show when={!isResultPhase}>
                          <span class="text-sm font-bold text-white">{investedRP}</span>
                        </Show>
                        <Show when={isResultPhase}>
                          <span class="text-sm font-bold text-white">
                            {earnedPoints > 0 ? '+' : ''}
                            {Math.round(earnedPoints)}
                          </span>
                        </Show>
                      </div>
                    );

                    return isLastOdd ? <div class="col-span-2 flex justify-center">{item}</div> : item;
                  }}
                </For>
              </div>
            );
          })()}
          {/* Phase label */}
          <div class="text-[10px] text-white/60 font-medium mt-1">
            {props.currentPhase === 'resolution' ? 'Phân bố' : 'Điểm số'}
          </div>
        </div>
      </Show>
    </button>
  );
}
