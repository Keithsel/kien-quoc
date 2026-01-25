/**
 * Offline Game Mode Implementation
 *
 * Implements IGameMode interface for offline/single-player games.
 * Uses transactional store for consistent state updates.
 */

import type { IGameMode, GameStateDTO, GameInitParams, Team, Placements, TurnEvent } from './GameMode';
import type { RegionId } from '~/config/regions';
import { REGIONS } from '~/config/regions';
import {
  PHASE_DURATIONS,
  PHASE_ORDER,
  RESOURCES_PER_TURN,
  MAX_TURNS,
  INITIAL_INDICES,
  MAINTENANCE_COST,
  type PhaseName
} from '~/config/game';
import { TURN_EVENTS, getScaledRequirements } from '~/config/events';

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
import { calculateTurnScores, applyProjectResult, updateIndicesFromCells } from '~/lib/scoring';
import { RealisticAdaptiveAgent } from '~/lib/ai';

// ============================================================================
// AI AGENTS
// ============================================================================

const aiAgents = new Map<RegionId, RealisticAdaptiveAgent>();

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

    const total = Object.values(placements).reduce((a, b) => a + b, 0);
    if (total > RESOURCES_PER_TURN) return;

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
    aiAgents.clear();

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
          aiAgents.set(region.id, new RealisticAdaptiveAgent(region.id));
        }
      }

      // Count active teams
      const activeCount = REGIONS.length;
      setOfflineState('activeTeamCount', activeCount);
    }

    this.notifySubscribers();
  }

  subscribe(callback: (state: GameStateDTO) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  destroy(): void {
    this.subscribers.clear();
    aiAgents.clear();
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
      gameOver: saved.state.gameOver
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
    const event = TURN_EVENTS[turn - 1];
    if (!event) return null;

    const { minTotal, minTeams } = getScaledRequirements(event, offlineState.activeTeamCount);

    return { ...event, minTotal, minTeams };
  }

  private runAITurns(): void {
    const event = offlineState.currentEvent;
    if (!event) return;

    const teams = Object.values(offlineState.teams).filter((t) => t.ownerId !== null);
    const avgScore = teams.reduce((sum, t) => sum + t.points, 0) / teams.length || 1;

    for (const [regionId, agent] of aiAgents) {
      const team = offlineState.teams[regionId];
      const placements = agent.generatePlacements(
        offlineState.currentTurn,
        team.points,
        avgScore,
        offlineState.nationalIndices,
        event
      );
      updateTeam(regionId, { placements, submitted: true });
    }

    this.notifySubscribers();
  }

  private processResults(): void {
    const allPlacements: Partial<Record<RegionId, Placements>> = {};
    for (const [regionId, team] of Object.entries(offlineState.teams)) {
      if (team.ownerId !== null) {
        allPlacements[regionId as RegionId] = team.placements;
      }
    }

    // Cast to full Record - functions handle missing entries gracefully
    const placementsRecord = allPlacements as Record<RegionId, Placements>;

    const result = calculateTurnScores(
      offlineState.currentTurn,
      placementsRecord,
      offlineState.nationalIndices,
      offlineState.activeTeamCount
    );

    const { newIndices: indicesAfterProject } = applyProjectResult(
      offlineState.currentTurn,
      result.success,
      offlineState.nationalIndices
    );

    const { newIndices: finalIndices, boosts } = updateIndicesFromCells(placementsRecord, indicesAfterProject);

    // Apply maintenance (skip on last turn - turn 8 - since game ends)
    if (offlineState.currentTurn < 8) {
      for (const [key, cost] of Object.entries(MAINTENANCE_COST)) {
        finalIndices[key as keyof typeof finalIndices] -= cost;
      }
    }

    // Update indices
    setOfflineState('nationalIndices', finalIndices);

    // Update team points (round to 2 decimal places)
    for (const [regionId, points] of Object.entries(result.teamPoints)) {
      const team = offlineState.teams[regionId as RegionId];
      updateTeam(regionId as RegionId, { points: Math.round((team.points + points) * 100) / 100 });
    }

    // Update project and result state
    batchUpdate({
      lastTurnResult: { ...result, zoneBoosts: boosts },
      project: {
        totalRP: result.totalRP,
        teamCount: result.teamCount,
        success: result.success
      }
    });

    // Record turn history for export
    const historyEntry = {
      turn: offlineState.currentTurn,
      activeTeams: Object.entries(offlineState.teams)
        .filter(([, t]) => t.ownerId !== null)
        .map(([id]) => id as RegionId),
      teamFormationSummary: `${Object.values(offlineState.teams).filter((t) => t.ownerId !== null).length} teams (${Object.values(offlineState.teams).filter((t) => t.ownerId === 'player').length} Human, ${Object.values(offlineState.teams).filter((t) => t.isAI).length} AI)`,
      event: {
        name: offlineState.currentEvent?.name || '',
        year: offlineState.currentEvent?.year || 0,
        project: offlineState.currentEvent?.project || ''
      },
      allocations: placementsRecord as Record<string, Record<string, number>>,
      indicesSnapshot: { ...finalIndices } as Record<string, number>,
      projectSuccess: result.success,
      projectRequirements: {
        minRP: offlineState.currentEvent?.minTotal || 0,
        minTeams: offlineState.currentEvent?.minTeams || 0
      },
      teamPoints: result.teamPoints as Record<string, number>
    };
    const existingHistory = offlineState.turnHistory || [];
    setOfflineState('turnHistory', [...existingHistory, historyEntry]);
  }

  private processEndOfTurn(): void {
    // Check for game over (index <= 0)
    for (const [key, value] of Object.entries(offlineState.nationalIndices)) {
      if (value <= 0) {
        this.endGame('index_zero', key as keyof typeof offlineState.nationalIndices);
        return;
      }
    }

    // Check if max turns reached
    if (offlineState.currentTurn >= MAX_TURNS) {
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
    const ranking = Object.values(offlineState.teams)
      .filter((t) => t.ownerId !== null)
      .sort((a, b) => b.points - a.points)
      .map((t) => ({ regionId: t.id, points: t.points }));

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
