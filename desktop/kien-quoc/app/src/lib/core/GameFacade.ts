/**
 * Game Facade
 *
 * Unified API for game operations that delegates to the active mode.
 * This is the primary interface that components should use.
 */

import { createSignal, createEffect, onCleanup } from 'solid-js';
import type { IGameMode, GameStateDTO, GameInitParams, Team, Placements } from './GameMode';
import type { RegionId } from '~/config/regions';
import type { GameMode as GameModeType } from '~/config/constants';
import { OfflineMode, getOfflineMode, resetOfflineMode } from './OfflineMode';
import { OnlineMode, getOnlineMode, resetOnlineMode } from './OnlineMode';

// ============================================================================
// GAME FACADE CLASS
// ============================================================================

export class GameFacade {
  private mode: IGameMode | null = null;
  private modeType: GameModeType = 'offline';

  // ---- Configuration ----

  /**
   * Set game mode (online or offline)
   * If already set to the same mode, does nothing (preserves state)
   */
  setMode(type: GameModeType): void {
    // Skip if already set to the same mode (preserves existing state)
    if (this.mode && this.modeType === type) {
      return;
    }

    // Clean up previous mode if different
    if (this.mode) {
      this.mode.destroy();
    }

    this.modeType = type;

    if (type === 'online') {
      resetOnlineMode();
      this.mode = getOnlineMode();
    } else {
      resetOfflineMode();
      this.mode = getOfflineMode();
    }
  }

  /**
   * Check if online mode
   */
  isOnline(): boolean {
    return this.modeType === 'online';
  }

  /**
   * Get current mode type
   */
  getModeType(): GameModeType {
    return this.modeType;
  }

  // ---- Mode Delegation ----

  private getMode(): IGameMode {
    if (!this.mode) {
      throw new Error('Game mode not initialized. Call setMode() first.');
    }
    return this.mode;
  }

  // ---- State Queries ----

  getState(): GameStateDTO {
    return this.getMode().getState();
  }

  getTeam(id: RegionId): Team | null {
    return this.getMode().getTeam(id);
  }

  getAllTeams(): Record<RegionId, Team> {
    return this.getMode().getAllTeams();
  }

  getMyTeamId(): RegionId | null {
    return this.getMode().getMyTeamId();
  }

  canControl(): boolean {
    return this.getMode().canControl();
  }

  canAllocate(): boolean {
    return this.getMode().canAllocate();
  }

  // Convenience: Check if user is a player (has a team)
  canPlay(): boolean {
    return this.getMyTeamId() !== null;
  }

  // ---- Actions ----

  async submitPlacements(placements: Placements): Promise<void> {
    const teamId = this.getMyTeamId();
    if (!teamId) return;
    await this.getMode().submitPlacements(teamId, placements);
  }

  async cancelSubmission(): Promise<void> {
    const teamId = this.getMyTeamId();
    if (!teamId) return;
    await this.getMode().cancelSubmission(teamId);
  }

  async advancePhase(): Promise<void> {
    await this.getMode().advancePhase();
  }

  async togglePause(): Promise<void> {
    await this.getMode().togglePause();
  }

  async extendTime(seconds: number): Promise<void> {
    await this.getMode().extendTime(seconds);
  }

  // ---- Lifecycle ----

  async initialize(params: GameInitParams): Promise<void> {
    await this.getMode().initialize(params);
  }

  subscribe(callback: (state: GameStateDTO) => void): () => void {
    return this.getMode().subscribe(callback);
  }

  destroy(): void {
    if (this.mode) {
      this.mode.destroy();
      this.mode = null;
    }
  }

  // ---- Persistence (delegates to mode if supported) ----

  save(): void {
    const mode = this.getMode();
    if ('save' in mode && typeof mode.save === 'function') {
      mode.save();
    }
  }

  load(): boolean {
    const mode = this.getMode();
    if ('load' in mode && typeof mode.load === 'function') {
      return mode.load();
    }
    return false;
  }

  hasSavedGame(): boolean {
    const mode = this.getMode();
    if ('hasSavedGame' in mode && typeof mode.hasSavedGame === 'function') {
      return mode.hasSavedGame();
    }
    return false;
  }

  clearSavedGame(): void {
    const mode = this.getMode();
    if ('clearSavedGame' in mode && typeof mode.clearSavedGame === 'function') {
      mode.clearSavedGame();
    }
  }

  // ---- Online-Specific (for backward compatibility) ----

  /**
   * Set role for online mode
   */
  setOnlineRole(role: 'host' | 'player' | 'spectator'): void {
    if (this.mode instanceof OnlineMode) {
      this.mode.setRole(role);
    }
  }

  /**
   * Host game (online mode only)
   */
  async hostGame(password: string): Promise<boolean> {
    if (this.mode instanceof OnlineMode) {
      return this.mode.hostGame(password);
    }
    return false;
  }

  /**
   * Join team (online mode only)
   */
  async joinTeam(regionId: RegionId): Promise<void> {
    if (this.mode instanceof OnlineMode) {
      await this.mode.joinTeam(regionId);
    }
  }

  /**
   * Start game
   */
  async startGame(): Promise<void> {
    if (this.mode instanceof OnlineMode) {
      await this.mode.startGame();
    } else if (this.mode instanceof OfflineMode) {
      this.mode.startGame();
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let facadeInstance: GameFacade | null = null;

export function getGameFacade(): GameFacade {
  if (!facadeInstance) {
    facadeInstance = new GameFacade();
  }
  return facadeInstance;
}

export function resetGameFacade(): void {
  if (facadeInstance) {
    facadeInstance.destroy();
    facadeInstance = null;
  }
}

// ============================================================================
// SOLIDJS REACTIVE HOOK
// ============================================================================

/**
 * Create a reactive game state signal
 * Use this in components for automatic reactivity
 */
export function createGameState() {
  const facade = getGameFacade();
  const [state, setState] = createSignal<GameStateDTO>(facade.getState());

  createEffect(() => {
    const unsubscribe = facade.subscribe((newState) => {
      setState(newState);
    });

    onCleanup(() => {
      unsubscribe();
    });
  });

  return state;
}
