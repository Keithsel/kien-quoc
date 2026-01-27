/**
 * TeamPanel Component
 * Shows all teams with their status, allocations, and points
 * Includes allocation distribution bars by cell type
 */
import { For, Show, createMemo, createSignal } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { Wifi, WifiOff, Bot, Rocket } from 'lucide-solid';
import { useGame } from '~/lib/game/context';
import { getAllocationsByType, mergePlacements, getTotalRP, type AllocationByType } from '~/lib/hooks';
import { REGIONS } from '~/config/regions';
import type { CellType } from '~/config/game';
import { UNDERDOG_START_TURN_TIER1, UNDERDOG_START_TURN_TIER2, UNDERDOG_THRESHOLD } from '~/config/game';
import { cellTypeIcons, cellTypeLabels } from '~/components/game/play';

// Cell type color classes for bar segments (solid versions)
const CELL_BAR_COLORS: Record<CellType, string> = {
  project: 'bg-red-600',
  synergy: 'bg-indigo-500',
  independent: 'bg-sky-500',
  cooperation: 'bg-emerald-500',
  competitive: 'bg-rose-500'
};

interface AllocationBarProps {
  allocations: AllocationByType[];
  label: string;
}

function AllocationBar(props: AllocationBarProps) {
  const [hoveredIndex, setHoveredIndex] = createSignal<number | null>(null);

  // Calculate segment positions for tooltip placement
  const getSegmentCenter = (index: number): number => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += props.allocations[i].percentage;
    }
    return offset + props.allocations[index].percentage / 2;
  };

  return (
    <div class="relative" style={{ 'padding-top': '1px' }}>
      <div class="text-[9px] text-gray-400 mb-0.5">{props.label}</div>
      <div class="bg-gray-100 rounded-full flex overflow-hidden" style={{ height: '10px' }}>
        <For each={props.allocations}>
          {(alloc, index) => {
            const colorClass = CELL_BAR_COLORS[alloc.type];
            const isFirst = index() === 0;
            const isLast = index() === props.allocations.length - 1;
            return (
              <div
                class={`${colorClass} cursor-pointer transition-all hover:brightness-110 ${
                  isFirst ? 'rounded-l-full' : ''
                } ${isLast ? 'rounded-r-full' : ''}`}
                style={{ width: `${alloc.percentage}%`, 'min-width': '4px' }}
                onMouseEnter={() => setHoveredIndex(index())}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          }}
        </For>
      </div>

      {/* Tooltip - rendered outside the bar to avoid clipping */}
      <Show when={hoveredIndex() !== null}>
        {(() => {
          const index = hoveredIndex()!;
          const alloc = props.allocations[index];
          const Icon = cellTypeIcons[alloc.type];
          const label = cellTypeLabels[alloc.type];
          const centerPercent = getSegmentCenter(index);

          return (
            <div
              class="absolute bottom-full mb-2 bg-white border border-gray-200 text-gray-800 text-xs rounded-lg px-3 py-2 whitespace-nowrap z-200 shadow-lg pointer-events-none"
              style={{ left: `${centerPercent}%`, transform: 'translateX(-50%)' }}
            >
              <div class="flex items-center gap-1.5 font-semibold mb-1">
                <Dynamic component={Icon} class="w-3.5 h-3.5" />
                <span>{label}</span>
              </div>
              <div class="text-gray-600">RP: {alloc.rp}</div>
              <div class="text-gray-600">Tỷ lệ: {alloc.percentage.toFixed(1)}%</div>
              {/* Arrow */}
              <div class="absolute top-full left-1/2 -translate-x-1/2">
                <div class="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white" />
              </div>
            </div>
          );
        })()}
      </Show>
    </div>
  );
}

export default function TeamPanel() {
  const game = useGame();

  const sortedTeams = createMemo(() => {
    return (
      Object.entries(game.teams())
        // Host sees all teams for monitoring
        .map(([regionId, t]) => {
          const region = REGIONS.find((r) => r.id === regionId);
          const currentAllocations = getAllocationsByType(t.placements);
          const totalRP = getTotalRP(t.placements);

          // Cumulative = previous cumulative + current turn's placements
          const allTimePlacements = mergePlacements(t.cumulativeAllocations || {}, t.placements);
          const allTimeAllocations = getAllocationsByType(allTimePlacements);
          const allTimeRP = getTotalRP(allTimePlacements);

          return {
            ...t,
            regionId,
            region,
            currentAllocations,
            totalRP,
            allTimeAllocations,
            allTimeRP,
            isBot: t.ownerId === 'bot'
          };
        })
        .sort((a, b) => b.points - a.points)
    );
  });

  return (
    <div class="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm p-2 overflow-auto">
      <h3 class="font-bold text-gray-700 text-xs mb-2">Đội tham gia</h3>
      <div class="space-y-1.5">
        <For each={sortedTeams()}>
          {(team, index) => {
            // Determine underdog tier (0 = not underdog, 1 = tier 1, 2 = tier 2)
            const underdogTier = () => {
              const turn = game.currentTurn();
              if (turn < UNDERDOG_START_TURN_TIER1) return 0;
              const teams = sortedTeams();
              const underdogCount = Math.floor(teams.length * UNDERDOG_THRESHOLD);
              if (index() < teams.length - underdogCount) return 0;
              return turn >= UNDERDOG_START_TURN_TIER2 ? 2 : 1;
            };
            const underdogTooltip = () => (underdogTier() === 2 ? '+2 RP, +5% điểm' : '+1 RP');
            return (
              <div
                class={`p-1.5 rounded-lg border-2 transition-all ${
                  team.connected ? 'bg-gray-50' : 'bg-gray-50/50 opacity-50'
                } ${team.submitted ? 'border-green-500' : team.connected ? 'border-gray-200' : 'border-gray-100'}`}
              >
                <div class="flex items-center gap-1.5">
                  {/* Team color badge */}
                  <div
                    class={`w-7 h-7 ${team.region?.colorClass || 'bg-gray-500'} rounded-md flex items-center justify-center shrink-0`}
                  >
                    <Show
                      when={team.isBot}
                      fallback={
                        team.connected ? (
                          <Wifi size={16} class="text-white" />
                        ) : (
                          <WifiOff size={16} class="text-white/50" />
                        )
                      }
                    >
                      <Bot size={16} class="text-white" />
                    </Show>
                  </div>

                  {/* Team info */}
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-xs text-gray-800 truncate flex items-center gap-1">
                      {team.region?.name || team.regionId}
                      <Show when={underdogTier() > 0}>
                        <span class="tooltip tooltip-right" data-tip={underdogTooltip()}>
                          <Rocket class="w-2.5 h-2.5 text-orange-500" />
                        </span>
                      </Show>
                    </div>
                    <div class="text-[10px] text-gray-500">
                      {team.isBot ? 'Bot' : team.connected ? 'Online' : 'Offline'}
                    </div>
                  </div>

                  {/* Points */}
                  <div class="text-right">
                    <div class="font-bold text-sm text-gray-800">{team.points.toFixed(2)}</div>
                    <div class="text-[10px] text-gray-500">điểm</div>
                  </div>
                </div>

                {/* Allocation bars - always show both when there's any allocation */}
                <Show when={team.allTimeRP > 0}>
                  <div class="mt-1.5 pt-1.5 border-t border-gray-200 space-y-1">
                    {/* Current turn bar */}
                    <Show when={team.totalRP > 0}>
                      <AllocationBar allocations={team.currentAllocations} label="Lượt này" />
                    </Show>
                    {/* All-time bar (includes current turn) */}
                    <AllocationBar allocations={team.allTimeAllocations} label="Tổng cộng" />
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
