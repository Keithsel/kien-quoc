import { createStore } from 'solid-js/store';

import {
  INITIAL_INDICES,
  MAINTENANCE_COST,
  PHASE_DURATIONS,
  MAX_TURNS,
  RESOURCES_PER_TURN,
  type PhaseName,
  type IndexName
} from '~/config/game';
import { REGIONS, type RegionId } from '~/config/regions';
import { TURN_EVENTS } from '~/config/events';
import { calculateTurnScores, applyProjectResult, updateIndicesFromCells } from './scoring';
import { RealisticAdaptiveAgent } from './ai';
import type { GameState, Team, GameMode, Placements } from './types';

const PHASES: PhaseName[] = ['event', 'action', 'resolution', 'result'];
const STORAGE_KEY = 'kien-quoc-offline-game';

function createInitialTeams(): Record<RegionId, Team> {
  const teams = {} as Record<RegionId, Team>;
  for (const region of REGIONS) {
    teams[region.id] = {
      id: region.id,
      name: region.name,
      ownerId: null,
      points: 0,
      placements: {},
      submitted: false,
      connected: false
    };
  }
  return teams;
}

function createInitialState(mode: GameMode): GameState {
  return {
    mode,
    status: 'lobby',
    currentTurn: 0,
    currentPhase: 'event',
    phaseEndTime: 0,
    nationalIndices: { ...INITIAL_INDICES },
    teams: createInitialTeams(),
    projectRP: 0,
    projectTeams: 0
  };
}

const [state, setState] = createStore<GameState>(createInitialState('offline'));

const aiAgents = new Map<RegionId, RealisticAdaptiveAgent>();

// FIXED: Removed createMemo - use plain functions instead
// createMemo at module scope causes "computations created outside createRoot" warning
// and breaks reactivity. Plain functions work correctly with stores.

export function getCurrentEvent() {
  if (state.currentTurn < 1 || state.currentTurn > MAX_TURNS) return null;
  return TURN_EVENTS[state.currentTurn - 1];
}

export function getActiveTeams() {
  return Object.values(state.teams).filter((t) => t.ownerId !== null || state.mode === 'offline');
}

export function getAllSubmitted() {
  return getActiveTeams().every((t) => t.submitted);
}

export function initGame(mode: GameMode, playerRegion?: RegionId) {
  setState(createInitialState(mode));
  aiAgents.clear();

  if (mode === 'offline' && playerRegion) {
    setState('teams', playerRegion, 'ownerId', 'player');
    setState('teams', playerRegion, 'connected', true);

    for (const region of REGIONS) {
      if (region.id !== playerRegion) {
        setState('teams', region.id, 'ownerId', `ai-${region.id}`);
        setState('teams', region.id, 'connected', true);
        aiAgents.set(region.id, new RealisticAdaptiveAgent(region.id));
      }
    }
  }
}

function applyMaintenance() {
  for (const [key, cost] of Object.entries(MAINTENANCE_COST)) {
    setState('nationalIndices', key as IndexName, (v) => v - cost);
  }
}

export function startGame() {
  if (state.status !== 'lobby') return;
  setState({
    status: 'playing',
    currentTurn: 1,
    currentPhase: 'event',
    phaseEndTime: Date.now() + PHASE_DURATIONS.event * 1000
  });
}

function runAITurns() {
  const event = getCurrentEvent();
  if (!event) return;
  const teams = getActiveTeams();
  const avgScore = teams.reduce((sum, t) => sum + t.points, 0) / teams.length || 1;

  for (const [regionId, agent] of aiAgents) {
    const team = state.teams[regionId];
    const placements = agent.generatePlacements(state.currentTurn, team.points, avgScore, state.nationalIndices, event);
    setState('teams', regionId, { placements, submitted: true });
  }
}

export function advancePhase() {
  const currentIndex = PHASES.indexOf(state.currentPhase);
  const nextPhase = PHASES[currentIndex + 1];

  if (state.currentPhase === 'resolution') {
    processResults();
    setState({
      currentPhase: 'result',
      phaseEndTime: Date.now() + PHASE_DURATIONS.result * 1000
    });
  } else if (state.currentPhase === 'result') {
    processEndOfTurn();
  } else {
    setState({
      currentPhase: nextPhase,
      phaseEndTime: Date.now() + PHASE_DURATIONS[nextPhase] * 1000
    });
    if (nextPhase === 'action' && state.mode === 'offline') runAITurns();
  }

  // Auto-save after phase change (only for playing games)
  if (state.status === 'playing') saveGame();
}

export function submitPlacements(regionId: RegionId, placements: Placements) {
  const team = state.teams[regionId];
  if (!team || team.submitted) return;
  const total = Object.values(placements).reduce((a, b) => a + b, 0);
  if (total > RESOURCES_PER_TURN) return;
  setState('teams', regionId, { placements, submitted: true });
}

function checkGameOver(): boolean {
  for (const [key, value] of Object.entries(state.nationalIndices)) {
    if (value <= 0) {
      endGame('index_zero', key as IndexName);
      return true;
    }
  }
  return false;
}

function endGame(reason: 'completed' | 'index_zero', zeroIndex?: IndexName) {
  const ranking = Object.values(state.teams)
    .filter((t) => t.ownerId !== null)
    .sort((a, b) => b.points - a.points)
    .map((t) => ({ regionId: t.id, points: t.points }));
  setState({
    status: 'finished',
    gameOver: { reason, zeroIndex, finalRanking: ranking }
  });
}

function processResults() {
  const allPlacements = {} as Record<RegionId, Placements>;
  for (const [regionId, team] of Object.entries(state.teams)) {
    if (team.ownerId !== null) allPlacements[regionId as RegionId] = team.placements;
  }

  const result = calculateTurnScores(state.currentTurn, allPlacements, state.nationalIndices);
  const { newIndices: indicesAfterProject } = applyProjectResult(
    state.currentTurn,
    result.success,
    state.nationalIndices
  );

  // Also apply index boosts from cell placements (Monte Carlo v7.3)
  const { newIndices: finalIndices, boosts } = updateIndicesFromCells(allPlacements, indicesAfterProject);

  // Update indices and points NOW (during result phase)
  setState('nationalIndices', finalIndices);
  for (const [regionId, points] of Object.entries(result.teamPoints)) {
    setState('teams', regionId as RegionId, 'points', (p) => p + points);
  }
  setState({
    lastTurnResult: { ...result, zoneBoosts: boosts },
    projectRP: result.totalRP,
    projectTeams: result.teamCount
  });
}

function processEndOfTurn() {
  if (checkGameOver()) return;
  if (state.currentTurn >= MAX_TURNS) {
    endGame('completed');
    return;
  }

  // Clear placements for all teams
  for (const regionId of Object.keys(state.teams) as RegionId[]) {
    setState('teams', regionId, { placements: {}, submitted: false });
  }

  // Reset project stats for new turn
  setState({ projectRP: 0, projectTeams: 0 });

  applyMaintenance();
  setState({
    currentTurn: state.currentTurn + 1,
    currentPhase: 'event',
    phaseEndTime: Date.now() + PHASE_DURATIONS.event * 1000
  });
  checkGameOver();
}

export function togglePause() {
  if (state.status === 'playing') setState('status', 'paused');
  else if (state.status === 'paused') {
    setState({
      status: 'playing',
      phaseEndTime: Date.now() + PHASE_DURATIONS[state.currentPhase] * 1000
    });
  }
}

export function extendTime(seconds: number) {
  setState('phaseEndTime', (t) => t + seconds * 1000);
}

// ============================================================================
// PERSISTENCE - localStorage save/load for offline games
// ============================================================================

interface SavedGame {
  playerRegion: RegionId;
  state: Omit<GameState, 'mode'>; // Mode is always 'offline' for saved games
  savedAt: number;
}

function getPlayerRegion(): RegionId | null {
  for (const [id, team] of Object.entries(state.teams)) {
    if (team.ownerId === 'player') return id as RegionId;
  }
  return null;
}

export function saveGame(): void {
  if (state.mode !== 'offline') return;
  const playerRegion = getPlayerRegion();
  if (!playerRegion) return;

  // Don't save if game hasn't started or is finished
  if (state.status === 'lobby' || state.status === 'finished') return;

  const saveData: SavedGame = {
    playerRegion,
    state: {
      status: state.status,
      currentTurn: state.currentTurn,
      currentPhase: state.currentPhase,
      phaseEndTime: state.phaseEndTime,
      nationalIndices: { ...state.nationalIndices },
      teams: JSON.parse(JSON.stringify(state.teams)), // Deep clone
      projectRP: state.projectRP,
      projectTeams: state.projectTeams,
      lastTurnResult: state.lastTurnResult,
      gameOver: state.gameOver
    },
    savedAt: Date.now()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
}

export function loadGame(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;

    const data: SavedGame = JSON.parse(saved);
    if (!data.playerRegion || !data.state) return false;

    // Initialize with saved player region
    initGame('offline', data.playerRegion);

    // Restore saved state (excluding mode)
    setState({
      status: data.state.status,
      currentTurn: data.state.currentTurn,
      currentPhase: data.state.currentPhase,
      phaseEndTime: Date.now() + PHASE_DURATIONS[data.state.currentPhase] * 1000, // Reset timer
      nationalIndices: data.state.nationalIndices,
      projectRP: data.state.projectRP,
      projectTeams: data.state.projectTeams,
      lastTurnResult: data.state.lastTurnResult,
      gameOver: data.state.gameOver
    });

    // Restore team state (placements, points, submitted status)
    for (const [id, team] of Object.entries(data.state.teams)) {
      setState('teams', id as RegionId, {
        points: team.points,
        placements: team.placements,
        submitted: team.submitted
      });
    }

    // Recreate AI agents for non-player teams
    aiAgents.clear();
    for (const region of REGIONS) {
      if (region.id !== data.playerRegion) {
        aiAgents.set(region.id, new RealisticAdaptiveAgent(region.id));
      }
    }

    return true;
  } catch (e) {
    console.warn('Failed to load game:', e);
    return false;
  }
}

export function hasSavedGame(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;
    const data: SavedGame = JSON.parse(saved);
    // Valid save must have player region, state, and not be finished
    return !!(data.playerRegion && data.state && data.state.status !== 'finished');
  } catch {
    return false;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear saved game:', e);
  }
}

export { state as gameState };
