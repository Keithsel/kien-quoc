"""Game configuration parameters."""

from pydantic import BaseModel


class GameConfig(BaseModel):
    """Game balance parameters."""

    # Core
    MAX_TURNS: int = 8
    RESOURCES_PER_TURN: int = 14

    # Teams - Fixed 5 teams created at room start
    NUM_TEAMS: int = 5

    # Phase durations (seconds)
    PHASE_EVENT_DURATION: int = 15
    PHASE_ACTION_DURATION: int = 60
    PHASE_RESOLUTION_DURATION: int = 3
    PHASE_RESULT_DURATION: int = 15

    # Room
    ROOM_CODE_LENGTH: int = 6
    ROOM_CODE_CHARSET: str = '0123456789'

    # Game over thresholds
    INDEX_MINIMUM: int = 0
    SURVIVAL_WARNING_THRESHOLD: int = 6
    INDEX_MAXIMUM: int = 30

    # Starting indices
    STARTING_INDICES: dict[str, int] = {
        'economy': 10,
        'society': 10,
        'culture': 10,
        'integration': 10,
        'environment': 10,
        'science': 10,
    }

    # Maintenance cost per turn
    MAINTENANCE_COST: dict[str, int] = {
        'economy': 1,
        'society': 1,
        'culture': 1,
        'integration': 1,
        'environment': 1,
        'science': 1,
    }


game_config = GameConfig()
