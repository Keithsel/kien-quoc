"""WebSocket router."""

import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.store.room_store import room_store
from backend.websocket.handlers import WSHandlers
from backend.websocket.manager import connection_manager

router = APIRouter()


@router.websocket('/ws/{room_code}')
async def websocket_endpoint(websocket: WebSocket, room_code: str):
    """WebSocket endpoint for game communication."""
    room_code = room_code.upper()

    # Check room exists
    if not room_store.get_by_code(room_code):
        await websocket.close(code=4004, reason='Room not found')
        return

    # Accept connection
    await connection_manager.connect(websocket, room_code)
    client_id = str(uuid.uuid4())

    # Send connected message
    await websocket.send_json({
        'type': 'CONNECTED',
        'client_id': client_id,
    })

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get('type')

            if msg_type == 'AUTH':
                await WSHandlers.handle_auth(websocket, room_code, data)

            elif msg_type == 'PLACE_RESOURCE':
                await WSHandlers.handle_place_resource(websocket, room_code, data)

            elif msg_type == 'SUBMIT_TURN':
                await WSHandlers.handle_submit_turn(websocket, room_code)

            elif msg_type == 'HOST_START':
                await WSHandlers.handle_host_start(websocket, room_code)

            elif msg_type == 'HOST_PAUSE':
                await WSHandlers.handle_host_pause(websocket, room_code)

            elif msg_type == 'HOST_RESUME':
                await WSHandlers.handle_host_resume(websocket, room_code)

            elif msg_type == 'HOST_SKIP':
                await WSHandlers.handle_host_skip(websocket, room_code)

            elif msg_type == 'HOST_END':
                await WSHandlers.handle_host_end(websocket, room_code)

            elif msg_type == 'PONG':
                pass  # Heartbeat response

    except WebSocketDisconnect:
        # Handle disconnect
        conn_info = connection_manager.disconnect(websocket, room_code)

        if conn_info and conn_info.team_id:
            # Mark team as disconnected
            room = room_store.get_by_code(room_code)
            if room:
                team = next((t for t in room.teams if t.id == conn_info.team_id), None)
                if team:
                    team.is_connected = False

                # Broadcast disconnect
                await connection_manager.broadcast_to_room(
                    room_code,
                    {'type': 'TEAM_DISCONNECTED', 'team_id': conn_info.team_id},
                )

    except Exception:
        connection_manager.disconnect(websocket, room_code)
