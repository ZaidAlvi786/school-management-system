"""
Attendance marking endpoints
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Literal, Optional
import logging

from app.services.face_recognition_service import FaceRecognitionService
from app.services.attendance_service import AttendanceService
from app.core.database import get_supabase
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()
face_service = FaceRecognitionService(tolerance=settings.FACE_TOLERANCE)
attendance_service = AttendanceService()


class AttendanceMarkRequest(BaseModel):
    """Request model for marking attendance"""
    base64_image: str = Field(..., description="Base64 encoded image with data URL prefix")
    role: Literal["student", "teacher"] = Field(..., description="User role")
    class_id: Optional[str] = Field(None, description="Class ID (required for students)")
    device_type: str = Field("web", description="Device type (web/mobile)")


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
async def mark_attendance(request: AttendanceMarkRequest):
    """
    Mark attendance using face recognition
    
    - Detects face in image
    - Matches face encoding with stored encodings
    - Identifies user
    - Applies role-based rules:
      - Student → per class per day
      - Teacher → once per day
    - Prevents duplicates
    - Inserts attendance record
    """
    try:
        supabase = get_supabase()
        
        # Validate class_id for students
        if request.role == "student" and not request.class_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="class_id is required for students"
            )
        
        # Generate face encoding from image with quality validation
        try:
            unknown_encoding, metadata = face_service.generate_encoding(request.base64_image)
            # Log quality info for debugging
            quality = metadata.get("quality", {})
            logger.info(
                f"Face encoding generated for attendance: "
                f"quality_score={quality.get('quality_score', 0):.1f}, "
                f"face_size={metadata.get('face_size', 0)}px, "
                f"warnings={quality.get('warnings', [])}"
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        # Get all face encodings for the specified role
        encodings_result = supabase.table("face_encodings").select(
            "user_id, encoding_vector"
        ).execute()
        
        if not encodings_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No face encodings found in database"
            )
        
        # Filter by role
        user_ids = [e["user_id"] for e in encodings_result.data]
        users_result = supabase.table("users").select("id, role").in_(
            "id", user_ids
        ).eq("role", request.role).execute()
        
        if not users_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No {request.role} users with registered faces found"
            )
        
        valid_user_ids = {u["id"] for u in users_result.data}
        
        # Filter encodings by valid user IDs
        valid_encodings = [
            {
                "user_id": e["user_id"],
                "encoding": e["encoding_vector"]
            }
            for e in encodings_result.data
            if e["user_id"] in valid_user_ids
        ]
        
        # Find matching user
        match_result = face_service.find_matching_user(unknown_encoding, valid_encodings)
        
        if not match_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Face not recognized. Please ensure you have registered your face."
            )
        
        user_id = match_result["user_id"]
        confidence = match_result["similarity"]
        
        logger.info(f"Face matched: user_id={user_id}, confidence={confidence:.4f}")
        
        # Mark attendance based on role
        if request.role == "student":
            if not request.class_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="class_id is required for students"
                )
            
            # Verify student belongs to the class
            student_result = supabase.table("students").select(
                "id, class_id"
            ).eq("user_id", user_id).maybe_single().execute()
            
            if not student_result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Student record not found"
                )
            
            student = student_result.data
            if student["class_id"] != request.class_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Student does not belong to the specified class"
                )
            
            # Mark student attendance
            result = attendance_service.mark_student_attendance(
                user_id,
                request.class_id,
                request.device_type
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
                request.device_type
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

