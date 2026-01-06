"""
Authentication endpoints
Note: NextAuth login/signup can stay in Next.js, but we provide JWT validation
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from app.core.auth import get_current_user, CurrentUser
from app.core.database import get_supabase
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class UserResponse(BaseModel):
    """User response model"""
    id: str
    email: str
    name: str
    role: str


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(user: CurrentUser = Depends(get_current_user)):
    """Get current authenticated user info"""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role
    )


@router.get("/verify")
async def verify_token(user: CurrentUser = Depends(get_current_user)):
    """Verify JWT token is valid"""
    return {
        "valid": True,
        "user_id": user.id,
        "role": user.role
    }

