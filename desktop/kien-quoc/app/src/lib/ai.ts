import { RESOURCES_PER_TURN, type CellType } from '~/config/game';
import { getCellsByType, PROJECT_CELLS } from '~/config/board';
import type { NationalIndices, Placements } from './types';
import type { TurnEvent } from '~/config/events';

interface AllocationByType {
  project: number;
  competitive: number;
  synergy: number;
  shared: number;
  cooperation: number;
}

export class RealisticAdaptiveAgent {
  readonly teamId: string;
  private baseTendency: number;
  private currentTendency: number;
  private projectPriority: number;
  private survivalMode: boolean;
  private personality: 'aggressive' | 'cooperative' | 'balanced' | 'opportunist';

  constructor(teamId: string, seed?: number) {
    this.teamId = teamId;
    // Random tendency between 0.3 (competitive) and 0.7 (cooperative)
    this.baseTendency = 0.3 + Math.random() * 0.4;
    this.currentTendency = this.baseTendency;
    this.projectPriority = 0.45;
    this.survivalMode = false;

    // Assign personality type randomly
    const roll = Math.random();
    this.personality =
      roll < 0.25 ? 'aggressive' : roll < 0.5 ? 'cooperative' : roll < 0.75 ? 'balanced' : 'opportunist';
  }

  /**
   * Decide resource allocation for this turn
   */
  decideAllocation(
    turn: number,
    myScore: number,
    avgScore: number,
    nationalIndices: NationalIndices,
    event: TurnEvent
  ): AllocationByType {
    const resources = RESOURCES_PER_TURN;
    const allocation: AllocationByType = {
      project: 0,
      competitive: 0,
      synergy: 0,
      shared: 0,
      cooperation: 0
    };

    // Check survival mode
    const minIndex = Math.min(...Object.values(nationalIndices));
    if (minIndex <= 5) {
      this.survivalMode = true;
      this.projectPriority = Math.min(0.6, this.projectPriority + 0.1);
    } else if (minIndex >= 8) {
      this.survivalMode = false;
      this.projectPriority = Math.max(0.25, this.projectPriority - 0.02);
    }

    let projectPct: number | undefined;
    let competitivePct: number | undefined;
    let cooperativePct: number | undefined;

    if (turn <= 2) {
      // Early game: more random
      const noise = (Math.random() - 0.5) * 0.2;
      projectPct = 0.3 + noise;
      const remaining = 1.0 - projectPct;
      competitivePct = remaining * (1 - this.currentTendency) * (0.8 + Math.random() * 0.4);
      cooperativePct = remaining * this.currentTendency * (0.8 + Math.random() * 0.4);
    } else {
      // Mid/late game: personality-based behavior
      switch (this.personality) {
        case 'aggressive':
          // Gets MORE competitive as game progresses
          this.currentTendency = Math.max(0.1, this.baseTendency - turn * 0.08);
          // Sometimes hog competitive cells entirely
          if (Math.random() < 0.4) {
            projectPct = 0.2;
            competitivePct = 0.65 + Math.random() * 0.15;
            cooperativePct = 0;
            break;
          }
          break;
        case 'cooperative':
          // Gets MORE cooperative as game progresses
          this.currentTendency = Math.min(0.9, this.baseTendency + turn * 0.08);
          // Sometimes focus entirely on cooperation
          if (Math.random() < 0.4) {
            projectPct = 0.35;
            cooperativePct = 0.5 + Math.random() * 0.15;
            competitivePct = 0;
            break;
          }
          break;
        case 'opportunist':
          // Flip between extremes randomly
          if (Math.random() < 0.5) {
            this.currentTendency = 0.1 + Math.random() * 0.2;
          } else {
            this.currentTendency = 0.7 + Math.random() * 0.2;
          }
          break;
        case 'balanced':
        default:
          // Adapt based on score difference
          if (myScore < avgScore * 0.85) {
            this.currentTendency = Math.min(0.9, this.currentTendency + 0.1);
          } else if (myScore > avgScore * 1.15) {
            this.currentTendency = Math.max(0.2, this.currentTendency - 0.05);
          }
          break;
      }

      // Set defaults if not set by switch case
      if (projectPct === undefined) {
        projectPct = this.projectPriority;
      }
      const remaining = 1.0 - projectPct;
      if (competitivePct === undefined) {
        competitivePct = remaining * (1 - this.currentTendency);
      }
      if (cooperativePct === undefined) {
        cooperativePct = remaining * this.currentTendency;
      }
    }

    // Allocate resources
    allocation.project = Math.floor(resources * projectPct);
    allocation.competitive = Math.floor(resources * competitivePct * 0.5);
    allocation.synergy = Math.floor(resources * cooperativePct * 0.4);
    allocation.shared = Math.floor(resources * cooperativePct * 0.3);
    allocation.cooperation = Math.floor(resources * cooperativePct * 0.3);

    // Handle remainder
    const total = Object.values(allocation).reduce((a, b) => a + b, 0);
    const diff = resources - total;
    if (diff > 0) {
      allocation.competitive += diff;
    } else if (diff < 0) {
      for (const key of ['shared', 'cooperation', 'synergy', 'competitive'] as const) {
        if (allocation[key] >= Math.abs(diff)) {
          allocation[key] += diff;
          break;
        }
      }
    }

    return allocation;
  }

  /**
   * Distribute allocation to cells. AI focuses on fewer cells to maximize impact.
   */
  distributeToCells(allocation: AllocationByType): Placements {
    const placements: Placements = {};

    // Project cells - focus on one project cell
    if (allocation.project > 0) {
      const projectCells = PROJECT_CELLS;
      // Pick one favorite project cell instead of spreading
      const focusCell = shuffleArray(projectCells)[0];
      placements[focusCell.id] = allocation.project;
    }

    // Helper to focus resources on ONE cell per type (sometimes 2)
    const distributeToType = (type: CellType, amount: number) => {
      if (amount <= 0) return;
      const cells = getCellsByType(type);
      const shuffled = shuffleArray(cells);

      // 70% chance focus on 1 cell, 30% chance split between 2
      const numCells = Math.random() < 0.7 ? 1 : Math.min(2, cells.length);
      const chosen = shuffled.slice(0, numCells);

      if (numCells === 1) {
        // Put all resources on one cell
        placements[chosen[0].id] = (placements[chosen[0].id] || 0) + amount;
      } else {
        // Split unevenly (primary gets more)
        const primary = Math.ceil(amount * 0.7);
        const secondary = amount - primary;
        placements[chosen[0].id] = (placements[chosen[0].id] || 0) + primary;
        if (chosen[1] && secondary > 0) {
          placements[chosen[1].id] = (placements[chosen[1].id] || 0) + secondary;
        }
      }
    };

    distributeToType('competitive', allocation.competitive);
    distributeToType('synergy', allocation.synergy);
    distributeToType('shared', allocation.shared);
    distributeToType('cooperation', allocation.cooperation);

    return placements;
  }

  generatePlacements(
    turn: number,
    myScore: number,
    avgScore: number,
    nationalIndices: NationalIndices,
    event: TurnEvent
  ): Placements {
    const allocation = this.decideAllocation(turn, myScore, avgScore, nationalIndices, event);
    return this.distributeToCells(allocation);
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
