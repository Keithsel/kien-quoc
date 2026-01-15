// ============================================
// GAME STATE TYPES
// ============================================

export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished'
export type Phase = 'event' | 'action' | 'resolution' | 'result'

export interface NationalIndices {
  economy: number      // Kinh tế (0-30)
  society: number      // Xã hội (0-30)
  culture: number      // Văn hóa (0-30)
  integration: number  // Hội nhập (0-30)
  environment: number  // Môi trường (0-30)
  science: number      // Khoa học (0-30)
}

export interface Region {
  id: string
  name: string
  description: string
  provinces: string[]
}

export interface Placement {
  cellId: string
  amount: number
}

export interface Team {
  id: string
  name: string
  regionId: string
  score: number
  resources: number
  placements: Placement[]
  hasSubmitted: boolean
  isConnected: boolean
  connectedClients: number
}

export interface TurnEvent {
  turn: number
  year: number
  name: string
  description: string
  historicalContext: string
  projectName: string
  requirement: {
    minTotal: number
    minTeams: number
  }
  successReward: Partial<NationalIndices>
  failurePenalty: Partial<NationalIndices>
}

export interface ProjectStatus {
  totalContributed: number
  contributingTeams: { teamId: string; amount: number }[]
  requirement: { minTotal: number; minTeams: number }
  status: 'pending' | 'success' | 'failure'
}

export interface GameState {
  roomCode: string
  status: GameStatus
  currentTurn: number
  currentPhase: Phase
  phaseStartTime: number
  phaseTimeLimit: number
  isPaused: boolean
  pausedTimeRemaining: number
  nationalIndices: NationalIndices
  currentEvent: TurnEvent | null
  teams: Team[]
  board: BoardState
  projectStatus: ProjectStatus
}

// ============================================
// BOARD TYPES
// ============================================

export type CellType = 'competitive' | 'synergy' | 'shared' | 'cooperation' | 'project'

export interface CellPlacement {
  teamId: string
  amount: number
}

export interface BoardCell {
  id: string
  position: { row: number; col: number }
  type: CellType
  name: string
  description: string
  placements: CellPlacement[]
}

export interface ProjectCell {
  id: 'project-center'
  name: string
  description: string
  totalContributed: number
  contributingTeams: string[]
}

export interface BoardState {
  cells: BoardCell[]
  projectCell: ProjectCell
}

// ============================================
// SCORING
// ============================================

export interface ScoringMultipliers {
  competitive: number
  synergy: { base: number; perTeam: number }
  shared: number
  cooperation: number
  project: number
}

// ============================================
// RESULTS
// ============================================

export interface CellResult {
  cellId: string
  cellType: CellType
  totalPlaced: number
  teamResults: { teamId: string; placed: number; scored: number }[]
}

export interface TurnResult {
  turn: number
  projectSuccess: boolean
  projectContributions: { teamId: string; amount: number }[]
  indicesChange: Partial<NationalIndices>
  cellResults: CellResult[]
  teamScores: { teamId: string; turnScore: number; totalScore: number }[]
}

export interface GameOverResult {
  reason: 'completed' | 'index_depleted' | 'host_ended'
  depletedIndex?: keyof NationalIndices
  winner: Team | null
  finalRankings: { team: Team; rank: number }[]
  finalIndices: NationalIndices
}
