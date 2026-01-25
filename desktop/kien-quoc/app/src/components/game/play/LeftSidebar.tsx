/**
 * LeftSidebar Component
 * Resources panel with submit button, and National Indices anchored to bottom
 *
 * IMPORTANT: Uses useGame() directly for reactivity
 */
import { Show, For, createMemo } from 'solid-js';
import { TrendingUp, TrendingDown, TriangleAlert } from 'lucide-solid';
import { useGame } from '~/lib/game/context';
import { INDEX_NAMES, INDEX_LABELS, RESOURCES_PER_TURN, type IndexName } from '~/config/game';
import { INDEX_ICONS, INDEX_COLORS } from '~/components/game/shared/constants';

interface LeftSidebarProps {
  usedResources: number;
  remainingResources: number;
  onSubmit: () => void;
  onCancelSubmission: () => void;
  onClearAll: () => void;
  timerExpired?: boolean;
}

export default function LeftSidebar(props: LeftSidebarProps) {
  // Use context directly for reactivity!
  const game = useGame();

  // Check for danger level (index <= 3) - use game.nationalIndices() directly
  const dangerIndices = createMemo(() => INDEX_NAMES.filter((idx) => game.nationalIndices()[idx] <= 3));

  // Get index changes from last turn result
  const indexChanges = createMemo(() => {
    if (game.currentPhase() !== 'result') return {};
    const result = game.lastTurnResult();
    if (!result) return {};

    const changes: Record<string, number> = {};
    if (result.indexChanges) {
      for (const [k, v] of Object.entries(result.indexChanges)) {
        changes[k] = (changes[k] || 0) + v;
      }
    }
    if (result.zoneBoosts) {
      for (const [k, v] of Object.entries(result.zoneBoosts)) {
        changes[k] = (changes[k] || 0) + v;
      }
    }
    return changes;
  });

  // Show resource panel during action phase (even if submitted/timeout - for cancel button)
  const isActionPhase = () => game.currentPhase() === 'action';

  return (
    <div class="col-span-2 flex flex-col gap-3">
      {/* Resource Panel - different for players vs spectators */}
      <div class="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold text-gray-700 text-sm flex items-center gap-2">
            <TrendingUp class="w-4 h-4 text-red-600" />
            {game.canPlay() ? 'Tài nguyên' : 'Đội chơi'}
          </h3>

          {/* Cancel all allocation button */}
          <Show when={game.canPlay() && isActionPhase() && !game.myTeamSubmitted() && props.usedResources > 0}>
            <button
              onClick={props.onClearAll}
              class="text-[10px] font-bold text-red-600 hover:text-red-700 px-2 py-1 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
            >
              Hủy phân bố
            </button>
          </Show>
        </div>

        {/* Player view - show own resources */}
        <Show when={game.canPlay()}>
          <Show
            when={isActionPhase()}
            fallback={
              <div class="text-center py-4 text-sm text-gray-500">
                <div class="text-gray-400 mb-1">Chờ giai đoạn hành động</div>
                <div class="text-xs text-gray-400">để phân bố tài nguyên</div>
              </div>
            }
          >
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Tổng</span>
                <span class="font-bold text-gray-800">{RESOURCES_PER_TURN} RP</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Đã dùng</span>
                <span class="font-bold text-red-600">{props.usedResources} RP</span>
              </div>
              <div class="h-px bg-gray-200" />
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600 font-medium">Còn</span>
                <span class={`font-bold text-lg ${props.remainingResources < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {props.remainingResources} RP
                </span>
              </div>
              {/* Resource bar */}
              <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (props.usedResources / RESOURCES_PER_TURN) * 100)}%` }}
                />
              </div>
              {/* Submit/Cancel/Timeout state */}
              <Show
                when={!props.timerExpired}
                fallback={
                  <div class="text-center py-2 text-red-600 font-medium text-sm">⏱ Hết thời gian - Chờ quản trò...</div>
                }
              >
                <Show
                  when={game.myTeamSubmitted()}
                  fallback={
                    <button
                      onClick={props.onSubmit}
                      disabled={props.remainingResources < 0}
                      class="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-bold rounded-xl transition-all shadow"
                    >
                      Hoàn tất (còn {props.remainingResources} RP)
                    </button>
                  }
                >
                  <div class="space-y-2">
                    <div class="text-center text-green-600 font-medium text-sm">✓ Đã gửi - Chờ đội khác...</div>
                    <button
                      onClick={props.onCancelSubmission}
                      class="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all border border-gray-300"
                    >
                      Hủy & Tiếp tục chỉnh
                    </button>
                  </div>
                </Show>
              </Show>
            </div>
          </Show>
        </Show>

        {/* Spectator view - show active teams only */}
        <Show when={!game.canPlay()}>
          <div class="space-y-2">
            <For each={Object.entries(game.teams()).filter(([_, t]) => (t.ownerId !== null && t.connected) || t.isAI)}>
              {([regionId, team]) => (
                <div
                  class={`p-2 rounded-lg flex items-center justify-between ${
                    team.submitted ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  <span class="text-sm font-medium text-gray-700">{team.name}</span>
                  {team.submitted ? (
                    <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">✓</span>
                  ) : (
                    <span class="text-xs text-gray-400">Đang chọn...</span>
                  )}
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Spacer to push national indices to bottom */}
      <div class="flex-1" />

      {/* National Indices - ANCHORED TO BOTTOM - uses game.nationalIndices() directly */}
      <div class="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm p-4">
        <h3 class="font-bold text-gray-700 text-sm mb-3">Chỉ số Quốc gia</h3>

        {/* Warning if any index is in danger */}
        <Show when={dangerIndices().length > 0}>
          <div class="mb-3 px-3 py-2 bg-red-100 rounded-lg text-red-700 text-xs font-medium animate-pulse flex items-center gap-1">
            <TriangleAlert class="w-4 h-4" /> Cảnh báo: {dangerIndices().length} chỉ số ở mức nguy hiểm!
          </div>
        </Show>

        <div class="space-y-3">
          <For each={INDEX_NAMES}>
            {(idx) => {
              const Icon = INDEX_ICONS[idx];
              const colors = INDEX_COLORS[idx];
              // Access game.nationalIndices()[idx] directly for reactivity!

              return (
                <div
                  class={`p-2 rounded-lg transition-all ${
                    game.nationalIndices()[idx] <= 3 ? 'bg-red-50 ring-2 ring-red-300' : colors.bg
                  }`}
                >
                  <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center gap-1.5">
                      <Icon class={`w-4 h-4 ${game.nationalIndices()[idx] <= 3 ? 'text-red-600' : colors.text}`} />
                      <span
                        class={`text-xs font-medium ${game.nationalIndices()[idx] <= 3 ? 'text-red-700' : colors.text}`}
                      >
                        {INDEX_LABELS[idx]}
                      </span>
                    </div>
                    <div class="flex items-center gap-1">
                      <span
                        class={`font-bold text-sm ${game.nationalIndices()[idx] <= 3 ? 'text-red-600' : colors.text}`}
                      >
                        {game.nationalIndices()[idx]}
                      </span>
                      {/* Change indicator */}
                      <Show
                        when={
                          game.currentPhase() === 'result' &&
                          indexChanges()[idx] !== undefined &&
                          indexChanges()[idx] !== 0
                        }
                      >
                        <span
                          class={`text-xs font-bold flex items-center ${indexChanges()[idx]! > 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {indexChanges()[idx]! > 0 ? <TrendingUp class="w-3 h-3" /> : <TrendingDown class="w-3 h-3" />}
                          {indexChanges()[idx]! > 0 ? '+' : ''}
                          {indexChanges()[idx]}
                        </span>
                      </Show>
                    </div>
                  </div>
                  <div class="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      class={`h-full rounded-full transition-all duration-500 ${game.nationalIndices()[idx] <= 3 ? 'bg-red-500' : colors.bar}`}
                      style={{ width: `${Math.max(0, Math.min(100, (game.nationalIndices()[idx] / 20) * 100))}%` }}
                    />
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
