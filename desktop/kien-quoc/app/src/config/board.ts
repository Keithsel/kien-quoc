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
  // Row 0: Top row
  {
    id: 'cell-0-0',
    row: 0,
    col: 0,
    name: 'Cửa khẩu Lạng Sơn',
    type: 'cooperation',
    indices: ['integration', 'economy']
  },
  { id: 'cell-0-1', row: 0, col: 1, name: 'Đại học Bách khoa', type: 'synergy', indices: ['science', 'society'] },
  { id: 'cell-0-2', row: 0, col: 2, name: 'Viện Hàn lâm', type: 'competitive', indices: ['culture', 'science'] },
  { id: 'cell-0-3', row: 0, col: 3, name: 'Khu CN Việt Trì', type: 'independent', indices: ['economy', 'environment'] },

  // Row 1: Left and right of project
  { id: 'cell-1-0', row: 1, col: 0, name: 'Đồng bằng sông Hồng', type: 'synergy', indices: ['society', 'environment'] },
  { id: 'cell-1-1', row: 1, col: 1, name: 'Dự án Quốc gia', type: 'project', indices: [] },
  { id: 'cell-1-2', row: 1, col: 2, name: 'Dự án Quốc gia', type: 'project', indices: [] },
  { id: 'cell-1-3', row: 1, col: 3, name: 'Cảng Đà Nẵng', type: 'competitive', indices: ['integration', 'culture'] },

  // Row 2: Left and right of project
  { id: 'cell-2-0', row: 2, col: 0, name: 'Tây Nguyên', type: 'cooperation', indices: ['environment', 'culture'] },
  { id: 'cell-2-1', row: 2, col: 1, name: 'Dự án Quốc gia', type: 'project', indices: [] },
  { id: 'cell-2-2', row: 2, col: 2, name: 'Dự án Quốc gia', type: 'project', indices: [] },
  { id: 'cell-2-3', row: 2, col: 3, name: 'KCX Tân Thuận', type: 'independent', indices: ['science', 'economy'] },

  // Row 3: Bottom row
  {
    id: 'cell-3-0',
    row: 3,
    col: 0,
    name: 'Đồng bằng sông Cửu Long',
    type: 'independent',
    indices: ['society', 'environment']
  },
  {
    id: 'cell-3-1',
    row: 3,
    col: 1,
    name: 'Khu đô thị Thủ Đức',
    type: 'competitive',
    indices: ['society', 'integration']
  },
  {
    id: 'cell-3-2',
    row: 3,
    col: 2,
    name: 'Ngân hàng Ngoại thương',
    type: 'cooperation',
    indices: ['economy', 'integration']
  },
  { id: 'cell-3-3', row: 3, col: 3, name: 'Cảng Sài Gòn', type: 'synergy', indices: ['science', 'culture'] }
];

export const PROJECT_CELLS = BOARD_CELLS.filter((c) => c.type === 'project');

export function getCellsByType(type: CellType): BoardCell[] {
  return BOARD_CELLS.filter((c) => c.type === type);
}
