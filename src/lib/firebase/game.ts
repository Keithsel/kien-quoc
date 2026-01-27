import { ensureAuth, getCurrentUserId } from './client';
import {
  readGame,
  readGameOrThrow,
  updateGame,
  setGame,
  updateTeam,
  subscribeGame,
  setupHostDisconnect,
  setupTeamDisconnect
} from './operations';
import type { OnlineGameData, OnlineTeam, OnlineTurnEvent } from './types';
import { INITIAL_INDICES, PHASE_DURATIONS, MIN_TEAMS, type IndexName } from '~/config/game';
import { REGIONS, type RegionId } from '~/config/regions';
import { TURN_EVENTS, getScaledRequirements } from '~/config/events';
const HOST_PASSWORD = import.meta.env.VITE_HOST_PASSWORD || 'CHANGE_ME';

function createInitialTeams(): Record<RegionId, OnlineTeam> {
  const teams = {} as Record<RegionId, OnlineTeam>;
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
  return teams;
}

function createInitialGameData(hostId: string): OnlineGameData {
  return {
    // Meta
    status: 'lobby',
    hostId,
    hostConnected: true,
    createdAt: Date.now(),

    // Turn/Phase
    currentTurn: 0,
    currentPhase: 'event',
    phaseEndTime: 0,

    // Teams
    teams: createInitialTeams(),
    turnActiveTeams: 0,

    // National Indices
    nationalIndices: { ...INITIAL_INDICES } as Record<IndexName, number>,

    // Current Event (null until game starts)
    currentEvent: null,

    // Project State
    project: {
      totalRP: 0,
      teamCount: 0,
      success: null
    },

    // Results
    lastTurnResult: null,
    gameOver: null,

    // History for export
    turnHistory: []
  };
}

/** Create stored event with pre-computed scaled requirements */
function createStoredEvent(turn: number, activeTeams: number): OnlineTurnEvent | null {
  const event = TURN_EVENTS[turn - 1];
  if (!event) return null;

  const { minTotal, minTeams } = getScaledRequirements(event, activeTeams);

  return {
    turn: event.turn,
    year: event.year,
    name: event.name,
    scenario: event.scenario,
    project: event.project,
    minTotal,
    minTeams,
    originalMinTotal: event.minTotal,
    originalMinTeams: event.minTeams,
    successReward: event.successReward,
    failurePenalty: event.failurePenalty,
    fixedModifier: event.fixedModifier
  };
}

export function subscribeToGame(callback: (game: OnlineGameData | null) => void): () => void {
  return subscribeGame(callback);
}

/** Host: Create/Reset game (requires password) */
export async function hostGame(password: string): Promise<boolean> {
  if (password !== HOST_PASSWORD) {
    throw new Error('Mật khẩu không đúng');
  }

  const user = await ensureAuth();

  // Check if a game already exists and is in progress
  const existingGame = await readGame();

  // Only reset if no game exists or game is in lobby state
  if (!existingGame || existingGame.status === 'lobby') {
    await setGame(createInitialGameData(user.uid));
  }

  // Set up disconnect handler for host
  setupHostDisconnect();

  return true;
}

/** Host: Force reset game - notifies all players before resetting */
export async function resetGame(): Promise<void> {
  const user = await ensureAuth();

  // First set status to 'ended' so players see the modal
  await updateGame({ status: 'ended' });

  // Wait a moment for players to see the notification
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Now create fresh game
  await setGame(createInitialGameData(user.uid));
}

export async function joinTeam(regionId: RegionId): Promise<void> {
  const user = await ensureAuth();
  const game = await readGameOrThrow('joinTeam');

  const team = game.teams[regionId];

  // Check if team is available (no owner or same user reconnecting)
  if (team.ownerId && team.ownerId !== user.uid && team.connected) {
    throw new Error('Khu vực đã có người chọn');
  }

  // Join the team
  await updateTeam(regionId, {
    ownerId: user.uid,
    connected: true
  });

  // Set up disconnect handler
  setupTeamDisconnect(regionId);
}

/** Reconnect an existing team on page reload */
export async function reconnectTeam(): Promise<RegionId | null> {
  const user = await ensureAuth();
  const game = await readGame();

  if (!game) return null;

  // Find team owned by this user
  for (const [regionId, team] of Object.entries(game.teams) as [RegionId, OnlineTeam][]) {
    if (team.ownerId === user.uid) {
      // Re-establish connection
      await updateTeam(regionId, { connected: true });

      // Set up disconnect handler again
      setupTeamDisconnect(regionId);

      return regionId;
    }
  }

  return null;
}

export async function leaveTeam(regionId: RegionId): Promise<void> {
  await updateTeam(regionId, {
    connected: false,
    ownerId: null
  });
}

export async function startOnlineGame(): Promise<void> {
  const game = await readGameOrThrow('startOnlineGame');

  // Check team count (humans + AIs)
  const humanCount = Object.values(game.teams).filter((t) => t.ownerId && t.connected && !t.isAI).length;
  const aiCount = Object.values(game.teams).filter((t) => t.isAI).length;
  const teamCount = humanCount + aiCount;

  if (teamCount < MIN_TEAMS) {
    throw new Error(`Cần tối thiểu ${MIN_TEAMS} đội để bắt đầu`);
  }

  const { RANDOM_MODIFIER_POOL } = await import('~/config/events');
  const shuffledModifiers = [...RANDOM_MODIFIER_POOL].sort(() => Math.random() - 0.5).slice(0, 8);

  await updateGame({
    status: 'playing',
    currentTurn: 1,
    currentPhase: 'event',
    phaseEndTime: Date.now() + 24 * 60 * 60 * 1000,
    turnActiveTeams: teamCount,
    currentEvent: createStoredEvent(1, teamCount),
    project: { totalRP: 0, teamCount: 0, success: null },
    randomModifiers: shuffledModifiers
  });
}

export async function advanceOnlinePhase(): Promise<void> {
  const game = await readGameOrThrow('advanceOnlinePhase');

  const phases = ['event', 'action', 'resolution', 'result'] as const;
  const currentIndex = phases.indexOf(game.currentPhase);

  if (currentIndex === phases.length - 1) {
    // End of turn (result -> next event) - just start next turn
    await processOnlineEndOfTurn();
  } else {
    const nextPhase = phases[currentIndex + 1];

    // When leaving action phase, force all teams to submitted state
    if (game.currentPhase === 'action') {
      await forceSubmitAllTeams();
    }

    // When entering result phase, calculate scores first
    if (nextPhase === 'result') {
      await processOnlineResolution();
      return; // processOnlineResolution advances to result phase
    }

    // Only action phase gets a real timer - other phases are manually controlled
    const phaseEndTime =
      nextPhase === 'action' ? Date.now() + PHASE_DURATIONS[nextPhase] * 1000 : Date.now() + 24 * 60 * 60 * 1000; // 24 hours (essentially no timeout)

    await updateGame({
      currentPhase: nextPhase,
      phaseEndTime
    });

    // Run AI turns when action phase starts
    if (nextPhase === 'action') {
      // Small delay to ensure Firebase update is complete
      setTimeout(() => runAITurns(), 500);
    }
  }
}

export async function toggleOnlinePause(): Promise<void> {
  const game = await readGameOrThrow('toggleOnlinePause');

  if (game.status === 'playing') {
    // Pausing: save the remaining time (can be 0 if expired)
    const remainingMs = Math.max(0, game.phaseEndTime - Date.now());
    await updateGame({
      status: 'paused',
      pausedRemainingMs: remainingMs
    });
  } else if (game.status === 'paused') {
    // Unpausing: restore the remaining time from when it was paused
    // Don't fall back to full duration - keep what was saved (even if 0)
    const savedMs = (game as OnlineGameData & { pausedRemainingMs?: number }).pausedRemainingMs;
    const remainingMs = savedMs !== undefined ? savedMs : 0;
    await updateGame({
      status: 'playing',
      phaseEndTime: Date.now() + remainingMs,
      pausedRemainingMs: null
    });
  }
}

export async function updateOnlinePlacements(regionId: RegionId, placements: Record<string, number>): Promise<void> {
  await updateTeam(regionId, { placements });
}

export async function submitOnlineTurn(regionId: RegionId): Promise<void> {
  await updateTeam(regionId, { submitted: true });
}

export async function extendOnlineTime(seconds: number): Promise<void> {
  const game = await readGameOrThrow('extendOnlineTime');

  if (game.status === 'paused') {
    // When paused, add to the saved remaining time
    const currentPausedMs = (game as OnlineGameData & { pausedRemainingMs?: number }).pausedRemainingMs || 0;
    await updateGame({ pausedRemainingMs: currentPausedMs + seconds * 1000 });
  } else {
    // When playing, extend from current time if timer has expired, otherwise add to existing
    const now = Date.now();
    const newEndTime =
      game.phaseEndTime > now
        ? game.phaseEndTime + seconds * 1000 // Timer still running: add to it
        : now + seconds * 1000; // Timer expired: start from now
    await updateGame({ phaseEndTime: newEndTime });
  }
}

/** Cancel submission - allows player to continue editing (keeps placements) */
export async function cancelOnlineSubmission(regionId: RegionId): Promise<void> {
  await updateTeam(regionId, { submitted: false });
}

/** Force all teams to submitted state - used when timer expires */
export async function forceSubmitAllTeams(): Promise<void> {
  const game = await readGameOrThrow('forceSubmitAllTeams');

  const updates: Record<string, boolean> = {};
  for (const regionId of Object.keys(game.teams)) {
    updates[`teams/${regionId}/submitted`] = true;
  }

  await updateGame(updates);
}

/** Calculate scores and update indices when entering result phase */
async function processOnlineResolution(): Promise<void> {
  const game = await readGameOrThrow('processOnlineResolution');

  // Import scoring functions
  const { calculateTurnScores, applyProjectResult, updateIndicesFromCells } = await import('~/lib/scoring');
  const { MAINTENANCE_COST } = await import('~/config/game');

  // Build placements map from all connected/AI teams
  const allPlacements: Partial<Record<RegionId, Record<string, number>>> = {};
  for (const [regionId, team] of Object.entries(game.teams) as [RegionId, OnlineTeam][]) {
    if ((team.ownerId && team.connected) || team.isAI) {
      allPlacements[regionId] = team.placements || {};
    }
  }

  // Calculate turn scores with correct team count
  const result = calculateTurnScores(
    game.currentTurn,
    allPlacements as Record<RegionId, Record<string, number>>,
    game.nationalIndices as import('~/lib/types').NationalIndices,
    game.turnActiveTeams
  );

  // Apply project result to indices
  const { newIndices: indicesAfterProject, changes: indexChanges } = applyProjectResult(
    game.currentTurn,
    result.success,
    game.nationalIndices as import('~/lib/types').NationalIndices
  );

  // Apply index boosts from cell placements
  const { newIndices: finalIndices, boosts } = updateIndicesFromCells(
    allPlacements as Record<RegionId, Record<string, number>>,
    indicesAfterProject
  );

  // Apply maintenance costs
  for (const [key, cost] of Object.entries(MAINTENANCE_COST)) {
    finalIndices[key as keyof typeof finalIndices] -= cost;
  }

  // Check for game over (index <= 0)
  let gameOver: OnlineGameData['gameOver'] | undefined;
  for (const [key, value] of Object.entries(finalIndices)) {
    if (value <= 0) {
      const ranking = Object.entries(game.teams)
        .filter(([_, t]) => (t.ownerId && t.connected) || t.isAI)
        .sort((a, b) => b[1].points - a[1].points)
        .map(([regionId, t]) => ({
          regionId: regionId as RegionId,
          points: t.points + (result.teamPoints[regionId as RegionId] || 0)
        }));
      gameOver = { reason: 'index_zero', zeroIndex: key as import('~/config/game').IndexName, finalRanking: ranking };
      break;
    }
  }

  // Update team points and accumulate allocations
  for (const [regionId, team] of Object.entries(game.teams) as [RegionId, OnlineTeam][]) {
    const pointsEarned = result.teamPoints[regionId] || 0;

    // Accumulate current placements into cumulative
    const cumulative = { ...(team.cumulativeAllocations || {}) };
    for (const [cellId, rp] of Object.entries(team.placements || {})) {
      cumulative[cellId] = (cumulative[cellId] || 0) + rp;
    }

    await updateTeam(regionId, {
      points: team.points + pointsEarned,
      cumulativeAllocations: cumulative
    });
  }

  // Build update object - advance to result phase with updated data
  const updates: Record<string, unknown> = {
    currentPhase: 'result',
    phaseEndTime: Date.now() + 24 * 60 * 60 * 1000, // Manual control
    nationalIndices: finalIndices,
    // Store final project state with success verdict
    project: {
      totalRP: result.totalRP,
      teamCount: result.teamCount,
      success: result.success
    },
    lastTurnResult: {
      success: result.success,
      totalRP: result.totalRP,
      teamCount: result.teamCount,
      indexChanges, // Only project changes
      zoneBoosts: boosts,
      teamPoints: result.teamPoints
    }
  };

  if (gameOver) {
    updates.status = 'finished';
    updates.gameOver = gameOver;
  }

  await updateGame(updates);
}

/** Start next turn - called when advancing from result to event */
async function processOnlineEndOfTurn(): Promise<void> {
  const game = await readGameOrThrow('processOnlineEndOfTurn');

  const { MAX_TURNS } = await import('~/config/game');

  // Check if game completed (turn 8)
  if (game.currentTurn >= MAX_TURNS) {
    const ranking = Object.entries(game.teams)
      .filter(([_, t]) => (t.ownerId && t.connected) || t.isAI)
      .sort((a, b) => b[1].points - a[1].points)
      .map(([regionId, t]) => ({
        regionId: regionId as RegionId,
        points: t.points
      }));

    await updateGame({
      status: 'finished',
      gameOver: { reason: 'completed', finalRanking: ranking }
    });
    return;
  }

  // Clear team placements and submitted status for next turn
  for (const regionId of Object.keys(game.teams)) {
    await updateTeam(regionId as RegionId, {
      placements: {},
      submitted: false
    });
  }

  // Recalculate active teams for next turn (who is connected/AI now)
  const nextTurnActiveTeams = Object.values(game.teams).filter((t) => (t.ownerId && t.connected) || t.isAI).length;

  // Advance to next turn's event phase
  await updateGame({
    currentTurn: game.currentTurn + 1,
    currentPhase: 'event',
    phaseEndTime: Date.now() + 24 * 60 * 60 * 1000, // Event phase: manual control
    turnActiveTeams: nextTurnActiveTeams,
    // Create next turn's event with scaled requirements
    currentEvent: createStoredEvent(game.currentTurn + 1, nextTurnActiveTeams),
    // Reset project state for new turn
    project: { totalRP: 0, teamCount: 0, success: null }
    // Note: We keep lastTurnResult so "Báo cáo lượt trước" can display it
  });
}

export function isCurrentUserHost(game: OnlineGameData | null): boolean {
  if (!game) return false;
  const userId = getCurrentUserId();
  return userId !== null && game.hostId === userId;
}

export function getAvailableTeams(game: OnlineGameData | null): RegionId[] {
  if (!game) return [];
  const userId = getCurrentUserId();

  return (Object.entries(game.teams) as [RegionId, OnlineTeam][])
    .filter(([_, team]) => !team.connected || team.ownerId === userId)
    .map(([id]) => id);
}

export function getCurrentUserTeam(game: OnlineGameData | null): RegionId | null {
  if (!game) return null;
  const userId = getCurrentUserId();
  if (!userId) return null;

  for (const [regionId, team] of Object.entries(game.teams) as [RegionId, OnlineTeam][]) {
    if (team.ownerId === userId) return regionId;
  }
  return null;
}

export async function addAITeam(regionId: RegionId): Promise<void> {
  const game = await readGameOrThrow('addAITeam');

  const team = game.teams[regionId];
  if (team.ownerId && team.connected) {
    throw new Error('Khu vực đã có người chơi');
  }

  await updateTeam(regionId, {
    ownerId: 'AI',
    connected: true,
    isAI: true
  });
}

export async function removeAITeam(regionId: RegionId): Promise<void> {
  await updateTeam(regionId, {
    ownerId: null,
    connected: false,
    isAI: false,
    placements: {},
    submitted: false
  });
}

export async function updateAIPlacements(regionId: RegionId, placements: Record<string, number>): Promise<void> {
  await updateTeam(regionId, {
    placements,
    submitted: true
  });
}

import { getOrCreateAgent, clearAllAgents } from '~/lib/domain';
import { getTeamRpForTurn } from '~/lib/scoring';

export async function runAITurns(): Promise<void> {
  const game = await readGame();
  if (!game) return;

  // Only run during action phase
  if (game.currentPhase !== 'action') return;

  // Get all AI teams
  const aiTeams = (Object.entries(game.teams) as [RegionId, OnlineTeam][]).filter(
    ([_, team]) => team.isAI && !team.submitted
  );

  if (aiTeams.length === 0) return;

  // Calculate average score and build cumulative points for underdog calculation
  const allTeams = Object.values(game.teams).filter((t) => t.connected || t.isAI);
  const avgScore = allTeams.reduce((sum, t) => sum + t.points, 0) / allTeams.length;
  
  const cumulativePoints: Partial<Record<RegionId, number>> = {};
  for (const [regionId, t] of Object.entries(game.teams)) {
    if ((t as OnlineTeam).connected || (t as OnlineTeam).isAI) {
      cumulativePoints[regionId as RegionId] = (t as OnlineTeam).points;
    }
  }

  // Process each AI team
  for (const [regionId, team] of aiTeams) {
    // Get or create agent from domain
    const agent = getOrCreateAgent(regionId);
    
    // Calculate team-specific RP (includes underdog bonus)
    const resources = getTeamRpForTurn(regionId, cumulativePoints as Record<RegionId, number>, game.currentTurn);

    // Get event for current turn
    const { TURN_EVENTS } = await import('~/config/events');
    const event = TURN_EVENTS.find((e) => e.turn === game.currentTurn) || TURN_EVENTS[0];

    // Generate placements
    const placements = agent.generatePlacements(
      game.currentTurn,
      team.points,
      avgScore,
      game.nationalIndices as import('~/lib/types').NationalIndices,
      event,
      resources,
      allTeams.length
    );

    // Submit AI placements
    await updateAIPlacements(regionId, placements);
  }
}

// Re-export clearAllAgents for backwards compatibility
export { clearAllAgents as clearAIAgents };
