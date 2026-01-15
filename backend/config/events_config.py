"""Turn events configuration."""

from pydantic import BaseModel


class TurnEvent(BaseModel):
    turn: int
    year: int
    name: str
    project: str
    min_total: int
    min_teams: int
    success_reward: dict[str, int]
    failure_penalty: dict[str, int]


TURN_EVENTS: dict[int, TurnEvent] = {
    1: TurnEvent(
        turn=1,
        year=1986,
        name='Khủng hoảng lạm phát 774%',
        project='Nghị quyết Khoán 10',
        min_total=20,
        min_teams=3,
        success_reward={'points': 8, 'economy': 4, 'society': 3},
        failure_penalty={'economy': -4, 'society': -3},
    ),
    2: TurnEvent(
        turn=2,
        year=1987,
        name='Cấm vận quốc tế bóp nghẹt',
        project='Luật Đầu tư Nước ngoài',
        min_total=21,
        min_teams=3,
        success_reward={'points': 10, 'integration': 5, 'economy': 3},
        failure_penalty={'integration': -4, 'economy': -3},
    ),
    3: TurnEvent(
        turn=3,
        year=1991,
        name='Liên Xô sụp đổ, viện trợ chấm dứt',
        project='Tự lực cánh sinh',
        min_total=22,
        min_teams=3,
        success_reward={'points': 12, 'science': 4, 'economy': 4},
        failure_penalty={'economy': -4, 'science': -3},
    ),
    4: TurnEvent(
        turn=4,
        year=1993,
        name='Thiên tai lũ lụt miền Trung',
        project='Cứu trợ quốc gia',
        min_total=23,
        min_teams=3,
        success_reward={'points': 12, 'environment': 5, 'society': 3},
        failure_penalty={'environment': -4, 'society': -3},
    ),
    5: TurnEvent(
        turn=5,
        year=1994,
        name='Áp lực mở cửa kinh tế',
        project='Mỹ dỡ bỏ cấm vận',
        min_total=24,
        min_teams=3,
        success_reward={'points': 14, 'integration': 4, 'economy': 4},
        failure_penalty={'integration': -4, 'economy': -3},
    ),
    6: TurnEvent(
        turn=6,
        year=1995,
        name='Hội nhập khu vực',
        project='Gia nhập ASEAN',
        min_total=25,
        min_teams=3,
        success_reward={'points': 14, 'integration': 5, 'culture': 3},
        failure_penalty={'integration': -5, 'culture': -4},
    ),
    7: TurnEvent(
        turn=7,
        year=2000,
        name='Cạnh tranh toàn cầu hóa',
        project='Hiệp định Thương mại Việt-Mỹ',
        min_total=26,
        min_teams=3,
        success_reward={'points': 16, 'economy': 5, 'science': 3},
        failure_penalty={'economy': -5, 'science': -4},
    ),
    8: TurnEvent(
        turn=8,
        year=2007,
        name='Hội nhập sâu rộng',
        project='Gia nhập WTO',
        min_total=28,
        min_teams=4,
        success_reward={
            'points': 20,
            'economy': 3,
            'society': 3,
            'culture': 3,
            'integration': 3,
            'environment': 3,
            'science': 3,
        },
        failure_penalty={
            'economy': -5,
            'society': -5,
            'culture': -5,
            'integration': -5,
            'environment': -5,
            'science': -5,
        },
    ),
}


def get_event_by_turn(turn: int) -> TurnEvent | None:
    return TURN_EVENTS.get(turn)
