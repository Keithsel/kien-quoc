"""Room exceptions."""

from fastapi import HTTPException, status


class RoomNotFound(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Room not found',
        )


class RoomAlreadyStarted(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail='Game already started',
        )


class Unauthorized(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Unauthorized',
        )


class NotEnoughTeams(HTTPException):
    def __init__(self, min_teams: int):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Need at least {min_teams} connected teams to start',
        )


class TeamNotFound(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Team not found',
        )


class InvalidToken(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid session token',
        )
