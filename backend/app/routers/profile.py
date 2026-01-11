"""
Profile management endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile
from pydantic import BaseModel, Field
from typing import Optional
from app.core.auth import get_current_user, CurrentUser
from app.core.database import get_supabase
from passlib.context import CryptContext
import logging

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

logger = logging.getLogger(__name__)

router = APIRouter()


class ProfileResponse(BaseModel):
    """Profile response model"""
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    profilePicture: Optional[str] = Field(None, alias="profile_picture")


class ProfileUpdateRequest(BaseModel):
    """Profile update request"""
    name: Optional[str] = None
    phone: Optional[str] = None
    profilePicture: Optional[str] = None


@router.get("", response_model=ProfileResponse)
async def get_profile(user: CurrentUser = Depends(get_current_user)):
    """Get current user profile"""
    try:
        supabase = get_supabase()
        result = supabase.table("users").select(
            "id, email, name, phone, profile_picture"
        ).eq("id", user.id).maybe_single().execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return ProfileResponse(**result.data)
    
    except Exception as e:
        logger.error(f"Error getting profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get profile: {str(e)}"
        )


@router.put("", response_model=ProfileResponse)
async def update_profile(
    request: ProfileUpdateRequest,
    user: CurrentUser = Depends(get_current_user)
):
    """Update user profile"""
    try:
        supabase = get_supabase()
        
        update_data = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.phone is not None:
            update_data["phone"] = request.phone or None
        if request.profilePicture is not None:
            update_data["profile_picture"] = request.profilePicture
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        update_data["updated_at"] = "now()"
        
        result = supabase.table("users").update(update_data).eq(
            "id", user.id
        ).select("id, email, name, phone, profile_picture").single().execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return ProfileResponse(**result.data)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str


@router.put("/password")
async def change_password(
    request: ChangePasswordRequest,
    user: CurrentUser = Depends(get_current_user)
):
    """Change user password"""
    try:
        if not request.currentPassword or not request.newPassword:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password and new password are required"
            )
        
        if len(request.newPassword) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 6 characters long"
            )
        
        supabase = get_supabase()
        
        # Get user with password
        user_result = supabase.table("users").select(
            "id, password"
        ).eq("id", user.id).maybe_single().execute()
        
        if not user_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify current password
        if not pwd_context.verify(request.currentPassword, user_result.data["password"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Hash new password
        hashed_password = pwd_context.hash(request.newPassword)
        
        # Update password
        supabase.table("users").update({
            "password": hashed_password,
            "updated_at": "now()"
        }).eq("id", user.id).execute()
        
        return {
            "message": "Password updated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change password: {str(e)}"
        )


@router.post("/upload")
async def upload_profile_picture(
    image: bytes = File(...),
    user: CurrentUser = Depends(get_current_user)
):
    """Upload profile picture"""
    try:
        # Convert image to base64
        import base64
        image_base64 = base64.b64encode(image).decode('utf-8')
        image_data_url = f"data:image/jpeg;base64,{image_base64}"
        
        supabase = get_supabase()
        
        # Update user profile picture
        supabase.table("users").update({
            "profile_picture": image_data_url,
            "updated_at": "now()"
        }).eq("id", user.id).execute()
        
        return {
            "message": "Profile picture uploaded successfully",
            "profilePicture": image_data_url
        }
    
    except Exception as e:
        logger.error(f"Error uploading picture: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload picture: {str(e)}"
        )

