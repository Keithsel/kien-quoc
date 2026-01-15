"""Region configuration."""

from enum import Enum

from pydantic import BaseModel


class RegionId(str, Enum):
    THU_DO = 'thu-do'
    DUYEN_HAI = 'duyen-hai'
    TAY_NGUYEN = 'tay-nguyen'
    DONG_BANG = 'dong-bang'
    MIEN_DONG = 'mien-dong'


class Region(BaseModel):
    id: RegionId
    name: str
    description: str


# 5 regions matching 5 fixed teams
REGIONS: list[Region] = [
    Region(
        id=RegionId.THU_DO,
        name='Thủ đô',
        description='Trung tâm chính trị, văn hóa (Hà Nội, Hải Phòng, Quảng Ninh)',
    ),
    Region(
        id=RegionId.DUYEN_HAI,
        name='Duyên hải',
        description='Ven biển miền Trung (Đà Nẵng, Quảng Nam, Bình Định)',
    ),
    Region(
        id=RegionId.TAY_NGUYEN,
        name='Tây Nguyên',
        description='Cao nguyên, nông lâm nghiệp (Đắk Lắk, Gia Lai, Kon Tum)',
    ),
    Region(
        id=RegionId.DONG_BANG,
        name='Đồng bằng',
        description='Vựa lúa quốc gia (Cần Thơ, An Giang, Đồng Tháp)',
    ),
    Region(
        id=RegionId.MIEN_DONG,
        name='Miền Đông',
        description='Công nghiệp, kinh tế trọng điểm (TP.HCM, Bình Dương, Đồng Nai)',
    ),
]


def get_region_by_id(region_id: RegionId) -> Region | None:
    return next((r for r in REGIONS if r.id == region_id), None)


def get_region_by_index(index: int) -> Region | None:
    """Get region by team index (0-4)."""
    if 0 <= index < len(REGIONS):
        return REGIONS[index]
    return None
