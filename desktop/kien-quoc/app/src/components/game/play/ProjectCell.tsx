/**
 * Project Cell Component (2x2 merged national project)
 * - Event/Action phase: Centered icon, project name, RP badge
 * - Resolution phase: Layout shows progress bars, fast animation from placements
 * - Result phase: Keeps final state, no re-animation
 *
 * USES useGame() directly for reactivity
 */
import { Show, createSignal, createEffect, on } from 'solid-js';
import { Star, Check, X, Target, Users } from 'lucide-solid';
import { useGame } from '~/lib/game/context';
import { PROJECT_CELLS } from '~/config/board';

interface ProjectCellProps {
  onClick: () => void;
  draftRP: number; // Player's draft contribution from usePlacement hook
}

export default function ProjectCell(props: ProjectCellProps) {
  const game = useGame();

  // Animation state
  const [animatedProgress, setAnimatedProgress] = createSignal(0);
  const [animatedTeams, setAnimatedTeams] = createSignal(0);
  const [showVerdict, setShowVerdict] = createSignal(false);

  // Track animation interval for cleanup
  let animationInterval: ReturnType<typeof setInterval> | undefined;

  const clearAnimation = () => {
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = undefined;
    }
  };

  // Note: draftRP is passed as a prop from usePlacement hook
  // because the draft is stored separately from game.teams().placements

  // Calculate project data from TEAM PLACEMENTS (for resolution phase)
  // This doesn't depend on lastTurnResult which is only set after resolution
  const calculateFromPlacements = () => {
    const ev = game.event();
    if (!ev) return { totalRP: 0, teamCount: 0, success: false };

    let totalRP = 0;
    let teamCount = 0;
    for (const team of Object.values(game.teams())) {
      // Only count active teams: connected humans OR AI
      if (!((team.ownerId !== null && team.connected) || team.isAI)) continue;
      const rp = PROJECT_CELLS.reduce((sum, cell) => sum + (team.placements[cell.id] || 0), 0);
      if (rp > 0) {
        totalRP += rp;
        teamCount++;
      }
    }
    return {
      totalRP,
      teamCount,
      success: totalRP >= ev.minTotal && teamCount >= ev.minTeams
    };
  };

  // Get data from lastTurnResult (for result phase)
  const projectDataFromResult = () => {
    const ev = game.event();
    const result = game.lastTurnResult();
    if (!ev || !result) return null;
    return {
      totalRP: result.totalRP,
      teamCount: result.teamCount,
      success: result.success
    };
  };

  // Track phase changes to trigger animation
  createEffect(
    on(
      () => game.currentPhase(),
      (phase, prevPhase) => {
        const ev = game.event();
        if (!ev) return;

        // ALWAYS clear any pending animation first
        clearAnimation();

        if (phase === 'resolution' && prevPhase !== 'resolution') {
          // Entering resolution phase - calculate from placements and animate
          setAnimatedProgress(0);
          setAnimatedTeams(0);
          setShowVerdict(false);

          // Calculate from team placements, not lastTurnResult
          const data = calculateFromPlacements();
          const targetProgress = Math.min(100, (data.totalRP / ev.minTotal) * 100);
          const targetTeams = data.teamCount;

          let step = 0;
          const totalSteps = 20;
          animationInterval = setInterval(() => {
            step++;
            setAnimatedProgress((targetProgress / totalSteps) * step);
            setAnimatedTeams(Math.min(targetTeams, Math.ceil((targetTeams / totalSteps) * step)));

            if (step >= totalSteps) {
              clearAnimation();
              setTimeout(() => setShowVerdict(true), 150);
            }
          }, 25);
        } else if (phase === 'result') {
          // Result phase - immediately use lastTurnResult for accurate final values
          const data = projectDataFromResult() || calculateFromPlacements();
          setAnimatedProgress(Math.min(100, (data.totalRP / ev.minTotal) * 100));
          setAnimatedTeams(data.teamCount);
          setShowVerdict(true);
        } else if (phase === 'event' || phase === 'action') {
          // Reset for new turn
          setAnimatedProgress(0);
          setAnimatedTeams(0);
          setShowVerdict(false);
        }
      }
    )
  );

  const isActionPhase = () => game.currentPhase() === 'action' && game.canAllocate();
  const showProgress = () => game.currentPhase() === 'resolution' || game.currentPhase() === 'result';

  // Get current success state
  // CRITICAL: Only use lastTurnResult in result phase - during resolution it contains OLD data!
  const isSuccess = () => {
    if (game.currentPhase() === 'result') {
      const result = projectDataFromResult();
      if (result) return result.success;
    }
    // During resolution or other phases, calculate from current placements
    return calculateFromPlacements().success;
  };

  // Get display values (for showing totals, not for verdict)
  // CRITICAL: Only use lastTurnResult in result phase!
  const displayData = () => {
    if (game.currentPhase() === 'result') {
      const result = projectDataFromResult();
      if (result) return result;
    }
    return calculateFromPlacements();
  };

  return (
    <button
      class={`col-span-2 row-span-2 rounded-xl shadow-lg p-4 flex flex-col text-white relative overflow-hidden text-left transition-all ${
        isActionPhase() ? 'cursor-pointer hover:scale-[1.02] hover:shadow-xl' : ''
      }`}
      onClick={props.onClick}
      disabled={!isActionPhase()}
    >
      {/* Background image */}
      <img src="/tiles/project.jpg" alt="Dự án Quốc gia" class="absolute inset-0 w-full h-full object-fill" />

      {/* Dim overlay for better text visibility */}
      <div class="absolute inset-0 bg-black/30" />

      {/* Dark overlay for resolution/result phase - matches other tiles */}
      <Show when={showProgress()}>
        <div class="absolute inset-0 bg-black/60 rounded-xl z-0" />
      </Show>

      {/* RP Badge - top right corner, no animation, only during action phase */}
      <Show when={isActionPhase() && props.draftRP > 0}>
        <div class="absolute top-2 right-2 bg-white text-red-600 font-bold text-xs px-1.5 py-0.5 rounded-full shadow z-20">
          +{props.draftRP}
        </div>
      </Show>

      {/* Content */}
      <div class="relative z-10 flex-1 flex flex-col">
        {/* Event/Action Phase: Centered simple display */}
        <Show when={!showProgress()}>
          <div class="flex-1 flex flex-col items-center justify-center text-center">
            <div class="w-14 h-14 rounded-2xl bg-amber-400/90 flex items-center justify-center mb-3 shadow-lg">
              <Star class="w-8 h-8 text-red-900" />
            </div>
            <h3 class="font-bold text-xl mb-1 drop-shadow-lg text-white">DỰ ÁN QUỐC GIA</h3>
            <Show when={game.event()}>
              <span class="text-base text-white drop-shadow-md">{game.event()?.project}</span>
            </Show>
          </div>
        </Show>

        {/* Resolution/Result Phase: Progress bars with icon anchored */}
        <Show when={showProgress()}>
          <Show when={game.event()}>
            <div class="flex-1 flex flex-col justify-center">
              {/* Icon + Title anchored to left of progress bars */}
              <div class="flex items-center gap-2 mb-2">
                <div class="w-10 h-10 rounded-xl bg-amber-400/90 flex items-center justify-center shrink-0">
                  <Star class="w-6 h-6 text-red-900" />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-bold text-sm truncate">DỰ ÁN QUỐC GIA</h3>
                  <span class="text-xs text-red-200 truncate block">{game.event()?.project}</span>
                </div>
              </div>

              {/* Progress bars */}
              <div class="space-y-2">
                {/* RP Progress bar */}
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span class="flex items-center gap-1">
                      <Target class="w-3 h-3" /> Tài nguyên
                    </span>
                    <span class={animatedProgress() >= 100 ? 'text-green-300 font-bold' : 'text-red-200'}>
                      {displayData().totalRP}/{game.scaledEvent()!.minTotal}
                    </span>
                  </div>
                  <div class="w-full bg-red-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      class={`h-full rounded-full transition-all duration-75 ${
                        animatedProgress() >= 100 ? 'bg-green-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${animatedProgress()}%` }}
                    />
                  </div>
                </div>

                {/* Teams count */}
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span class="flex items-center gap-1">
                      <Users class="w-3 h-3" /> Đội tham gia
                    </span>
                    <span
                      class={
                        animatedTeams() >= (game.scaledEvent()?.minTeams || 0)
                          ? 'text-green-300 font-bold'
                          : 'text-red-200'
                      }
                    >
                      {animatedTeams()}/{game.scaledEvent()!.minTeams}
                    </span>
                  </div>
                  <div class="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        class={`flex-1 h-2 rounded-full transition-all duration-75 ${
                          i <= animatedTeams() ? 'bg-green-400' : 'bg-red-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Verdict */}
                <Show when={showVerdict()}>
                  <div
                    class={`mt-1 p-2 rounded-lg text-center font-bold text-sm ${
                      isSuccess() ? 'bg-green-500/10 text-green-200' : 'bg-red-900/10 text-red-200'
                    }`}
                  >
                    {isSuccess() ? (
                      <span class="flex items-center justify-center gap-1.5">
                        <Check class="w-4 h-4" /> THÀNH CÔNG
                      </span>
                    ) : (
                      <span class="flex items-center justify-center gap-1.5">
                        <X class="w-4 h-4" /> THẤT BẠI
                      </span>
                    )}
                  </div>
                </Show>
              </div>
            </div>
          </Show>
        </Show>
      </div>
    </button>
  );
}
