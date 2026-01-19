/**
 * Game Hooks
 * Reusable hooks for placement management and phase animations
 */
import { createSignal, createMemo, createEffect, onCleanup } from 'solid-js';
import type { Placements } from '~/lib/types';
import type { PhaseName } from '~/config/game';
import { RESOURCES_PER_TURN } from '~/config/game';
import { BOARD_CELLS } from '~/config/board';

/**
 * Hook for managing draft placements during action phase
 */
export function usePlacement() {
  const [draft, setDraft] = createSignal<Placements>({});

  const used = createMemo(() => Object.values(draft()).reduce((a, b) => a + b, 0));
  const remaining = createMemo(() => RESOURCES_PER_TURN - used());

  function update(cellId: string, delta: number) {
    const current = draft()[cellId] || 0;
    const newAmount = current + delta;

    // Validate
    if (newAmount < 0) return;
    if (delta > 0 && remaining() < delta) return;

    setDraft((prev) => {
      if (newAmount === 0) {
        const { [cellId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [cellId]: newAmount };
    });
  }

  function get(cellId: string): number {
    return draft()[cellId] || 0;
  }

  function reset() {
    setDraft({});
  }

  // Load draft from existing placements (used when canceling submission)
  function loadFrom(placements: Placements) {
    setDraft({ ...placements });
  }

  return { draft, used, remaining, update, get, reset, loadFrom };
}

/**
 * Hook for phase animations (tile reveal during resolution, progress during result)
 */
export function usePhaseAnimations(currentPhase: () => PhaseName) {
  const [phaseTimer, setPhaseTimer] = createSignal(0);
  const [revealedTiles, setRevealedTiles] = createSignal<string[]>([]);
  const [showingResults, setShowingResults] = createSignal(false);

  let timerInterval: ReturnType<typeof setInterval> | undefined;

  createEffect(() => {
    // Clear any existing interval
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = undefined;
    }

    const phase = currentPhase();

    if (phase === 'resolution') {
      // Resolution phase: reveal tiles one by one
      setPhaseTimer(0);
      setRevealedTiles([]);
      const tiles = BOARD_CELLS.filter((c) => c.type !== 'project');
      let idx = 0;
      timerInterval = setInterval(() => {
        if (idx < tiles.length) {
          setRevealedTiles((prev) => [...prev, tiles[idx].id]);
          idx++;
          setPhaseTimer((idx / tiles.length) * 100);
        } else {
          clearInterval(timerInterval);
          timerInterval = undefined;
        }
      }, 50);
    } else if (phase === 'result') {
      // Result phase: reveal ALL tiles and progress animation
      setRevealedTiles(BOARD_CELLS.filter((c) => c.type !== 'project').map((c) => c.id));
      setPhaseTimer(0);
      setShowingResults(true);
      let progress = 0;
      timerInterval = setInterval(() => {
        progress += 5;
        setPhaseTimer(progress);
        if (progress >= 100) {
          clearInterval(timerInterval);
          timerInterval = undefined;
          setShowingResults(false);
        }
      }, 50);
    } else if (phase === 'event') {
      // Event phase: reset all animations
      setPhaseTimer(0);
      setShowingResults(false);
      setRevealedTiles([]);
    } else {
      // Action phase: just reset timer
      setPhaseTimer(0);
      setShowingResults(false);
    }
  });

  onCleanup(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  });

  return { phaseTimer, revealedTiles, showingResults };
}

/**
 * Hook for countdown timer (online mode only)
 * Also accepts pausedRemainingMs for showing time during pause
 */
export function useTimer(
  phaseEndTime: () => number,
  status: () => string,
  pausedRemainingMs?: () => number | undefined
) {
  const [remaining, setRemaining] = createSignal(0);

  let interval: ReturnType<typeof setInterval> | undefined;

  createEffect(() => {
    if (interval) {
      clearInterval(interval);
      interval = undefined;
    }

    const currentStatus = status();

    if (currentStatus === 'playing') {
      // Active: countdown from phaseEndTime
      interval = setInterval(() => {
        const endTime = phaseEndTime();
        const rem = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        setRemaining(rem);
      }, 100);
    } else if (currentStatus === 'paused') {
      // Paused: show the frozen remaining time
      const pausedMs = pausedRemainingMs?.() ?? 0;
      setRemaining(Math.floor(pausedMs / 1000));
    } else {
      setRemaining(0);
    }
  });

  onCleanup(() => {
    if (interval) {
      clearInterval(interval);
    }
  });

  const formatted = createMemo(() => {
    const secs = remaining();
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  });

  const isWarning = createMemo(() => remaining() <= 10 && remaining() > 0);
  const isExpired = createMemo(() => remaining() === 0 && status() === 'playing');

  return { remaining, formatted, isWarning, isExpired };
}

/**
 * Utility to format time in MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
