import { Show, For } from 'solid-js';
import { ChartColumn, Settings, CircleCheckBig, CircleX, Target } from 'lucide-solid';
import type { TurnResult } from '~/lib/types';
import { INDEX_LABELS } from '~/config/game';

interface EventPopupProps {
  event: {
    year: number;
    name: string;
    scenario: string;
    project: string;
    minTotal: number;
    minTeams: number;
    successReward: { points: number; indices: Record<string, number> };
    failurePenalty: Record<string, number>;
  };
  turn: number;
  lastTurnResult?: TurnResult;
  onClose: () => void;
}

export default function EventPopup(props: EventPopupProps) {
  return (
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl max-w-xl w-full mx-4 p-6 animate-scale-in">
        {/* Header */}
        <div class="flex justify-between items-start mb-4">
          <div>
            <span class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-sm font-medium">
              Năm {props.event.year}
            </span>
            <h2 class="text-2xl font-bold text-red-700 mt-2">{props.event.name}</h2>
            {/* Scenario description */}
            <Show when={props.event.scenario}>
              <p class="text-sm text-gray-600 mt-2 leading-relaxed">{props.event.scenario}</p>
            </Show>
          </div>
        </div>

        {/* Previous turn report */}
        <Show when={props.lastTurnResult && props.turn > 1}>
          <div class="mb-4 p-4 bg-gray-50 rounded-xl">
            <h3 class="font-bold text-gray-700 mb-3 flex items-center gap-2">
              <ChartColumn class="w-4 h-4" />
              Báo cáo lượt trước
            </h3>
            <div class="flex flex-col gap-2">
              {/* Project result */}
              <div class={`p-2 rounded ${props.lastTurnResult!.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div
                  class={`font-bold flex items-center gap-1 text-sm ${props.lastTurnResult!.success ? 'text-green-700' : 'text-red-700'}`}
                >
                  {props.lastTurnResult!.success ? (
                    <CircleCheckBig class="w-3.5 h-3.5" />
                  ) : (
                    <CircleX class="w-3.5 h-3.5" />
                  )}
                  Dự án: {props.lastTurnResult!.success ? 'Thành công' : 'Thất bại'}
                </div>
                <Show when={Object.keys(props.lastTurnResult!.indexChanges || {}).length > 0}>
                  <div class={`text-xs mt-1 ${props.lastTurnResult!.success ? 'text-green-600' : 'text-red-600'}`}>
                    <For each={Object.entries(props.lastTurnResult!.indexChanges || {})}>
                      {([key, value]) => (
                        <span class="mr-2">
                          {(value as number) > 0 ? '+' : ''}
                          {value} {INDEX_LABELS[key as keyof typeof INDEX_LABELS]}
                        </span>
                      )}
                    </For>
                  </div>
                </Show>
              </div>

              {/* Zone boosts - shown separately */}
              <Show when={Object.keys(props.lastTurnResult!.zoneBoosts || {}).length > 0}>
                <div class="p-2 rounded bg-blue-50">
                  <div class="font-bold text-blue-700 flex items-center gap-1 text-sm">
                    <Target class="w-3.5 h-3.5" /> Phần thưởng vùng
                  </div>
                  <div class="text-xs text-blue-600 mt-1">
                    <For each={Object.entries(props.lastTurnResult!.zoneBoosts || {})}>
                      {([key, value]) => (
                        <span class="mr-2">
                          +{value} {INDEX_LABELS[key as keyof typeof INDEX_LABELS]}
                        </span>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Maintenance cost */}
              <div class="p-2 rounded bg-amber-50">
                <div class="font-bold text-amber-700 flex items-center gap-1 text-sm">
                  <Settings class="w-3.5 h-3.5" />
                  Chi phí duy trì
                </div>
                <div class="text-amber-600 text-xs mt-1">-1 mỗi chỉ số</div>
              </div>
            </div>
          </div>
        </Show>

        {/* Project info */}
        <div class="mb-4 p-4 bg-blue-50 rounded-xl">
          <h3 class="font-bold text-blue-700 mb-2">Dự án: {props.event.project}</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-600">Yêu cầu RP:</span>
              <span class="ml-2 font-bold text-blue-600">{props.event.minTotal}</span>
            </div>
            <div>
              <span class="text-gray-600">Số đội:</span>
              <span class="ml-2 font-bold text-blue-600">{props.event.minTeams}+</span>
            </div>
          </div>
        </div>

        {/* Rewards/Penalties */}
        <div class="grid grid-cols-2 gap-3 mb-6">
          <div class="p-3 bg-green-50 rounded-xl">
            <div class="font-bold text-green-700 text-sm mb-1">Thành công</div>
            <div class="text-xs text-green-600">
              +{props.event.successReward.points} điểm/đội
              {Object.entries(props.event.successReward.indices || {}).map(([k, v]) => (
                <span class="ml-1">
                  , +{v} {INDEX_LABELS[k as keyof typeof INDEX_LABELS]}
                </span>
              ))}
            </div>
          </div>
          <div class="p-3 bg-red-50 rounded-xl">
            <div class="font-bold text-red-700 text-sm mb-1">Thất bại</div>
            <div class="text-xs text-red-600">
              {Object.entries(props.event.failurePenalty || {}).map(([k, v], i, arr) => (
                <span>
                  {v} {INDEX_LABELS[k as keyof typeof INDEX_LABELS]}
                  {i < arr.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Continue button */}
        <button
          class="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all"
          onClick={props.onClose}
        >
          Bắt đầu
        </button>
      </div>
    </div>
  );
}
