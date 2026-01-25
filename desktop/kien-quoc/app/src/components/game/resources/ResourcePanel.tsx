/**
 * ResourcePanel Component
 *
 * Displays resource allocation status and submit button for players.
 * Shows team status list for spectators/hosts.
 */

import { Show, For } from 'solid-js';
import { TrendingUp } from 'lucide-solid';
import { Card, ProgressBar } from '~/components/ui';
import { useGame } from '~/lib/game/context';
import { RESOURCES_PER_TURN } from '~/config/game';

export interface ResourcePanelProps {
  /** Resources used this turn */
  usedResources: number;
  /** Remaining resources (calculated) */
  remainingResources: number;
  /** Submit callback */
  onSubmit: () => void;
  /** Cancel submission callback */
  onCancelSubmission: () => void;
  /** Whether timer has expired */
  timerExpired?: boolean;
  /** Use glass effect */
  glass?: boolean;
}

export default function ResourcePanel(props: ResourcePanelProps) {
  const game = useGame();

  const isActionPhase = () => game.currentPhase() === 'action';

  return (
    <Card glass={props.glass} padding="md">
      <h3 class="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
        <TrendingUp class="w-4 h-4 text-red-600" />
        {game.canPlay() ? 'Tài nguyên' : 'Đội chơi'}
      </h3>

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
            <ProgressBar value={props.usedResources} max={RESOURCES_PER_TURN} color="gradient" size="md" animated />

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

      {/* Spectator/Overseer view - show all teams */}
      <Show when={!game.canPlay()}>
        <div class="space-y-2">
          <For each={Object.entries(game.teams())}>
            {([, team]) => (
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
    </Card>
  );
}
