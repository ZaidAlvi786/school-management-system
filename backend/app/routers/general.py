"""
General endpoints (grades, homework, attendance, papers)
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional
from app.core.auth import get_current_user, require_teacher, CurrentUser
from app.core.database import get_supabase
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Grades ============

@router.get("/grades")
async def get_grades(
    studentId: Optional[str] = Query(None),
    subjectId: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user)
):
    """Get grades"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("grades").select(
            "*, student:students(roll_number), subject:subjects(name), teacher:users!grades_teacher_id_fkey(name)"
        )
        
        if studentId:
            query = query.eq("student_id", studentId)
        if subjectId:
            query = query.eq("subject_id", subjectId)
        
        result = query.order("date", desc=True).execute()
        return result.data or []
    
    except Exception as e:
        logger.error(f"Error getting grades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get grades: {str(e)}"
        )


class CreateGradeRequest(BaseModel):
    student: str
    subject: str
    examType: str
    marks: float
    totalMarks: float
    remarks: Optional[str] = None
    date: Optional[str] = None


@router.post("/grades")
async def create_grade(
    request: CreateGradeRequest,
    user: CurrentUser = Depends(require_teacher)
):
    """Create a new grade"""
    try:
        percentage = (request.marks / request.totalMarks) * 100
        
        supabase = get_supabase()
        
        grade = supabase.table("grades").insert({
            "student_id": request.student,
            "subject_id": request.subject,
            "exam_type": request.examType,
            "marks": request.marks,
            "total_marks": request.totalMarks,
            "percentage": percentage,
            "teacher_id": user.id,
            "remarks": request.remarks,
            "date": request.date
        }).select().single().execute()
        
        if not grade.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create grade"
            )
        
        return grade.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating grade: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create grade: {str(e)}"
        )


# ============ Homework ============

@router.get("/homework")
async def get_homework(
    classId: Optional[str] = Query(None),
    sectionId: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user)
):
    """Get homework"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("homework").select(
            "*, subject:subjects(name), class:classes(name), "
            "section:sections(name), assigned_by:users(name)"
        )
        
        if classId:
            query = query.eq("class_id", classId)
        if sectionId:
            query = query.eq("section_id", sectionId)
        
        result = query.order("due_date", desc=True).execute()
        return result.data or []
    
    except Exception as e:
        logger.error(f"Error getting homework: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get homework: {str(e)}"
        )


class CreateHomeworkRequest(BaseModel):
    model_config = {"populate_by_name": True}
    
    title: str
    description: Optional[str] = None
    subject: str
    class_: str = Field(..., alias="class")
    section: Optional[str] = None
    dueDate: str
    aiGenerated: Optional[bool] = False


@router.post("/homework")
async def create_homework(
    request: CreateHomeworkRequest,
    user: CurrentUser = Depends(require_teacher)
):
    """Create a new homework"""
    try:
        supabase = get_supabase()
        
        # Get teacher record
        teacher_result = supabase.table("teachers").select("id").eq(
            "user_id", user.id
        ).maybe_single().execute()
        
        if not teacher_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found"
            )
        
        homework = supabase.table("homework").insert({
            "title": request.title,
            "description": request.description,
            "subject_id": request.subject,
            "class_id": request.class_,
            "section_id": request.section,
            "due_date": request.dueDate,
            "assigned_by_id": user.id,
            "ai_generated": request.aiGenerated or False
        }).select().single().execute()
        
        if not homework.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create homework"
            )
        
        return homework.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating homework: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create homework: {str(e)}"
        )


# ============ Attendance (GET) ============

@router.get("/attendance")
async def get_attendance(
    studentId: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    classId: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user)
):
    """Get attendance records"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("attendance").select(
            "*, student:students(roll_number, user:users(name)), marked_by:users!attendance_marked_by_id_fkey(name)"
        )
        
        if date:
            query = query.eq("date", date)
        if studentId:
            query = query.eq("student_id", studentId)
        elif user.role == "teacher":
            # Filter by teacher's class
            teacher_result = supabase.table("teachers").select("id").eq(
                "user_id", user.id
            ).maybe_single().execute()
            
            # Safe check for teacher_result
            if not teacher_result:
                logger.warning("Teacher query returned None")
                return []

            if teacher_result.data:
                class_result = supabase.table("classes").select("id").eq(
                    "class_incharge_id", teacher_result.data["id"]
                ).maybe_single().execute()
                
                # Safe check for class_result
                if not class_result:
                     logger.warning("Class query returned None")
                     return []

                if class_result.data:
                    students_result = supabase.table("students").select("id").eq(
                        "class_id", class_result.data["id"]
                    ).execute()
                    
                    # Safe check for students_result
                    if not students_result:
                        logger.warning("Students query returned None")
                        return []

                    if students_result.data:
                        student_ids = [s["id"] for s in students_result.data]
                        query = query.in_("student_id", student_ids)
                    else:
                        return []
        elif classId:
            students_result = supabase.table("students").select("id").eq(
                "class_id", classId
            ).execute()
            
            if students_result.data:
                student_ids = [s["id"] for s in students_result.data]
                query = query.in_("student_id", student_ids)
            else:
                return []
        
        result = query.order("date", desc=True).execute()
        
        logger.info(f"Attendance query result object: {result}")
        if result is None:
             logger.error("CRITICAL: Supabase execute() returned None")
             return []

        return result.data or []
    
    except Exception as e:
        logger.error(f"Error getting attendance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get attendance: {str(e)}"
        )

