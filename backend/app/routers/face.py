"""
Face registration endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, field_serializer
from typing import Literal, Optional, List
from datetime import datetime
import logging

from app.services.face_recognition_service import FaceRecognitionService
from app.services.liveness_service import LivenessService
from app.core.database import get_supabase
from app.core.config import settings
from app.core.auth import get_current_user, CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter()
face_service = FaceRecognitionService(tolerance=settings.FACE_TOLERANCE)
liveness_service = LivenessService()


class FaceRegisterRequest(BaseModel):
    """Request model for face registration - supports multiple images"""
    user_id: str = Field(..., description="User ID")
    role: Literal["student", "teacher"] = Field(..., description="User role")
    base64_images: List[str] = Field(..., min_items=1, max_items=10, description="Base64 encoded images (1-10 images for better accuracy)")
    liveness_verified: bool = Field(False, description="Whether liveness detection was verified during registration")
    challenge_type: Optional[str] = Field(None, description="Type of liveness challenge completed (blink, head_left, head_right, combined)")


class FaceRegisterResponse(BaseModel):
    """Response model for face registration"""
    success: bool
    message: str


class FaceStatusResponse(BaseModel):
    """Response model for face status"""
    model_config = {
        "populate_by_name": True,
        "json_encoders": {datetime: lambda v: v.isoformat() if v else None}
    }
    
    hasRegisteredFace: bool = Field(alias="is_registered")
    lastUpdated: Optional[datetime] = Field(None, alias="last_updated")
    message: Optional[str] = None
    
    class Config:
        populate_by_name = True


@router.get("/status", response_model=FaceStatusResponse)
async def get_face_status(user: CurrentUser = Depends(get_current_user)):
    """
    Check if a user has a registered face
    """
    try:
        supabase = get_supabase()
        
        result = supabase.table("face_encodings").select(
            "updated_at, created_at"
        ).eq("user_id", user.id).limit(1).execute()
        
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
                is_registered=True,  # Use snake_case internally
                last_updated=last_updated,
                message="User has a registered face"
            )
            
        return FaceStatusResponse(
            is_registered=False,  # Use snake_case internally
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
    Register face(s) for a user with multiple embeddings support
    
    - Accepts 1-10 images for better accuracy
    - Validates exactly ONE face per image
    - Generates multiple face encodings (one per image)
    - Stores all embeddings in database
    - Supports liveness verification
    - Prevents duplicate face registration across users
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
        
        # Generate multiple face encodings
        try:
            encodings, metadatas = face_service.generate_multiple_encodings(request.base64_images)
            logger.info(
                f"Generated {len(encodings)} face encoding(s) for user {request.user_id} from {len(request.base64_images)} image(s)"
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        # Check if this face matches any existing user (prevent duplicate faces)
        # Use first encoding for duplicate check
        all_encodings_result = supabase.table("face_encodings").select(
            "user_id, encoding_vector"
        ).execute()
        
        if all_encodings_result.data:
            for existing_encoding_data in all_encodings_result.data:
                try:
                    stored_encoding = existing_encoding_data["encoding_vector"]
                    # Check first encoding against existing
                    match, similarity, distance = face_service.compare_faces(stored_encoding, encodings[0])
                    
                    if match:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"This face is already registered for another user. Similarity: {similarity:.2%}"
                        )
                except Exception as e:
                    if isinstance(e, HTTPException):
                        raise
                    logger.warning(f"Error checking duplicate face: {str(e)}")
                    continue
        
        # Delete old embeddings for this user (replace all)
        delete_result = supabase.table("face_encodings").delete().eq("user_id", request.user_id).execute()
        logger.info(f"Deleted {len(delete_result.data) if delete_result.data else 0} old embedding(s) for user {request.user_id}")
        
        # Find best quality embedding to mark as primary
        best_quality_idx = 0
        best_quality_score = 0
        for idx, metadata in enumerate(metadatas):
            quality_score = metadata.get("quality", {}).get("quality_score", 0)
            if quality_score > best_quality_score:
                best_quality_score = quality_score
                best_quality_idx = idx
        
        # Insert all encodings
        insert_data_list = []
        for idx, (encoding, metadata) in enumerate(zip(encodings, metadatas)):
            quality = metadata.get("quality", {})
            quality_score = quality.get("quality_score")
            face_size = metadata.get("face_size")
            registration_index = metadata.get("registration_index", idx + 1)
            
            insert_data = {
                "user_id": request.user_id,
                "encoding_vector": encoding,
                "model_version": metadata.get("model_version", face_service.model_version),
                "embedding_dimension": metadata.get("embedding_dimension", face_service.embedding_dimension),
                "registration_index": registration_index,
                "is_primary": (idx == best_quality_idx),
                "liveness_verified": request.liveness_verified
            }
            
            if quality_score is not None:
                insert_data["quality_score"] = quality_score
            if face_size is not None:
                insert_data["face_size"] = face_size
            
            insert_data_list.append(insert_data)
        
        # Insert all embeddings in batch
        insert_result = supabase.table("face_encodings").insert(insert_data_list).execute()
        
        logger.info(
            f"Registered {len(insert_data_list)} face encoding(s) for user {request.user_id} "
            f"(primary: index {best_quality_idx + 1}, liveness: {request.liveness_verified})"
        )
        
        return FaceRegisterResponse(
            success=True,
            message=f"Face registered successfully with {len(encodings)} embedding(s)"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering face: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )
