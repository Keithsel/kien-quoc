/**
 * Offline Game Mode Implementation
 *
 * Implements IGameMode interface for offline/single-player games.
 * Uses transactional store for consistent state updates.
 */

import type { IGameMode, GameStateDTO, GameInitParams, Team, Placements, TurnEvent } from './GameMode';
import type { RegionId } from '~/config/regions';
import { REGIONS } from '~/config/regions';
import { PHASE_ORDER, MAX_TURNS } from '~/config/game';
import { RANDOM_MODIFIER_POOL, type RandomModifierId } from '~/config/events';
import { getTeamRpForTurn } from '~/lib/scoring';

import {
  offlineState,
  resetOfflineState,
  setOfflineState,
  updateTeam,
  batchUpdate,
  saveOfflineGame,
  loadOfflineGame,
  hasSavedOfflineGame,
  clearSavedOfflineGame,
  offlineTransactionExecutor
} from '~/lib/data/OfflineStore';
import { createTransaction } from '~/lib/data/Transaction';
import {
  processTurn,
  checkGameOver,
  isGameComplete,
  prepareNextTurn,
  generateFinalRanking,
  shuffleArray,
  calculateNewTeamPoints,
  // AI Management
  createAgent,
  clearAllAgents,
  generateAllPlacements
} from '~/lib/domain';

// ============================================================================
// OFFLINE MODE CLASS
// ============================================================================

export class OfflineMode implements IGameMode {
  private subscribers = new Set<(state: GameStateDTO) => void>();

  // ---- State Queries ----

  getState(): GameStateDTO {
    return offlineState;
  }

  getTeam(id: RegionId): Team | null {
    return offlineState.teams[id] ?? null;
  }

  getAllTeams(): Record<RegionId, Team> {
    return offlineState.teams;
  }

  getMyTeamId(): RegionId | null {
    for (const [id, team] of Object.entries(offlineState.teams)) {
      if (team.ownerId === 'player') return id as RegionId;
    }
    return null;
  }

  canControl(): boolean {
    // In offline mode, player always has control
    return true;
  }

  canAllocate(): boolean {
    const myTeamId = this.getMyTeamId();
    if (!myTeamId) return false;
    const team = this.getTeam(myTeamId);
    return offlineState.status === 'playing' && offlineState.currentPhase === 'action' && !team?.submitted;
  }

  // ---- Actions ----

  async submitPlacements(teamId: RegionId, placements: Placements): Promise<void> {
    const team = offlineState.teams[teamId];
    if (!team || team.submitted) return;

    // Calculate team-specific RP limit (includes underdog bonus)
    const cumulativePoints: Partial<Record<RegionId, number>> = {};
    for (const [regionId, t] of Object.entries(offlineState.teams)) {
      if (t.ownerId !== null) {
        cumulativePoints[regionId as RegionId] = t.points;
      }
    }
    const maxRP = getTeamRpForTurn(teamId, cumulativePoints as Record<RegionId, number>, offlineState.currentTurn);

    const total = Object.values(placements).reduce((a, b) => a + b, 0);
    if (total > maxRP) return;

    const tx = createTransaction();
    tx.update(`teams.${teamId}`, { placements, submitted: true });
    await offlineTransactionExecutor.execute(tx);

    this.notifySubscribers();
  }

  async cancelSubmission(teamId: RegionId): Promise<void> {
    updateTeam(teamId, { submitted: false });
    this.notifySubscribers();
  }

  async advancePhase(): Promise<void> {
    const currentIndex = PHASE_ORDER.indexOf(offlineState.currentPhase);

    if (offlineState.currentPhase === 'resolution') {
      // Process results and move to result phase
      this.processResults();
      batchUpdate({
        currentPhase: 'result',
        phaseEndTime: Date.now() + 24 * 60 * 60 * 1000 // 24 hours - no timeout in offline
      });
    } else if (offlineState.currentPhase === 'result') {
      // End of turn - move to next turn
      this.processEndOfTurn();
    } else {
      // Normal phase transition
      const nextPhase = PHASE_ORDER[currentIndex + 1];
      batchUpdate({
        currentPhase: nextPhase,
        phaseEndTime: Date.now() + 24 * 60 * 60 * 1000 // 24 hours - no timeout in offline
      });

      // Run AI turns when action phase starts
      if (nextPhase === 'action') {
        this.runAITurns();
      }
    }

    // Auto-save after phase change
    if (offlineState.status === 'playing') {
      this.save();
    }

    this.notifySubscribers();
  }

  async togglePause(): Promise<void> {
    if (offlineState.status === 'playing') {
      setOfflineState('status', 'paused');
    } else if (offlineState.status === 'paused') {
      batchUpdate({
        status: 'playing',
        phaseEndTime: Date.now() + 24 * 60 * 60 * 1000 // 24 hours - no timeout in offline
      });
    }
    this.notifySubscribers();
  }

  async extendTime(seconds: number): Promise<void> {
    setOfflineState('phaseEndTime', offlineState.phaseEndTime + seconds * 1000);
    this.notifySubscribers();
  }

  // ---- Lifecycle ----

  async initialize(params: GameInitParams): Promise<void> {
    resetOfflineState();
    clearAllAgents();

    if (params.playerRegion) {
      // Set up player team
      updateTeam(params.playerRegion, {
        ownerId: 'player',
        connected: true
      });

      // Set up AI teams
      for (const region of REGIONS) {
        if (region.id !== params.playerRegion) {
          updateTeam(region.id, {
            ownerId: `ai-${region.id}`,
            connected: true,
            isAI: true
          });
          createAgent(region.id);
        }
      }

      // Count active teams
      const activeCount = REGIONS.length;
      setOfflineState('activeTeamCount', activeCount);

      // Shuffle random modifiers for each turn (8 turns, take first 8 from shuffled pool)
      const shuffledModifiers = shuffleArray(RANDOM_MODIFIER_POOL).slice(0, 8) as RandomModifierId[];
      setOfflineState('randomModifiers', shuffledModifiers);
    }

    this.notifySubscribers();
  }

  subscribe(callback: (state: GameStateDTO) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  destroy(): void {
    this.subscribers.clear();
    clearAllAgents();
    // Reset the store state to initial values
    resetOfflineState();
  }

  // ---- Persistence ----

  save(): void {
    saveOfflineGame();
  }

  load(): boolean {
    const saved = loadOfflineGame();
    if (!saved) return false;

    // Re-initialize with saved player region
    this.initialize({ playerRegion: saved.playerRegion });

    // Restore state
    batchUpdate({
      status: saved.state.status,
      currentTurn: saved.state.currentTurn,
      currentPhase: saved.state.currentPhase,
      phaseEndTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours - no timeout in offline
      nationalIndices: saved.state.nationalIndices,
      activeTeamCount: saved.state.activeTeamCount,
      currentEvent: saved.state.currentEvent,
      project: saved.state.project,
      lastTurnResult: saved.state.lastTurnResult,
      gameOver: saved.state.gameOver,
      turnHistory: saved.state.turnHistory,
      randomModifiers: saved.state.randomModifiers
    });

    // Restore team state
    for (const [id, team] of Object.entries(saved.state.teams)) {
      updateTeam(id as RegionId, {
        points: team.points,
        placements: team.placements,
        submitted: team.submitted
      });
    }

    this.notifySubscribers();
    return true;
  }

  hasSavedGame(): boolean {
    return hasSavedOfflineGame();
  }

  clearSavedGame(): void {
    clearSavedOfflineGame();
  }

  // ---- Game Start ----

  startGame(): void {
    if (offlineState.status !== 'lobby') return;

    const event = this.getScaledEvent(1);

    batchUpdate({
      status: 'playing',
      currentTurn: 1,
      currentPhase: 'event',
      phaseEndTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours - no timeout in offline
      currentEvent: event
    });

    this.notifySubscribers();
  }

  // ---- Private Methods ----

  private notifySubscribers(): void {
    const state = this.getState();
    for (const callback of this.subscribers) {
      callback(state);
    }
  }

  private getScaledEvent(turn: number): TurnEvent | null {
    return prepareNextTurn(turn, offlineState.activeTeamCount);
  }

  private runAITurns(): void {
    const event = offlineState.currentEvent;
    if (!event) return;

    // Build team scores map
    const teamScores: Record<RegionId, number> = {} as Record<RegionId, number>;
    for (const [regionId, team] of Object.entries(offlineState.teams)) {
      if (team.ownerId !== null) {
        teamScores[regionId as RegionId] = team.points;
      }
    }

    // Generate all AI placements at once
    const allPlacements = generateAllPlacements(
      offlineState.currentTurn,
      teamScores,
      offlineState.nationalIndices,
      event
    );

    // Update teams with placements
    for (const [regionId, placements] of Object.entries(allPlacements)) {
      updateTeam(regionId as RegionId, { placements, submitted: true });
    }

    this.notifySubscribers();
  }

  private processResults(): void {
    // Build placements map for active teams
    const allPlacements: Partial<Record<RegionId, Placements>> = {};
    const cumulativePoints: Record<RegionId, number> = {} as Record<RegionId, number>;
    const teamInfo: Record<RegionId, { name: string; isAI?: boolean }> = {} as Record<
      RegionId,
      { name: string; isAI?: boolean }
    >;

    for (const [regionId, team] of Object.entries(offlineState.teams)) {
      if (team.ownerId !== null) {
        allPlacements[regionId as RegionId] = team.placements;
        cumulativePoints[regionId as RegionId] = team.points;
        teamInfo[regionId as RegionId] = { name: team.name, isAI: team.isAI };
      }
    }

    // Use domain layer to process turn
    const result = processTurn({
      turn: offlineState.currentTurn,
      placements: allPlacements as Record<RegionId, Placements>,
      currentIndices: offlineState.nationalIndices,
      activeTeamCount: offlineState.activeTeamCount,
      cumulativePoints,
      randomModifiers: offlineState.randomModifiers,
      currentEvent: offlineState.currentEvent,
      teams: teamInfo,
      isLastTurn: offlineState.currentTurn >= MAX_TURNS
    });

    // Update indices
    setOfflineState('nationalIndices', result.finalIndices);

    // Update team points and cumulative allocations
    for (const [regionId, points] of Object.entries(result.turnResult.teamPoints)) {
      const team = offlineState.teams[regionId as RegionId];

      // Accumulate allocations
      const cumulative = { ...(team.cumulativeAllocations || {}) };
      for (const [cellId, rp] of Object.entries(team.placements || {})) {
        cumulative[cellId] = (cumulative[cellId] || 0) + rp;
      }

      updateTeam(regionId as RegionId, {
        points: calculateNewTeamPoints(team.points, points),
        cumulativeAllocations: cumulative
      });
    }

    // Update project and result state
    batchUpdate({
      lastTurnResult: result.turnResult,
      project: result.projectState
    });

    // Record turn history for export
    const existingHistory = offlineState.turnHistory || [];
    setOfflineState('turnHistory', [...existingHistory, result.historyEntry]);
  }

  private processEndOfTurn(): void {
    // Check for game over (index <= 0)
    const gameOverCheck = checkGameOver(offlineState.nationalIndices);
    if (gameOverCheck.gameOver) {
      this.endGame('index_zero', gameOverCheck.zeroIndex);
      return;
    }

    // Check if max turns reached
    if (isGameComplete(offlineState.currentTurn)) {
      this.endGame('completed');
      return;
    }

    // Clear placements and reset submitted for all teams
    for (const regionId of Object.keys(offlineState.teams) as RegionId[]) {
      updateTeam(regionId, { placements: {}, submitted: false });
    }

    // Advance to next turn
    const nextTurn = offlineState.currentTurn + 1;
    const event = this.getScaledEvent(nextTurn);

    batchUpdate({
      currentTurn: nextTurn,
      currentPhase: 'event',
      phaseEndTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours - no timeout in offline
      currentEvent: event,
      project: { totalRP: 0, teamCount: 0, success: null }
    });
  }

  private endGame(reason: 'completed' | 'index_zero', zeroIndex?: keyof typeof offlineState.nationalIndices): void {
    const ranking = generateFinalRanking(
      offlineState.teams as Record<
        RegionId,
        { points: number; ownerId: string | null; connected?: boolean; isAI?: boolean }
      >
    );

    batchUpdate({
      status: 'finished',
      gameOver: { reason, zeroIndex, finalRanking: ranking }
    });

    this.notifySubscribers();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let offlineModeInstance: OfflineMode | null = null;

export function getOfflineMode(): OfflineMode {
  if (!offlineModeInstance) {
    offlineModeInstance = new OfflineMode();
  }
  return offlineModeInstance;
}

export function resetOfflineMode(): void {
  if (offlineModeInstance) {
    offlineModeInstance.destroy();
    offlineModeInstance = null;
  }
}
