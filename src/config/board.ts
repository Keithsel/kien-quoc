import type { CellType, IndexName } from './game';

export interface BoardCell {
  id: string;
  row: number;
  col: number;
  name: string;
  type: CellType;
  indices: IndexName[];
}

export const BOARD_CELLS: BoardCell[] = [
  // Row 0: synergy, competitive, cooperation, independent
  { id: 'cell-0-0', row: 0, col: 0, name: 'Đại học Bách khoa', type: 'synergy', indices: ['science', 'society'] },
  { id: 'cell-0-1', row: 0, col: 1, name: 'Khu CN Việt Trì', type: 'competitive', indices: ['economy', 'environment'] },
  {
    id: 'cell-0-2',
    row: 0,
    col: 2,
    name: 'Cửa khẩu Lạng Sơn',
    type: 'cooperation',
    indices: ['integration', 'economy']
  },
  { id: 'cell-0-3', row: 0, col: 3, name: 'Viện Hàn lâm', type: 'independent', indices: ['culture', 'science'] },

  // Row 1: cooperation, [project], [project], synergy
  { id: 'cell-1-0', row: 1, col: 0, name: 'Tây Nguyên', type: 'cooperation', indices: ['environment', 'culture'] },
  { id: 'cell-1-1', row: 1, col: 1, name: 'Dự án Quốc gia', type: 'project', indices: [] },
  { id: 'cell-1-2', row: 1, col: 2, name: 'Dự án Quốc gia', type: 'project', indices: [] },
  { id: 'cell-1-3', row: 1, col: 3, name: 'Cảng Đà Nẵng', type: 'synergy', indices: ['integration', 'society'] },

  // Row 2: independent, [project], [project], competitive
  {
    id: 'cell-2-0',
    row: 2,
    col: 0,
    name: 'Đồng bằng sông Hồng',
    type: 'independent',
    indices: ['society', 'environment']
  },
  { id: 'cell-2-1', row: 2, col: 1, name: 'Dự án Quốc gia', type: 'project', indices: [] },
  { id: 'cell-2-2', row: 2, col: 2, name: 'Dự án Quốc gia', type: 'project', indices: [] },
  { id: 'cell-2-3', row: 2, col: 3, name: 'KCX Tân Thuận', type: 'competitive', indices: ['science', 'economy'] },

  // Row 3: competitive, synergy, independent, cooperation
  {
    id: 'cell-3-0',
    row: 3,
    col: 0,
    name: 'Khu đô thị Thủ Đức',
    type: 'competitive',
    indices: ['culture', 'integration']
  },
  {
    id: 'cell-3-1',
    row: 3,
    col: 1,
    name: 'Tây Nam Bộ',
    type: 'synergy',
    indices: ['economy', 'environment']
  },
  {
    id: 'cell-3-2',
    row: 3,
    col: 2,
    name: 'Ngân hàng Ngoại thương',
    type: 'independent',
    indices: ['integration', 'science']
  },
  { id: 'cell-3-3', row: 3, col: 3, name: 'Cảng Sài Gòn', type: 'cooperation', indices: ['society', 'culture'] }
];

export const PROJECT_CELLS = BOARD_CELLS.filter((c) => c.type === 'project');

export function getCellsByType(type: CellType): BoardCell[] {
  return BOARD_CELLS.filter((c) => c.type === type);
}
