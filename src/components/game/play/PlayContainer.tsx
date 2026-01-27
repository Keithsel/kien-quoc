/**
 * PlayContainer Component
 * Main game layout wrapper that orchestrates all play components
 *
 * IMPORTANT: Child components use useGame() directly for reactivity.
 * We only pass handler props and placement-related data.
 */
import { createSignal, createMemo, createEffect, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import type { BoardCell } from '~/config/board';
import { PROJECT_CELLS } from '~/config/board';
import type { RegionId } from '~/config/regions';
import { getRegion } from '~/config/regions';
import { useGame } from '~/lib/game/context';
import { usePlacement, usePhaseAnimations, useTimer } from '~/lib/game/hooks';
import { getGameFacade, resetGameFacade } from '~/lib/core';
import { getTeamRpForTurn } from '~/lib/scoring';
import { Pause } from 'lucide-solid';

import PlayHeader from './PlayHeader';
import PlayBoard from './PlayBoard';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import { CellModal, EventPopup, GameOverModal, InstructionModal } from '~/components/game/modals';

export default function PlayContainer() {
  const navigate = useNavigate();
  const game = useGame();

  // Calculate team-specific RP (includes underdog bonus)
  const teamMaxRP = createMemo(() => {
    const myTeamId = game.myTeamId();
    if (!myTeamId) return 14;

    const teams = game.teams();
    const cumulativePoints: Partial<Record<RegionId, number>> = {};
    for (const [regionId, team] of Object.entries(teams)) {
      if (team.ownerId !== null) {
        cumulativePoints[regionId as RegionId] = team.points;
      }
    }
    return getTeamRpForTurn(myTeamId, cumulativePoints as Record<RegionId, number>, game.currentTurn());
  });

  // UI state
  const [selectedCell, setSelectedCell] = createSignal<BoardCell | null>(null);
  const [showCellModal, setShowCellModal] = createSignal(false);
  const [showEventPopup, setShowEventPopup] = createSignal(false);
  const [showInstructions, setShowInstructions] = createSignal(false);
  const [originalPlacement, setOriginalPlacement] = createSignal(0); // For cancel revert

  // Hooks - pass reactive maxRP for underdog bonus
  const placement = usePlacement(teamMaxRP);
  const animations = usePhaseAnimations(game.currentPhase);
  const facade = getGameFacade();
  // Get pausedRemainingMs from state for proper timer display during pause
  const pausedRemainingMs = () => {
    const state = facade.getState();
    return (state as unknown as { pausedRemainingMs?: number })?.pausedRemainingMs;
  };
  const timer = useTimer(game.phaseEndTime, game.status, pausedRemainingMs);

  // Show event popup when entering event phase
  createEffect(() => {
    if (game.currentPhase() === 'event' && game.event()) {
      setShowEventPopup(true);
    }
  });

  // Reset placements and close modal when ENTERING action phase (transition from non-action to action)
  let previousPhase = game.currentPhase();
  createEffect(() => {
    const currentPhase = game.currentPhase();
    // Only reset when transitioning TO action phase from a different phase
    if (currentPhase === 'action' && previousPhase !== 'action') {
      placement.reset();
      setSelectedCell(null);
      setShowCellModal(false);
    }
    previousPhase = currentPhase;
  });

  // Watch for game ended/reset by host - redirect immediately without modal
  createEffect(() => {
    if (game.isOnline()) {
      const status = game.status();
      // Redirect to lobby when game is ended or reset to lobby state
      if (status === 'ended' || status === 'lobby') {
        navigate('/lobby');
      }
    }
  });

  // Handlers
  function handleCellClick(cell: BoardCell) {
    // Block if not in action phase, can't allocate, or timer expired
    const isAction = game.currentPhase() === 'action' && game.canAllocate() && !timer.isExpired();
    if (!isAction) return;
    setSelectedCell(cell);
    // Save original placement for cancel revert
    if (cell.type === 'project') {
      setOriginalPlacement(PROJECT_CELLS.reduce((sum, c) => sum + placement.get(c.id), 0));
    } else {
      setOriginalPlacement(placement.get(cell.id));
    }
    setShowCellModal(true);
  }

  function handlePlacementUpdate(delta: number) {
    const cell = selectedCell();
    if (!cell) return;

    if (cell.type === 'project') {
      placement.update(PROJECT_CELLS[0].id, delta);
    } else {
      placement.update(cell.id, delta);
    }
  }

  function handleSubmit() {
    game.submitPlacements(placement.draft());

    // Only reset in offline mode - in online mode, keep showing placements
    // until phase changes (reset is triggered by action phase effect)
    if (!game.isOnline()) {
      placement.reset();
      // In offline mode, auto-advance to next phase after submit
      game.advancePhase();
    }
  }

  function handleCancelSubmission() {
    // Get my team's current placements from Firebase to restore the draft
    const myTeam = game.myTeamId();
    if (myTeam) {
      const teamData = game.teams()[myTeam];
      if (teamData?.placements) {
        placement.loadFrom(teamData.placements);
      }
    }
    // Cancel the submission in Firebase
    game.cancelSubmission();
  }

  function handleAdvancePhase() {
    // If in action phase, auto-submit any pending allocations first
    if (game.currentPhase() === 'action' && !game.isOnline()) {
      game.submitPlacements(placement.draft());
      placement.reset();
    }
    game.advancePhase();
  }

  function handleTogglePause() {
    game.togglePause();
  }

  function handleBack() {
    // Offline goes to mode selection, online goes to role selection
    navigate(game.isOnline() ? '/online' : '/mode');
  }

  function handlePlayAgain() {
    // Clear saved game and fully reset the game facade singleton
    facade.clearSavedGame();
    resetGameFacade(); // This resets the singleton so region.tsx creates fresh state
    navigate('/region?mode=offline');
  }

  function handleQuit() {
    // Go home but keep save (can continue later)
    navigate('/');
  }

  function handleProjectClick() {
    const isAction = game.currentPhase() === 'action' && game.canAllocate();
    if (isAction) {
      setSelectedCell(PROJECT_CELLS[0]);
      setShowCellModal(true);
    } else {
      setShowEventPopup(true);
    }
  }

  function handleCancelModal() {
    const cell = selectedCell();
    if (cell) {
      // Revert to original placement
      const cellId = cell.type === 'project' ? PROJECT_CELLS[0].id : cell.id;
      const current = placement.get(cellId);
      const delta = originalPlacement() - current;
      if (delta !== 0) {
        placement.update(cellId, delta);
      }
    }
    setShowCellModal(false);
  }

  const currentCellPlacement = createMemo(() => {
    const cell = selectedCell();
    if (!cell) return 0;
    if (cell.type === 'project') {
      return PROJECT_CELLS.reduce((sum, c) => sum + placement.get(c.id), 0);
    }
    return placement.get(cell.id);
  });

  // Check if game is paused
  const isPaused = () => game.status() === 'paused';

  return (
    <main class="min-h-screen bg-linear-to-br from-red-50 to-amber-50 flex flex-col">
      {/* Header - uses useGame() internally for reactivity */}
      <PlayHeader
        onAdvancePhase={handleAdvancePhase}
        onTogglePause={handleTogglePause}
        onShowEvent={() => setShowEventPopup(true)}
        onShowInstructions={() => setShowInstructions(true)}
        onBack={handleBack}
        onReset={handlePlayAgain}
        timer={timer}
      />

      {/* Paused banner - show for players/spectators when game is paused */}
      <Show when={isPaused() && game.isOnline()}>
        <div class="px-4 py-2 bg-orange-100 border-b border-orange-200 text-center text-orange-700 font-bold flex items-center justify-center gap-2">
          <Pause class="w-4 h-4" /> TẠM DỪNG - Đang chờ quản trò tiếp tục...
        </div>
      </Show>

      {/* Main content - 12 column grid */}
      <div class="flex-1 grid grid-cols-12 gap-3 p-3">
        {/* Left Sidebar - uses useGame() internally for national indices */}
        <LeftSidebar
          usedResources={placement.used()}
          remainingResources={placement.remaining()}
          maxRP={teamMaxRP()}
          onSubmit={handleSubmit}
          onCancelSubmission={handleCancelSubmission}
          onClearAll={() => placement.reset()}
          timerExpired={timer.isExpired()}
        />

        {/* Board - still needs props for placement/animation state */}
        <PlayBoard
          currentPhase={game.currentPhase()}
          teams={game.teams()}
          event={game.event()}
          projectRP={game.projectRP()}
          projectTeams={game.projectTeams()}
          lastTurnResult={game.lastTurnResult()}
          draftPlacements={placement.draft()}
          revealedTiles={animations.revealedTiles()}
          showingResults={animations.showingResults()}
          phaseTimer={animations.phaseTimer()}
          isActionPhase={game.currentPhase() === 'action' && game.canAllocate()}
          onCellClick={handleCellClick}
          isPaused={isPaused() && game.isOnline()}
          specializedIndices={game.myTeamId() ? getRegion(game.myTeamId()!)?.specializedIndices : undefined}
          modifierEffect={game.modifierEffect()}
        />

        {/* Right Sidebar - uses useGame() internally */}
        <RightSidebar onProjectClick={handleProjectClick} />
      </div>

      {/* Modals */}
      <Show when={showCellModal() && selectedCell()}>
        <CellModal
          cell={selectedCell()!}
          placement={currentCellPlacement()}
          remainingResources={placement.remaining()}
          onUpdate={handlePlacementUpdate}
          onClose={() => setShowCellModal(false)}
          onCancel={handleCancelModal}
        />
      </Show>

      <Show when={showEventPopup() && game.scaledEvent()}>
        <EventPopup
          event={game.scaledEvent()!}
          turn={game.currentTurn()}
          lastTurnResult={game.lastTurnResult()}
          randomModifier={game.randomModifiers()?.[game.currentTurn() - 1]}
          onClose={() => setShowEventPopup(false)}
        />
      </Show>

      <Show when={showInstructions()}>
        <InstructionModal onClose={() => setShowInstructions(false)} />
      </Show>

      <Show when={game.gameOver()}>
        <GameOverModal
          gameOver={game.gameOver()!}
          teams={game.teams()}
          myTeamId={game.myTeamId()}
          onPlayAgain={handlePlayAgain}
          onQuit={handleQuit}
          isOnline={game.isOnline()}
          role={game.role() === 'spectator' ? 'spectator' : 'player'}
          onLobby={() => navigate('/lobby?mode=online&role=' + game.role())}
        />
      </Show>

      <style>{`
				@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
				.animate-scale-in { animation: scale-in 0.2s ease-out; }
			`}</style>
    </main>
  );
}
