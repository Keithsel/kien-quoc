import type { Region, NationalIndices } from '../types/game'

export const ROOM_CODE_LENGTH = 6
export const ROOM_CODE_CHARSET = '0123456789'
export const ROOM_EXPIRY_MINUTES = 120

export const MAX_TURNS = 8
export const RESOURCES_PER_TURN = 14
export const MIN_TEAMS = 3
export const MAX_TEAMS = 5

export const PHASE_DURATIONS = {
  event: 15, action: 60, resolution: 3, result: 15,
} as const

export const STARTING_INDICES: NationalIndices = {
  economy: 10, society: 10, culture: 10,
  integration: 8, environment: 10, science: 10,
}

export const INDEX_MIN = 0
export const INDEX_MAX = 30
export const SURVIVAL_WARNING = 6

export const SCORING = {
  competitive: 2.0,
  synergy: { base: 1.5, perTeam: 0.25 },
  shared: 1.0,
  cooperation: 1.8,
  cooperationMinTeams: 2,
  project: 1.5,
} as const

export const REGIONS: Region[] = [
  { id: 'thu-do', name: 'THỦ ĐÔ', description: 'Trung tâm chính trị, văn hóa', provinces: ['Hà Nội', 'Hải Phòng', 'Quảng Ninh'] },
  { id: 'duyen-hai', name: 'DUYÊN HẢI', description: 'Ven biển miền Trung', provinces: ['Đà Nẵng', 'Quảng Nam', 'Bình Định'] },
  { id: 'tay-nguyen', name: 'TÂY NGUYÊN', description: 'Cao nguyên, nông lâm nghiệp', provinces: ['Đắk Lắk', 'Gia Lai', 'Kon Tum'] },
  { id: 'dong-bang', name: 'ĐỒNG BẰNG', description: 'Vựa lúa quốc gia', provinces: ['Cần Thơ', 'An Giang', 'Đồng Tháp'] },
  { id: 'mien-dong', name: 'MIỀN ĐÔNG', description: 'Công nghiệp, kinh tế trọng điểm', provinces: ['TP.HCM', 'Bình Dương', 'Đồng Nai'] },
]

export const WS_PING_INTERVAL = 30000
export const WS_RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]
