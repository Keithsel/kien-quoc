"""Room code generator."""

import random

from backend.config.game_config import game_config


def generate_room_code() -> str:
    """Generate 6-digit room code."""
    charset = game_config.ROOM_CODE_CHARSET
    length = game_config.ROOM_CODE_LENGTH
    return ''.join(random.choices(charset, k=length))
