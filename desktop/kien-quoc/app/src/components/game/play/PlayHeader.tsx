/**
 * PlayHeader Component
 * Game header with turn, phase progress, controls, reset and instruction buttons
 *
 * IMPORTANT: This component uses useGame() directly for reactivity.
 * Passing values through props doesn't maintain SolidJS reactivity.
 */
import { Show, For } from 'solid-js';
import { Calendar, ArrowRight, Pause, Play, ArrowLeft, Clock, RotateCcw, CircleQuestionMark } from 'lucide-solid';
import type { PhaseName } from '~/config/game';
import { useGame } from '~/lib/game/context';
import { PHASES, PHASE_LABELS, getPhaseColor } from '~/components/game/shared/constants';

interface PlayHeaderProps {
  onAdvancePhase: () => void;
  onTogglePause: () => void;
  onShowEvent: () => void;
  onShowInstructions?: () => void;
  onBack: () => void;
  onReset?: () => void;
  timer?: {
    formatted: () => string;
    isWarning: () => boolean;
  };
}

export default function PlayHeader(props: PlayHeaderProps) {
  // Use context directly for reactivity - don't pass through props!
  const game = useGame();

  return (
    <header class="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-30">
      <div class="px-4 py-2 flex items-center gap-4">
        {/* Left zone: Back + Reset + Instructions */}
        <div class="flex items-center gap-1">
          <button
            onClick={props.onBack}
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            title="Trang chủ"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>

          <Show when={props.onReset && game.canControl() && !game.isOnline()}>
            <button
              onClick={props.onReset}
              class="p-2 hover:bg-red-100 rounded-lg transition-colors text-gray-600 hover:text-red-600"
              title="Chơi lại"
            >
              <RotateCcw class="w-5 h-5" />
            </button>
          </Show>

          <Show when={props.onShowInstructions}>
            <button
              onClick={props.onShowInstructions}
              class="p-2 hover:bg-blue-100 rounded-lg transition-colors text-gray-600 hover:text-blue-600"
              title="Hướng dẫn"
            >
              <CircleQuestionMark class="w-5 h-5" />
            </button>
          </Show>
        </div>

        {/* Turn/Year Badge */}
        <button
          onClick={props.onShowEvent}
          class="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Calendar class="w-4 h-4" />
          <span class="font-bold">Lượt {game.currentTurn()}</span>
          <Show when={game.event()}>
            <span class="text-red-200">• {game.event()!.year}</span>
          </Show>
        </button>

        {/* Phase Progress - use game.currentPhase() directly for reactivity */}
        <div class="flex-1 flex items-center gap-2">
          <For each={PHASES}>
            {(phase, i) => {
              const colorClass = getPhaseColor(phase);

              // Access game.currentPhase() directly in the expression!
              return (
                <>
                  <div
                    class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      phase === game.currentPhase()
                        ? `${colorClass} text-white font-bold shadow`
                        : i() < PHASES.indexOf(game.currentPhase())
                          ? 'bg-gray-200 text-gray-600'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <span class="text-sm">{PHASE_LABELS[phase]}</span>
                  </div>
                  <Show when={i() < PHASES.length - 1}>
                    <ArrowRight
                      class={`w-4 h-4 ${i() < PHASES.indexOf(game.currentPhase()) ? 'text-gray-400' : 'text-gray-300'}`}
                    />
                  </Show>
                </>
              );
            }}
          </For>
        </div>

        {/* Timer (online only) */}
        <Show when={game.showTimer() && props.timer}>
          <div
            class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-lg font-bold transition-all ${
              props.timer!.isWarning() ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Clock class="w-4 h-4" />
            <span>{props.timer!.formatted()}</span>
          </div>
        </Show>

        {/* Controls (for those who can advance phases) */}
        <Show when={game.canAdvance()}>
          <div class="flex items-center gap-2">
            {/* Pause/Resume (online only) */}
            <Show when={game.isOnline()}>
              <button
                onClick={props.onTogglePause}
                class={`p-1.5 rounded-lg transition-colors ${
                  game.status() === 'paused'
                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={game.status() === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}
              >
                {game.status() === 'paused' ? <Play class="w-5 h-5" /> : <Pause class="w-5 h-5" />}
              </button>
            </Show>

            {/* Advance Phase */}
            <Show when={game.status() === 'playing'}>
              <button
                onClick={props.onAdvancePhase}
                class="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow"
              >
                <span>Tiếp</span>
                <ArrowRight class="w-4 h-4" />
              </button>
            </Show>
          </div>
        </Show>
      </div>
    </header>
  );
}
