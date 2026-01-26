/**
 * Unified Game Context (Refactored)
 *
 * Provides reactive game state via GameFacade.
 * All mode-specific logic is handled internally by the facade.
 *
 * CRITICAL: SolidJS reactivity is maintained through createMemo/createSignal
 * that track the facade's state changes via subscription.
 */
import { createContext, useContext, createEffect, createSignal, createMemo, onCleanup, type JSX } from 'solid-js';
import {
  getGameFacade,
  type GameStateDTO,
  type Team,
  type Placements,
  type TurnEvent,
  type TurnResult,
  type GameOver,
  type NationalIndices,
  type RandomModifierId
} from '~/lib/core';
import type { RegionId } from '~/config/regions';
import type { PhaseName, GameMode as GameModeType } from '~/config/game';
import { PROJECT_CELLS } from '~/config/board';

export type GameRole = 'player' | 'host' | 'spectator';

export interface GameContextValue {
  // Mode & Role
  isOnline: () => boolean;
  role: () => GameRole;
  canControl: () => boolean;
  canPlay: () => boolean;
  canAdvance: () => boolean;
  canAllocate: () => boolean;
  showTimer: () => boolean;

  // State Accessors
  status: () => 'lobby' | 'playing' | 'paused' | 'finished' | 'ended';
  currentTurn: () => number;
  currentPhase: () => PhaseName;
  teams: () => Record<RegionId, Team>;
  nationalIndices: () => NationalIndices;
  projectRP: () => number;
  projectTeams: () => number;
  projectSuccess: () => boolean | null;
  phaseEndTime: () => number;
  myTeamId: () => RegionId | null;
  event: () => TurnEvent | null;
  activeTeamCount: () => number;
  scaledEvent: () => TurnEvent | null;
  lastTurnResult: () => TurnResult | undefined;
  gameOver: () => GameOver | undefined;
  randomModifiers: () => RandomModifierId[] | undefined;

  // Actions
  advancePhase: () => Promise<void>;
  submitPlacements: (placements: Placements) => Promise<void>;
  cancelSubmission: () => Promise<void>;
  togglePause: () => Promise<void>;
  myTeamSubmitted: () => boolean;
}

const GameContext = createContext<GameContextValue>();

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

interface GameProviderProps {
  mode: GameModeType;
  children: JSX.Element;
  /** Online role (required for online mode) */
  onlineRole?: 'host' | 'player' | 'spectator';
}

export function GameProvider(props: GameProviderProps) {
  const facade = getGameFacade();

  // Set the mode - this is safe and just selects which mode implementation to use
  facade.setMode(props.mode);

  if (props.mode === 'online' && props.onlineRole) {
    facade.setOnlineRole(props.onlineRole);
    // For online mode, ensure Firebase subscription is active
    // This is safe to call multiple times - it just sets up the subscription
    facade.initialize({});
  }

  // Reactive state signal - updated via subscription
  const [state, setState] = createSignal<GameStateDTO>(facade.getState());

  // Subscribe to state changes
  createEffect(() => {
    const unsubscribe = facade.subscribe((newState) => {
      setState(newState);
    });

    onCleanup(() => {
      unsubscribe();
    });
  });

  // ---- Computed Values ----

  const isOnline = () => props.mode === 'online';

  const role = createMemo((): GameRole => {
    if (!isOnline()) return 'player';
    if (props.onlineRole === 'host') return 'host';
    if (props.onlineRole === 'player') return 'player';
    return 'spectator';
  });

  const canControl = createMemo(() => facade.canControl());
  const canPlay = createMemo(() => facade.canPlay());
  const canAdvance = createMemo(() => facade.canControl());
  const canAllocate = createMemo(() => facade.canAllocate());
  const showTimer = createMemo(() => isOnline() && state().currentPhase === 'action');

  // ---- State Accessors ----

  const status = createMemo(() => state().status);
  const currentTurn = createMemo(() => state().currentTurn);
  const currentPhase = createMemo(() => state().currentPhase);
  const teams = createMemo(() => state().teams);
  const nationalIndices = createMemo(() => state().nationalIndices);
  const phaseEndTime = createMemo(() => state().phaseEndTime);
  const activeTeamCount = createMemo(() => state().activeTeamCount);
  const lastTurnResult = createMemo(() => state().lastTurnResult);
  const gameOver = createMemo(() => state().gameOver);

  const myTeamId = createMemo(() => facade.getMyTeamId());

  const event = createMemo(() => state().currentEvent);
  const scaledEvent = createMemo(() => state().currentEvent);
  const randomModifiers = createMemo(() => state().randomModifiers);

  // Live project progress - calculate from team placements
  const projectRP = createMemo(() => {
    const s = state();
    if (s.currentPhase === 'result') {
      return s.project.totalRP;
    }
    // Calculate live from placements
    let total = 0;
    for (const team of Object.values(s.teams)) {
      if (!team.placements) continue;
      for (const cell of PROJECT_CELLS) {
        total += team.placements[cell.id] || 0;
      }
    }
    return total;
  });

  const projectTeams = createMemo(() => {
    const s = state();
    if (s.currentPhase === 'result') {
      return s.project.teamCount;
    }
    // Calculate live
    let count = 0;
    for (const team of Object.values(s.teams)) {
      if (!team.placements) continue;
      const teamRP = PROJECT_CELLS.reduce((sum, cell) => sum + (team.placements[cell.id] || 0), 0);
      if (teamRP > 0) count++;
    }
    return count;
  });

  const projectSuccess = createMemo(() => {
    const s = state();
    if (s.currentPhase === 'result') {
      return s.project.success;
    }
    // Calculate live
    const ev = s.currentEvent;
    if (!ev) return null;
    return projectRP() >= ev.minTotal && projectTeams() >= ev.minTeams;
  });

  const myTeamSubmitted = createMemo(() => {
    const teamId = myTeamId();
    if (!teamId) return false;
    const team = teams()[teamId];
    return team?.submitted ?? false;
  });

  // ---- Actions ----

  async function advancePhase() {
    if (!canControl()) return;
    await facade.advancePhase();
  }

  async function submitPlacements(placements: Placements) {
    if (!canPlay()) return;
    await facade.submitPlacements(placements);
  }

  async function cancelSubmission() {
    if (!canPlay()) return;
    await facade.cancelSubmission();
  }

  async function togglePause() {
    if (!canControl()) return;
    await facade.togglePause();
  }

  // ---- Context Value ----

  const contextValue: GameContextValue = {
    isOnline,
    role: () => role(),
    canControl: () => canControl(),
    canPlay: () => canPlay(),
    canAdvance: () => canAdvance(),
    canAllocate: () => canAllocate(),
    showTimer: () => showTimer(),
    status: () => status(),
    currentTurn: () => currentTurn(),
    currentPhase: () => currentPhase(),
    teams: () => teams(),
    nationalIndices: () => nationalIndices(),
    projectRP: () => projectRP(),
    projectTeams: () => projectTeams(),
    projectSuccess: () => projectSuccess(),
    phaseEndTime: () => phaseEndTime(),
    myTeamId: () => myTeamId(),
    event: () => event(),
    activeTeamCount: () => activeTeamCount(),
    scaledEvent: () => scaledEvent(),
    lastTurnResult: () => lastTurnResult(),
    gameOver: () => gameOver(),
    randomModifiers: () => randomModifiers(),
    advancePhase,
    submitPlacements,
    cancelSubmission,
    togglePause,
    myTeamSubmitted: () => myTeamSubmitted()
  };

  return <GameContext.Provider value={contextValue}>{props.children}</GameContext.Provider>;
}
