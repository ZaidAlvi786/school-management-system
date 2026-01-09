"""
Principal endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.auth import require_principal, CurrentUser
from app.core.database import get_supabase
from passlib.context import CryptContext
import logging
import secrets

logger = logging.getLogger(__name__)

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============ Teachers ============

@router.get("/teachers")
async def get_principal_teachers(user: CurrentUser = Depends(require_principal)):
    """Get teachers for principal's school"""
    try:
        supabase = get_supabase()
        
        # Get principal's school
        principal_result = supabase.table("principals").select(
            "id, school_id"
        ).eq("user_id", user.id).maybe_single().execute()
        
        if not principal_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Principal not found"
            )
        
        principal = principal_result.data
        
        # Find school_id
        school_id = principal["school_id"]
        if not school_id:
            campus_result = supabase.table("campuses").select(
                "school_id"
            ).eq("principal_id", principal["id"]).maybe_single().execute()
            
            if campus_result.data:
                school_id = campus_result.data["school_id"]
        
        if not school_id:
            return []
        
        # Get teachers
        teachers_result = supabase.table("teachers").select(
            "*, user:users(name, email, phone), school:schools(name, code)"
        ).eq("school_id", school_id).execute()
        
        teachers = teachers_result.data or []
        
        # Get assigned subjects
        teachers_with_subjects = []
        for teacher in teachers:
            subjects_result = supabase.table("subjects").select(
                "*, class:classes(name, level, campus:campuses(name))"
            ).eq("teacher_id", teacher["user_id"]).execute()
            
            teachers_with_subjects.append({
                **teacher,
                "assignedSubjects": subjects_result.data or []
            })
        
        return teachers_with_subjects
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting teachers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get teachers: {str(e)}"
        )


class CreateTeacherRequest(BaseModel):
    email: str
    name: str
    phone: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[int] = 0


@router.post("/teachers")
async def create_teacher(
    request: CreateTeacherRequest,
    user: CurrentUser = Depends(require_principal)
):
    """Create a new teacher"""
    try:
        if not request.email or not request.name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and name are required"
            )
        
        supabase = get_supabase()
        
        # Get principal's school
        principal_result = supabase.table("principals").select(
            "id, school_id"
        ).eq("user_id", user.id).maybe_single().execute()
        
        if not principal_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Principal not found"
            )
        
        principal = principal_result.data
        
        # Find school_id
        school_id = principal["school_id"]
        if not school_id:
            campus_result = supabase.table("campuses").select(
                "school_id"
            ).eq("principal_id", principal["id"]).maybe_single().execute()
            
            if campus_result.data:
                school_id = campus_result.data["school_id"]
        
        if not school_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found"
            )
        
        # Check if teacher user exists
        existing_user_result = supabase.table("users").select("id").eq(
            "email", request.email.lower()
        ).maybe_single().execute()
        
        teacher_user_id = existing_user_result.data["id"] if existing_user_result.data else None
        
        if existing_user_result.data:
            # Check if teacher already exists
            existing_teacher_result = supabase.table("teachers").select(
                "id, school_id"
            ).eq("user_id", teacher_user_id).maybe_single().execute()
            
            if existing_teacher_result.data:
                if existing_teacher_result.data["school_id"] != school_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This teacher is already assigned to another school"
                    )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Teacher already exists"
                )
            
            # Create teacher record for existing user
            teacher = supabase.table("teachers").insert({
                "user_id": teacher_user_id,
                "employee_id": f"EMP-{secrets.token_hex(8)}",
                "school_id": school_id,
                "qualification": request.qualification,
                "experience": request.experience or 0
            }).select().single().execute()
            
            if not teacher.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create teacher"
                )
        else:
            # Create new user and teacher
            temp_password = secrets.token_urlsafe(16)
            hashed_password = pwd_context.hash(temp_password)
            
            new_user = supabase.table("users").insert({
                "email": request.email.lower(),
                "password": hashed_password,
                "role": "teacher",
                "name": request.name,
                "phone": request.phone,
                "is_active": True
            }).select().single().execute()
            
            if not new_user.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user"
                )
            
            teacher = supabase.table("teachers").insert({
                "user_id": new_user.data["id"],
                "employee_id": f"EMP-{secrets.token_hex(8)}",
                "school_id": school_id,
                "qualification": request.qualification,
                "experience": request.experience or 0
            }).select().single().execute()
            
            if not teacher.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create teacher"
                )
            
            # TODO: Send invite email (requires email service setup)
        
        # Get teacher with populated data
        teacher_with_data = supabase.table("teachers").select(
            "*, user:users(name, email, phone), school:schools(name)"
        ).eq("id", teacher.data["id"]).single().execute()
        
        return teacher_with_data.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating teacher: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create teacher: {str(e)}"
        )


# ============ Timetable ============

@router.get("/timetable")
async def get_principal_timetable(user: CurrentUser = Depends(require_principal)):
    """Get timetable for principal's school"""
    try:
        supabase = get_supabase()
        
        # Get principal's school
        principal_result = supabase.table("principals").select(
            "id, school_id"
        ).eq("user_id", user.id).maybe_single().execute()
        
        if not principal_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Principal not found"
            )
        
        school_id = principal_result.data["school_id"]
        if not school_id:
            campus_result = supabase.table("campuses").select(
                "school_id"
            ).eq("principal_id", principal_result.data["id"]).maybe_single().execute()
            
            if campus_result.data:
                school_id = campus_result.data["school_id"]
        
        if not school_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found"
            )
        
        # Get timetables
        timetables_result = supabase.table("timetables").select("*").eq(
            "school_id", school_id
        ).eq("is_active", True).execute()
        
        timetables = timetables_result.data or []
        junior = next((t for t in timetables if t["level_type"] == "junior"), None)
        senior = next((t for t in timetables if t["level_type"] == "senior"), None)
        
        return {"junior": junior, "senior": senior}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting timetable: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get timetable: {str(e)}"
        )


class CreatePrincipalTimetableRequest(BaseModel):
    junior: Optional[dict] = None
    senior: Optional[dict] = None


@router.post("/timetable")
async def create_principal_timetable(
    request: CreatePrincipalTimetableRequest,
    user: CurrentUser = Depends(require_principal)
):
    """Create/Update timetable"""
    try:
        supabase = get_supabase()
        
        # Get principal's school
        principal_result = supabase.table("principals").select(
            "id, school_id"
        ).eq("user_id", user.id).maybe_single().execute()
        
        if not principal_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Principal not found"
            )
        
        school_id = principal_result.data["school_id"]
        if not school_id:
            campus_result = supabase.table("campuses").select(
                "school_id"
            ).eq("principal_id", principal_result.data["id"]).maybe_single().execute()
            
            if campus_result.data:
                school_id = campus_result.data["school_id"]
        
        if not school_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found"
            )
        
        # Deactivate old timetables
        supabase.table("timetables").update({
            "is_active": False
        }).eq("school_id", school_id).execute()
        
        # Insert new timetables
        timetables_to_insert = []
        
        if request.junior:
            timetables_to_insert.append({
                "school_id": school_id,
                "level_type": "junior",
                "level_range": request.junior.get("level_range", "1-5"),
                "start_time": request.junior["start_time"],
                "end_time": request.junior["end_time"],
                "late_threshold_minutes": request.junior.get("late_threshold_minutes", 15),
                "is_active": True,
                "created_by_id": user.id
            })
        
        if request.senior:
            timetables_to_insert.append({
                "school_id": school_id,
                "level_type": "senior",
                "level_range": request.senior.get("level_range", "6-10"),
                "start_time": request.senior["start_time"],
                "end_time": request.senior["end_time"],
                "late_threshold_minutes": request.senior.get("late_threshold_minutes", 15),
                "is_active": True,
                "created_by_id": user.id
            })
        
        if timetables_to_insert:
            supabase.table("timetables").insert(timetables_to_insert).execute()
        
        return {
            "message": "Timetable saved successfully",
            "success": True
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating timetable: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create timetable: {str(e)}"
        )


# ============ Teacher Attendance ============

@router.get("/teacher-attendance")
async def get_teacher_attendance(
    date: Optional[str] = None,
    user: CurrentUser = Depends(require_principal)
):
    """Get teacher attendance for principal's school"""
    try:
        supabase = get_supabase()
        
        # Get principal's school
        principal_result = supabase.table("principals").select(
            "id, school_id"
        ).eq("user_id", user.id).maybe_single().execute()
        
        if not principal_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Principal not found"
            )
        
        school_id = principal_result.data["school_id"]
        if not school_id:
            campus_result = supabase.table("campuses").select(
                "school_id"
            ).eq("principal_id", principal_result.data["id"]).maybe_single().execute()
            
            if campus_result.data:
                school_id = campus_result.data["school_id"]
        
        if not school_id:
            return []
        
        # Get teachers in school
        teachers_result = supabase.table("teachers").select("id").eq(
            "school_id", school_id
        ).execute()
        
        if not teachers_result.data:
            return []
        
        teacher_ids = [t["id"] for t in teachers_result.data]
        
        # Get teacher user_ids
        teacher_users_result = supabase.table("teachers").select(
            "id, user_id"
        ).in_("id", teacher_ids).execute()
        
        user_ids = [t["user_id"] for t in teacher_users_result.data or []]
        
        # Get attendance
        query = supabase.table("attendance").select(
            "*, user:users(name, email)"
        ).in_("user_id", user_ids).eq("role", "teacher")
        
        if date:
            query = query.eq("date", date)
        
        result = query.order("date", desc=True).execute()
        
        return result.data or []
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting teacher attendance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get teacher attendance: {str(e)}"
        )

