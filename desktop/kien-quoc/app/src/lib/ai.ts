import { RESOURCES_PER_TURN, type CellType } from '~/config/game';
import { getCellsByType, PROJECT_CELLS } from '~/config/board';
import type { NationalIndices, Placements } from './types';
import type { TurnEvent } from '~/config/events';

interface AllocationByType {
  project: number;
  competitive: number;
  synergy: number;
  independent: number;
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
    this.projectPriority = 0.3;
    this.survivalMode = false;

    // Assign personality type randomly (equal distribution)
    const roll = Math.random();
    this.personality =
      roll < 0.25 ? 'aggressive' : roll < 0.5 ? 'cooperative' : roll < 0.75 ? 'balanced' : 'opportunist';

    // Set baseTendency based on personality (more polarized from the start)
    // Lower tendency = more competitive, Higher tendency = more cooperative
    switch (this.personality) {
      case 'aggressive':
        this.baseTendency = 0.15 + Math.random() * 0.15; // 0.15-0.30 (very competitive)
        break;
      case 'cooperative':
        this.baseTendency = 0.7 + Math.random() * 0.2; // 0.70-0.90 (very cooperative)
        break;
      case 'balanced':
        this.baseTendency = 0.4 + Math.random() * 0.2; // 0.40-0.60 (center)
        break;
      case 'opportunist':
        this.baseTendency = 0.3 + Math.random() * 0.4; // 0.30-0.70 (will flip anyway)
        break;
    }
    this.currentTendency = this.baseTendency;
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
      independent: 0,
      cooperation: 0
    };

    // Check survival mode - trigger earlier and be more aggressive
    const minIndex = Math.min(...Object.values(nationalIndices));
    if (minIndex <= 2) {
      // Critical mode - heavy project focus
      this.survivalMode = true;
      this.projectPriority = 0.55; // Nerfed from 0.70
    } else if (minIndex <= 5) {
      // Survival mode - increased project priority
      this.survivalMode = true;
      this.projectPriority = Math.min(0.45, this.projectPriority + 0.08); // Nerfed from 0.60/0.10
    } else if (minIndex >= 8) {
      this.survivalMode = false;
      this.projectPriority = Math.max(0.25, this.projectPriority - 0.02);
    }

    let projectPct: number;
    let competitivePct: number;
    let cooperativePct: number;

    // Personality-based behavior from Turn 1 (no more generic early game)
    switch (this.personality) {
      case 'aggressive':
        // Heavy competitive focus, minimal cooperation
        this.currentTendency = Math.max(0.1, this.baseTendency - turn * 0.02);
        projectPct = 0.2 + Math.random() * 0.1; // 20-30% project
        competitivePct = 0.45 + Math.random() * 0.15; // 45-60% competitive
        cooperativePct = 1.0 - projectPct - competitivePct; // Rest to coop
        break;

      case 'cooperative':
        // Heavy synergy/cooperation focus, minimal competitive
        this.currentTendency = Math.min(0.95, this.baseTendency + turn * 0.02);
        projectPct = 0.3 + Math.random() * 0.1; // 30-40% project (more civic-minded)
        cooperativePct = 0.45 + Math.random() * 0.15; // 45-60% cooperative
        competitivePct = Math.max(0, 1.0 - projectPct - cooperativePct); // Minimal competitive
        break;

      case 'opportunist':
        // Flip between extremes each turn
        if (Math.random() < 0.5) {
          // Aggressive turn
          this.currentTendency = 0.15 + Math.random() * 0.15;
          projectPct = 0.15;
          competitivePct = 0.5 + Math.random() * 0.2;
          cooperativePct = 1.0 - projectPct - competitivePct;
        } else {
          // Cooperative turn
          this.currentTendency = 0.75 + Math.random() * 0.15;
          projectPct = 0.35;
          cooperativePct = 0.5 + Math.random() * 0.15;
          competitivePct = Math.max(0, 1.0 - projectPct - cooperativePct);
        }
        break;

      case 'balanced':
      default:
        // Adapt based on score difference
        if (myScore < avgScore * 0.85) {
          // Behind: be more cooperative to catch up via synergy
          this.currentTendency = Math.min(0.8, this.currentTendency + 0.15);
        } else if (myScore > avgScore * 1.15) {
          // Ahead: be more competitive to maintain lead
          this.currentTendency = Math.max(0.25, this.currentTendency - 0.1);
        }
        projectPct = this.projectPriority;
        const remaining = 1.0 - projectPct;
        competitivePct = remaining * (1 - this.currentTendency);
        cooperativePct = remaining * this.currentTendency;
        break;
    }

    // Allocate resources with personality-influenced distribution
    allocation.project = Math.floor(resources * projectPct);

    // Competitive pool
    allocation.competitive = Math.floor(resources * competitivePct * 0.7); // 70% of competitive budget
    allocation.independent = Math.floor(resources * competitivePct * 0.3); // 30% to independent (safe points)

    // Cooperative pool
    allocation.synergy = Math.floor(resources * cooperativePct * 0.5); // 50% synergy (scales with participants)
    allocation.cooperation = Math.floor(resources * cooperativePct * 0.5); // 50% cooperation (high risk/reward)

    // Handle remainder - distribute to personality's preferred type
    const total = Object.values(allocation).reduce((a, b) => a + b, 0);
    const diff = resources - total;
    if (diff > 0) {
      if (this.personality === 'aggressive') {
        allocation.competitive += diff;
      } else if (this.personality === 'cooperative') {
        allocation.synergy += diff;
      } else {
        allocation.project += diff;
      }
    } else if (diff < 0) {
      for (const key of ['independent', 'cooperation', 'synergy', 'competitive'] as const) {
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
    distributeToType('independent', allocation.independent);
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
