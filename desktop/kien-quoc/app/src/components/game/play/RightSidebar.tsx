/**
 * RightSidebar Component
 * Project status (top, clickable) and Leaderboard (anchored to bottom)
 *
 * USES useGame() directly for reactivity
 */
import { Show, For, createMemo } from 'solid-js';
import { Target, Trophy, TrendingUp, Star, ChevronRight, Rocket } from 'lucide-solid';
import { useGame } from '~/lib/game/context';
import { REGIONS, type RegionId } from '~/config/regions';
import { UNDERDOG_START_TURN, UNDERDOG_THRESHOLD } from '~/config/game';

interface RightSidebarProps {
  onProjectClick?: () => void;
}

export default function RightSidebar(props: RightSidebarProps) {
  // Use context directly for reactivity!
  const game = useGame();

  // Calculate sorted leaderboard with rankings
  const leaderboard = createMemo(() => {
    const result = game.lastTurnResult();
    const sorted = Object.values(game.teams())
      // Include teams that are either: connected humans OR AI
      .filter((t) => (t.ownerId !== null && t.connected) || t.isAI)
      .map((t) => {
        const pointsChange = result?.teamPoints[t.id] || 0;
        return { ...t, pointsChange };
      })
      .sort((a, b) => b.points - a.points);

    return sorted.map((t, i) => ({ ...t, rank: i + 1 }));
  });

  // Calculate underdog teams (bottom 40% from turn 5+)
  const underdogTeams = createMemo(() => {
    const turn = game.currentTurn();
    if (turn < UNDERDOG_START_TURN) return new Set<RegionId>();
    const teams = leaderboard();
    const underdogCount = Math.floor(teams.length * UNDERDOG_THRESHOLD);
    return new Set(teams.slice(-underdogCount).map((t) => t.id as RegionId));
  });

  return (
    <div class="col-span-2 flex flex-col gap-3">
      {/* Project Status - TOP, clickable */}
      <button
        class="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm p-4 text-left transition-all group"
        onClick={props.onProjectClick}
      >
        <h3 class="font-bold text-gray-700 text-sm mb-3 flex items-center justify-between">
          <span class="flex items-center gap-2">
            <Target class="w-4 h-4 text-red-600" />
            Dự án hiện tại
          </span>
          <ChevronRight class="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
        </h3>

        <Show when={game.event()} fallback={<div class="text-center text-gray-500 py-4 text-sm">Chưa có dự án</div>}>
          <div class="space-y-3">
            {/* Project name */}
            <div class="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
              <Star class="w-5 h-5 text-red-600" />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-red-700 text-sm truncate">{game.event()!.project}</div>
                <div class="text-xs text-red-600 truncate">{game.event()!.name}</div>
              </div>
            </div>

            {/* Requirements summary */}
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div class="text-center p-2 bg-gray-50 rounded-lg">
                <div class="text-xs text-gray-500">Cần RP</div>
                <div class="font-bold text-gray-700">{game.scaledEvent()!.minTotal}</div>
              </div>
              <div class="text-center p-2 bg-gray-50 rounded-lg">
                <div class="text-xs text-gray-500">Cần đội</div>
                <div class="font-bold text-gray-700">{game.scaledEvent()!.minTeams}</div>
              </div>
            </div>
          </div>
        </Show>
      </button>

      {/* Spacer to push leaderboard to bottom */}
      <div class="flex-1" />

      {/* Leaderboard - ANCHORED TO BOTTOM */}
      <div class="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm p-4">
        <h3 class="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <Trophy class="w-4 h-4 text-amber-500" />
          Bảng xếp hạng
        </h3>

        <div class="space-y-2">
          <For each={leaderboard()}>
            {(team) => {
              const region = REGIONS.find((r) => r.id === team.id);
              const Icon = region?.icon;
              const isMe = team.id === game.myTeamId();
              const showChange = game.currentPhase() === 'result' && team.pointsChange > 0;

              return (
                <div
                  class={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                    isMe ? 'bg-red-50 ring-2 ring-red-300' : 'bg-gray-50'
                  }`}
                >
                  {/* Rank badge */}
                  <div
                    class={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      team.rank === 1
                        ? 'bg-amber-400 text-amber-900 shadow-sm'
                        : team.rank === 2
                          ? 'bg-gray-300 text-gray-700'
                          : team.rank === 3
                            ? 'bg-amber-700 text-amber-100'
                            : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {team.rank}
                  </div>

                  {/* Team icon */}
                  <div
                    class={`w-8 h-8 ${region?.colorClass || 'bg-gray-400'} rounded-lg flex items-center justify-center shadow-sm`}
                  >
                    {Icon && <Icon class="w-4 h-4 text-white" />}
                  </div>

                  {/* Team name */}
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm text-gray-800 truncate flex items-center gap-1">
                      {region?.name || team.name}
                      <Show when={underdogTeams().has(team.id as RegionId)}>
                        <span class="tooltip tooltip-left" data-tip="Hỗ trợ vùng khó khăn: +1 RP, x1.05 điểm">
                          <Rocket class="w-3 h-3 text-orange-500" />
                        </span>
                      </Show>
                    </div>
                    <Show when={isMe}>
                      <div class="text-xs text-red-600 font-medium">Bạn</div>
                    </Show>
                  </div>

                  {/* Points with change indicator */}
                  <div class="text-right">
                    <div class="font-bold text-gray-800">{team.points.toFixed(2)}</div>
                    <Show when={showChange}>
                      <div class="text-xs text-green-600 flex items-center justify-end gap-0.5">
                        <TrendingUp class="w-3 h-3" />+{Math.round(team.pointsChange)}
                      </div>
                    </Show>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
}
