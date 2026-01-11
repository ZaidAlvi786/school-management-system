"""
Student endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional
from app.core.auth import require_student, CurrentUser
from app.core.database import get_supabase
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter()


class StudentInfoResponse(BaseModel):
    """Student info response"""
    model_config = {"populate_by_name": True}
    
    _id: str
    id: str
    rollNumber: str
    admissionNumber: str
    classId: str
    sectionId: str
    class_: Optional[dict] = Field(None, alias="class")
    section: Optional[dict] = None


@router.get("/info", response_model=StudentInfoResponse)
async def get_student_info(user: CurrentUser = Depends(require_student)):
    """Get student information"""
    try:
        supabase = get_supabase()
        
        # Get student record
        result = supabase.table("students").select(
            "id, roll_number, admission_number, class_id, section_id, "
            "class:classes(name, level), section:sections(name)"
        ).eq("user_id", user.id).maybe_single().execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student record not found"
            )
        
        student = result.data
        return StudentInfoResponse(
            _id=student["id"],
            id=student["id"],
            rollNumber=student["roll_number"],
            admissionNumber=student["admission_number"],
            classId=student["class_id"],
            sectionId=student["section_id"],
            class_=student.get("class"),
            section=student.get("section")
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting student info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get student info: {str(e)}"
        )


@router.get("/grades")
async def get_student_grades(
    studentId: Optional[str] = Query(None),
    subjectId: Optional[str] = Query(None),
    user: CurrentUser = Depends(require_student)
):
    """Get student grades"""
    try:
        supabase = get_supabase()
        
        # If studentId not provided, use current student
        if not studentId:
            student_result = supabase.table("students").select("id").eq(
                "user_id", user.id
            ).maybe_single().execute()
            
            if not student_result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Student not found"
                )
            studentId = student_result.data["id"]
        
        query = supabase.table("grades").select(
            "*, student:students(roll_number), subject:subjects(name), teacher:users(name)"
        ).eq("student_id", studentId)
        
        if subjectId:
            query = query.eq("subject_id", subjectId)
        
        result = query.order("date", desc=True).execute()
        
        return result.data or []
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting grades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get grades: {str(e)}"
        )


@router.get("/attendance")
async def get_student_attendance(
    studentId: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    user: CurrentUser = Depends(require_student)
):
    """Get student attendance"""
    try:
        supabase = get_supabase()
        
        # If studentId not provided, use current student
        if not studentId:
            student_result = supabase.table("students").select("id").eq(
                "user_id", user.id
            ).maybe_single().execute()
            
            if not student_result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Student not found"
                )
            studentId = student_result.data["id"]
        
        query = supabase.table("attendance").select(
            "*, student:students(roll_number, user:users(name)), marked_by:users(name)"
        ).eq("student_id", studentId)
        
        if date:
            query = query.eq("date", date)
        
        result = query.order("date", desc=True).execute()
        
        return result.data or []
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting attendance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get attendance: {str(e)}"
        )


@router.get("/homework")
async def get_student_homework(user: CurrentUser = Depends(require_student)):
    """Get homework assigned to student"""
    try:
        supabase = get_supabase()
        
        # Get student's class and section
        student_result = supabase.table("students").select(
            "class_id, section_id"
        ).eq("user_id", user.id).maybe_single().execute()
        
        if not student_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        student = student_result.data
        class_id = student["class_id"]
        section_id = student["section_id"]
        
        # Get homework for student's class and section
        query = supabase.table("homework").select(
            "*, subject:subjects(name), class:classes(name), section:sections(name), "
            "assigned_by:users(name)"
        ).eq("class_id", class_id)
        
        if section_id:
            query = query.eq("section_id", section_id)
        
        result = query.order("due_date", desc=True).execute()
        
        return result.data or []
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting homework: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get homework: {str(e)}"
        )


@router.get("/materials")
async def get_student_materials(user: CurrentUser = Depends(require_student)):
    """Get study materials for student"""
    try:
        supabase = get_supabase()
        
        # Get student's class
        student_result = supabase.table("students").select(
            "class_id"
        ).eq("user_id", user.id).maybe_single().execute()
        
        if not student_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        class_id = student_result.data["class_id"]
        
        # Get materials for student's class
        result = supabase.table("materials").select(
            "*, subject:subjects(name), class:classes(name), uploaded_by:users(name)"
        ).eq("class_id", class_id).order("created_at", desc=True).execute()
        
        return result.data or []
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting materials: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get materials: {str(e)}"
        )


@router.get("/syllabus")
async def get_student_syllabus(user: CurrentUser = Depends(require_student)):
    """Get syllabus for student's class"""
    try:
        supabase = get_supabase()
        
        # Get student's class
        student_result = supabase.table("students").select(
            "class_id"
        ).eq("user_id", user.id).maybe_single().execute()
        
        if not student_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        class_id = student_result.data["class_id"]
        
        # Get syllabus for student's class
        result = supabase.table("syllabus").select(
            "*, subject:subjects(name), class:classes(name), teacher:users(name)"
        ).eq("class_id", class_id).order("term", desc=True).order("week", desc=True).execute()
        
        return result.data or []
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting syllabus: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get syllabus: {str(e)}"
        )


@router.get("/qr-code")
async def get_qr_codes(user: CurrentUser = Depends(require_student)):
    """Get QR code for student (for attendance marking)"""
    try:
        supabase = get_supabase()
        
        # Get student record
        student_result = supabase.table("students").select("id").eq(
            "user_id", user.id
        ).maybe_single().execute()
        
        if not student_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        # Generate QR data URL
        # Note: QR code generation should be done in frontend or use a library
        # For now, return the data needed to generate QR code
        base_url = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
        qr_data = f"{base_url}/attendance/mark?studentId={student_result.data['id']}"
        
        return {
            "studentId": student_result.data["id"],
            "qrData": qr_data,
            "message": "Use this data to generate QR code in frontend"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting QR code: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get QR code: {str(e)}"
        )


@router.get("/forecast")
async def get_student_forecast(user: CurrentUser = Depends(require_student)):
    """Get grade forecast for student"""
    try:
        supabase = get_supabase()
        
        # Get student record
        student_result = supabase.table("students").select("id").eq(
            "user_id", user.id
        ).maybe_single().execute()
        
        if not student_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        student_id = student_result.data["id"]
        
        # Get past grades
        grades_result = supabase.table("grades").select(
            "subject:subjects(name), marks, total_marks, date"
        ).eq("student_id", student_id).order("date", desc=True).limit(10).execute()
        
        # Get attendance
        attendance_result = supabase.table("attendance").select("*").eq(
            "user_id", user.id
        ).eq("role", "student").execute()
        
        # Get syllabus progress
        class_result = supabase.table("students").select("class_id").eq(
            "id", student_id
        ).maybe_single().execute()
        
        syllabus_result = supabase.table("syllabus").select("*").eq(
            "class_id", class_result.data["class_id"] if class_result.data else None
        ).execute() if class_result.data else {"data": []}
        
        # Calculate statistics
        past_grades = [
            {
                "subject": g.get("subject", {}).get("name", "N/A"),
                "marks": g["marks"],
                "totalMarks": g["total_marks"],
                "date": g["date"]
            }
            for g in (grades_result.data or [])
        ]
        
        attendance_data = attendance_result.data or []
        present = len([a for a in attendance_data if a.get("status") == "present"])
        total = len(attendance_data)
        attendance_percentage = (present / total * 100) if total > 0 else 0
        
        syllabus_data = syllabus_result.data or []
        completed = len([s for s in syllabus_data if s.get("is_completed")])
        syllabus_percentage = (completed / len(syllabus_data) * 100) if syllabus_data else 0
        
        # Return data for frontend to call AI forecast endpoint
        return {
            "pastGrades": past_grades,
            "attendance": {
                "present": present,
                "total": total,
                "percentage": attendance_percentage
            },
            "syllabusProgress": {
                "completed": completed,
                "total": len(syllabus_data),
                "percentage": syllabus_percentage
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting forecast: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get forecast: {str(e)}"
        )


class MarkHomeworkDoneRequest(BaseModel):
    homeworkId: str


@router.post("/homework/mark-done")
async def mark_homework_done(
    request: MarkHomeworkDoneRequest,
    user: CurrentUser = Depends(require_student)
):
    """Mark homework as done"""
    try:
        supabase = get_supabase()
        
        # Get student record
        student_result = supabase.table("students").select("id, class_id, section_id").eq(
            "user_id", user.id
        ).maybe_single().execute()
        
        if not student_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        student = student_result.data
        
        # Verify homework exists and is assigned to student's class
        homework_result = supabase.table("homework").select(
            "id, class_id, section_id"
        ).eq("id", request.homeworkId).maybe_single().execute()
        
        if not homework_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Homework not found"
            )
        
        homework = homework_result.data
        
        if student["class_id"] != homework["class_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Homework not assigned to your class"
            )
        
        # Check if already completed
        existing_result = supabase.table("homework_completions").select(
            "id, status"
        ).eq("homework_id", request.homeworkId).eq(
            "student_id", student["id"]
        ).maybe_single().execute()
        
        if existing_result.data:
            if existing_result.data["status"] == "approved":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Homework already approved"
                )
            
            # Update existing
            updated = supabase.table("homework_completions").update({
                "status": "completed",
                "completed_at": "now()",
                "updated_at": "now()"
            }).eq("id", existing_result.data["id"]).select().single().execute()
            
            return {
                "message": "Homework marked as done",
                "completion": updated.data
            }
        
        # Create new completion
        completion = supabase.table("homework_completions").insert({
            "homework_id": request.homeworkId,
            "student_id": student["id"],
            "status": "completed",
            "completed_at": "now()"
        }).select().single().execute()
        
        if not completion.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create completion"
            )
        
        return {
            "message": "Homework marked as done. Waiting for teacher approval.",
            "completion": completion.data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking homework done: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark homework as done: {str(e)}"
        )

