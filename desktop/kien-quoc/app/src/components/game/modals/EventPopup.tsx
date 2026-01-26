import { Show, For } from 'solid-js';
import { ChartColumn, CircleCheckBig, CircleX, Target, TrendingUp, TrendingDown } from 'lucide-solid';
import type { TurnResult } from '~/lib/types';
import { INDEX_LABELS } from '~/config/game';
import { FIXED_MODIFIERS, RANDOM_MODIFIERS, type FixedModifierId, type RandomModifierId } from '~/config/events';

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
    fixedModifier?: FixedModifierId;
  };
  turn: number;
  lastTurnResult?: TurnResult;
  randomModifier?: RandomModifierId;
  onClose: () => void;
}

export default function EventPopup(props: EventPopupProps) {
  const fixedMod = () => (props.event.fixedModifier ? FIXED_MODIFIERS[props.event.fixedModifier] : null);
  const randomMod = () => (props.randomModifier ? RANDOM_MODIFIERS[props.randomModifier] : null);

  return (
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        {/* Scrollable Content */}
        <div class="p-6 overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div class="mb-5">
            <div class="flex items-center gap-3 mb-2">
              <span class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold">
                Năm {props.event.year}
              </span>
              <div class="h-px bg-gray-200 flex-1"></div>
            </div>
            <h2 class="text-2xl font-bold text-red-700 leading-tight mb-2">{props.event.name}</h2>
            <Show when={props.event.scenario}>
              <p class="text-sm text-gray-600 leading-relaxed">{props.event.scenario}</p>
            </Show>
          </div>

          {/* Unified Modifiers Card */}
          <Show when={fixedMod() || randomMod()}>
            <div class="mb-5 bg-slate-100 rounded-xl p-4">
              <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Bối cảnh</div>
              <div class="grid grid-cols-2 gap-3">
                <Show when={fixedMod()}>
                  <div class="flex items-start gap-3">
                    <div class={`p-1.5 rounded-lg ${fixedMod()!.isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
                      {fixedMod()!.isPositive ? (
                        <TrendingUp class="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown class="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-xs text-gray-500 font-medium">Lịch sử</div>
                      <div
                        class={`text-sm font-semibold ${fixedMod()!.isPositive ? 'text-green-700' : 'text-red-700'}`}
                      >
                        {fixedMod()!.name}
                      </div>
                      <div class="text-xs text-gray-600">{fixedMod()!.description}</div>
                    </div>
                  </div>
                </Show>

                <Show when={randomMod()}>
                  <div class="flex items-start gap-3">
                    <div class={`p-1.5 rounded-lg ${randomMod()!.isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
                      {randomMod()!.isPositive ? (
                        <TrendingUp class="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown class="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-xs text-gray-500 font-medium">Ngẫu nhiên</div>
                      <div
                        class={`text-sm font-semibold ${randomMod()!.isPositive ? 'text-green-700' : 'text-red-700'}`}
                      >
                        {randomMod()!.name}
                      </div>
                      <div class="text-xs text-gray-600">{randomMod()!.description}</div>
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          </Show>

          {/* Previous Turn Report */}
          <Show when={props.lastTurnResult && props.turn > 1}>
            <div class="mb-5 pt-4 border-t border-gray-100">
              <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ChartColumn class="w-3.5 h-3.5" />
                Báo cáo lượt trước
              </div>

              <div class="bg-gray-50 rounded-xl p-3 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">Kết quả dự án</span>
                  <div
                    class={`text-sm font-semibold flex items-center gap-1.5 ${props.lastTurnResult!.success ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {props.lastTurnResult!.success ? <CircleCheckBig class="w-4 h-4" /> : <CircleX class="w-4 h-4" />}
                    {props.lastTurnResult!.success ? 'Thành công' : 'Thất bại'}
                  </div>
                </div>

                <Show when={Object.keys(props.lastTurnResult!.indexChanges || {}).length > 0}>
                  <div class="flex flex-wrap gap-1.5 pt-2 border-t border-gray-200/50">
                    <For each={Object.entries(props.lastTurnResult!.indexChanges || {})}>
                      {([key, value]) => (
                        <span
                          class={`text-xs font-medium px-1.5 py-0.5 rounded ${(value as number) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                        >
                          {(value as number) > 0 ? '+' : ''}
                          {value} {INDEX_LABELS[key as keyof typeof INDEX_LABELS]}
                        </span>
                      )}
                    </For>
                  </div>
                </Show>

                <Show when={Object.keys(props.lastTurnResult!.zoneBoosts || {}).length > 0}>
                  <div class="flex items-center gap-2 pt-2 border-t border-gray-200/50">
                    <span class="text-xs font-semibold text-green-600 flex items-center gap-1">
                      <Target class="w-3 h-3" /> Vùng:
                    </span>
                    <div class="flex flex-wrap gap-1">
                      <For each={Object.entries(props.lastTurnResult!.zoneBoosts || {})}>
                        {([key, value]) => (
                          <span class="text-xs font-medium text-green-700 px-1.5 py-0.5 bg-green-100 rounded">
                            +{value} {INDEX_LABELS[key as keyof typeof INDEX_LABELS]}
                          </span>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          </Show>

          {/* Mission Card */}
          <div class="bg-blue-50 rounded-xl p-4">
            <div class="flex justify-between items-start mb-3">
              <div>
                <div class="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-0.5">Dự án trọng điểm</div>
                <h3 class="text-base font-bold text-blue-700">{props.event.project}</h3>
              </div>
              <div class="text-right">
                <div class="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-0.5">Mục tiêu</div>
                <div class="text-sm font-bold text-blue-600">
                  {props.event.minTotal} RP / {props.event.minTeams}+ Đội
                </div>
              </div>
            </div>

            {/* Rewards Grid */}
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-green-50 rounded-lg p-2.5">
                <div class="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                  <TrendingUp class="w-3 h-3" /> Thành công
                </div>
                <div class="text-xs text-green-600 space-y-0.5">
                  <div class="font-semibold">+{props.event.successReward.points} điểm</div>
                  {Object.entries(props.event.successReward.indices || {}).map(([k, v]) => (
                    <div>
                      +{v} {INDEX_LABELS[k as keyof typeof INDEX_LABELS]}
                    </div>
                  ))}
                </div>
              </div>
              <div class="bg-red-50 rounded-lg p-2.5">
                <div class="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                  <TrendingDown class="w-3 h-3" /> Thất bại
                </div>
                <div class="text-xs text-red-600 space-y-0.5">
                  {Object.entries(props.event.failurePenalty || {}).map(([k, v]) => (
                    <div>
                      {v} {INDEX_LABELS[k as keyof typeof INDEX_LABELS]}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div class="p-4 bg-gray-50 border-t border-gray-100">
          <button
            class="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all"
            onClick={props.onClose}
          >
            Bắt đầu
          </button>
        </div>
      </div>
    </div>
  );
}
