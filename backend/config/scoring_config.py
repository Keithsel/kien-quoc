"""Scoring configuration."""

from enum import Enum

from pydantic import BaseModel


class CellType(str, Enum):
    COMPETITIVE = 'competitive'
    SYNERGY = 'synergy'
    SHARED = 'shared'
    COOPERATION = 'cooperation'
    PROJECT = 'project'


class ScoringConfig(BaseModel):
    """Scoring multipliers."""

    CELL_MULTIPLIERS: dict[str, float] = {
        CellType.COMPETITIVE: 1.5,
        CellType.SYNERGY: 1.8,
        CellType.SHARED: 1.5,
        CellType.COOPERATION: 2.5,
        CellType.PROJECT: 1.0,
    }

    COOPERATION_MIN_TEAMS: int = 2
    PROJECT_SUCCESS_BONUS_PER_RP: float = 1.0


scoring_config = ScoringConfig()
