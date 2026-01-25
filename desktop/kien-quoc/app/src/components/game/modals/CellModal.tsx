import { Show, For } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { Plus, Minus, Info } from 'lucide-solid';
import type { BoardCell } from '~/config/board';
import { INDEX_LABELS } from '~/config/game';
import { cellEffects, cellTypeLabels } from '~/components/game/play/shared/labels';
import { cellTypeIcons } from '~/components/game/play/shared/icons';

interface CellModalProps {
  cell: BoardCell;
  placement: number;
  remainingResources: number;
  onUpdate: (delta: number) => void;
  onClose: () => void;
  onCancel?: () => void;
}

export default function CellModal(props: CellModalProps) {
  return (
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={props.onCancel || props.onClose}
    >
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div class="flex items-center gap-4 mb-6">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center">
            <Dynamic component={cellTypeIcons[props.cell.type]} class="w-6 h-6 text-white" />
          </div>
          <div class="flex-1">
            <span class="text-xs font-bold uppercase text-gray-500">{cellTypeLabels[props.cell.type]}</span>
            <h2 class="text-xl font-bold text-red-700">{props.cell.name}</h2>
          </div>
          <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">
            Còn {props.remainingResources} RP
          </span>
        </div>

        {/* Effect info */}
        <div class="bg-blue-50 rounded-lg p-3 mb-4 flex items-start gap-2">
          <Info class="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p class="text-sm text-blue-700">{cellEffects[props.cell.type]}</p>
          </div>
        </div>

        {/* Affected indices */}
        <Show when={props.cell.type !== 'project'}>
          <div class="flex items-center gap-2 mb-4 flex-wrap">
            <span class="text-sm text-gray-600 font-medium">Tác động:</span>
            <For each={props.cell.indices}>
              {(idx) => (
                <span class="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  {INDEX_LABELS[idx]}
                </span>
              )}
            </For>
          </div>
        </Show>

        {/* Allocation controls */}
        <div class="flex items-center justify-center gap-6 mb-6 py-4">
          <button
            class="w-14 h-14 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-3xl font-bold text-red-600 disabled:opacity-50 transition-all"
            onClick={() => props.onUpdate(-1)}
            disabled={props.placement <= 0}
          >
            <Minus class="w-6 h-6" />
          </button>
          <div class="text-center min-w-[100px]">
            <div class="text-6xl font-bold text-red-600">{props.placement}</div>
            <div class="text-sm text-gray-500 font-medium">RP phân bố</div>
          </div>
          <button
            class="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-3xl font-bold text-white disabled:opacity-50 transition-all"
            onClick={() => props.onUpdate(1)}
            disabled={props.remainingResources <= 0}
          >
            <Plus class="w-6 h-6" />
          </button>
        </div>

        {/* Action buttons */}
        <div class="flex gap-3">
          <button
            class="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all"
            onClick={props.onCancel || props.onClose}
          >
            Hủy
          </button>
          <button
            class="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all"
            onClick={props.onClose}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
