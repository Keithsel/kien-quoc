import type { BoardCell, ProjectCell, CellType } from '@kien-quoc/shared'

type CellDef = Omit<BoardCell, 'placements'>

export const BOARD_CELLS: CellDef[] = [
  // Row 0
  { id: 'cell-0-0', position: { row: 0, col: 0 }, type: 'competitive', name: 'Cửa khẩu Lạng Sơn', description: 'Cửa khẩu quan trọng với Trung Quốc' },
  { id: 'cell-0-1', position: { row: 0, col: 1 }, type: 'synergy', name: 'Đại học Bách khoa', description: 'Trung tâm đào tạo kỹ thuật' },
  { id: 'cell-0-2', position: { row: 0, col: 2 }, type: 'synergy', name: 'Viện Nghiên cứu', description: 'Nghiên cứu khoa học công nghệ' },
  { id: 'cell-0-3', position: { row: 0, col: 3 }, type: 'competitive', name: 'Khu CN Việt Trì', description: 'Khu công nghiệp phía Bắc' },
  
  // Row 1 (cells 1,2 are project)
  { id: 'cell-1-0', position: { row: 1, col: 0 }, type: 'shared', name: 'Đồng bằng sông Hồng', description: 'Vùng nông nghiệp trù phú' },
  { id: 'cell-1-3', position: { row: 1, col: 3 }, type: 'shared', name: 'Cảng Hải Phòng', description: 'Cảng biển lớn miền Bắc' },
  
  // Row 2 (cells 1,2 are project)
  { id: 'cell-2-0', position: { row: 2, col: 0 }, type: 'shared', name: 'Cảng Đà Nẵng', description: 'Cảng biển miền Trung' },
  { id: 'cell-2-3', position: { row: 2, col: 3 }, type: 'shared', name: 'Tây Nguyên', description: 'Vùng cao nguyên trung bộ' },
  
  // Row 3
  { id: 'cell-3-0', position: { row: 3, col: 0 }, type: 'competitive', name: 'Khu CN Biên Hòa', description: 'Khu công nghiệp lớn miền Nam' },
  { id: 'cell-3-1', position: { row: 3, col: 1 }, type: 'cooperation', name: 'Đồng bằng sông Cửu Long', description: 'Vựa lúa của cả nước' },
  { id: 'cell-3-2', position: { row: 3, col: 2 }, type: 'cooperation', name: 'Trung tâm Tài chính', description: 'Trung tâm tài chính TP.HCM' },
  { id: 'cell-3-3', position: { row: 3, col: 3 }, type: 'competitive', name: 'Cảng Cát Lái', description: 'Cảng container lớn nhất' },
]

export function createProjectCell(name: string, description: string): ProjectCell {
  return {
    id: 'project-center',
    name,
    description,
    totalContributed: 0,
    contributingTeams: [],
  }
}

export function initBoardCells(): BoardCell[] {
  return BOARD_CELLS.map(cell => ({ ...cell, placements: [] }))
}
