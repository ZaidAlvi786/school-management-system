"""
Face registration endpoints
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime
import logging

from app.services.face_recognition_service import FaceRecognitionService
from app.core.database import get_supabase
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()
face_service = FaceRecognitionService(tolerance=settings.FACE_TOLERANCE)


class FaceRegisterRequest(BaseModel):
    """Request model for face registration"""
    user_id: str = Field(..., description="User ID")
    role: Literal["student", "teacher"] = Field(..., description="User role")
    base64_image: str = Field(..., description="Base64 encoded image with data URL prefix")


class FaceRegisterResponse(BaseModel):
    """Response model for face registration"""
    success: bool
    message: str


class FaceStatusResponse(BaseModel):
    """Response model for face status"""
    is_registered: bool
    last_updated: Optional[datetime] = None
    message: Optional[str] = None


@router.get("/status", response_model=FaceStatusResponse)
async def get_face_status(user_id: str):
    """
    Check if a user has a registered face
    """
    try:
        supabase = get_supabase()
        
        result = supabase.table("face_encodings").select(
            "updated_at, created_at"
        ).eq("user_id", user_id).limit(1).execute()
        
        if result.data and len(result.data) > 0:
            record = result.data[0]
            # specific preference to updated_at, fallback to created_at
            timestamp_str = record.get("updated_at") or record.get("created_at")
            last_updated = None
            if timestamp_str:
                try:
                    last_updated = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                except ValueError:
                     pass

            return FaceStatusResponse(
                is_registered=True,
                last_updated=last_updated,
                message="User has a registered face"
            )
            
        return FaceStatusResponse(
            is_registered=False,
            message="User does not have a registered face"
        )
            
    except Exception as e:
        logger.error(f"Error checking face status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/register", response_model=FaceRegisterResponse)
async def register_face(request: FaceRegisterRequest):
    """
    Register a face for a user
    
    - Validates exactly ONE face in image
    - Generates face encoding
    - Stores encoding in database
    - Prevents duplicate face registration
    - Rejects multiple users with same face
    """
    try:
        supabase = get_supabase()
        
        # Validate user exists
        user_result = supabase.table("users").select("id, role").eq(
            "id", request.user_id
        ).maybe_single().execute()
        
        if not user_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user = user_result.data
        if user["role"] != request.role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User role mismatch. Expected {request.role}, got {user['role']}"
            )
        
        # Generate face encoding
        try:
            encoding = face_service.generate_encoding(request.base64_image)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        # Check if user already has face registered
        existing_result = supabase.table("face_encodings").select("*").eq(
            "user_id", request.user_id
        ).maybe_single().execute()
        
        if existing_result.data:
            # Update existing encoding
            update_result = supabase.table("face_encodings").update({
                "encoding_vector": encoding,
                "updated_at": "now()"
            }).eq("user_id", request.user_id).execute()
            
            logger.info(f"Updated face encoding for user {request.user_id}")
            return FaceRegisterResponse(
                success=True,
                message="Face encoding updated successfully"
            )
        
        # Check if this face matches any existing user (prevent duplicate faces)
        all_encodings_result = supabase.table("face_encodings").select(
            "user_id, encoding_vector"
        ).execute()
        
        if all_encodings_result.data:
            for existing_encoding_data in all_encodings_result.data:
                try:
                    stored_encoding = existing_encoding_data["encoding_vector"]
                    match, similarity = face_service.compare_faces(stored_encoding, encoding)
                    
                    if match:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"This face is already registered for another user. Similarity: {similarity:.2%}"
                        )
                except Exception as e:
                    logger.warning(f"Error checking duplicate face: {str(e)}")
                    continue
        
        # Insert new face encoding
        insert_result = supabase.table("face_encodings").insert({
            "user_id": request.user_id,
            "encoding_vector": encoding
        }).execute()
        
        if not insert_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to store face encoding"
            )
        
        logger.info(f"Face registered successfully for user {request.user_id}")
        return FaceRegisterResponse(
            success=True,
            message="Face registered successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering face: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

