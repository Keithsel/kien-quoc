/**
 * Application Types
 *
 * Re-exports all domain types from the domain layer.
 * This maintains backwards compatibility while establishing
 * the domain layer as the single source of truth.
 */

// Re-export all domain types
export type {
  // Config re-exports
  IndexName,
  PhaseName,
  GameStatus,
  GameMode,
  CellType,
  RegionId,
  TurnEvent,
  RandomModifierId,
  ModifierEffect,

  // Core domain types
  Placements,
  NationalIndices,
  Team,
  TurnResult,
  GameOver,
  ProjectState,
  TurnHistoryEntry,

  // Turn processing types
  TurnProcessingInput,
  TurnProcessingResult,
  GameOverCheck,
  PreparedTurnEvent,

  // Full game state
  GameState
} from './domain';
