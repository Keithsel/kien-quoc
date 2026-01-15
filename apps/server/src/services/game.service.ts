import type { 
  GameState, NationalIndices, Team, BoardState, Phase, 
  TurnEvent, ProjectStatus, TurnResult, CellResult, GameOverResult 
} from '@kien-quoc/shared'
import { GAME_CONFIG, TURN_EVENTS } from '../config/game.config'
import { initBoardCells, createProjectCell } from '../config/board.config'
import { calculateCellScores, calculateProjectSuccess, calculateProjectScores } from './scoring.service'
import { getRoom } from './room.service'
import { broadcastToRoom } from './websocket.service'

// Active games storage
const games = new Map<string, GameState>()

export function createGame(roomCode: string): GameState {
  const room = getRoom(roomCode)
  if (!room) throw new Error('Room not found')
  
  const teams: Team[] = Array.from(room.teams.values())
  const event = TURN_EVENTS[0]
  
  const state: GameState = {
    roomCode,
    status: 'playing',
    currentTurn: 1,
    currentPhase: 'event',
    phaseStartTime: Date.now(),
    phaseTimeLimit: GAME_CONFIG.phaseDurations.event,
    isPaused: false,
    pausedTimeRemaining: 0,
    nationalIndices: { ...GAME_CONFIG.startingIndices },
    currentEvent: event,
    teams: teams.map(t => ({
      ...t,
      resources: GAME_CONFIG.resourcesPerTurn,
      placements: [],
      hasSubmitted: false,
    })),
    board: {
      cells: initBoardCells(),
      projectCell: createProjectCell(event.projectName, event.description),
    },
    projectStatus: {
      totalContributed: 0,
      contributingTeams: [],
      requirement: event.requirement,
      status: 'pending',
    },
  }
  
  games.set(roomCode, state)
  return state
}

export function getGame(roomCode: string): GameState | undefined {
  return games.get(roomCode)
}

export function advancePhase(roomCode: string): Phase | null {
  const game = games.get(roomCode)
  if (!game || game.status !== 'playing') return null
  
  const phases: Phase[] = ['event', 'action', 'resolution', 'result']
  const currentIndex = phases.indexOf(game.currentPhase)
  
  if (currentIndex === phases.length - 1) {
    // End of result phase - go to next turn
    return advanceTurn(roomCode)
  }
  
  const nextPhase = phases[currentIndex + 1]
  game.currentPhase = nextPhase
  game.phaseStartTime = Date.now()
  game.phaseTimeLimit = GAME_CONFIG.phaseDurations[nextPhase]
  
  // Process resolution phase
  if (nextPhase === 'resolution') {
    processResolution(roomCode)
  }
  
  broadcastToRoom(roomCode, {
    type: 'PHASE_STARTED',
    payload: { phase: nextPhase, timeLimit: game.phaseTimeLimit, event: game.currentEvent ?? undefined }
  })
  
  return nextPhase
}

function advanceTurn(roomCode: string): Phase | null {
  const game = games.get(roomCode)
  if (!game) return null
  
  if (game.currentTurn >= GAME_CONFIG.maxTurns) {
    endGame(roomCode, 'completed')
    return null
  }
  
  game.currentTurn++
  game.currentPhase = 'event'
  game.phaseStartTime = Date.now()
  game.phaseTimeLimit = GAME_CONFIG.phaseDurations.event
  
  const event = TURN_EVENTS[game.currentTurn - 1]
  game.currentEvent = event
  
  // Reset teams for new turn
  game.teams.forEach(t => {
    t.resources = GAME_CONFIG.resourcesPerTurn
    t.placements = []
    t.hasSubmitted = false
  })
  
  // Reset board
  game.board = {
    cells: initBoardCells(),
    projectCell: createProjectCell(event.projectName, event.description),
  }
  
  game.projectStatus = {
    totalContributed: 0,
    contributingTeams: [],
    requirement: event.requirement,
    status: 'pending',
  }
  
  broadcastToRoom(roomCode, {
    type: 'PHASE_STARTED',
    payload: { phase: 'event', timeLimit: game.phaseTimeLimit, event }
  })
  
  return 'event'
}

function processResolution(roomCode: string): TurnResult | null {
  const game = games.get(roomCode)
  if (!game || !game.currentEvent) return null
  
  const cellResults: CellResult[] = []
  
  // Score each cell
  for (const cell of game.board.cells) {
    const scores = calculateCellScores(cell)
    cellResults.push({
      cellId: cell.id,
      cellType: cell.type,
      totalPlaced: cell.placements.reduce((s, p) => s + p.amount, 0),
      teamResults: scores,
    })
    
    // Add scores to teams
    for (const result of scores) {
      const team = game.teams.find(t => t.id === result.teamId)
      if (team) team.score += result.scored
    }
  }
  
  // Process project
  const projectSuccess = calculateProjectSuccess(
    game.projectStatus.totalContributed,
    game.projectStatus.contributingTeams.length,
    game.projectStatus.requirement
  )
  
  game.projectStatus.status = projectSuccess ? 'success' : 'failure'
  
  const projectScores = calculateProjectScores(
    game.projectStatus.contributingTeams,
    projectSuccess
  )
  
  for (const result of projectScores) {
    const team = game.teams.find(t => t.id === result.teamId)
    if (team) team.score += result.scored
  }
  
  // Apply index changes
  const indexChange = projectSuccess 
    ? game.currentEvent.successReward 
    : game.currentEvent.failurePenalty
  
  applyIndexChange(game.nationalIndices, indexChange)
  
  // Check game over
  if (checkGameOver(game)) {
    return null
  }
  
  const turnResult: TurnResult = {
    turn: game.currentTurn,
    projectSuccess,
    projectContributions: game.projectStatus.contributingTeams,
    indicesChange: indexChange,
    cellResults,
    teamScores: game.teams.map(t => ({ 
      teamId: t.id, 
      turnScore: cellResults.reduce((s, c) => s + (c.teamResults.find(r => r.teamId === t.id)?.scored ?? 0), 0),
      totalScore: t.score 
    })),
  }
  
  broadcastToRoom(roomCode, { type: 'TURN_RESULT', payload: turnResult })
  
  return turnResult
}

function applyIndexChange(indices: NationalIndices, change: Partial<NationalIndices>) {
  for (const [key, value] of Object.entries(change)) {
    const k = key as keyof NationalIndices
    indices[k] = Math.max(GAME_CONFIG.indexMin, Math.min(GAME_CONFIG.indexMax, indices[k] + (value ?? 0)))
  }
}

function checkGameOver(game: GameState): boolean {
  for (const [key, value] of Object.entries(game.nationalIndices)) {
    if (value <= GAME_CONFIG.indexMin) {
      endGame(game.roomCode, 'index_depleted', key as keyof NationalIndices)
      return true
    }
  }
  return false
}

export function endGame(roomCode: string, reason: 'completed' | 'index_depleted' | 'host_ended', depletedIndex?: keyof NationalIndices) {
  const game = games.get(roomCode)
  if (!game) return
  
  game.status = 'finished'
  
  const sortedTeams = [...game.teams].sort((a, b) => b.score - a.score)
  
  const result: GameOverResult = {
    reason,
    depletedIndex,
    winner: sortedTeams[0] ?? null,
    finalRankings: sortedTeams.map((t, i) => ({ team: t, rank: i + 1 })),
    finalIndices: game.nationalIndices,
  }
  
  broadcastToRoom(roomCode, { type: 'GAME_OVER', payload: result })
}

export function placeResource(roomCode: string, teamId: string, cellId: string, amount: number): boolean {
  const game = games.get(roomCode)
  if (!game || game.status !== 'playing' || game.currentPhase !== 'action') return false
  
  const team = game.teams.find(t => t.id === teamId)
  if (!team || team.hasSubmitted || team.resources < amount) return false
  
  // Handle project cell
  if (cellId === 'project-center') {
    const existing = game.projectStatus.contributingTeams.find(c => c.teamId === teamId)
    if (existing) {
      team.resources += existing.amount // Refund
      existing.amount = amount
    } else {
      game.projectStatus.contributingTeams.push({ teamId, amount })
    }
    game.projectStatus.totalContributed = game.projectStatus.contributingTeams.reduce((s, c) => s + c.amount, 0)
    team.resources -= amount
    return true
  }
  
  // Handle regular cells
  const cell = game.board.cells.find(c => c.id === cellId)
  if (!cell) return false
  
  const existingPlacement = cell.placements.find(p => p.teamId === teamId)
  if (existingPlacement) {
    team.resources += existingPlacement.amount // Refund
    existingPlacement.amount = amount
  } else {
    cell.placements.push({ teamId, amount })
  }
  team.resources -= amount
  
  // Update team placements record
  const teamPlacement = team.placements.find(p => p.cellId === cellId)
  if (teamPlacement) {
    teamPlacement.amount = amount
  } else {
    team.placements.push({ cellId, amount })
  }
  
  return true
}

export function submitTurn(roomCode: string, teamId: string): boolean {
  const game = games.get(roomCode)
  if (!game || game.status !== 'playing' || game.currentPhase !== 'action') return false
  
  const team = game.teams.find(t => t.id === teamId)
  if (!team || team.hasSubmitted) return false
  
  team.hasSubmitted = true
  
  broadcastToRoom(roomCode, { type: 'TEAM_SUBMITTED', payload: { teamId } })
  
  // Check if all teams submitted
  if (game.teams.every(t => t.hasSubmitted)) {
    advancePhase(roomCode)
  }
  
  return true
}

export function pauseGame(roomCode: string): boolean {
  const game = games.get(roomCode)
  if (!game || game.status !== 'playing' || game.isPaused) return false
  
  game.isPaused = true
  game.pausedTimeRemaining = game.phaseTimeLimit - Math.floor((Date.now() - game.phaseStartTime) / 1000)
  
  broadcastToRoom(roomCode, { type: 'PARTIAL_UPDATE', payload: { isPaused: true, pausedTimeRemaining: game.pausedTimeRemaining } })
  return true
}

export function resumeGame(roomCode: string): boolean {
  const game = games.get(roomCode)
  if (!game || game.status !== 'playing' || !game.isPaused) return false
  
  game.isPaused = false
  game.phaseStartTime = Date.now()
  game.phaseTimeLimit = game.pausedTimeRemaining
  
  broadcastToRoom(roomCode, { type: 'PARTIAL_UPDATE', payload: { isPaused: false, phaseStartTime: game.phaseStartTime, phaseTimeLimit: game.phaseTimeLimit } })
  return true
}
