import type { NationalIndices, TurnEvent } from '@kien-quoc/shared'

export const GAME_CONFIG = {
  maxTurns: 8,
  resourcesPerTurn: 14,
  minTeams: 3,
  maxTeams: 5,
  
  phaseDurations: {
    event: 15,
    action: 60,
    resolution: 3,
    result: 15,
  },
  
  startingIndices: {
    economy: 10,
    society: 10,
    culture: 10,
    integration: 8,
    environment: 10,
    science: 10,
  } as NationalIndices,
  
  indexMin: 0,
  indexMax: 30,
  survivalWarning: 6,
} as const

export const TURN_EVENTS: TurnEvent[] = [
  {
    turn: 1, year: 1986,
    name: 'Khủng hoảng lạm phát 774%',
    description: 'Đất nước đối mặt với khủng hoảng kinh tế nghiêm trọng.',
    historicalContext: 'Đại hội VI quyết định đường lối Đổi Mới toàn diện.',
    projectName: 'Nghị quyết Khoán 10',
    requirement: { minTotal: 20, minTeams: 3 },
    successReward: { economy: 4, society: 2 },
    failurePenalty: { economy: -4, society: -3 },
  },
  {
    turn: 2, year: 1987,
    name: 'Cấm vận quốc tế',
    description: 'Việt Nam bị cô lập về kinh tế và ngoại giao.',
    historicalContext: 'Luật Đầu tư Nước ngoài đầu tiên được ban hành.',
    projectName: 'Luật Đầu tư Nước ngoài',
    requirement: { minTotal: 21, minTeams: 3 },
    successReward: { integration: 4, economy: 2 },
    failurePenalty: { integration: -5, economy: -2 },
  },
  {
    turn: 3, year: 1991,
    name: 'Liên Xô sụp đổ',
    description: 'Mất nguồn viện trợ chính, phải tự lực cánh sinh.',
    historicalContext: 'Chuyển từ kinh tế kế hoạch sang kinh tế thị trường XHCN.',
    projectName: 'Tự lực cánh sinh',
    requirement: { minTotal: 22, minTeams: 3 },
    successReward: { science: 3, economy: 2 },
    failurePenalty: { economy: -4, science: -3 },
  },
  {
    turn: 4, year: 1993,
    name: 'Thiên tai lũ lụt',
    description: 'Lũ lụt lịch sử tại miền Trung gây thiệt hại nặng.',
    historicalContext: 'Phát huy tinh thần đoàn kết, tương trợ giữa các vùng.',
    projectName: 'Cứu trợ quốc gia',
    requirement: { minTotal: 23, minTeams: 3 },
    successReward: { environment: 3, society: 2 },
    failurePenalty: { environment: -4, society: -3 },
  },
  {
    turn: 5, year: 1994,
    name: 'Chuẩn bị bình thường hóa',
    description: 'Mỹ sắp dỡ bỏ cấm vận thương mại.',
    historicalContext: 'Tháng 2/1994, Mỹ chính thức dỡ bỏ cấm vận.',
    projectName: 'Dỡ bỏ cấm vận',
    requirement: { minTotal: 24, minTeams: 3 },
    successReward: { integration: 5, economy: 3 },
    failurePenalty: { integration: -3, economy: -2 },
  },
  {
    turn: 6, year: 1995,
    name: 'Hội nhập khu vực',
    description: 'Việt Nam gia nhập ASEAN.',
    historicalContext: 'Ngày 28/7/1995, Việt Nam thành viên thứ 7 của ASEAN.',
    projectName: 'Gia nhập ASEAN',
    requirement: { minTotal: 24, minTeams: 3 },
    successReward: { integration: 4, culture: 2 },
    failurePenalty: { integration: -4, culture: -2 },
  },
  {
    turn: 7, year: 2000,
    name: 'Mở rộng thị trường',
    description: 'Đàm phán hiệp định thương mại song phương với Mỹ.',
    historicalContext: 'Hiệp định Thương mại Việt-Mỹ ký ngày 13/7/2000.',
    projectName: 'Hiệp định Việt-Mỹ',
    requirement: { minTotal: 26, minTeams: 4 },
    successReward: { economy: 5, integration: 3 },
    failurePenalty: { economy: -3, integration: -3 },
  },
  {
    turn: 8, year: 2007,
    name: 'Hội nhập toàn cầu',
    description: 'Cơ hội gia nhập WTO - bước ngoặt lịch sử.',
    historicalContext: 'Ngày 11/1/2007, Việt Nam thành viên thứ 150 của WTO.',
    projectName: 'Gia nhập WTO',
    requirement: { minTotal: 28, minTeams: 4 },
    successReward: { economy: 2, society: 2, culture: 2, integration: 2, environment: 2, science: 2 },
    failurePenalty: { economy: -2, society: -2, culture: -2, integration: -2, environment: -2, science: -2 },
  },
]

export const SCORING = {
  competitive: 2.0,
  synergy: { base: 1.5, perTeam: 0.25 },
  shared: 1.0,
  cooperation: { multiplier: 1.8, minTeams: 2 },
  project: 1.5,
} as const
