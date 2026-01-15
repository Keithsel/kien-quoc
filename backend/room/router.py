"""Room REST endpoints."""

from fastapi import APIRouter, status

from backend.room.schemas import CreateRoomRequest, CreateRoomResponse, RoomInfoResponse
from backend.room.service import RoomService

router = APIRouter(prefix='/api/rooms', tags=['rooms'])


@router.post(
    '',
    response_model=CreateRoomResponse,
    status_code=status.HTTP_201_CREATED,
    summary='Create a new room',
    description='Creates a new game room with 5 teams. Deletes any existing room.',
)
async def create_room(request: CreateRoomRequest):
    return await RoomService.create_room(request.host_name)


@router.get(
    '/{room_code}',
    response_model=RoomInfoResponse,
    summary='Get room info',
    description='Get room information including teams and their connection status',
)
async def get_room(room_code: str):
    room = await RoomService.get_room(room_code.upper())

    return RoomInfoResponse(
        room_code=room.code,
        status=room.status,
        host_name=room.host_name,
        teams=[t.to_public() for t in room.teams],
        created_at=room.created_at,
    )


@router.get(
    '/{room_code}/teams',
    summary='Get teams info',
    description='Get all teams with their tokens for host display',
)
async def get_teams(room_code: str):
    """Return teams with tokens for host to distribute."""
    room = await RoomService.get_room(room_code.upper())

    return {
        'teams': [
            {
                'id': t.id,
                'index': t.index,
                'name': t.name,
                'region': t.region.model_dump(),
                'session_token': t.session_token,
                'is_connected': t.is_connected,
            }
            for t in room.teams
        ]
    }
