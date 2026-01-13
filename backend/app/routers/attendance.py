"""
Attendance marking endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Literal, Optional, List
import logging

from app.services.face_recognition_service import FaceRecognitionService
from app.services.attendance_service import AttendanceService
from app.core.database import get_supabase
from app.core.config import settings
from app.core.auth import get_current_user, CurrentUser

# Import liveness service
try:
    from app.services.liveness_service import LivenessService
    liveness_service = LivenessService()
except ImportError:
    # Fallback if liveness service not available
    LivenessService = None
    liveness_service = None

logger = logging.getLogger(__name__)

router = APIRouter()
# Use stricter tolerance (0.4 instead of 0.6) for security
# Lower tolerance = more strict matching (fewer false positives)
face_service = FaceRecognitionService(tolerance=min(settings.FACE_TOLERANCE, 0.4))
attendance_service = AttendanceService()


class AttendanceMarkRequest(BaseModel):
    """Request model for marking attendance"""
    base64_image: str = Field(..., description="Base64 encoded image with data URL prefix")
    role: Literal["student", "teacher"] = Field(..., description="User role")
    class_id: Optional[str] = Field(None, description="Class ID (required for students)")
    device_type: str = Field("web", description="Device type (web/mobile)")
    liveness_verified: bool = Field(False, description="Whether liveness detection was verified")
    liveness_images: Optional[List[str]] = Field(None, description="Optional: Sequence of images for liveness verification")
    challenge_type: Optional[str] = Field(None, description="Type of liveness challenge completed")


class AttendanceMarkResponse(BaseModel):
    """Response model for marking attendance"""
    success: bool
    status: str
    user_id: str
    message: str
    already_marked: Optional[bool] = None
    is_late: Optional[bool] = None
    late_minutes: Optional[int] = None
    confidence: Optional[float] = None


@router.post("/mark", response_model=AttendanceMarkResponse)
async def mark_attendance(
    request: AttendanceMarkRequest,
    user: CurrentUser = Depends(get_current_user)
):
    """
    Mark attendance using face recognition
    
    SECURITY: Verifies that the detected face belongs to the authenticated user.
    Only the authenticated user can mark their own attendance.
    
    - Requires authentication
    - Detects face in image
    - Matches face encoding with authenticated user's stored encoding ONLY
    - Verifies match belongs to authenticated user (security check)
    - Applies role-based rules:
      - Student → per class per day
      - Teacher → once per day
    - Prevents duplicates
    - Inserts attendance record
    """
    try:
        supabase = get_supabase()
        
        # SECURITY: Verify user role matches request role
        if user.role != request.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role '{user.role}' does not match request role '{request.role}'"
            )
        
        # Generate face encoding from image with quality validation
        try:
            unknown_encoding, metadata = face_service.generate_encoding(request.base64_image)
            # Log quality info for debugging
            quality = metadata.get("quality", {})
            logger.info(
                f"Face encoding generated for attendance (user_id={user.id}): "
                f"quality_score={quality.get('quality_score', 0):.1f}, "
                f"face_size={metadata.get('face_size', 0)}px, "
                f"warnings={quality.get('warnings', [])}"
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        # SECURITY: Get ALL face encodings for the authenticated user
        # Supports multiple embeddings per user for better accuracy
        encoding_result = supabase.table("face_encodings").select(
            "id, user_id, encoding_vector, registration_index, is_primary, quality_score"
        ).eq("user_id", user.id).execute()
        
        if not encoding_result.data or len(encoding_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Face not registered. Please register your face first."
            )
        
        # Prepare encodings list for matching (supports multiple embeddings)
        user_encodings = [
            {
                'user_id': enc['user_id'],
                'encoding': enc['encoding_vector'],
                'registration_index': enc.get('registration_index', 0),
                'is_primary': enc.get('is_primary', False),
                'quality_score': enc.get('quality_score', 0)
            }
            for enc in encoding_result.data
        ]
        
        logger.info(f"Comparing against {len(user_encodings)} embedding(s) for user {user.id}")
        
        # CRITICAL: Compare with ALL embeddings for this user, use best match
        # This improves accuracy by comparing against multiple registered images
        match_result = face_service.find_matching_user(
            unknown_encoding, 
            user_encodings,
            min_confidence=0.75,  # 75% similarity required
            use_best_of_multiple=True  # Use best match across all embeddings
        )
        
        if not match_result:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Face does not match your registered face. Please ensure you are showing your own face clearly."
            )
        
        # Verify matched user is the authenticated user (security check)
        if match_result['user_id'] != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Face match verification failed. User ID mismatch."
            )
        
        similarity = match_result['similarity']
        confidence = similarity
        
        # Log comparison details
        logger.info(
            f"Face comparison for user_id={user.id}: "
            f"match={match}, similarity={similarity:.4f}, distance={distance:.4f}"
        )
        
        # Optional: Verify liveness if provided
        liveness_passed = False
        if request.liveness_verified and request.liveness_images and liveness_service:
            try:
                liveness_result = liveness_service.verify_liveness_from_base64(
                    challenge_type=request.challenge_type or 'combined',
                    base64_images=request.liveness_images
                )
                liveness_passed = liveness_result.get('challenge_passed', False)
                
                # Log liveness attempt
                supabase.table("liveness_attempts").insert({
                    "user_id": user.id,
                    "attempt_type": "attendance",
                    "challenge_type": request.challenge_type or 'combined',
                    "success": liveness_passed,
                    "confidence": liveness_result.get('confidence', 0.0),
                    "metadata": liveness_result.get('details', {})
                }).execute()
                
                if not liveness_passed:
                    logger.warning(f"Liveness check failed for user {user.id}: {liveness_result.get('details', {})}")
                    # Don't reject attendance for liveness failure, but log it
                    # In production, you might want to require liveness
            except Exception as e:
                logger.error(f"Liveness verification error: {str(e)}")
                # Continue without liveness if verification fails
        
        user_id = user.id  # Use authenticated user ID (security)
        
        logger.info(
            f"Face verified for user_id={user_id}, "
            f"confidence={confidence:.4f}, "
            f"matched_embedding_index={match_result.get('matched_embedding_index')}, "
            f"liveness_passed={liveness_passed}"
        )
        
        # Mark attendance based on role
        if request.role == "student":
            # Get student record to automatically get class_id
            student_result = supabase.table("students").select(
                "id, class_id"
            ).eq("user_id", user_id).maybe_single().execute()
            
            if not student_result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Student record not found. Please contact administrator."
                )
            
            student = student_result.data
            class_id = student["class_id"]
            student_id = student["id"]
            
            # If class_id provided in request, verify it matches student's class
            if request.class_id:
                if class_id != request.class_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Student does not belong to the specified class"
                    )
            
            if not class_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Student is not assigned to a class. Please contact administrator."
                )
            
            # Mark student attendance (class_id auto-fetched from student record)
            result = attendance_service.mark_student_attendance(
                user_id,
                class_id,
                request.device_type,
                student_id  # Pass student_id for database
            )
            
            if result.get("already_marked"):
                return AttendanceMarkResponse(
                    success=False,
                    status="already_marked",
                    user_id=user_id,
                    message="Attendance already marked for today",
                    already_marked=True,
                    confidence=confidence
                )
            
            return AttendanceMarkResponse(
                success=True,
                status="present",
                user_id=user_id,
                message="Attendance marked successfully",
                confidence=confidence
            )
        
        else:  # teacher
            # Mark teacher attendance
            result = attendance_service.mark_teacher_attendance(
                user_id,
                request.device_type,
                confidence=confidence,
                liveness_verified=liveness_passed
            )
            
            if result.get("already_marked"):
                return AttendanceMarkResponse(
                    success=False,
                    status="already_marked",
                    user_id=user_id,
                    message="Attendance already marked for today",
                    already_marked=True,
                    confidence=confidence
                )
            
            attendance = result.get("attendance", {})
            status_value = attendance.get("status", "present")
            is_late = result.get("is_late", False)
            late_minutes = result.get("late_minutes", 0)
            
            message = "Attendance marked successfully"
            if is_late:
                message = f"Attendance marked. You were {late_minutes} minutes late."
            
            return AttendanceMarkResponse(
                success=True,
                status=status_value,
                user_id=user_id,
                message=message,
                is_late=is_late,
                late_minutes=late_minutes,
                confidence=confidence
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking attendance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

