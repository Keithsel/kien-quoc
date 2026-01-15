"""WebSocket message handlers."""

import asyncio

from fastapi import WebSocket

from backend.config.settings import settings
from backend.game.service import GameService
from backend.room.schemas import ClientRole, RoomStatus
from backend.room.service import RoomService
from backend.store.room_store import room_store
from backend.websocket.manager import connection_manager
from backend.websocket.state_filter import filter_game_state


class WSHandlers:
    """WebSocket message handlers."""

    @staticmethod
    async def handle_auth(ws: WebSocket, room_code: str, data: dict) -> bool:
        """Handle authentication."""
        token = data.get('token', '')
        role = ClientRole(data.get('role'))
        team_id = data.get('team_id')

        # Validate token
        is_valid = False

        if role == ClientRole.HOST:
            # Host uses env secret, not room-specific token
            is_valid = token == settings.HOST_SECRET
        elif role == ClientRole.PLAYER:
            if team_id and token:
                is_valid = RoomService.validate_session_token(room_code, team_id, token)
        else:
            # Spectator - just check room exists
            is_valid = room_store.get_by_code(room_code) is not None

        if not is_valid:
            await ws.send_json({
                'type': 'AUTH_FAILED',
                'reason': 'Invalid token',
            })
            return False

        # Try to authenticate (checks for duplicate connections)
        success, error = connection_manager.authenticate(ws, room_code, role, team_id)
        if not success:
            await ws.send_json({
                'type': 'AUTH_FAILED',
                'reason': error,
            })
            return False

        # Mark team as connected
        if role == ClientRole.PLAYER and team_id:
            room = room_store.get_by_code(room_code)
            if room:
                team = next((t for t in room.teams if t.id == team_id), None)
                if team:
                    team.is_connected = True

        await ws.send_json({
            'type': 'AUTH_SUCCESS',
            'role': role,
        })

        # Send current state
        room = room_store.get_by_code(room_code)
        if room:
            conn_info = connection_manager.get_connection_info(ws, room_code)
            if conn_info:
                state_msg = {'type': 'GAME_STATE', 'data': room.model_dump(mode='json')}
                filtered_msg = filter_game_state(state_msg, conn_info)
                await ws.send_json(filtered_msg)

        # Broadcast team connected
        if role == ClientRole.PLAYER and team_id:
            await connection_manager.broadcast_to_room(
                room_code,
                {'type': 'TEAM_CONNECTED', 'team_id': team_id},
                exclude=ws,
            )

        return True

    @staticmethod
    async def handle_place_resource(
        ws: WebSocket,
        room_code: str,
        data: dict,
    ) -> None:
        """Handle resource placement."""
        conn_info = connection_manager.get_connection_info(ws, room_code)

        if not conn_info or conn_info.role != ClientRole.PLAYER:
            await ws.send_json({
                'type': 'ERROR',
                'code': 'UNAUTHORIZED',
                'message': 'Only players can place resources',
            })
            return

        room = room_store.get_by_code(room_code)
        if not room:
            return

        if not conn_info.team_id:
            return

        cell_id = data.get('cell_id', '')
        if not cell_id:
            await ws.send_json({
                'type': 'ERROR',
                'code': 'INVALID_CELL',
                'message': 'cell_id is required',
            })
            return

        try:
            GameService.place_resource(
                room,
                conn_info.team_id,
                cell_id,
                data.get('amount', 0),
            )

            # Broadcast updated state
            await WSHandlers._broadcast_game_state(room_code)

        except ValueError as e:
            await ws.send_json({
                'type': 'ERROR',
                'code': 'PLACE_FAILED',
                'message': str(e),
            })

    @staticmethod
    async def handle_submit_turn(
        ws: WebSocket,
        room_code: str,
    ) -> None:
        """Handle turn submission."""
        conn_info = connection_manager.get_connection_info(ws, room_code)

        if not conn_info or conn_info.role != ClientRole.PLAYER:
            return

        room = room_store.get_by_code(room_code)
        if not room:
            return

        if not conn_info.team_id:
            return

        try:
            GameService.submit_turn(room, conn_info.team_id)

            # Broadcast team submitted
            await connection_manager.broadcast_to_room(
                room_code,
                {'type': 'TEAM_SUBMITTED', 'team_id': conn_info.team_id},
            )

            # Check if all submitted
            if GameService.all_teams_submitted(room):
                await WSHandlers._advance_phase(room_code)

        except ValueError as e:
            await ws.send_json({
                'type': 'ERROR',
                'code': 'SUBMIT_FAILED',
                'message': str(e),
            })

    @staticmethod
    async def handle_host_start(
        ws: WebSocket,
        room_code: str,
    ) -> None:
        """Handle game start."""
        conn_info = connection_manager.get_connection_info(ws, room_code)

        if not conn_info or conn_info.role != ClientRole.HOST:
            await ws.send_json({
                'type': 'ERROR',
                'code': 'UNAUTHORIZED',
                'message': 'Only host can start game',
            })
            return

        room = room_store.get_by_code(room_code)
        if not room:
            return

        try:
            GameService.start_game(room)

            # Broadcast game state
            await WSHandlers._broadcast_game_state(room_code)

            # Start phase timer
            asyncio.create_task(WSHandlers._phase_timer(room_code))

        except ValueError as e:
            await ws.send_json({
                'type': 'ERROR',
                'code': 'START_FAILED',
                'message': str(e),
            })

    @staticmethod
    async def handle_host_pause(ws: WebSocket, room_code: str) -> None:
        """Handle game pause."""
        conn_info = connection_manager.get_connection_info(ws, room_code)
        if not conn_info or conn_info.role != ClientRole.HOST:
            return

        room = room_store.get_by_code(room_code)
        if room:
            GameService.pause_game(room)
            await WSHandlers._broadcast_game_state(room_code)

    @staticmethod
    async def handle_host_resume(ws: WebSocket, room_code: str) -> None:
        """Handle game resume."""
        conn_info = connection_manager.get_connection_info(ws, room_code)
        if not conn_info or conn_info.role != ClientRole.HOST:
            return

        room = room_store.get_by_code(room_code)
        if room:
            GameService.resume_game(room)
            await WSHandlers._broadcast_game_state(room_code)
            asyncio.create_task(WSHandlers._phase_timer(room_code))

    @staticmethod
    async def handle_host_skip(ws: WebSocket, room_code: str) -> None:
        """Handle phase skip."""
        conn_info = connection_manager.get_connection_info(ws, room_code)
        if not conn_info or conn_info.role != ClientRole.HOST:
            return

        await WSHandlers._advance_phase(room_code)

    @staticmethod
    async def handle_host_end(ws: WebSocket, room_code: str) -> None:
        """Handle game end."""
        conn_info = connection_manager.get_connection_info(ws, room_code)
        if not conn_info or conn_info.role != ClientRole.HOST:
            return

        room = room_store.get_by_code(room_code)
        if room:
            room.status = RoomStatus.FINISHED
            result = GameService.get_game_over_result(room)

            await connection_manager.broadcast_to_room(
                room_code,
                {'type': 'GAME_OVER', 'data': result.model_dump()},
            )

    @staticmethod
    async def _advance_phase(room_code: str) -> None:
        """Advance phase and broadcast."""
        room = room_store.get_by_code(room_code)
        if not room:
            return

        new_phase, turn_result = GameService.advance_phase(room)

        # Broadcast turn result if available
        if turn_result:
            await connection_manager.broadcast_to_room(
                room_code,
                {'type': 'TURN_RESULT', 'data': turn_result.model_dump()},
            )

        # Check game over
        if room.status == RoomStatus.FINISHED:
            result = GameService.get_game_over_result(room)
            await connection_manager.broadcast_to_room(
                room_code,
                {'type': 'GAME_OVER', 'data': result.model_dump()},
            )
            return

        # Broadcast new state
        await WSHandlers._broadcast_game_state(room_code)

        # Start new phase timer
        asyncio.create_task(WSHandlers._phase_timer(room_code))

    @staticmethod
    async def _broadcast_game_state(room_code: str) -> None:
        """Broadcast filtered game state to all connections."""
        room = room_store.get_by_code(room_code)
        if not room:
            return

        state_msg = {'type': 'GAME_STATE', 'data': room.model_dump(mode='json')}

        await connection_manager.broadcast_to_room(
            room_code,
            state_msg,
            filter_func=filter_game_state,
        )

    @staticmethod
    async def _phase_timer(room_code: str) -> None:
        """Timer coroutine for current phase."""
        room = room_store.get_by_code(room_code)
        if not room or not room.game_state:
            return

        time_limit = room.game_state.phase_time_limit
        current_phase = room.game_state.current_phase
        current_turn = room.game_state.current_turn

        await asyncio.sleep(time_limit)

        # Check if still valid
        room = room_store.get_by_code(room_code)
        if not room or not room.game_state:
            return

        # Check if phase/turn changed (was skipped)
        if room.game_state.current_phase != current_phase or room.game_state.current_turn != current_turn:
            return

        if room.game_state.is_paused:
            return

        if room.status != RoomStatus.PLAYING:
            return

        # Advance phase
        await WSHandlers._advance_phase(room_code)
