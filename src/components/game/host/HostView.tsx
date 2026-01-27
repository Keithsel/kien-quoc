/**
 * HostView Component
 * Main layout for game host - sees all teams, controls game, cannot play
 * Uses same styling elements as player view (LeftSidebar, PlayHeader)
 */
import { createSignal, createMemo, createEffect, Show, For } from 'solid-js';
import {
  Clock,
  Pause,
  Play,
  Plus,
  ArrowLeft,
  ArrowRight,
  Target,
  Users,
  TriangleAlert,
  Calendar,
  TrendingUp,
  TrendingDown,
  Trophy,
  CircleX
} from 'lucide-solid';
import { useGame } from '~/lib/game/context';
import { useTimer, usePhaseAnimations } from '~/lib/game/hooks';
import { extendOnlineTime, forceSubmitAllTeams } from '~/lib/firebase/game';
import { ExportButton } from '~/components/ui';
import { INDEX_NAMES, INDEX_LABELS } from '~/config/game';
import { EventPopup } from '~/components/game/modals';
import { INDEX_ICONS, INDEX_COLORS, PHASE_LABELS, getPhaseColor, PHASES } from '~/components/game/shared';
import TeamPanel from './TeamPanel';
import HostBoard from './HostBoard';
import { useIndexHealth } from '~/lib/hooks';
import { PROJECT_CELLS } from '~/config/board';
import { onlineGame } from '~/lib/firebase/store';
import { FIXED_MODIFIERS, RANDOM_MODIFIERS } from '~/config/events';

interface HostViewProps {
  onBack: () => void;
}

export default function HostView(props: HostViewProps) {
  const game = useGame();
  // Get pausedRemainingMs from Firebase for proper timer display during pause
  const pausedRemainingMs = () => (onlineGame() as { pausedRemainingMs?: number } | null)?.pausedRemainingMs;
  const timer = useTimer(game.phaseEndTime, game.status, pausedRemainingMs);
  const animations = usePhaseAnimations(game.currentPhase);

  const [showEventPopup, setShowEventPopup] = createSignal(false);
  const [hasForceSubmitted, setHasForceSubmitted] = createSignal(false);

  // When timer expires during action phase, force-submit all teams
  createEffect(() => {
    if (game.currentPhase() === 'action' && timer.isExpired() && !hasForceSubmitted()) {
      setHasForceSubmitted(true);
      forceSubmitAllTeams();
    }
    // Reset flag when leaving action phase
    if (game.currentPhase() !== 'action') {
      setHasForceSubmitted(false);
    }
  });

  // Constants from shared

  const year = () => game.event()?.year || 1986;
  const isPaused = () => game.status() === 'paused';

  // Use shared hook for index health (danger levels and changes including maintenance)
  const { dangerIndices, indexChanges } = useIndexHealth();

  // Calculate total project RP from all teams
  const totalProjectRP = createMemo(() => {
    const teams = game.teams();
    return Object.values(teams).reduce((sum, team) => {
      const teamProjectRP = PROJECT_CELLS.reduce((s, cell) => s + (team.placements[cell.id] || 0), 0);
      return sum + teamProjectRP;
    }, 0);
  });

  // Count teams contributing to project
  const contributingTeams = createMemo(() => {
    const teams = game.teams();
    return Object.values(teams).filter((team) => {
      const teamProjectRP = PROJECT_CELLS.reduce((s, cell) => s + (team.placements[cell.id] || 0), 0);
      return teamProjectRP > 0;
    }).length;
  });

  // Project success - read from context (single source of truth)
  // Returns null during action phase (not determined), true/false in result phase
  const projectSuccess = () => {
    const success = game.projectSuccess();
    if (success !== null) return success;
    // During action phase, calculate live for visual feedback
    const ev = game.scaledEvent();
    if (!ev) return false;
    return totalProjectRP() >= ev.minTotal && contributingTeams() >= ev.minTeams;
  };

  // Modifier helpers for the sidebar/popup
  const turnFixedMod = createMemo(() => {
    const ev = game.event();
    const mod = ev?.fixedModifier ? FIXED_MODIFIERS[ev.fixedModifier] : null;
    return mod;
  });

  const turnRandomMod = createMemo(() => {
    const mods = game.randomModifiers();
    const turn = game.currentTurn();
    const modId = mods?.[turn - 1];
    const mod = modId ? RANDOM_MODIFIERS[modId] : null;
    return mod;
  });

  const handleExtendTime = async (seconds: number) => {
    try {
      await extendOnlineTime(seconds);
    } catch (err) {
      console.error('Failed to extend time:', err);
    }
  };

  const handleAdvancePhase = () => {
    if (game.canAdvance()) {
      game.advancePhase();
    }
  };

  const handleTogglePause = () => {
    game.togglePause();
  };

  return (
    <main class="min-h-screen bg-linear-to-br from-red-50 to-amber-50 flex flex-col">
      {/* Header - matches PlayHeader design exactly */}
      <header class="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-30">
        <div class="px-4 py-2 flex items-center gap-4">
          {/* Left zone: Back button */}
          <div class="flex items-center gap-1">
            <button
              onClick={props.onBack}
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              title="Quay lại"
            >
              <ArrowLeft class="w-5 h-5" />
            </button>
          </div>

          {/* Turn/Year Badge - matches PlayHeader */}
          <button
            onClick={() => setShowEventPopup(true)}
            class="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Calendar class="w-4 h-4" />
            <span class="font-bold">Lượt {game.currentTurn()}</span>
            <Show when={game.event()}>
              <span class="text-red-200">• {game.event()!.year}</span>
            </Show>
          </button>

          {/* Phase Progress - shows all phases with current highlighted */}
          <div class="flex-1 flex items-center gap-2">
            <For each={PHASES}>
              {(phase, i) => {
                const colorClass = getPhaseColor(phase);
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

          {/* Timer - only during action phase */}
          <Show when={game.currentPhase() === 'action'}>
            <div
              class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-lg font-bold transition-all ${
                timer.isWarning() ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Clock class="w-4 h-4" />
              <span>{timer.formatted()}</span>
            </div>
          </Show>

          {/* Controls - grouped like PlayHeader */}
          <div class="flex items-center gap-2">
            {/* Extend time (action phase only) */}
            <Show when={game.currentPhase() === 'action'}>
              <button
                onClick={() => handleExtendTime(10)}
                class="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg font-bold transition-colors"
              >
                <Plus class="w-4 h-4" />
                10s
              </button>
            </Show>

            {/* Pause/Resume (action phase only) */}
            <Show when={game.currentPhase() === 'action'}>
              <button
                onClick={handleTogglePause}
                class={`p-1.5 rounded-lg transition-colors ${
                  isPaused()
                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isPaused() ? 'Tiếp tục' : 'Tạm dừng'}
              >
                {isPaused() ? <Play class="w-5 h-5" /> : <Pause class="w-5 h-5" />}
              </button>
            </Show>

            {/* Advance Phase - show when playing or paused */}
            <Show when={game.canAdvance() && (game.status() === 'playing' || game.status() === 'paused')}>
              <button
                onClick={handleAdvancePhase}
                class="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow"
              >
                <span>Tiếp</span>
                <ArrowRight class="w-4 h-4" />
              </button>
            </Show>

            {/* Game Completion Badge - show when game is finished */}
            <Show when={game.gameOver()}>
              <div
                class={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold ${
                  game.gameOver()?.reason === 'completed'
                    ? 'bg-green-100 text-green-700 ring-2 ring-green-400'
                    : 'bg-red-100 text-red-700 ring-2 ring-red-400'
                }`}
              >
                {game.gameOver()?.reason === 'completed' ? (
                  <>
                    <Trophy class="w-4 h-4" /> Hoàn thành!
                  </>
                ) : (
                  <>
                    <CircleX class="w-4 h-4" /> Thất bại
                  </>
                )}
              </div>
              {/* Export Button - show when game is finished */}
              <ExportButton class="px-4 py-1.5 shadow" />
            </Show>
          </div>
        </div>

        {/* Paused banner */}
        <Show when={isPaused()}>
          <div class="px-4 py-2 bg-orange-100 border-t border-orange-200 text-center text-orange-700 font-bold flex items-center justify-center gap-2">
            <Pause class="w-4 h-4" /> TẠM DỪNG
          </div>
        </Show>
      </header>

      {/* Main content - 12 column grid like PlayContainer */}
      <div class="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left Panel: Team Tracking */}
        <div class="col-span-2 flex flex-col gap-3 overflow-hidden">
          <TeamPanel />
        </div>

        {/* Center: Map Board - takes 8 cols like PlayBoard */}
        <div class="col-span-8 flex flex-col gap-3 overflow-hidden">
          {/* Board Container */}
          <div class="flex-1 bg-white/95 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden">
            <HostBoard animations={animations} modifierEffect={game.modifierEffect()} />
          </div>
        </div>

        {/* Right Panel: Project + National Indices - col-span-2 like LeftSidebar */}
        <div class="col-span-2 flex flex-col gap-3 overflow-hidden">
          {/* Project Status - matches player view RightSidebar design */}
          <div
            class={`bg-white/95 backdrop-blur-sm rounded-xl shadow-sm p-4 border-2 transition-colors ${
              game.event() ? (projectSuccess() ? 'border-green-500' : 'border-red-400') : 'border-transparent'
            }`}
          >
            <h3 class="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
              <Target class="w-4 h-4 text-red-600" />
              Dự án hiện tại
            </h3>

            <Show
              when={game.event()}
              fallback={<div class="text-gray-500 text-sm text-center py-4">Chưa có dự án</div>}
            >
              <div class="space-y-3">
                {/* Event banner - Star icon with project name */}
                <div class="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                  <div class="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center shrink-0">
                    <Target class="w-5 h-5 text-red-900" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-bold text-red-700 text-sm truncate">{game.event()!.project}</div>
                    <div class="text-xs text-red-600 truncate">{game.event()!.name}</div>
                  </div>
                </div>

                {/* RP Progress bar */}
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span class="flex items-center gap-1 text-gray-600">
                      <Target class="w-3 h-3" /> Tài nguyên
                    </span>
                    <span
                      class={
                        totalProjectRP() >= (game.scaledEvent()?.minTotal || 0)
                          ? 'text-green-600 font-bold'
                          : 'text-gray-700'
                      }
                    >
                      {totalProjectRP()}/{game.scaledEvent()?.minTotal || 0}
                    </span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      class={`h-full rounded-full transition-all duration-300 ${
                        totalProjectRP() >= (game.scaledEvent()?.minTotal || 0) ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (totalProjectRP() / (game.scaledEvent()?.minTotal || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                {/* Teams count - segmented */}
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span class="flex items-center gap-1 text-gray-600">
                      <Users class="w-3 h-3" /> Đội tham gia
                    </span>
                    <span
                      class={
                        contributingTeams() >= (game.scaledEvent()?.minTeams || 0)
                          ? 'text-green-600 font-bold'
                          : 'text-gray-700'
                      }
                    >
                      {contributingTeams()}/{game.scaledEvent()?.minTeams || 0}
                    </span>
                  </div>
                  <div class="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        class={`flex-1 h-2 rounded-full transition-all duration-300 ${
                          i <= contributingTeams() ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Show>
          </div>

          {/* Modifiers Panel - under Project Status */}
          <div class="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm p-3">
            <h3 class="font-semibold text-gray-600 text-xs mb-2 uppercase tracking-wide">Bối cảnh</h3>
            <Show
              when={turnFixedMod() || turnRandomMod()}
              fallback={
                <div class="text-xs text-gray-400 italic">Không có bối cảnh cho lượt này ({game.currentTurn()})</div>
              }
            >
              <div class="space-y-2">
                <Show when={turnFixedMod()}>
                  <div class="flex items-start gap-2 border-b border-gray-100 pb-2 mb-2">
                    <div
                      class={`p-1 rounded-lg shrink-0 ${turnFixedMod()!.isPositive ? 'bg-green-100' : 'bg-red-100'}`}
                    >
                      {turnFixedMod()!.isPositive ? (
                        <TrendingUp class="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <TrendingDown class="w-3.5 h-3.5 text-red-600" />
                      )}
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs text-gray-500 font-medium">Lịch sử</div>
                      <div
                        class={`text-sm font-semibold ${turnFixedMod()!.isPositive ? 'text-green-700' : 'text-red-700'}`}
                      >
                        {turnFixedMod()!.name}
                      </div>
                      <div class="text-xs text-gray-600 leading-tight">{turnFixedMod()!.description}</div>
                    </div>
                  </div>
                </Show>

                <Show when={turnRandomMod()}>
                  <div class="flex items-start gap-2">
                    <div
                      class={`p-1 rounded-lg shrink-0 ${turnRandomMod()!.isPositive ? 'bg-green-100' : 'bg-red-100'}`}
                    >
                      {turnRandomMod()!.isPositive ? (
                        <TrendingUp class="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <TrendingDown class="w-3.5 h-3.5 text-red-600" />
                      )}
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs text-gray-500 font-medium">Ngẫu nhiên</div>
                      <div
                        class={`text-sm font-semibold ${turnRandomMod()!.isPositive ? 'text-green-700' : 'text-red-700'}`}
                      >
                        {turnRandomMod()!.name}
                      </div>
                      <div class="text-xs text-gray-600 leading-tight">{turnRandomMod()!.description}</div>
                    </div>
                  </div>
                </Show>
              </div>
            </Show>
          </div>

          {/* Spacer to push National Indices to bottom */}
          <div class="flex-1" />

          {/* National Indices - styled like LeftSidebar */}
          <div class="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm p-4 overflow-auto">
            <h3 class="font-bold text-gray-700 text-sm mb-3">Chỉ số Quốc gia</h3>

            {/* Warning if any index is in danger */}
            <Show when={dangerIndices().length > 0}>
              <div class="mb-3 px-3 py-2 bg-red-100 rounded-lg text-red-700 text-xs font-medium animate-pulse flex items-center gap-1">
                <TriangleAlert class="w-4 h-4" />
                Cảnh báo: {dangerIndices().length} chỉ số ở mức nguy hiểm!
              </div>
            </Show>

            <div class="space-y-2">
              <For each={INDEX_NAMES}>
                {(idx) => {
                  const Icon = INDEX_ICONS[idx];
                  const colors = INDEX_COLORS[idx];
                  // Access game.nationalIndices()[idx] directly for reactivity!
                  const isDanger = () => game.nationalIndices()[idx] <= 3;

                  return (
                    <div
                      class={`p-2 rounded-lg transition-all ${
                        isDanger() ? 'bg-red-50 ring-2 ring-red-300' : colors.bg
                      }`}
                    >
                      <div class="flex items-center justify-between mb-1">
                        <div class="flex items-center gap-1.5">
                          <Icon class={`w-3.5 h-3.5 ${isDanger() ? 'text-red-600' : colors.text}`} />
                          <span class={`text-xs font-medium ${isDanger() ? 'text-red-700' : colors.text}`}>
                            {INDEX_LABELS[idx]}
                          </span>
                        </div>
                        <div class="flex items-center gap-1">
                          <span class={`font-bold text-sm ${isDanger() ? 'text-red-600' : colors.text}`}>
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
                              {indexChanges()[idx]! > 0 ? (
                                <TrendingUp class="w-3 h-3" />
                              ) : (
                                <TrendingDown class="w-3 h-3" />
                              )}
                              {indexChanges()[idx]! > 0 ? '+' : ''}
                              {indexChanges()[idx]}
                            </span>
                          </Show>
                        </div>
                      </div>
                      <div class="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                        <div
                          class={`h-full rounded-full transition-all duration-500 ${isDanger() ? 'bg-red-500' : colors.bar}`}
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
      </div>

      {/* Event Popup */}
      <Show when={showEventPopup() && game.event()}>
        <EventPopup
          event={game.scaledEvent()!}
          turn={game.currentTurn()}
          lastTurnResult={game.lastTurnResult()}
          randomModifier={game.randomModifiers()?.[game.currentTurn() - 1]}
          onClose={() => setShowEventPopup(false)}
        />
      </Show>
    </main>
  );
}
