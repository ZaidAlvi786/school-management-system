"""
Supabase database client
"""

from supabase import create_client, Client
from app.core.config import settings
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Global Supabase client instance (lazy initialization)
_supabase_client: Optional[Client] = None

def get_supabase() -> Client:
    """Get Supabase client instance (lazy initialization)"""
    global _supabase_client
    
    if _supabase_client is None:
        try:
            # Settings are already validated by Pydantic at startup
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to create Supabase client: {e}")
            raise ValueError(
                f"Failed to initialize Supabase client.\n"
                f"Error: {str(e)}"
            ) from e
    
    return _supabase_client

