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
        # Validate Supabase credentials
        if not settings.SUPABASE_URL or settings.SUPABASE_URL == "your_supabase_url_here":
            raise ValueError(
                "Supabase URL is not configured. Please set SUPABASE_URL in your .env file.\n"
                "Get your Supabase URL from: https://app.supabase.com/project/_/settings/api"
            )
        if not settings.SUPABASE_KEY or settings.SUPABASE_KEY == "your_supabase_key_here":
            raise ValueError(
                "Supabase KEY is not configured. Please set SUPABASE_KEY in your .env file.\n"
                "Get your Supabase key from: https://app.supabase.com/project/_/settings/api"
            )
        
        try:
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to create Supabase client: {e}")
            raise ValueError(
                f"Failed to initialize Supabase client. Please check your SUPABASE_URL and SUPABASE_KEY.\n"
                f"Error: {str(e)}"
            ) from e
    
    return _supabase_client

