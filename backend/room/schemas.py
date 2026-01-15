"""Room schemas and models."""

from datetime import datetime
from enum import Enum
from typing import Any, Annotated

from pydantic import BaseModel, Field

from backend.config.regions_config import Region


# === Enums ===


class RoomStatus(str, Enum):
    WAITING = 'waiting'
    PLAYING = 'playing'
    PAUSED = 'paused'
    FINISHED = 'finished'


class GamePhase(str, Enum):
    EVENT = 'event'
    ACTION = 'action'
    RESOLUTION = 'resolution'
    RESULT = 'result'


class ClientRole(str, Enum):
    HOST = 'host'
    PLAYER = 'player'
    SPECTATOR = 'spectator'


# === Request Models ===


class CreateRoomRequest(BaseModel):
    host_name: Annotated[str, Field(min_length=1, max_length=50)]


# === Response Models ===


class CreateRoomResponse(BaseModel):
    room_code: str
    host_token: str


class TeamPublic(BaseModel):
    """Team info visible to everyone."""

    id: str
    index: int  # 0-4, for display ordering
    name: str
    region: Region
    score: int
    has_submitted: bool
    is_connected: bool


class RoomInfoResponse(BaseModel):
    room_code: str
    status: RoomStatus
    host_name: str
    teams: list[TeamPublic]
    created_at: datetime


# === Internal Models ===


class Placement(BaseModel):
    cell_id: str
    amount: int


class Team(BaseModel):
    """Internal team representation."""

    id: str
    index: int  # 0-4, fixed position
    name: str
    region: Region
    session_token: str
    score: int = 0
    resources: int = 14
    placements: list[Placement] = []
    has_submitted: bool = False
    is_connected: bool = False

    def to_public(self) -> TeamPublic:
        return TeamPublic(
            id=self.id,
            index=self.index,
            name=self.name,
            region=self.region,
            score=self.score,
            has_submitted=self.has_submitted,
            is_connected=self.is_connected,
        )


class Room(BaseModel):
    """Room model with 5 pre-created teams."""

    code: str
    host_name: str
    host_token: str
    status: RoomStatus = RoomStatus.WAITING
    teams: list[Team] = []  # Always 5 teams
    game_state: Any = None  # GameState at runtime
    created_at: datetime
