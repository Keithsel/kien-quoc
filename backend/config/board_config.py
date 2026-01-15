"""Board configuration."""

from pydantic import BaseModel

from backend.config.scoring_config import CellType


class CellConfig(BaseModel):
    name: str
    type: CellType
    indices: list[str]


# 16 cells on 4x4 board
BOARD_CELLS: dict[tuple[int, int], CellConfig] = {
    (0, 0): CellConfig(
        name='Cửa khẩu Lạng Sơn',
        type=CellType.COOPERATION,
        indices=['integration', 'economy'],
    ),
    (0, 1): CellConfig(
        name='Đại học Bách khoa',
        type=CellType.SYNERGY,
        indices=['science', 'society'],
    ),
    (0, 2): CellConfig(
        name='Viện Hàn lâm',
        type=CellType.SYNERGY,
        indices=['science', 'culture'],
    ),
    (0, 3): CellConfig(
        name='Khu CN Việt Trì',
        type=CellType.COMPETITIVE,
        indices=['economy', 'environment'],
    ),
    (1, 0): CellConfig(
        name='Đồng bằng sông Hồng',
        type=CellType.SHARED,
        indices=['society', 'environment'],
    ),
    (1, 1): CellConfig(
        name='Dự án Quốc gia',
        type=CellType.PROJECT,
        indices=[],
    ),
    (1, 2): CellConfig(
        name='Dự án Quốc gia',
        type=CellType.PROJECT,
        indices=[],
    ),
    (1, 3): CellConfig(
        name='Cảng Đà Nẵng',
        type=CellType.COMPETITIVE,
        indices=['economy', 'integration'],
    ),
    (2, 0): CellConfig(
        name='Tây Nguyên',
        type=CellType.SYNERGY,
        indices=['environment', 'economy'],
    ),
    (2, 1): CellConfig(
        name='Dự án Quốc gia',
        type=CellType.PROJECT,
        indices=[],
    ),
    (2, 2): CellConfig(
        name='Dự án Quốc gia',
        type=CellType.PROJECT,
        indices=[],
    ),
    (2, 3): CellConfig(
        name='KCX Tân Thuận',
        type=CellType.COMPETITIVE,
        indices=['economy', 'science'],
    ),
    (3, 0): CellConfig(
        name='Đồng bằng Cửu Long',
        type=CellType.SHARED,
        indices=['society', 'economy'],
    ),
    (3, 1): CellConfig(
        name='Khu đô thị Thủ Đức',
        type=CellType.SYNERGY,
        indices=['society', 'science'],
    ),
    (3, 2): CellConfig(
        name='Trung tâm Tài chính',
        type=CellType.COOPERATION,
        indices=['economy', 'integration'],
    ),
    (3, 3): CellConfig(
        name='Cảng Sài Gòn',
        type=CellType.COMPETITIVE,
        indices=['economy', 'integration'],
    ),
}

# Project cells (4 center cells)
PROJECT_CELLS: list[tuple[int, int]] = [(1, 1), (1, 2), (2, 1), (2, 2)]
PROJECT_CELL_ID = 'project-center'


def get_regular_cells() -> dict[tuple[int, int], CellConfig]:
    """Get cells excluding project cells."""
    return {k: v for k, v in BOARD_CELLS.items() if k not in PROJECT_CELLS}


def create_cell_id(pos: tuple[int, int]) -> str:
    """Create cell ID from position."""
    return f'cell-{pos[0]}-{pos[1]}'
