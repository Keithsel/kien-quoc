"""Room management service."""

import uuid
from datetime import datetime

from backend.config.game_config import game_config
from backend.config.regions_config import REGIONS
from backend.room import exceptions
from backend.room.schemas import CreateRoomResponse, Room, RoomStatus, Team
from backend.store.room_store import room_store
from backend.utils.room_code import generate_room_code


class RoomService:
    """Room management business logic."""

    @staticmethod
    async def create_room(host_name: str) -> CreateRoomResponse:
        """Create a new room with 5 pre-created teams. Deletes existing room."""
        # Delete existing room if any
        room_store.delete()

        room_code = generate_room_code()
        host_token = str(uuid.uuid4())

        # Create 5 teams, one for each region
        teams: list[Team] = []
        for i, region in enumerate(REGIONS):
            team = Team(
                id=str(uuid.uuid4()),
                index=i,
                name=f'Đội {i + 1}',  # Default name, can be changed
                region=region,
                session_token=str(uuid.uuid4()),
                score=0,
                resources=game_config.RESOURCES_PER_TURN,
                placements=[],
                has_submitted=False,
                is_connected=False,
            )
            teams.append(team)

        room = Room(
            code=room_code,
            host_name=host_name,
            host_token=host_token,
            status=RoomStatus.WAITING,
            teams=teams,
            game_state=None,
            created_at=datetime.now(),
        )

        room_store.set(room)

        return CreateRoomResponse(
            room_code=room_code,
            host_token=host_token,
        )

    @staticmethod
    async def get_room(room_code: str) -> Room:
        """Get room by code."""
        room = room_store.get_by_code(room_code)
        if not room:
            raise exceptions.RoomNotFound()
        return room

    @staticmethod
    async def get_current_room() -> Room | None:
        """Get the current active room if any."""
        return room_store.get()

    @staticmethod
    async def delete_room(room_code: str, host_token: str) -> bool:
        """Delete room (host only)."""
        room = room_store.get_by_code(room_code)
        if not room:
            raise exceptions.RoomNotFound()
        if room.host_token != host_token:
            raise exceptions.Unauthorized()
        return room_store.delete()

    @staticmethod
    def validate_host_token(room_code: str, token: str) -> bool:
        """Validate host token."""
        room = room_store.get_by_code(room_code)
        return room is not None and room.host_token == token

    @staticmethod
    def validate_session_token(room_code: str, team_id: str, token: str) -> bool:
        """Validate team session token."""
        room = room_store.get_by_code(room_code)
        if not room:
            return False
        team = next((t for t in room.teams if t.id == team_id), None)
        return team is not None and team.session_token == token

    @staticmethod
    def get_team(room_code: str, team_id: str) -> Team | None:
        """Get team by ID."""
        room = room_store.get_by_code(room_code)
        if not room:
            return None
        return next((t for t in room.teams if t.id == team_id), None)

    @staticmethod
    def get_team_by_index(room_code: str, index: int) -> Team | None:
        """Get team by index (0-4)."""
        room = room_store.get_by_code(room_code)
        if not room:
            return None
        return next((t for t in room.teams if t.index == index), None)

    @staticmethod
    def get_connected_team_count(room_code: str) -> int:
        """Get count of connected teams."""
        room = room_store.get_by_code(room_code)
        if not room:
            return 0
        return sum(1 for t in room.teams if t.is_connected)
