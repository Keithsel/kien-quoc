"""Kiến Quốc Ký API - Main application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config.settings import settings
from backend.room.router import router as room_router
from backend.websocket.router import router as websocket_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url='/docs' if settings.DEBUG else None,
    redoc_url='/redoc' if settings.DEBUG else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,  # type: ignore[arg-type]
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Include routers
app.include_router(room_router)
app.include_router(websocket_router)


@app.get('/', tags=['health'])
async def root():
    """Root endpoint."""
    return {
        'service': settings.APP_NAME,
        'version': settings.APP_VERSION,
        'status': 'running',
    }


@app.get('/health', tags=['health'])
async def health():
    """Health check endpoint."""
    return {'status': 'healthy'}
