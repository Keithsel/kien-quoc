/**
 * AI Manager
 *
 * Centralized AI agent management for both online and offline modes.
 * Consolidates the duplicated aiAgents Map from OfflineMode, OnlineMode,
 * and firebase/game.ts into a single source of truth.
 */

import type { RegionId } from '~/config/regions';
import type { NationalIndices, Placements } from './types';
import type { TurnEvent } from '~/config/events';
import { RealisticAdaptiveAgent } from '~/lib/ai';

// ============================================================================
// SINGLETON AI AGENT STORAGE
// ============================================================================

const aiAgents = new Map<RegionId, RealisticAdaptiveAgent>();

// ============================================================================
// AGENT LIFECYCLE
// ============================================================================

/**
 * Create an AI agent for a region.
 * If an agent already exists for this region, it is replaced.
 */
export function createAgent(regionId: RegionId): RealisticAdaptiveAgent {
  const agent = new RealisticAdaptiveAgent(regionId);
  aiAgents.set(regionId, agent);
  return agent;
}

/**
 * Get an existing AI agent for a region.
 * Returns null if no agent exists.
 */
export function getAgent(regionId: RegionId): RealisticAdaptiveAgent | null {
  return aiAgents.get(regionId) ?? null;
}

/**
 * Get or create an AI agent for a region.
 * If no agent exists, creates one.
 */
export function getOrCreateAgent(regionId: RegionId): RealisticAdaptiveAgent {
  let agent = aiAgents.get(regionId);
  if (!agent) {
    agent = new RealisticAdaptiveAgent(regionId);
    aiAgents.set(regionId, agent);
  }
  return agent;
}

/**
 * Remove an AI agent for a region.
 */
export function removeAgent(regionId: RegionId): void {
  aiAgents.delete(regionId);
}

/**
 * Clear all AI agents.
 * Call this when resetting/destroying a game.
 */
export function clearAllAgents(): void {
  aiAgents.clear();
}

/**
 * Get all active agent region IDs.
 */
export function getActiveAgentIds(): RegionId[] {
  return Array.from(aiAgents.keys());
}

/**
 * Check if an agent exists for a region.
 */
export function hasAgent(regionId: RegionId): boolean {
  return aiAgents.has(regionId);
}

// ============================================================================
// PLACEMENT GENERATION
// ============================================================================

/**
 * Generate placements for a single AI agent.
 */
export function generatePlacement(
  regionId: RegionId,
  turn: number,
  teamScore: number,
  avgScore: number,
  nationalIndices: NationalIndices,
  event: TurnEvent
): Placements {
  const agent = getOrCreateAgent(regionId);
  return agent.generatePlacements(turn, teamScore, avgScore, nationalIndices, event);
}

/**
 * Generate placements for all AI agents.
 * Returns a map of regionId to placements.
 */
export function generateAllPlacements(
  turn: number,
  teamScores: Record<RegionId, number>,
  nationalIndices: NationalIndices,
  event: TurnEvent
): Record<RegionId, Placements> {
  const result: Record<RegionId, Placements> = {} as Record<RegionId, Placements>;

  // Calculate average score
  const scores = Object.values(teamScores);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  for (const regionId of aiAgents.keys()) {
    const teamScore = teamScores[regionId] ?? 0;
    result[regionId] = generatePlacement(regionId, turn, teamScore, avgScore, nationalIndices, event);
  }

  return result;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Initialize AI agents for multiple regions.
 * Clears existing agents first.
 */
export function initializeAgents(regionIds: RegionId[]): void {
  clearAllAgents();
  for (const regionId of regionIds) {
    createAgent(regionId);
  }
}

/**
 * Get count of active AI agents.
 */
export function getAgentCount(): number {
  return aiAgents.size;
}
