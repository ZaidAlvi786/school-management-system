"""
FastAPI Main Application
Handles all backend logic for face recognition and attendance system.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import logging

from app.routers import face, attendance
from app.core.config import settings
from app.core.logging_config import setup_logging

# Load environment variables
load_dotenv()

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("Starting FastAPI application...")
    logger.info(f"Face tolerance: {settings.FACE_TOLERANCE}")
    logger.info(f"CORS origins: {settings.cors_origins_list}")
    yield
    logger.info("Shutting down FastAPI application...")


# Create FastAPI app
app = FastAPI(
    title="School Management System API",
    description="Backend API for face recognition and attendance system",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from app.routers import (
    auth, profile, student, teacher, general,
    admin, principal, ai, papers
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(student.router, prefix="/api/student", tags=["student"])
app.include_router(teacher.router, prefix="/api/teacher", tags=["teacher"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(principal.router, prefix="/api/principal", tags=["principal"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(papers.router, prefix="/api/papers", tags=["papers"])
app.include_router(general.router, prefix="/api", tags=["general"])
app.include_router(face.router, prefix="/api/face", tags=["face"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["attendance"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "School Management System API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    from app.core.config import settings
    return {
        "status": "healthy",
        "env_check": {
            "SUPABASE_URL_SET": bool(settings.SUPABASE_URL and settings.SUPABASE_URL != "your_supabase_url_here"),
            "SUPABASE_KEY_SET": bool(settings.SUPABASE_KEY and settings.SUPABASE_KEY != "your_supabase_key_here"),
            "CORS_ORIGINS": settings.cors_origins_list,
            "HOST": settings.HOST
        },
        "face_recognition": "ready"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower(),
        proxy_headers=True,
        forwarded_allow_ips="*"
    )

