/**
 * Online Game Mode Implementation
 *
 * Implements IGameMode interface for online/multiplayer games.
 * Uses Firebase Realtime Database with batched writes.
 */

import { createSignal, type Accessor } from 'solid-js';
import { ref, get, update, onValue, onDisconnect } from 'firebase/database';
import type {
  IGameMode,
  GameStateDTO,
  GameInitParams,
  Team,
  Placements,
  TurnEvent,
  TurnResult,
  GameOver,
  NationalIndices
} from './GameMode';
import type { RegionId } from '~/config/regions';
import { REGIONS } from '~/config/regions';
import {
  PHASE_DURATIONS,
  PHASE_ORDER,
  INITIAL_INDICES,
  MAX_TURNS,
  type PhaseName
} from '~/config/game';
import { TURN_EVENTS, RANDOM_MODIFIER_POOL, type RandomModifierId } from '~/config/events';
import { db, ensureAuth, getCurrentUserId } from '~/lib/firebase/client';
import {
  processTurn,
  checkGameOver,
  isGameComplete,
  prepareNextTurn,
  generateFinalRanking,
  shuffleArray,
  calculateNewTeamPoints,
  // AI Management
  getOrCreateAgent,
  clearAllAgents
} from '~/lib/domain';

const GAME_PATH = 'game';

// ============================================================================
// FIREBASE DATA TYPES
// ============================================================================

interface FirebaseTeam {
  name: string;
  ownerId: string | null;
  connected: boolean;
  isAI: boolean;
  points: number;
  placements: Record<string, number>;
  submitted: boolean;
  cumulativeAllocations: Record<string, number>;
}

interface FirebaseGameData {
  status: 'lobby' | 'waiting' | 'playing' | 'paused' | 'finished' | 'ended';
  hostId: string;
  hostConnected: boolean;
  createdAt: number;
  currentTurn: number;
  currentPhase: PhaseName;
  phaseEndTime: number;
  teams: Record<string, FirebaseTeam>;
  turnActiveTeams: number;
  nationalIndices: Record<string, number>;
  currentEvent: TurnEvent | null;
  project: { totalRP: number; teamCount: number; success: boolean | null };
  lastTurnResult: TurnResult | null;
  gameOver: GameOver | null;
  pausedRemainingMs?: number;
  turnHistory?: Array<{
    turn: number;
    activeTeams: RegionId[];
    teamFormationSummary: string;
    event: { name: string; year: number; project: string };
    allocations: Record<string, Record<string, number>>;
    indicesSnapshot: Record<string, number>;
    projectSuccess: boolean;
    projectRequirements: { minRP: number; minTeams: number };
    teamPoints: Record<string, number>;
  }>;
  randomModifiers?: RandomModifierId[];
}

// ============================================================================
// ONLINE MODE CLASS
// ============================================================================

export class OnlineMode implements IGameMode {
  private unsubscribeFirebase: (() => void) | null = null;
  private subscribers = new Set<(state: GameStateDTO) => void>();
  private gameDataSignal: Accessor<FirebaseGameData | null>;
  private setGameData: (data: FirebaseGameData | null) => void;
  private role: 'host' | 'player' | 'spectator' = 'spectator';

  constructor() {
    const [gameData, setGameData] = createSignal<FirebaseGameData | null>(null);
    this.gameDataSignal = gameData;
    this.setGameData = setGameData;
  }

  // ---- State Queries ----

  getState(): GameStateDTO {
    const data = this.gameDataSignal();
    if (!data) {
      return this.createEmptyState();
    }
    return this.convertToDTO(data);
  }

  getTeam(id: RegionId): Team | null {
    const data = this.gameDataSignal();
    if (!data?.teams[id]) return null;
    return this.convertTeam(id, data.teams[id]);
  }

  getAllTeams(): Record<RegionId, Team> {
    const data = this.gameDataSignal();
    if (!data) return {} as Record<RegionId, Team>;

    const teams = {} as Record<RegionId, Team>;
    for (const [id, team] of Object.entries(data.teams)) {
      teams[id as RegionId] = this.convertTeam(id as RegionId, team);
    }
    return teams;
  }

  getMyTeamId(): RegionId | null {
    const data = this.gameDataSignal();
    if (!data) return null;

    const userId = getCurrentUserId();
    if (!userId) return null;

    for (const [regionId, team] of Object.entries(data.teams)) {
      if (team.ownerId === userId) return regionId as RegionId;
    }
    return null;
  }

  canControl(): boolean {
    return this.role === 'host';
  }

  canAllocate(): boolean {
    if (this.role !== 'player') return false;

    const data = this.gameDataSignal();
    if (!data || data.status !== 'playing' || data.currentPhase !== 'action') return false;

    const myTeamId = this.getMyTeamId();
    if (!myTeamId) return false;

    const team = data.teams[myTeamId];
    if (!team || team.submitted) return false;

    // Check if timer expired
    if (Date.now() > data.phaseEndTime) return false;

    return true;
  }

  // ---- Actions ----

  async submitPlacements(teamId: RegionId, placements: Placements): Promise<void> {
    const teamRef = ref(db!, `${GAME_PATH}/teams/${teamId}`);
    await update(teamRef, { placements, submitted: true });
  }

  async cancelSubmission(teamId: RegionId): Promise<void> {
    const teamRef = ref(db!, `${GAME_PATH}/teams/${teamId}`);
    await update(teamRef, { submitted: false });
  }

  async advancePhase(): Promise<void> {
    if (!this.canControl()) return;

    const data = this.gameDataSignal();
    if (!data) return;

    const currentIndex = PHASE_ORDER.indexOf(data.currentPhase);

    if (currentIndex === PHASE_ORDER.length - 1) {
      // End of turn
      await this.processEndOfTurn();
    } else {
      const nextPhase = PHASE_ORDER[currentIndex + 1];

      // Force submit all teams when leaving action phase
      if (data.currentPhase === 'action') {
        await this.forceSubmitAllTeams();
      }

      // Process resolution when entering result phase
      if (nextPhase === 'result') {
        await this.processResolution();
        return;
      }

      const phaseEndTime =
        nextPhase === 'action' ? Date.now() + PHASE_DURATIONS[nextPhase] * 1000 : Date.now() + 24 * 60 * 60 * 1000; // Manual control for other phases

      await update(ref(db!, GAME_PATH), {
        currentPhase: nextPhase,
        phaseEndTime
      });

      // Run AI turns when action phase starts
      if (nextPhase === 'action') {
        setTimeout(() => this.runAITurns(), 500);
      }
    }
  }

  async togglePause(): Promise<void> {
    if (!this.canControl()) return;

    const data = this.gameDataSignal();
    if (!data) return;

    const gameRef = ref(db!, GAME_PATH);

    if (data.status === 'playing') {
      const remainingMs = Math.max(0, data.phaseEndTime - Date.now());
      await update(gameRef, {
        status: 'paused',
        pausedRemainingMs: remainingMs
      });
    } else if (data.status === 'paused') {
      const remainingMs = data.pausedRemainingMs ?? 0;
      await update(gameRef, {
        status: 'playing',
        phaseEndTime: Date.now() + remainingMs,
        pausedRemainingMs: null
      });
    }
  }

  async extendTime(seconds: number): Promise<void> {
    if (!this.canControl()) return;

    const data = this.gameDataSignal();
    if (!data) return;

    const gameRef = ref(db!, GAME_PATH);

    if (data.status === 'paused') {
      const currentPausedMs = data.pausedRemainingMs || 0;
      await update(gameRef, { pausedRemainingMs: currentPausedMs + seconds * 1000 });
    } else {
      const now = Date.now();
      const newEndTime = data.phaseEndTime > now ? data.phaseEndTime + seconds * 1000 : now + seconds * 1000;
      await update(gameRef, { phaseEndTime: newEndTime });
    }
  }

  // ---- Lifecycle ----

  async initialize(_params: GameInitParams): Promise<void> {
    // Subscribe to Firebase
    this.subscribeToFirebase();
  }

  setRole(role: 'host' | 'player' | 'spectator'): void {
    this.role = role;
  }

  subscribe(callback: (state: GameStateDTO) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  destroy(): void {
    if (this.unsubscribeFirebase) {
      this.unsubscribeFirebase();
      this.unsubscribeFirebase = null;
    }
    this.subscribers.clear();
    clearAllAgents();
  }

  // ---- Online-Specific Methods ----

  async hostGame(password: string): Promise<boolean> {
    const HOST_PASSWORD = import.meta.env.VITE_HOST_PASSWORD || 'CHANGE_ME';
    if (password !== HOST_PASSWORD) {
      throw new Error('Mật khẩu không đúng');
    }

    const user = await ensureAuth();
    const gameRef = ref(db!, GAME_PATH);

    // Check if game already exists
    const snapshot = await get(gameRef);
    const existingGame = snapshot.val() as FirebaseGameData | null;

    if (!existingGame || existingGame.status === 'lobby') {
      await update(gameRef, this.createInitialFirebaseData(user.uid));
    }

    // Set up disconnect handler
    onDisconnect(ref(db!, `${GAME_PATH}/hostConnected`)).set(false);

    return true;
  }

  async joinTeam(regionId: RegionId): Promise<void> {
    const user = await ensureAuth();
    const snapshot = await get(ref(db!, GAME_PATH));

    if (!snapshot.exists()) {
      throw new Error('Chưa có phòng chơi');
    }

    const game = snapshot.val() as FirebaseGameData;
    const team = game.teams[regionId];

    if (team.ownerId && team.ownerId !== user.uid && team.connected) {
      throw new Error('Khu vực đã có người chọn');
    }

    const teamRef = ref(db!, `${GAME_PATH}/teams/${regionId}`);
    await update(teamRef, {
      ownerId: user.uid,
      connected: true
    });

    onDisconnect(ref(db!, `${GAME_PATH}/teams/${regionId}/connected`)).set(false);
  }

  async startGame(): Promise<void> {
    if (!this.canControl()) return;

    const data = this.gameDataSignal();
    if (!data) return;

    const teamEntries = Object.values(data.teams) as FirebaseTeam[];
    const humanCount = teamEntries.filter((t) => t.ownerId && t.connected && !t.isAI).length;
    const aiCount = teamEntries.filter((t) => t.isAI).length;
    const teamCount = humanCount + aiCount;

    if (teamCount < 2) {
      throw new Error('Cần tối thiểu 2 đội để bắt đầu');
    }

    // Generate random modifiers for all 8 turns
    const shuffledModifiers = shuffleArray(RANDOM_MODIFIER_POOL).slice(0, 8);
    const event = this.getScaledEvent(1, teamCount);

    await update(ref(db!, GAME_PATH), {
      status: 'playing',
      currentTurn: 1,
      currentPhase: 'event',
      phaseEndTime: Date.now() + 24 * 60 * 60 * 1000,
      turnActiveTeams: teamCount,
      currentEvent: event,
      project: { totalRP: 0, teamCount: 0, success: null },
      randomModifiers: shuffledModifiers
    });
  }

  // ---- Private Methods ----

  private subscribeToFirebase(): void {
    if (!db) return;

    const gameRef = ref(db, GAME_PATH);
    this.unsubscribeFirebase = onValue(gameRef, (snapshot) => {
      const data = snapshot.exists() ? (snapshot.val() as FirebaseGameData) : null;
      this.setGameData(data);
      this.notifySubscribers();
    });
  }

  private notifySubscribers(): void {
    const state = this.getState();
    for (const callback of this.subscribers) {
      callback(state);
    }
  }

  private createEmptyState(): GameStateDTO {
    return {
      mode: 'online',
      status: 'lobby',
      currentTurn: 0,
      currentPhase: 'event',
      phaseEndTime: 0,
      nationalIndices: { ...INITIAL_INDICES },
      teams: {} as Record<RegionId, Team>,
      activeTeamCount: 0,
      currentEvent: null,
      project: { totalRP: 0, teamCount: 0, success: null }
    };
  }

  private createInitialFirebaseData(hostId: string): FirebaseGameData {
    const teams: Record<string, FirebaseTeam> = {};
    for (const region of REGIONS) {
      teams[region.id] = {
        name: region.name,
        ownerId: null,
        connected: false,
        isAI: false,
        points: 0,
        placements: {},
        submitted: false,
        cumulativeAllocations: {}
      };
    }

    return {
      status: 'lobby',
      hostId,
      hostConnected: true,
      createdAt: Date.now(),
      currentTurn: 0,
      currentPhase: 'event',
      phaseEndTime: 0,
      teams,
      turnActiveTeams: 0,
      nationalIndices: { ...INITIAL_INDICES } as Record<string, number>,
      currentEvent: null,
      project: { totalRP: 0, teamCount: 0, success: null },
      lastTurnResult: null,
      gameOver: null
    };
  }

  private convertToDTO(data: FirebaseGameData): GameStateDTO {
    const teams = {} as Record<RegionId, Team>;
    for (const [id, t] of Object.entries(data.teams)) {
      teams[id as RegionId] = this.convertTeam(id as RegionId, t);
    }

    const dto: GameStateDTO = {
      mode: 'online',
      status: data.status === 'waiting' ? 'lobby' : data.status,
      currentTurn: data.currentTurn,
      currentPhase: data.currentPhase,
      phaseEndTime: data.phaseEndTime,
      nationalIndices: data.nationalIndices as NationalIndices,
      teams,
      activeTeamCount: data.turnActiveTeams,
      currentEvent: data.currentEvent,
      project: data.project,
      lastTurnResult: data.lastTurnResult ?? undefined,
      gameOver: data.gameOver ?? undefined,
      turnHistory: data.turnHistory ?? [],
      randomModifiers: data.randomModifiers
    };

    return dto;
  }

  private convertTeam(id: RegionId, t: FirebaseTeam): Team {
    return {
      id,
      name: t.name,
      ownerId: t.ownerId,
      points: t.points,
      placements: t.placements || {},
      submitted: t.submitted,
      connected: t.connected,
      isAI: t.isAI,
      cumulativeAllocations: t.cumulativeAllocations || {}
    };
  }

  private getScaledEvent(turn: number, activeTeams: number): TurnEvent | null {
    return prepareNextTurn(turn, activeTeams);
  }

  private async forceSubmitAllTeams(): Promise<void> {
    const data = this.gameDataSignal();
    if (!data) return;

    const updates: Record<string, boolean> = {};
    for (const regionId of Object.keys(data.teams)) {
      updates[`teams/${regionId}/submitted`] = true;
    }

    await update(ref(db!, GAME_PATH), updates);
  }

  private async runAITurns(): Promise<void> {
    const data = this.gameDataSignal();
    if (!data || data.currentPhase !== 'action') return;

    const aiTeams = Object.entries(data.teams).filter(([, t]) => t.isAI && !t.submitted) as [string, FirebaseTeam][];

    if (aiTeams.length === 0) return;

    const allTeams = Object.values(data.teams) as FirebaseTeam[];
    const activeTeams = allTeams.filter((t) => t.connected || t.isAI);
    const avgScore = activeTeams.reduce((sum, t) => sum + t.points, 0) / activeTeams.length;

    for (const [regionId, team] of aiTeams) {
      try {
        const agent = getOrCreateAgent(regionId as RegionId);

        const event = TURN_EVENTS.find((e) => e.turn === data.currentTurn) || TURN_EVENTS[0];
        const placements = agent.generatePlacements(
          data.currentTurn,
          team.points,
          avgScore,
          data.nationalIndices as NationalIndices,
          event
        );

        await update(ref(db!, `${GAME_PATH}/teams/${regionId}`), {
          placements,
          submitted: true
        });
      } catch (err) {
        // Silently fail or log sparingly in production if needed
      }
    }
  }

  private async processResolution(): Promise<void> {
    const data = this.gameDataSignal();
    if (!data) return;

    // Build placements map, cumulative points, and team info for active teams
    const allPlacements: Partial<Record<RegionId, Record<string, number>>> = {};
    const cumulativePoints: Record<RegionId, number> = {} as Record<RegionId, number>;
    const teamInfo: Record<RegionId, { name: string; isAI?: boolean }> = {} as Record<
      RegionId,
      { name: string; isAI?: boolean }
    >;

    for (const [regionId, team] of Object.entries(data.teams) as [string, FirebaseTeam][]) {
      if ((team.ownerId && team.connected) || team.isAI) {
        allPlacements[regionId as RegionId] = team.placements || {};
        cumulativePoints[regionId as RegionId] = team.points;
        teamInfo[regionId as RegionId] = { name: team.name, isAI: team.isAI };
      }
    }

    // Use domain layer to process turn
    const result = processTurn({
      turn: data.currentTurn,
      placements: allPlacements as Record<RegionId, Record<string, number>>,
      currentIndices: data.nationalIndices as NationalIndices,
      activeTeamCount: data.turnActiveTeams,
      cumulativePoints,
      randomModifiers: data.randomModifiers,
      currentEvent: data.currentEvent,
      teams: teamInfo,
      isLastTurn: data.currentTurn >= MAX_TURNS
    });

    // Check for game over using domain function
    const gameOverCheck = checkGameOver(result.finalIndices);
    let gameOver: GameOver | null = null;
    if (gameOverCheck.gameOver) {
      const ranking = generateFinalRanking(
        Object.fromEntries(
          Object.entries(data.teams)
            .filter(([, t]) => (t.ownerId && t.connected) || t.isAI)
            .map(([id, t]) => [
              id,
              {
                points: t.points,
                ownerId: t.ownerId,
                connected: t.connected,
                isAI: t.isAI
              }
            ])
        ) as Record<RegionId, { points: number; ownerId: string | null; connected?: boolean; isAI?: boolean }>,
        result.turnResult.teamPoints
      );
      gameOver = { reason: 'index_zero', zeroIndex: gameOverCheck.zeroIndex, finalRanking: ranking };
    }

    // Update team points and cumulative allocations
    for (const [regionId, team] of Object.entries(data.teams) as [string, FirebaseTeam][]) {
      const pointsEarned = result.turnResult.teamPoints[regionId as RegionId] || 0;
      const cumulative = { ...(team.cumulativeAllocations || {}) };

      for (const [cellId, rp] of Object.entries(team.placements || {})) {
        cumulative[cellId] = (cumulative[cellId] || 0) + rp;
      }

      await update(ref(db!, `${GAME_PATH}/teams/${regionId}`), {
        points: calculateNewTeamPoints(team.points, pointsEarned),
        cumulativeAllocations: cumulative
      });
    }

    // Build final update
    const updates: Record<string, unknown> = {
      currentPhase: 'result',
      phaseEndTime: Date.now() + 24 * 60 * 60 * 1000,
      nationalIndices: result.finalIndices,
      project: result.projectState,
      lastTurnResult: result.turnResult
    };

    // Append to existing history or create new array
    const existingHistory = data.turnHistory || [];
    updates.turnHistory = [...existingHistory, result.historyEntry];

    if (gameOver) {
      updates.status = 'finished';
      updates.gameOver = gameOver;
    }

    await update(ref(db!, GAME_PATH), updates);
  }

  private async processEndOfTurn(): Promise<void> {
    const data = this.gameDataSignal();
    if (!data) return;

    // Check if game completed
    if (isGameComplete(data.currentTurn)) {
      const ranking = generateFinalRanking(
        Object.fromEntries(
          Object.entries(data.teams)
            .filter(([, t]) => (t.ownerId && t.connected) || t.isAI)
            .map(([id, t]) => [
              id,
              {
                points: t.points,
                ownerId: t.ownerId,
                connected: t.connected,
                isAI: t.isAI
              }
            ])
        ) as Record<RegionId, { points: number; ownerId: string | null; connected?: boolean; isAI?: boolean }>
      );

      await update(ref(db!, GAME_PATH), {
        status: 'finished',
        gameOver: { reason: 'completed', finalRanking: ranking }
      });
      return;
    }

    // Clear team placements
    for (const regionId of Object.keys(data.teams)) {
      await update(ref(db!, `${GAME_PATH}/teams/${regionId}`), {
        placements: {},
        submitted: false
      });
    }

    // Calculate next turn active teams
    const teamEntries = Object.values(data.teams) as FirebaseTeam[];
    const nextTurnActiveTeams = teamEntries.filter((t) => (t.ownerId && t.connected) || t.isAI).length;

    const nextTurn = data.currentTurn + 1;
    const event = this.getScaledEvent(nextTurn, nextTurnActiveTeams);

    await update(ref(db!, GAME_PATH), {
      currentTurn: nextTurn,
      currentPhase: 'event',
      phaseEndTime: Date.now() + 24 * 60 * 60 * 1000,
      turnActiveTeams: nextTurnActiveTeams,
      currentEvent: event,
      project: { totalRP: 0, teamCount: 0, success: null }
      // Note: We keep lastTurnResult so "Báo cáo lượt trước" can display it
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let onlineModeInstance: OnlineMode | null = null;

export function getOnlineMode(): OnlineMode {
  if (!onlineModeInstance) {
    onlineModeInstance = new OnlineMode();
  }
  return onlineModeInstance;
}

export function resetOnlineMode(): void {
  if (onlineModeInstance) {
    onlineModeInstance.destroy();
    onlineModeInstance = null;
  }
}
