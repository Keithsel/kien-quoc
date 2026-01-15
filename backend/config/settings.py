"""Application settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Global application settings."""

    # App
    APP_NAME: str = 'Kiến Quốc Ký API'
    APP_VERSION: str = '1.0.0'
    DEBUG: bool = False

    # Server
    HOST: str = '0.0.0.0'
    PORT: int = 8000

    # CORS
    CORS_ORIGINS: list[str] = ['*']

    # Host authentication
    HOST_SECRET: str = 'kienquoc@FPT2026'

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30  # seconds
    WS_CONNECTION_TIMEOUT: int = 60  # seconds

    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
