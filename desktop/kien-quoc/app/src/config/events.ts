import { type IndexName } from './game';

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
    failurePenalty: { economy: -4, society: -3 }
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
    failurePenalty: { integration: -4, economy: -3 }
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
    failurePenalty: { economy: -4, science: -3 }
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
    failurePenalty: { environment: -4, society: -3 }
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
    failurePenalty: { integration: -4, economy: -3 }
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
    failurePenalty: { integration: -5, culture: -4 }
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
    failurePenalty: { economy: -5, science: -4 }
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
    }
  }
];

export function getEventForTurn(turn: number): TurnEvent | undefined {
  return TURN_EVENTS.find((e) => e.turn === turn);
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
