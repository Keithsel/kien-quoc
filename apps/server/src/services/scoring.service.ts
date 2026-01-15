import type { BoardCell, CellPlacement, CellType } from '@kien-quoc/shared'
import { SCORING } from '../config/game.config'

interface ScoreResult {
  teamId: string
  placed: number
  scored: number
}

export function calculateCellScores(cell: BoardCell): ScoreResult[] {
  const placements = cell.placements
  if (placements.length === 0) return []
  
  switch (cell.type) {
    case 'competitive':
      return scoreCompetitive(placements)
    case 'synergy':
      return scoreSynergy(placements)
    case 'shared':
      return scoreShared(placements)
    case 'cooperation':
      return scoreCooperation(placements)
    default:
      return placements.map(p => ({ teamId: p.teamId, placed: p.amount, scored: 0 }))
  }
}

function scoreCompetitive(placements: CellPlacement[]): ScoreResult[] {
  const total = placements.reduce((sum, p) => sum + p.amount, 0)
  if (total === 0) return placements.map(p => ({ teamId: p.teamId, placed: p.amount, scored: 0 }))
  
  const maxAmount = Math.max(...placements.map(p => p.amount))
  const winners = placements.filter(p => p.amount === maxAmount)
  
  return placements.map(p => {
    if (p.amount === maxAmount) {
      // Winner(s) split the total × multiplier
      const score = (total * SCORING.competitive) / winners.length
      return { teamId: p.teamId, placed: p.amount, scored: Math.round(score * 10) / 10 }
    }
    return { teamId: p.teamId, placed: p.amount, scored: 0 }
  })
}

function scoreSynergy(placements: CellPlacement[]): ScoreResult[] {
  const numTeams = placements.filter(p => p.amount > 0).length
  if (numTeams === 0) return placements.map(p => ({ teamId: p.teamId, placed: p.amount, scored: 0 }))
  
  const multiplier = SCORING.synergy.base + (numTeams - 1) * SCORING.synergy.perTeam
  
  return placements.map(p => ({
    teamId: p.teamId,
    placed: p.amount,
    scored: Math.round(p.amount * multiplier * 10) / 10,
  }))
}

function scoreShared(placements: CellPlacement[]): ScoreResult[] {
  const total = placements.reduce((sum, p) => sum + p.amount, 0)
  if (total === 0) return placements.map(p => ({ teamId: p.teamId, placed: p.amount, scored: 0 }))
  
  return placements.map(p => ({
    teamId: p.teamId,
    placed: p.amount,
    scored: Math.round(p.amount * SCORING.shared * 10) / 10,
  }))
}

function scoreCooperation(placements: CellPlacement[]): ScoreResult[] {
  const participatingTeams = placements.filter(p => p.amount > 0).length
  
  if (participatingTeams < SCORING.cooperation.minTeams) {
    // Not enough teams = no points
    return placements.map(p => ({ teamId: p.teamId, placed: p.amount, scored: 0 }))
  }
  
  return placements.map(p => ({
    teamId: p.teamId,
    placed: p.amount,
    scored: Math.round(p.amount * SCORING.cooperation.multiplier * 10) / 10,
  }))
}

export function calculateProjectSuccess(
  totalContributed: number,
  contributingTeamsCount: number,
  requirement: { minTotal: number; minTeams: number }
): boolean {
  return totalContributed >= requirement.minTotal && contributingTeamsCount >= requirement.minTeams
}

export function calculateProjectScores(
  contributions: { teamId: string; amount: number }[],
  success: boolean
): ScoreResult[] {
  if (!success) {
    return contributions.map(c => ({ teamId: c.teamId, placed: c.amount, scored: 0 }))
  }
  
  return contributions.map(c => ({
    teamId: c.teamId,
    placed: c.amount,
    scored: Math.round(c.amount * SCORING.project * 10) / 10,
  }))
}
