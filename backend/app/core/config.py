"""
Application configuration
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    
    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    
    # Face Recognition
    FACE_TOLERANCE: float = 0.6
    
    # CORS - accepts comma-separated string or JSON list
    CORS_ORIGINS: str = "http://localhost:3000"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Logging
    LOG_LEVEL: str = "INFO"

    # Auth
    NEXTAUTH_SECRET: str = ""
    JWT_SECRET: str = ""
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS into a list, handling both comma-separated and JSON formats"""
        if not self.CORS_ORIGINS:
            return ["http://localhost:3000"]
        # Try JSON first, fall back to comma-separated
        import json
        try:
            return json.loads(self.CORS_ORIGINS)
        except (json.JSONDecodeError, TypeError):
            # If not JSON, split by comma
            # Split by comma and strip whitespace and trailing slashes
            return [origin.strip().rstrip("/") for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()

