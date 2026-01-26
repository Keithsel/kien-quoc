import { type IndexName, type CellType } from './game';

// ============================================================================
// MODIFIER TYPES
// ============================================================================

/** Fixed modifier tied to historical events */
export type FixedModifierId =
  | 'hyperinflation' // Turn 1: All yields -20%
  | 'fdi_boom' // Turn 2: Independent +50%
  | 'aid_cutoff' // Turn 3: Cooperation needs 3+ teams
  | 'crisis_response' // Turn 4: Project RP counts 1.5x
  | 'market_access' // Turn 5: Competitive +30%
  | 'regional_unity' // Turn 6: Synergy bonus +25%
  | 'trade_surge' // Turn 7: All yields +10%
  | 'multilateral_trade'; // Turn 8: Cooperation +50%

/** Random modifier drawn each turn */
export type RandomModifierId =
  | 'economy_surge'
  | 'economy_slump'
  | 'society_boom'
  | 'social_unrest'
  | 'culture_renaissance'
  | 'culture_decline'
  | 'diplomatic_windfall'
  | 'isolationism'
  | 'green_initiative'
  | 'pollution_crisis'
  | 'science_boom'
  | 'science_drought'
  | 'easy_indices'
  | 'foreign_aid'
  | 'resource_scarcity';

export interface ModifierEffect {
  /** Multiplier for specific cell types (e.g., { competitive: 1.3 } = +30%) */
  cellMultipliers?: Partial<Record<CellType, number>>;
  /** Multiplier for all cell types */
  globalMultiplier?: number;
  /** Bonus/penalty to RP this turn */
  rpBonus?: number;
  /** Minimum teams required for cooperation cells (overrides default 2) */
  minCoopTeams?: number;
  /** Multiplier for project RP contribution */
  projectRpMultiplier?: number;
  /** Index divisor adjustment (e.g., -1 means 6 RP → +1 index instead of 7) */
  indexDivisorAdjust?: number;
}

export interface ModifierDefinition {
  id: FixedModifierId | RandomModifierId;
  name: string;
  description: string;
  effect: ModifierEffect;
  isPositive: boolean; // For UI coloring
}

// Fixed modifiers - one per turn, historically grounded
export const FIXED_MODIFIERS: Record<FixedModifierId, ModifierDefinition> = {
  hyperinflation: {
    id: 'hyperinflation',
    name: 'Siêu lạm phát',
    description: 'Tất cả điểm -20%',
    effect: { globalMultiplier: 0.8 },
    isPositive: false
  },
  fdi_boom: {
    id: 'fdi_boom',
    name: 'Bùng nổ FDI',
    description: 'Ô Độc lập +50%',
    effect: { cellMultipliers: { independent: 1.5 } },
    isPositive: true
  },
  aid_cutoff: {
    id: 'aid_cutoff',
    name: 'Cắt viện trợ',
    description: 'Ô Hợp tác cần 3+ đội',
    effect: { minCoopTeams: 3 },
    isPositive: false
  },
  crisis_response: {
    id: 'crisis_response',
    name: 'Đoàn kết cứu trợ',
    description: 'RP dự án x1.5',
    effect: { projectRpMultiplier: 1.5 },
    isPositive: true
  },
  market_access: {
    id: 'market_access',
    name: 'Mở cửa thị trường',
    description: 'Ô Cạnh tranh +30%',
    effect: { cellMultipliers: { competitive: 1.3 } },
    isPositive: true
  },
  regional_unity: {
    id: 'regional_unity',
    name: 'Đoàn kết khu vực',
    description: 'Ô Hiệp lực +25%',
    effect: { cellMultipliers: { synergy: 1.25 } },
    isPositive: true
  },
  trade_surge: {
    id: 'trade_surge',
    name: 'Thương mại tăng trưởng',
    description: 'Tất cả điểm +10%',
    effect: { globalMultiplier: 1.1 },
    isPositive: true
  },
  multilateral_trade: {
    id: 'multilateral_trade',
    name: 'Hợp tác đa phương',
    description: 'Ô Hợp tác +50%',
    effect: { cellMultipliers: { cooperation: 1.5 } },
    isPositive: true
  }
};

// Random modifiers - shuffled at game start, one drawn per turn
export const RANDOM_MODIFIERS: Record<RandomModifierId, ModifierDefinition> = {
  economy_surge: {
    id: 'economy_surge',
    name: 'Kinh tế khởi sắc',
    description: 'Ô Kinh tế +20%',
    effect: { cellMultipliers: { competitive: 1.2, independent: 1.2 } }, // Economy-linked cells
    isPositive: true
  },
  economy_slump: {
    id: 'economy_slump',
    name: 'Suy thoái kinh tế',
    description: 'Ô Kinh tế -20%',
    effect: { cellMultipliers: { competitive: 0.8, independent: 0.8 } },
    isPositive: false
  },
  society_boom: {
    id: 'society_boom',
    name: 'Xã hội phát triển',
    description: 'Ô Xã hội +20%',
    effect: { cellMultipliers: { synergy: 1.2, cooperation: 1.2 } },
    isPositive: true
  },
  social_unrest: {
    id: 'social_unrest',
    name: 'Bất ổn xã hội',
    description: 'Ô Xã hội -20%',
    effect: { cellMultipliers: { synergy: 0.8, cooperation: 0.8 } },
    isPositive: false
  },
  culture_renaissance: {
    id: 'culture_renaissance',
    name: 'Văn hóa nở rộ',
    description: 'Ô Văn hóa +20%',
    effect: { cellMultipliers: { cooperation: 1.2 } },
    isPositive: true
  },
  culture_decline: {
    id: 'culture_decline',
    name: 'Văn hóa suy yếu',
    description: 'Ô Văn hóa -20%',
    effect: { cellMultipliers: { cooperation: 0.8 } },
    isPositive: false
  },
  diplomatic_windfall: {
    id: 'diplomatic_windfall',
    name: 'Cơ hội ngoại giao',
    description: 'Ô Hội nhập +20%',
    effect: { cellMultipliers: { synergy: 1.2 } },
    isPositive: true
  },
  isolationism: {
    id: 'isolationism',
    name: 'Xu hướng cô lập',
    description: 'Ô Hội nhập -20%',
    effect: { cellMultipliers: { synergy: 0.8 } },
    isPositive: false
  },
  green_initiative: {
    id: 'green_initiative',
    name: 'Sáng kiến xanh',
    description: 'Ô Môi trường +20%',
    effect: { cellMultipliers: { independent: 1.2 } },
    isPositive: true
  },
  pollution_crisis: {
    id: 'pollution_crisis',
    name: 'Khủng hoảng ô nhiễm',
    description: 'Ô Môi trường -20%',
    effect: { cellMultipliers: { independent: 0.8 } },
    isPositive: false
  },
  science_boom: {
    id: 'science_boom',
    name: 'Khoa học phát triển',
    description: 'Ô Khoa học +20%',
    effect: { cellMultipliers: { synergy: 1.2 } },
    isPositive: true
  },
  science_drought: {
    id: 'science_drought',
    name: 'Khoa học trì trệ',
    description: 'Ô Khoa học -20%',
    effect: { cellMultipliers: { synergy: 0.8 } },
    isPositive: false
  },
  easy_indices: {
    id: 'easy_indices',
    name: 'Điều kiện thuận lợi',
    description: 'Các chỉ số cần ít RP hơn để tăng trưởng',
    effect: { indexDivisorAdjust: -1 },
    isPositive: true
  },
  foreign_aid: {
    id: 'foreign_aid',
    name: 'Viện trợ nước ngoài',
    description: 'Tất cả đội +2 RP',
    effect: { rpBonus: 2 },
    isPositive: true
  },
  resource_scarcity: {
    id: 'resource_scarcity',
    name: 'Khan hiếm tài nguyên',
    description: 'Tất cả đội -2 RP',
    effect: { rpBonus: -2 },
    isPositive: false
  }
};

// Pool of random modifier IDs (will be shuffled at game start)
export const RANDOM_MODIFIER_POOL: RandomModifierId[] = Object.keys(RANDOM_MODIFIERS) as RandomModifierId[];

// ============================================================================
// TURN EVENT TYPES
// ============================================================================

export interface TurnEvent {
  turn: number;
  year: number;
  name: string;
  scenario: string; // Mô tả bối cảnh lịch sử
  project: string;
  minTotal: number;
  minTeams: number;
  successReward: {
    points: number;
    indices: Partial<Record<IndexName, number>>;
  };
  failurePenalty: Partial<Record<IndexName, number>>;
  /** Fixed modifier for this turn (historically grounded) */
  fixedModifier: FixedModifierId;
}

/**
 * Historical Events for Kiến Quốc Ký
 * Based on Vietnam's Đổi Mới period (1986-2007)
 * Research sources: Wikipedia, Đảng Cộng sản VN, Báo Chính phủ
 */
export const TURN_EVENTS: TurnEvent[] = [
  {
    turn: 1,
    year: 1986,
    name: 'Đại hội Đảng VI',
    scenario:
      'Lạm phát vượt 774%, đời sống nhân dân cực kỳ khó khăn. Đại hội Đảng VI (12/1986) quyết định "Đổi Mới" toàn diện, xóa bỏ cơ chế bao cấp.',
    project: 'Khởi động Đổi Mới',
    minTotal: 20,
    minTeams: 3,
    successReward: { points: 8, indices: { economy: 4, society: 3 } },
    failurePenalty: { economy: -4, society: -3 },
    fixedModifier: 'hyperinflation'
  },
  {
    turn: 2,
    year: 1987,
    name: 'Luật Đầu tư Nước ngoài',
    scenario:
      'Việt Nam thông qua Luật Đầu tư Nước ngoài (12/1987) - văn bản pháp lý đầu tiên thu hút FDI, cho phép 100% vốn nước ngoài.',
    project: 'Mở cửa đầu tư',
    minTotal: 21,
    minTeams: 3,
    successReward: { points: 10, indices: { integration: 5, economy: 3 } },
    failurePenalty: { integration: -4, economy: -3 },
    fixedModifier: 'fdi_boom'
  },
  {
    turn: 3,
    year: 1991,
    name: 'Liên Xô sụp đổ',
    scenario:
      'Liên Xô tan rã (12/1991), viện trợ và hợp tác kinh tế chấm dứt đột ngột. Việt Nam phải tự lực cánh sinh, đa dạng hóa quan hệ.',
    project: 'Tự lực phát triển',
    minTotal: 22,
    minTeams: 3,
    successReward: { points: 12, indices: { science: 4, economy: 4 } },
    failurePenalty: { economy: -4, science: -3 },
    fixedModifier: 'aid_cutoff'
  },
  {
    turn: 4,
    year: 1993,
    name: 'Thiên tai miền Trung',
    scenario: 'Lũ lụt lịch sử ở miền Trung, mực nước sông Ba đạt đỉnh 5.2m. Thiệt hại nặng nề về người và tài sản.',
    project: 'Cứu trợ quốc gia',
    minTotal: 23,
    minTeams: 3,
    successReward: { points: 12, indices: { environment: 5, society: 3 } },
    failurePenalty: { environment: -4, society: -3 },
    fixedModifier: 'crisis_response'
  },
  {
    turn: 5,
    year: 1994,
    name: 'Hoa Kỳ dỡ bỏ cấm vận',
    scenario:
      'Tổng thống Bill Clinton dỡ bỏ cấm vận thương mại 18 năm (2/1994). Cơ hội lịch sử để Việt Nam hội nhập kinh tế thế giới.',
    project: 'Bình thường hóa quan hệ',
    minTotal: 24,
    minTeams: 3,
    successReward: { points: 14, indices: { integration: 4, economy: 4 } },
    failurePenalty: { integration: -4, economy: -3 },
    fixedModifier: 'market_access'
  },
  {
    turn: 6,
    year: 1995,
    name: 'Gia nhập ASEAN',
    scenario:
      'Việt Nam trở thành thành viên thứ 7 của ASEAN (28/7/1995), chấm dứt thời kỳ cô lập, mở ra kỷ nguyên hội nhập khu vực.',
    project: 'Hội nhập Đông Nam Á',
    minTotal: 25,
    minTeams: 3,
    successReward: { points: 14, indices: { integration: 5, culture: 3 } },
    failurePenalty: { integration: -5, culture: -4 },
    fixedModifier: 'regional_unity'
  },
  {
    turn: 7,
    year: 2000,
    name: 'Hiệp định Thương mại Việt Nam - Hoa Kỳ',
    scenario:
      'Ký BTA (13/7/2000) sau 5 năm đàm phán. Hoa Kỳ trở thành thị trường xuất khẩu số 1, kim ngạch tăng từ 1 tỷ USD lên 10 tỷ USD.',
    project: 'Mở rộng thị trường',
    minTotal: 26,
    minTeams: 3,
    successReward: { points: 16, indices: { economy: 5, science: 3 } },
    failurePenalty: { economy: -5, science: -4 },
    fixedModifier: 'trade_surge'
  },
  {
    turn: 8,
    year: 2007,
    name: 'Gia nhập WTO',
    scenario:
      'Việt Nam trở thành thành viên thứ 150 của WTO (11/1/2007). Hoàn tất hội nhập kinh tế quốc tế sau hơn 10 năm đàm phán.',
    project: 'Hội nhập toàn cầu',
    minTotal: 28,
    minTeams: 4,
    successReward: {
      points: 20,
      indices: { economy: 3, society: 3, culture: 3, integration: 3, environment: 3, science: 3 }
    },
    failurePenalty: {
      economy: -5,
      society: -5,
      culture: -5,
      integration: -5,
      environment: -5,
      science: -5
    },
    fixedModifier: 'multilateral_trade'
  }
];

export function getEventForTurn(turn: number): TurnEvent | undefined {
  return TURN_EVENTS.find((e) => e.turn === turn);
}

/**
 * Combine fixed and random modifier effects for a turn.
 * Effects are merged algebraically:
 * - globalMultiplier: multiply together
 * - cellMultipliers: multiply per cell type
 * - rpBonus: add together
 * - minCoopTeams: take maximum
 * - projectRpMultiplier: multiply together
 * - indexDivisorAdjust: add together
 */
export function getTurnModifierEffect(turn: number, randomModifiers?: RandomModifierId[]): ModifierEffect {
  const event = TURN_EVENTS[turn - 1];
  const fixedMod = event ? FIXED_MODIFIERS[event.fixedModifier] : null;
  const randomModId = randomModifiers?.[turn - 1];
  const randomMod = randomModId ? RANDOM_MODIFIERS[randomModId] : null;

  const combined: ModifierEffect = {};

  // Merge effects
  for (const mod of [fixedMod, randomMod]) {
    if (!mod) continue;
    const eff = mod.effect;

    // Global multiplier (multiply together)
    if (eff.globalMultiplier !== undefined) {
      combined.globalMultiplier = (combined.globalMultiplier ?? 1) * eff.globalMultiplier;
    }
    // Cell multipliers (multiply together per cell type)
    if (eff.cellMultipliers) {
      combined.cellMultipliers = combined.cellMultipliers ?? {};
      for (const [cellType, mult] of Object.entries(eff.cellMultipliers)) {
        combined.cellMultipliers[cellType as keyof typeof combined.cellMultipliers] =
          (combined.cellMultipliers[cellType as keyof typeof combined.cellMultipliers] ?? 1) * mult;
      }
    }
    // RP bonus (add together)
    if (eff.rpBonus !== undefined) {
      combined.rpBonus = (combined.rpBonus ?? 0) + eff.rpBonus;
    }
    // Min coop teams (take max)
    if (eff.minCoopTeams !== undefined) {
      combined.minCoopTeams = Math.max(combined.minCoopTeams ?? 2, eff.minCoopTeams);
    }
    // Project RP multiplier (multiply together)
    if (eff.projectRpMultiplier !== undefined) {
      combined.projectRpMultiplier = (combined.projectRpMultiplier ?? 1) * eff.projectRpMultiplier;
    }
    // Index divisor adjust (add together)
    if (eff.indexDivisorAdjust !== undefined) {
      combined.indexDivisorAdjust = (combined.indexDivisorAdjust ?? 0) + eff.indexDivisorAdjust;
    }
  }

  return combined;
}

/**
 * Scale project requirements based on active team count (2-5 teams)
 *
 * Scaling rules:
 * - minTotal: Scales proportionally (5 teams = 100%, 4 = 80%, 3 = 60%, 2 = 40%)
 * - minTeams: Base requirement minus (5 - activeTeams), minimum 1
 *   e.g., base minTeams=3: 5 teams→3, 4 teams→2, 3 teams→1, 2 teams→1
 *
 * @param event - The turn event to scale
 * @param activeTeams - Number of active teams (2-5)
 */
export function getScaledRequirements(event: TurnEvent, activeTeams: number): { minTotal: number; minTeams: number } {
  // Clamp to valid range (2-5 teams)
  const teams = Math.max(2, Math.min(5, activeTeams));

  // Scale RP proportionally: 5 teams = full, fewer = proportional reduction
  const scaleFactor = teams / 5;
  const scaledMinTotal = Math.ceil(event.minTotal * scaleFactor);

  // Decrease minTeams by 1 for each team lacking from 5
  // e.g., 5 teams = base, 4 teams = base-1, 3 = base-2, 2 = base-3
  const teamsLacking = 5 - teams;
  const scaledMinTeams = Math.max(1, event.minTeams - teamsLacking);

  return {
    minTotal: scaledMinTotal,
    minTeams: scaledMinTeams
  };
}
