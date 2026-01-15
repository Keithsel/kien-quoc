"""In-memory room storage."""

from backend.room.schemas import Room


class RoomStore:
    """Thread-safe in-memory room storage. Only 1 room allowed."""

    def __init__(self):
        self._room: Room | None = None

    def get(self) -> Room | None:
        return self._room

    def set(self, room: Room) -> None:
        self._room = room

    def delete(self) -> bool:
        if self._room:
            self._room = None
            return True
        return False

    def exists(self) -> bool:
        return self._room is not None

    def get_by_code(self, code: str) -> Room | None:
        """Get room if code matches."""
        if self._room and self._room.code.upper() == code.upper():
            return self._room
        return None


# Singleton instance
room_store = RoomStore()
