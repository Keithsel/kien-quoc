import { RESOURCES_PER_TURN, MAX_TURNS, type CellType, type IndexName } from '~/config/game';
import { getCellsByType, PROJECT_CELLS } from '~/config/board';
import type { NationalIndices, Placements } from './types';
import type { TurnEvent } from '~/config/events';
import { FIXED_MODIFIERS, type FixedModifierId } from '~/config/events';
import { REGION_MAP, type RegionId } from '~/config/regions';

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
   * @param resources - Total RP available (may include underdog bonus)
   * @param activeTeams - Number of active teams for project estimation
   */
  decideAllocation(
    turn: number,
    myScore: number,
    avgScore: number,
    nationalIndices: NationalIndices,
    event: TurnEvent,
    resources: number = RESOURCES_PER_TURN,
    activeTeams: number = 6
  ): AllocationByType {
    const allocation: AllocationByType = {
      project: 0,
      competitive: 0,
      synergy: 0,
      independent: 0,
      cooperation: 0
    };

    // === IMPROVEMENT #3: Predictive Index Maintenance ===
    // Check which indices will collapse soon (accounting for -1/turn maintenance)
    const minIndex = Math.min(...Object.values(nationalIndices));
    const turnsRemaining = MAX_TURNS - turn;
    const predictedMinAtEnd = minIndex - turnsRemaining; // Indices drop by 1 each turn
    
    if (minIndex <= 3 || predictedMinAtEnd <= 0) {
      // Critical mode - heavy project focus to boost indices
      this.survivalMode = true;
      this.projectPriority = 0.50;
    } else if (minIndex <= 5 || predictedMinAtEnd <= 2) {
      // Survival mode - increased project priority
      this.survivalMode = true;
      this.projectPriority = 0.40;
    } else if (minIndex <= 7) {
      // Caution mode - moderate project priority
      this.survivalMode = false;
      this.projectPriority = 0.30;
    } else {
      // Healthy indices - be selfish, focus on scoring
      this.survivalMode = false;
      this.projectPriority = 0.25;
    }

    // === IMPROVEMENT #2: Smart Project Contribution ===
    // Estimate if project will succeed and adjust contribution
    const scaledMinTotal = Math.ceil(event.minTotal * (activeTeams / 6));
    const fairShareProject = Math.ceil(scaledMinTotal / activeTeams);
    
    // Smart project contribution: contribute fair share, not more (unless survival mode)
    // This ensures project success without wasting RP that could score points
    const minProjectRP = Math.max(3, Math.ceil(fairShareProject * 0.85)); // 85% of fair share minimum
    const maxProjectRP = this.survivalMode ? fairShareProject + 2 : fairShareProject; // Cap at fair share (or +2 if survival)
    
    let projectPct: number;
    let competitivePct: number;
    let cooperativePct: number;

    // === IMPROVEMENT #1: Use Event Modifiers ===
    // Adjust strategy based on turn's fixed modifier
    const fixedMod = FIXED_MODIFIERS[event.fixedModifier as FixedModifierId];
    const cellBoosts = fixedMod?.effect?.cellMultipliers || {};
    const hasSynergyBoost = (cellBoosts.synergy ?? 1) > 1;
    const hasCompetitiveBoost = (cellBoosts.competitive ?? 1) > 1;
    const hasCooperationBoost = (cellBoosts.cooperation ?? 1) > 1;
    const hasIndependentBoost = (cellBoosts.independent ?? 1) > 1;
    const hasProjectBoost = (fixedMod?.effect?.projectRpMultiplier ?? 1) > 1;

    // === IMPROVEMENT #4: Turn-Aware Strategy (triggered randomly in last turns) ===
    const isLastTurns = turn >= MAX_TURNS - 1; // Turn 7-8
    const shouldMaximizePoints = isLastTurns && Math.random() < 0.6; // 60% chance to play aggressive in endgame

    if (shouldMaximizePoints && !this.survivalMode) {
      // Endgame: maximize points, contribute only minimum to project
      projectPct = minProjectRP / resources;
      competitivePct = 0.50 + Math.random() * 0.15; // 50-65% - be greedy!
      cooperativePct = 1.0 - projectPct - competitivePct;
    } else {
      // Normal personality-based behavior with modifier awareness
      switch (this.personality) {
        case 'aggressive':
          this.currentTendency = Math.max(0.2, this.baseTendency - turn * 0.015);
          // Aggressive: minimum project, maximum competitive
          projectPct = this.survivalMode ? 0.35 : minProjectRP / resources;
          
          // Lean into competitive (45-55%)
          if (hasCompetitiveBoost) {
            competitivePct = 0.50 + Math.random() * 0.10;
          } else {
            competitivePct = 0.45 + Math.random() * 0.10;
          }
          cooperativePct = Math.max(0.1, 1.0 - projectPct - competitivePct);
          break;

        case 'cooperative':
          this.currentTendency = Math.min(0.90, this.baseTendency + turn * 0.015);
          // Cooperative: slightly more to project, but still compete
          projectPct = this.survivalMode ? 0.40 : (hasProjectBoost ? 0.35 : 0.30);
          
          // Lean into synergy/coop (35-45%)
          if (hasSynergyBoost || hasCooperationBoost) {
            cooperativePct = 0.40 + Math.random() * 0.10;
          } else {
            cooperativePct = 0.35 + Math.random() * 0.10;
          }
          // Still compete for points (at least 25%)
          competitivePct = Math.max(0.25, 1.0 - projectPct - cooperativePct);
          break;

        case 'opportunist':
          // Opportunist: flip strategy based on modifiers, but always compete
          if (hasCompetitiveBoost || hasIndependentBoost) {
            this.currentTendency = 0.25 + Math.random() * 0.10;
            projectPct = this.survivalMode ? 0.30 : minProjectRP / resources;
            competitivePct = 0.50 + Math.random() * 0.10;
            cooperativePct = Math.max(0.1, 1.0 - projectPct - competitivePct);
          } else if (hasSynergyBoost || hasCooperationBoost) {
            this.currentTendency = 0.65 + Math.random() * 0.15;
            projectPct = this.survivalMode ? 0.35 : 0.25;
            cooperativePct = 0.40 + Math.random() * 0.10;
            competitivePct = Math.max(0.20, 1.0 - projectPct - cooperativePct);
          } else {
            // Random flip
            if (Math.random() < 0.5) {
              this.currentTendency = 0.25 + Math.random() * 0.10;
              projectPct = this.survivalMode ? 0.30 : minProjectRP / resources;
              competitivePct = 0.50 + Math.random() * 0.10;
              cooperativePct = Math.max(0.1, 1.0 - projectPct - competitivePct);
            } else {
              this.currentTendency = 0.65 + Math.random() * 0.15;
              projectPct = this.survivalMode ? 0.35 : 0.25;
              cooperativePct = 0.40 + Math.random() * 0.10;
              competitivePct = Math.max(0.20, 1.0 - projectPct - cooperativePct);
            }
          }
          break;

        case 'balanced':
        default: {
          // Adapt based on score difference
          if (myScore < avgScore * 0.9) {
            this.currentTendency = Math.min(0.7, this.currentTendency + 0.10);
          } else if (myScore > avgScore * 1.1) {
            this.currentTendency = Math.max(0.3, this.currentTendency - 0.08);
          }
          
          // Smart project contribution - fair share, capped
          projectPct = this.survivalMode ? this.projectPriority : Math.max(minProjectRP / resources, 0.25);
          
          const remaining = 1.0 - projectPct;
          
          // Adjust for modifier boosts
          let competitiveWeight = 1 - this.currentTendency;
          let cooperativeWeight = this.currentTendency;
          
          if (hasCompetitiveBoost || hasIndependentBoost) competitiveWeight *= 1.2;
          if (hasSynergyBoost || hasCooperationBoost) cooperativeWeight *= 1.2;
          
          const totalWeight = competitiveWeight + cooperativeWeight;
          competitivePct = remaining * (competitiveWeight / totalWeight);
          cooperativePct = remaining * (cooperativeWeight / totalWeight);
          break;
        }
      }
    }

    // Allocate resources with personality-influenced distribution
    // CAP project at fair share to maximize personal scoring potential
    const rawProjectRP = Math.floor(resources * projectPct);
    allocation.project = Math.min(rawProjectRP, maxProjectRP);
    
    // Redirect excess project RP to competitive cells (maximize personal gain)
    const excessProject = rawProjectRP - allocation.project;

    // Competitive pool - adjust split based on modifiers
    const independentRatio = hasIndependentBoost ? 0.5 : 0.3;
    allocation.competitive = Math.floor(resources * competitivePct * (1 - independentRatio)) + Math.ceil(excessProject * 0.7);
    allocation.independent = Math.floor(resources * competitivePct * independentRatio) + Math.floor(excessProject * 0.3);

    // Cooperative pool - adjust split based on modifiers
    const coopRatio = hasCooperationBoost ? 0.65 : 0.5;
    allocation.synergy = Math.floor(resources * cooperativePct * (1 - coopRatio));
    allocation.cooperation = Math.floor(resources * cooperativePct * coopRatio);

    // Handle remainder - distribute to competitive cells (maximize personal gain)
    const total = Object.values(allocation).reduce((a, b) => a + b, 0);
    const diff = resources - total;
    if (diff > 0) {
      // Extra RP goes to competitive cells for most personalities
      if (this.personality === 'cooperative') {
        allocation.synergy += diff;
      } else {
        allocation.competitive += diff; // Maximize personal scoring
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
   * Uses scoring system to pick best cells:
   * 1. Cells that boost WEAK indices (survival mode) - highest priority
   * 2. Cells specialized by the region
   * 3. Cells with better modifier boosts
   */
  distributeToCells(allocation: AllocationByType, nationalIndices?: NationalIndices, event?: TurnEvent): Placements {
    const placements: Placements = {};
    const region = REGION_MAP[this.teamId as RegionId];

    // Identify weak indices (threshold: 4 or below)
    const weakIndices: IndexName[] = nationalIndices
      ? (Object.entries(nationalIndices) as [IndexName, number][])
          .filter(([, value]) => value <= 4)
          .sort((a, b) => a[1] - b[1]) // Sort by weakest first
          .map(([name]) => name)
      : [];

    // Get modifier info for cell scoring
    const fixedMod = event ? FIXED_MODIFIERS[event.fixedModifier as FixedModifierId] : null;
    const cellBoosts = fixedMod?.effect?.cellMultipliers || {};

    // Project cells - focus on one project cell
    if (allocation.project > 0) {
      const focusCell = shuffleArray(PROJECT_CELLS)[0];
      placements[focusCell.id] = allocation.project;
    }

    // === IMPROVEMENT #5: Smarter Cell Selection ===
    // Score cells by value instead of random shuffle
    const scoreCells = (cells: ReturnType<typeof getCellsByType>, type: CellType) => {
      return cells.map((cell) => {
        let score = Math.random() * 2; // Small random factor (0-2) for variety
        
        // Priority 1: Cells that boost WEAK indices (+5 per weak index)
        const boostedWeakCount = weakIndices.filter((idx) => cell.indices.includes(idx)).length;
        if (boostedWeakCount > 0 && this.survivalMode) {
          score += boostedWeakCount * 5;
        }
        
        // Priority 2: Cells specialized by region (+3)
        const isSpecialized = region?.specializedIndices.some((idx) => cell.indices.includes(idx));
        if (isSpecialized) {
          score += 3;
        }
        
        // Priority 3: Cells with modifier boost (+2)
        const typeBoost = cellBoosts[type] ?? 1;
        if (typeBoost > 1) {
          score += 2;
        }
        
        return { cell, score };
      }).sort((a, b) => b.score - a.score);
    };

    // Helper to focus resources on highest-scored cells
    const distributeToType = (type: CellType, amount: number) => {
      if (amount <= 0) return;
      const cells = getCellsByType(type);
      const scoredCells = scoreCells(cells, type);
      
      // Pick top 1-2 cells based on personality
      const numCells = this.personality === 'opportunist' || Math.random() < 0.3 ? 
        Math.min(2, scoredCells.length) : 1;
      const chosen = scoredCells.slice(0, numCells);

      if (numCells === 1 || chosen.length === 1) {
        placements[chosen[0].cell.id] = (placements[chosen[0].cell.id] || 0) + amount;
      } else {
        // Split 70-30 between top two
        const primary = Math.ceil(amount * 0.7);
        const secondary = amount - primary;
        placements[chosen[0].cell.id] = (placements[chosen[0].cell.id] || 0) + primary;
        if (chosen[1] && secondary > 0) {
          placements[chosen[1].cell.id] = (placements[chosen[1].cell.id] || 0) + secondary;
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
    event: TurnEvent,
    resources: number = RESOURCES_PER_TURN,
    activeTeams: number = 6
  ): Placements {
    const allocation = this.decideAllocation(turn, myScore, avgScore, nationalIndices, event, resources, activeTeams);
    return this.distributeToCells(allocation, nationalIndices, event);
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
