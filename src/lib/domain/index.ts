/**
 * Domain Layer
 *
 * Pure business logic with no framework dependencies.
 * This layer contains:
 * - Canonical domain types
 * - Turn processing logic
 * - AI agent management
 * - Game state calculations
 */

// Types
export * from './types';

// Turn processing
export {
  processTurn,
  checkGameOver,
  isGameComplete,
  prepareNextTurn,
  generateFinalRanking,
  shuffleArray,
  calculateNewTeamPoints
} from './turnProcessor';

// AI Management
export {
  createAgent,
  getAgent,
  getOrCreateAgent,
  removeAgent,
  clearAllAgents,
  getActiveAgentIds,
  hasAgent,
  generatePlacement,
  generateAllPlacements,
  initializeAgents,
  getAgentCount
} from './AIManager';
