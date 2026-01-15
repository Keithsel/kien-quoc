"""Game state schemas."""

from datetime import datetime

from pydantic import BaseModel

from backend.config.events_config import TurnEvent
from backend.config.scoring_config import CellType
from backend.room.schemas import GamePhase


class NationalIndices(BaseModel):
    economy: int = 10
    society: int = 10
    culture: int = 10
    integration: int = 10
    environment: int = 10
    science: int = 10

    def apply_changes(self, changes: dict[str, int], max_val: int = 30) -> None:
        """Apply index changes with bounds checking."""
        for key, delta in changes.items():
            if hasattr(self, key):
                current = getattr(self, key)
                new_val = max(0, min(max_val, current + delta))
                setattr(self, key, new_val)

    def is_any_zero(self) -> bool:
        """Check if any index is <= 0."""
        return any([
            self.economy <= 0,
            self.society <= 0,
            self.culture <= 0,
            self.integration <= 0,
            self.environment <= 0,
            self.science <= 0,
        ])

    def get_zero_index(self) -> str | None:
        """Get name of first index that is <= 0."""
        if self.economy <= 0:
            return 'economy'
        if self.society <= 0:
            return 'society'
        if self.culture <= 0:
            return 'culture'
        if self.integration <= 0:
            return 'integration'
        if self.environment <= 0:
            return 'environment'
        if self.science <= 0:
            return 'science'
        return None


class CellPlacement(BaseModel):
    team_id: str
    amount: int


class BoardCell(BaseModel):
    id: str
    position: tuple[int, int]
    type: CellType
    name: str
    indices: list[str]
    placements: list[CellPlacement] = []


class ProjectStatus(BaseModel):
    total_contributed: int = 0
    contributing_teams: list[dict] = []  # [{team_id, amount}]
    min_total: int
    min_teams: int
    status: str = 'pending'  # pending, success, failure


class GameState(BaseModel):
    current_turn: int = 1
    current_phase: GamePhase = GamePhase.EVENT
    phase_start_time: datetime | None = None
    phase_time_limit: int = 60
    is_paused: bool = False
    paused_time_remaining: int | None = None

    national_indices: NationalIndices = NationalIndices()
    current_event: TurnEvent | None = None
    project_status: ProjectStatus | None = None

    board: list[BoardCell] = []


class TurnResult(BaseModel):
    turn: int
    project_success: bool
    project_contributions: list[dict]  # [{team_id, amount, points}]
    cell_results: list[dict]  # [{cell_id, team_scores: [{team_id, points}]}]
    index_changes: dict[str, int]
    new_indices: NationalIndices
    team_scores: list[dict]  # [{team_id, turn_score, total_score}]


class GameOverResult(BaseModel):
    reason: str  # "completed", "index_zero", "host_ended"
    failed_index: str | None = None
    final_rankings: list[dict]  # [{rank, team_id, team_name, region, score}]
    total_turns_played: int
    final_indices: NationalIndices
