"""
Supabase database client
"""

from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Create Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_supabase() -> Client:
    """Get Supabase client instance"""
    return supabase

