/**
 * Core Module Exports
 *
 * Single entry point for all core game functionality.
 * Import from '~/lib/core' instead of individual files.
 */

// Types
export type {
  IGameMode,
  GameStateDTO,
  GameInitParams,
  Team,
  Placements,
  NationalIndices,
  TurnEvent,
  TurnResult,
  GameOver,
  ProjectState,
  RandomModifierId
} from './GameMode';

// Mode implementations (usually not needed directly - use facade)
export { OfflineMode, getOfflineMode, resetOfflineMode } from './OfflineMode';
export { OnlineMode, getOnlineMode, resetOnlineMode } from './OnlineMode';

// Facade (primary API)
export { GameFacade, getGameFacade, resetGameFacade, createGameState } from './GameFacade';
