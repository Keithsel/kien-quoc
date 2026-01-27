/**
 * Hooks barrel export
 */
export {
  // Phase checks
  usePhaseChecks,
  // Index health
  useIndexHealth,
  type IndexHealth,
  // Leaderboard
  useLeaderboard,
  type RankedTeam,
  type LeaderboardData,
  // Allocation utilities
  getAllocationsByType,
  mergePlacements,
  getTotalRP,
  type AllocationByType
} from './useGameDerived';
