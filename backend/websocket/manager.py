"""WebSocket connection manager."""

from collections.abc import Callable

from fastapi import WebSocket

from backend.room.schemas import ClientRole


class ConnectionInfo:
    def __init__(self):
        self.authenticated: bool = False
        self.role: ClientRole | None = None
        self.team_id: str | None = None


class ConnectionManager:
    """Manage WebSocket connections. Only 1 connection per team allowed."""

    def __init__(self):
        # room_code -> {websocket: ConnectionInfo}
        self._connections: dict[str, dict[WebSocket, ConnectionInfo]] = {}
        # team_id -> websocket (for enforcing 1 connection per team)
        self._team_connections: dict[str, WebSocket] = {}
        # host connection tracking
        self._host_connection: WebSocket | None = None

    async def connect(self, websocket: WebSocket, room_code: str) -> None:
        """Accept new connection."""
        await websocket.accept()

        if room_code not in self._connections:
            self._connections[room_code] = {}

        self._connections[room_code][websocket] = ConnectionInfo()

    def disconnect(self, websocket: WebSocket, room_code: str) -> ConnectionInfo | None:
        """Remove connection and return its info."""
        if room_code not in self._connections:
            return None

        info = self._connections[room_code].pop(websocket, None)

        # Remove from team connections if applicable
        if info and info.team_id:
            if self._team_connections.get(info.team_id) == websocket:
                del self._team_connections[info.team_id]

        # Remove host connection if applicable
        if info and info.role == ClientRole.HOST:
            if self._host_connection == websocket:
                self._host_connection = None

        # Cleanup empty rooms
        if not self._connections[room_code]:
            del self._connections[room_code]

        return info

    def authenticate(
        self,
        websocket: WebSocket,
        room_code: str,
        role: ClientRole,
        team_id: str | None = None,
    ) -> tuple[bool, str]:
        """
        Mark connection as authenticated.
        Returns (success, error_message).
        """
        if room_code not in self._connections:
            return False, 'Room not found'

        if websocket not in self._connections[room_code]:
            return False, 'Connection not found'

        # Check for existing connections
        if role == ClientRole.HOST:
            if self._host_connection is not None:
                return False, 'Host already connected'
            self._host_connection = websocket

        elif role == ClientRole.PLAYER and team_id:
            if team_id in self._team_connections:
                return False, 'Team already connected'
            self._team_connections[team_id] = websocket

        info = self._connections[room_code][websocket]
        info.authenticated = True
        info.role = role
        info.team_id = team_id

        return True, ''

    def get_connection_info(self, websocket: WebSocket, room_code: str) -> ConnectionInfo | None:
        """Get info for a connection."""
        if room_code in self._connections:
            return self._connections[room_code].get(websocket)
        return None

    async def send_to_connection(self, websocket: WebSocket, message: dict) -> bool:
        """Send message to single connection."""
        try:
            await websocket.send_json(message)
            return True
        except Exception:
            return False

    async def broadcast_to_room(
        self,
        room_code: str,
        message: dict,
        exclude: WebSocket | None = None,
        filter_func: Callable[[dict, ConnectionInfo], dict | None] | None = None,
    ) -> None:
        """Broadcast message to all connections in room."""
        if room_code not in self._connections:
            return

        for ws, info in list(self._connections[room_code].items()):
            if ws == exclude:
                continue

            if not info.authenticated:
                continue

            # Apply filter if provided
            msg_to_send = message
            if filter_func:
                msg_to_send = filter_func(message, info)
                if msg_to_send is None:
                    continue

            try:
                await ws.send_json(msg_to_send)
            except Exception:
                pass

    async def send_to_team(self, room_code: str, team_id: str, message: dict) -> None:
        """Send message to team's connection."""
        ws = self._team_connections.get(team_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                pass

    def get_room_connection_count(self, room_code: str) -> int:
        """Get number of connections in room."""
        if room_code in self._connections:
            return len(self._connections[room_code])
        return 0

    def is_team_connected(self, team_id: str) -> bool:
        """Check if team has active connection."""
        return team_id in self._team_connections

    def clear_room(self, room_code: str) -> None:
        """Clear all connections for a room."""
        if room_code in self._connections:
            for info in self._connections[room_code].values():
                if info.team_id and info.team_id in self._team_connections:
                    del self._team_connections[info.team_id]
                if info.role == ClientRole.HOST:
                    self._host_connection = None
            del self._connections[room_code]


# Singleton
connection_manager = ConnectionManager()
