"""
Admin endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from app.core.auth import require_admin, require_admin_or_principal, CurrentUser
from app.core.database import get_supabase
from passlib.context import CryptContext
import logging
import secrets

logger = logging.getLogger(__name__)

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============ Schools ============

@router.get("/schools")
async def get_schools(user: CurrentUser = Depends(require_admin_or_principal)):
    """Get schools (admin gets by domain, principal gets their school)"""
    try:
        supabase = get_supabase()
        
        if user.role == "admin":
            # Admin: get school by domain from email
            email_parts = user.email.split("@")
            if len(email_parts) != 2:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid admin email format"
                )
            
            domain = email_parts[1].lower()
            
            school_result = supabase.table("schools").select(
                "*, principal:principals(user:users(name, email))"
            ).eq("domain", domain).maybe_single().execute()
            
            if not school_result.data:
                return []
            
            campuses_result = supabase.table("campuses").select(
                "*, incharge:users(name, email), principal:principals(user:users(name, email))"
            ).eq("school_id", school_result.data["id"]).execute()
            
            return [{**school_result.data, "campuses": campuses_result.data or []}]
        
        else:  # principal
            # Principal: get their school
            principal_result = supabase.table("principals").select(
                "id, school_id"
            ).eq("user_id", user.id).maybe_single().execute()
            
            if not principal_result.data:
                return []
            
            principal = principal_result.data
            school_id = principal["school_id"]
            
            if not school_id:
                # Check if assigned to campus
                campus_result = supabase.table("campuses").select(
                    "school_id"
                ).eq("principal_id", principal["id"]).maybe_single().execute()
                
                if campus_result.data:
                    school_id = campus_result.data["school_id"]
                else:
                    return []
            
            school_result = supabase.table("schools").select(
                "*, principal:principals(user:users(name, email))"
            ).eq("id", school_id).maybe_single().execute()
            
            if not school_result.data:
                return []
            
            # Get campuses
            if principal["school_id"]:
                # Principal assigned to school - show all campuses
                campuses_result = supabase.table("campuses").select(
                    "*, incharge:users(name, email), principal:principals(user:users(name, email))"
                ).eq("school_id", school_id).execute()
                campuses = campuses_result.data or []
            else:
                # Principal assigned to campus - show only their campus
                campus_result = supabase.table("campuses").select(
                    "*, incharge:users(name, email), principal:principals(user:users(name, email))"
                ).eq("principal_id", principal["id"]).maybe_single().execute()
                campuses = [campus_result.data] if campus_result.data else []
            
            return [{**school_result.data, "campuses": campuses}]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting schools: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get schools: {str(e)}"
        )


class CreateSchoolRequest(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    type: Optional[str] = None
    principalEmail: str
    campuses: Optional[List[dict]] = None


@router.post("/schools")
async def create_school(
    request: CreateSchoolRequest,
    user: CurrentUser = Depends(require_admin)
):
    """Create a new school (admin only)"""
    try:
        supabase = get_supabase()
        
        # Find principal user
        principal_user_result = supabase.table("users").select("id").eq(
            "email", request.principalEmail
        ).maybe_single().execute()
        
        if not principal_user_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Principal user not found. Please create the user first."
            )
        
        # Check if principal already has a school
        existing_principal_result = supabase.table("principals").select(
            "id, school_id"
        ).eq("user_id", principal_user_result.data["id"]).maybe_single().execute()
        
        if existing_principal_result.data and existing_principal_result.data.get("school_id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Principal is already assigned to another school"
            )
        
        principal_id = existing_principal_result.data["id"] if existing_principal_result.data else None
        
        # Create principal if doesn't exist
        if not principal_id:
            new_principal = supabase.table("principals").insert({
                "user_id": principal_user_result.data["id"],
                "employee_id": f"EMP-{secrets.token_hex(8)}",
                "qualification": "Principal",
                "experience": 0,
                "school_id": None
            }).select().single().execute()
            
            if not new_principal.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create principal"
                )
            principal_id = new_principal.data["id"]
        
        # Create school
        school = supabase.table("schools").insert({
            "name": request.name,
            "code": request.code,
            "address": request.address,
            "city": request.city,
            "province": request.province,
            "type": request.type,
            "principal_id": principal_id
        }).select().single().execute()
        
        if not school.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create school"
            )
        
        # Update principal with school
        supabase.table("principals").update({
            "school_id": school.data["id"]
        }).eq("id", principal_id).execute()
        
        # Create campuses
        if request.campuses:
            for campus in request.campuses:
                supabase.table("campuses").insert({
                    "name": campus.get("name"),
                    "school_id": school.data["id"],
                    "address": campus.get("address") or request.address,
                    "incharge_id": None,
                    "principal_id": None
                }).execute()
        
        # Get school with populated data
        school_with_data = supabase.table("schools").select(
            "*, principal:principals(user:users(name, email))"
        ).eq("id", school.data["id"]).single().execute()
        
        campuses_result = supabase.table("campuses").select("*").eq(
            "school_id", school.data["id"]
        ).execute()
        
        return {**school_with_data.data, "campuses": campuses_result.data or []}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating school: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create school: {str(e)}"
        )


# ============ Teachers ============

@router.get("/teachers")
async def get_teachers(user: CurrentUser = Depends(require_admin_or_principal)):
    """Get teachers"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("teachers").select(
            "*, user:users(name, email, phone), school:schools(name, code)"
        )
        
        # Filter by school if principal
        if user.role == "principal":
            principal_result = supabase.table("principals").select(
                "id, school_id"
            ).eq("user_id", user.id).maybe_single().execute()
            
            if principal_result.data:
                principal = principal_result.data
                school_id = principal["school_id"]
                
                if not school_id:
                    campus_result = supabase.table("campuses").select(
                        "school_id"
                    ).eq("principal_id", principal["id"]).maybe_single().execute()
                    
                    if campus_result.data:
                        school_id = campus_result.data["school_id"]
                
                if school_id:
                    query = query.eq("school_id", school_id)
                else:
                    return []
        
        result = query.execute()
        teachers = result.data or []
        
        # Get assigned subjects for each teacher
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


class AssignSubjectRequest(BaseModel):
    teacherId: str
    classId: str
    subjectName: str
    subjectCode: str


@router.post("/teachers")
async def assign_subject(
    request: AssignSubjectRequest,
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Assign subject to teacher"""
    try:
        supabase = get_supabase()
        
        # Get teacher
        teacher_result = supabase.table("teachers").select(
            "id, user_id"
        ).eq("id", request.teacherId).maybe_single().execute()
        
        if not teacher_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found"
            )
        
        teacher = teacher_result.data
        
        # Verify class exists
        class_result = supabase.table("classes").select("id").eq(
            "id", request.classId
        ).maybe_single().execute()
        
        if not class_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found"
            )
        
        # Check if subject exists
        existing_subject_result = supabase.table("subjects").select("id").eq(
            "code", request.subjectCode
        ).eq("class_id", request.classId).maybe_single().execute()
        
        if existing_subject_result.data:
            # Update existing
            subject = supabase.table("subjects").update({
                "teacher_id": teacher["user_id"]
            }).eq("id", existing_subject_result.data["id"]).select().single().execute()
            subject_id = subject.data["id"]
        else:
            # Create new
            new_subject = supabase.table("subjects").insert({
                "name": request.subjectName,
                "code": request.subjectCode,
                "class_id": request.classId,
                "teacher_id": teacher["user_id"]
            }).select().single().execute()
            
            if not new_subject.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create subject"
                )
            subject_id = new_subject.data["id"]
        
        # Add to teacher_subjects junction table
        existing_relation = supabase.table("teacher_subjects").select("*").eq(
            "teacher_id", teacher["id"]
        ).eq("subject_id", subject_id).maybe_single().execute()
        
        if not existing_relation.data:
            supabase.table("teacher_subjects").insert({
                "teacher_id": teacher["id"],
                "subject_id": subject_id
            }).execute()
        
        # Get subject with details
        subject_with_details = supabase.table("subjects").select(
            "*, class:classes(name, level), teacher:teachers(user:users(name, email))"
        ).eq("id", subject_id).single().execute()
        
        return subject_with_details.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning subject: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign subject: {str(e)}"
        )


class UpdateSubjectTeacherRequest(BaseModel):
    subjectId: str
    teacherId: str


@router.put("/teachers")
async def update_subject_teacher(
    request: UpdateSubjectTeacherRequest,
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Update subject teacher assignment"""
    try:
        supabase = get_supabase()
        
        # Get teacher
        teacher_result = supabase.table("teachers").select(
            "id, user_id"
        ).eq("id", request.teacherId).maybe_single().execute()
        
        if not teacher_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found"
            )
        
        # Update subject
        subject = supabase.table("subjects").update({
            "teacher_id": teacher_result.data["user_id"]
        }).eq("id", request.subjectId).select(
            "*, class:classes(name, level), teacher:teachers(user:users(name, email))"
        ).single().execute()
        
        if not subject.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found"
            )
        
        # Add to teacher_subjects junction table
        existing_relation = supabase.table("teacher_subjects").select("*").eq(
            "teacher_id", request.teacherId
        ).eq("subject_id", request.subjectId).maybe_single().execute()
        
        if not existing_relation.data:
            supabase.table("teacher_subjects").insert({
                "teacher_id": request.teacherId,
                "subject_id": request.subjectId
            }).execute()
        
        return subject.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating subject teacher: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update subject teacher: {str(e)}"
        )


# ============ Classes ============

@router.get("/classes")
async def get_classes(
    campusId: Optional[str] = Query(None),
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Get classes"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("classes").select(
            "*, campus:campuses(name, school_id), class_incharge:users(name, email)"
        )
        
        if campusId:
            query = query.eq("campus_id", campusId)
        
        # Filter by principal's campus
        if user.role == "principal":
            principal_result = supabase.table("principals").select(
                "id, school_id"
            ).eq("user_id", user.id).maybe_single().execute()
            
            if principal_result.data:
                principal = principal_result.data
                campus_result = supabase.table("campuses").select(
                    "id"
                ).eq("principal_id", principal["id"]).maybe_single().execute()
                
                if campus_result.data:
                    query = query.eq("campus_id", campus_result.data["id"])
                elif principal["school_id"]:
                    # Get all campuses of school
                    school_campuses = supabase.table("campuses").select(
                        "id"
                    ).eq("school_id", principal["school_id"]).execute()
                    
                    if school_campuses.data:
                        campus_ids = [c["id"] for c in school_campuses.data]
                        query = query.in_("campus_id", campus_ids)
                    else:
                        return []
                else:
                    return []
        
        result = query.execute()
        classes = result.data or []
        
        # Get sections for each class
        classes_with_sections = []
        for cls in classes:
            sections_result = supabase.table("sections").select("*").eq(
                "class_id", cls["id"]
            ).execute()
            
            classes_with_sections.append({
                **cls,
                "sections": sections_result.data or []
            })
        
        return classes_with_sections
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting classes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get classes: {str(e)}"
        )


class CreateClassRequest(BaseModel):
    name: str
    level: int
    campusId: str
    classInchargeId: Optional[str] = None
    sections: Optional[List[dict]] = None


@router.post("/classes")
async def create_class(
    request: CreateClassRequest,
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Create a new class"""
    try:
        supabase = get_supabase()
        
        # Verify campus if principal
        if user.role == "principal":
            principal_result = supabase.table("principals").select(
                "id, school_id"
            ).eq("user_id", user.id).maybe_single().execute()
            
            if principal_result.data:
                principal = principal_result.data
                principal_campus = supabase.table("campuses").select(
                    "id"
                ).eq("principal_id", principal["id"]).maybe_single().execute()
                
                if principal_campus.data:
                    if str(principal_campus.data["id"]) != str(request.campusId):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Unauthorized. You can only create classes in your campus."
                        )
                elif principal["school_id"]:
                    # Verify campus belongs to school
                    campus_result = supabase.table("campuses").select(
                        "school_id"
                    ).eq("id", request.campusId).maybe_single().execute()
                    
                    if not campus_result.data or campus_result.data["school_id"] != principal["school_id"]:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Unauthorized. You can only create classes in campuses of your school."
                        )
        
        # Convert teacher id to user_id
        class_incharge_user_id = None
        if request.classInchargeId:
            teacher_result = supabase.table("teachers").select(
                "user_id"
            ).eq("id", request.classInchargeId).maybe_single().execute()
            
            if not teacher_result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Teacher not found"
                )
            class_incharge_user_id = teacher_result.data["user_id"]
        
        # Create class
        class_doc = supabase.table("classes").insert({
            "name": request.name,
            "level": request.level,
            "campus_id": request.campusId,
            "class_incharge_id": class_incharge_user_id
        }).select().single().execute()
        
        if not class_doc.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create class"
            )
        
        # Create sections
        if request.sections:
            for section in request.sections:
                supabase.table("sections").insert({
                    "name": section.get("name"),
                    "class_id": class_doc.data["id"],
                    "capacity": section.get("capacity", 40),
                    "current_strength": 0
                }).execute()
        
        # Get class with populated data
        class_with_data = supabase.table("classes").select(
            "*, campus:campuses(name, school_id), class_incharge:users(name, email)"
        ).eq("id", class_doc.data["id"]).single().execute()
        
        sections_result = supabase.table("sections").select("*").eq(
            "class_id", class_doc.data["id"]
        ).execute()
        
        return {**class_with_data.data, "sections": sections_result.data or []}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating class: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create class: {str(e)}"
        )


class UpdateClassRequest(BaseModel):
    id: str
    name: Optional[str] = None
    level: Optional[int] = None
    classInchargeId: Optional[str] = None


@router.put("/classes")
async def update_class(
    request: UpdateClassRequest,
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Update a class"""
    try:
        supabase = get_supabase()
        
        # Verify class exists
        existing_class = supabase.table("classes").select(
            "id, campus_id"
        ).eq("id", request.id).maybe_single().execute()
        
        if not existing_class.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found"
            )
        
        # Verify campus if principal
        if user.role == "principal":
            principal_result = supabase.table("principals").select("id").eq(
                "user_id", user.id
            ).maybe_single().execute()
            
            if principal_result.data:
                principal_campus = supabase.table("campuses").select(
                    "id"
                ).eq("principal_id", principal_result.data["id"]).maybe_single().execute()
                
                if principal_campus.data:
                    if existing_class.data["campus_id"] != principal_campus.data["id"]:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Unauthorized. You can only edit classes in your campus."
                        )
        
        # Convert teacher id to user_id
        class_incharge_user_id = None
        if request.classInchargeId:
            teacher_result = supabase.table("teachers").select(
                "user_id"
            ).eq("id", request.classInchargeId).maybe_single().execute()
            
            if not teacher_result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Teacher not found"
                )
            class_incharge_user_id = teacher_result.data["user_id"]
        
        # Build update data
        update_data = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.level is not None:
            update_data["level"] = request.level
        if request.classInchargeId is not None:
            update_data["class_incharge_id"] = class_incharge_user_id
        
        # Update class
        class_doc = supabase.table("classes").update(update_data).eq(
            "id", request.id
        ).select(
            "*, campus:campuses(name, school_id), class_incharge:users(name, email)"
        ).single().execute()
        
        if not class_doc.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found"
            )
        
        return class_doc.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating class: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update class: {str(e)}"
        )


@router.delete("/classes")
async def delete_class(
    id: str = Query(...),
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Delete a class"""
    try:
        supabase = get_supabase()
        
        # Delete sections first
        supabase.table("sections").delete().eq("class_id", id).execute()
        
        # Delete class
        supabase.table("classes").delete().eq("id", id).execute()
        
        return {"success": True}
    
    except Exception as e:
        logger.error(f"Error deleting class: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete class: {str(e)}"
        )


# ============ Timetable ============

@router.get("/timetable")
async def get_timetable(user: CurrentUser = Depends(require_admin)):
    """Get timetable"""
    try:
        supabase = get_supabase()
        
        # Get first school
        schools_result = supabase.table("schools").select("id").limit(1).execute()
        
        if not schools_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No schools found"
            )
        
        school_id = schools_result.data[0]["id"]
        
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


class CreateTimetableRequest(BaseModel):
    junior: Optional[dict] = None
    senior: Optional[dict] = None


@router.post("/timetable")
async def create_timetable(
    request: CreateTimetableRequest,
    user: CurrentUser = Depends(require_admin)
):
    """Create/Update timetable"""
    try:
        supabase = get_supabase()
        
        # Get first school
        schools_result = supabase.table("schools").select("id").limit(1).execute()
        
        if not schools_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No schools found"
            )
        
        school_id = schools_result.data[0]["id"]
        
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


# ============ Principals ============

@router.get("/principals")
async def get_principals(user: CurrentUser = Depends(require_admin)):
    """Get all principals for admin's school"""
    try:
        supabase = get_supabase()
        
        # Get admin's school by domain
        email_parts = user.email.split("@")
        if len(email_parts) != 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid admin email format"
            )
        
        domain = email_parts[1].lower()
        
        school_result = supabase.table("schools").select("id").eq(
            "domain", domain
        ).maybe_single().execute()
        
        if not school_result.data:
            return []
        
        school_id = school_result.data["id"]
        
        # Get school principals
        school_principals_result = supabase.table("principals").select("*").eq(
            "school_id", school_id
        ).execute()
        
        # Get campus principals
        campuses_result = supabase.table("campuses").select(
            "principal_id"
        ).eq("school_id", school_id).execute()
        
        campus_principal_ids = [
            c["principal_id"] for c in (campuses_result.data or [])
            if c.get("principal_id")
        ]
        
        all_principal_ids = [p["id"] for p in (school_principals_result.data or [])]
        if campus_principal_ids:
            campus_principals_result = supabase.table("principals").select("*").in_(
                "id", campus_principal_ids
            ).execute()
            all_principal_ids.extend([p["id"] for p in (campus_principals_result.data or [])])
        
        # Get all principals with user data
        principals_result = supabase.table("principals").select(
            "*, user:users(name, email, phone), school:schools(name)"
        ).in_("id", all_principal_ids).execute()
        
        principals = principals_result.data or []
        
        # Add campus info
        principals_with_campus = []
        for principal in principals:
            campus_result = supabase.table("campuses").select("name").eq(
                "principal_id", principal["id"]
            ).maybe_single().execute()
            
            principals_with_campus.append({
                **principal,
                "campus": campus_result.data if campus_result.data else None
            })
        
        return principals_with_campus
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting principals: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get principals: {str(e)}"
        )


class CreatePrincipalRequest(BaseModel):
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None


@router.post("/principals")
async def create_principal(
    request: CreatePrincipalRequest,
    user: CurrentUser = Depends(require_admin)
):
    """Create a new principal"""
    try:
        if not request.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        supabase = get_supabase()
        
        # Get admin's school
        email_parts = user.email.split("@")
        if len(email_parts) != 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid admin email format"
            )
        
        domain = email_parts[1].lower()
        
        school_result = supabase.table("schools").select("id").eq(
            "domain", domain
        ).maybe_single().execute()
        
        if not school_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found"
            )
        
        school_id = school_result.data["id"]
        
        # Check if user exists
        existing_user_result = supabase.table("users").select("id").eq(
            "email", request.email.lower()
        ).maybe_single().execute()
        
        principal_user_id = existing_user_result.data["id"] if existing_user_result.data else None
        
        if existing_user_result.data:
            # Check if principal already exists
            existing_principal_result = supabase.table("principals").select(
                "id, school_id"
            ).eq("user_id", principal_user_id).maybe_single().execute()
            
            if existing_principal_result.data:
                # Check if assigned to campus
                campus_result = supabase.table("campuses").select("id").eq(
                    "principal_id", existing_principal_result.data["id"]
                ).maybe_single().execute()
                
                if campus_result.data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This principal is already assigned to a campus"
                    )
                
                if existing_principal_result.data["school_id"] == school_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This principal is already assigned to your school"
                    )
            
            # Create principal record
            new_principal = supabase.table("principals").insert({
                "user_id": principal_user_id,
                "employee_id": f"EMP-{secrets.token_hex(8)}",
                "qualification": "Principal",
                "experience": 0,
                "school_id": school_id
            }).select().single().execute()
            
            principal_id = new_principal.data["id"]
        else:
            # Create new user and principal
            email_name = request.name or request.email.split("@")[0]
            temp_password = secrets.token_urlsafe(16)
            hashed_password = pwd_context.hash(temp_password)
            
            new_user = supabase.table("users").insert({
                "email": request.email.lower(),
                "password": hashed_password,
                "role": "principal",
                "name": email_name.capitalize(),
                "phone": request.phone,
                "is_active": True
            }).select().single().execute()
            
            if not new_user.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user"
                )
            
            new_principal = supabase.table("principals").insert({
                "user_id": new_user.data["id"],
                "employee_id": f"EMP-{secrets.token_hex(8)}",
                "qualification": "Principal",
                "experience": 0,
                "school_id": school_id
            }).select().single().execute()
            
            if not new_principal.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create principal"
                )
            
            principal_id = new_principal.data["id"]
            # TODO: Send invite email
        
        # Get principal with populated data
        principal_with_data = supabase.table("principals").select(
            "*, user:users(name, email, phone), school:schools(name)"
        ).eq("id", principal_id).single().execute()
        
        return principal_with_data.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating principal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create principal: {str(e)}"
        )


class UpdatePrincipalRequest(BaseModel):
    id: str
    name: Optional[str] = None
    phone: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[int] = None


@router.put("/principals")
async def update_principal(
    request: UpdatePrincipalRequest,
    user: CurrentUser = Depends(require_admin)
):
    """Update a principal"""
    try:
        supabase = get_supabase()
        
        # Get admin's school
        email_parts = user.email.split("@")
        if len(email_parts) != 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid admin email format"
            )
        
        domain = email_parts[1].lower()
        
        school_result = supabase.table("schools").select("id").eq(
            "domain", domain
        ).maybe_single().execute()
        
        if not school_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found"
            )
        
        # Verify principal belongs to school
        principal_result = supabase.table("principals").select(
            "id, school_id, user_id"
        ).eq("id", request.id).maybe_single().execute()
        
        if not principal_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Principal not found"
            )
        
        principal = principal_result.data
        
        # Check if belongs to school or campus
        is_school_principal = principal["school_id"] == school_result.data["id"]
        campus_result = supabase.table("campuses").select("id").eq(
            "principal_id", principal["id"]
        ).eq("school_id", school_result.data["id"]).maybe_single().execute()
        
        is_campus_principal = bool(campus_result.data)
        
        if not is_school_principal and not is_campus_principal:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to edit this principal"
            )
        
        # Update principal fields
        update_data = {}
        if request.qualification is not None:
            update_data["qualification"] = request.qualification
        if request.experience is not None:
            update_data["experience"] = request.experience
        
        if update_data:
            supabase.table("principals").update(update_data).eq("id", request.id).execute()
        
        # Update user fields
        user_update_data = {}
        if request.name is not None:
            user_update_data["name"] = request.name
        if request.phone is not None:
            user_update_data["phone"] = request.phone
        
        if user_update_data:
            supabase.table("users").update(user_update_data).eq(
                "id", principal["user_id"]
            ).execute()
        
        # Get updated principal
        updated_principal = supabase.table("principals").select(
            "*, user:users(name, email, phone), school:schools(name)"
        ).eq("id", request.id).single().execute()
        
        # Get campus info
        campus_result = supabase.table("campuses").select("name").eq(
            "principal_id", principal["id"]
        ).maybe_single().execute()
        
        return {
            **updated_principal.data,
            "campus": campus_result.data if campus_result.data else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating principal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update principal: {str(e)}"
        )


@router.delete("/principals")
async def delete_principal(
    id: str = Query(...),
    user: CurrentUser = Depends(require_admin)
):
    """Delete a principal"""
    try:
        supabase = get_supabase()
        
        # Get admin's school
        email_parts = user.email.split("@")
        if len(email_parts) != 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid admin email format"
            )
        
        domain = email_parts[1].lower()
        
        school_result = supabase.table("schools").select("id").eq(
            "domain", domain
        ).maybe_single().execute()
        
        if not school_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found"
            )
        
        # Verify principal belongs to school
        principal_result = supabase.table("principals").select(
            "id, school_id"
        ).eq("id", id).maybe_single().execute()
        
        if not principal_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Principal not found"
            )
        
        # Check if assigned to campus
        campus_result = supabase.table("campuses").select("id").eq(
            "principal_id", principal_result.data["id"]
        ).maybe_single().execute()
        
        if campus_result.data:
            # Remove assignment
            supabase.table("campuses").update({
                "principal_id": None
            }).eq("id", campus_result.data["id"]).execute()
        
        # Delete principal (keep user)
        supabase.table("principals").delete().eq("id", id).execute()
        
        return {"success": True}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting principal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete principal: {str(e)}"
        )


# ============ Sections ============

class CreateSectionRequest(BaseModel):
    name: str
    classId: str
    capacity: Optional[int] = 40


@router.post("/sections")
async def create_section(
    request: CreateSectionRequest,
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Create a new section"""
    try:
        supabase = get_supabase()
        
        section = supabase.table("sections").insert({
            "name": request.name,
            "class_id": request.classId,
            "capacity": request.capacity or 40,
            "current_strength": 0
        }).select("*, class:classes(name, level)").single().execute()
        
        return section.data
    
    except Exception as e:
        logger.error(f"Error creating section: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create section: {str(e)}"
        )


class UpdateSectionRequest(BaseModel):
    id: str
    name: Optional[str] = None
    capacity: Optional[int] = None


@router.put("/sections")
async def update_section(
    request: UpdateSectionRequest,
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Update a section"""
    try:
        supabase = get_supabase()
        
        update_data = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.capacity is not None:
            update_data["capacity"] = request.capacity
        
        section = supabase.table("sections").update(update_data).eq(
            "id", request.id
        ).select("*, class:classes(name, level)").single().execute()
        
        if not section.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Section not found"
            )
        
        return section.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating section: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update section: {str(e)}"
        )


@router.delete("/sections")
async def delete_section(
    id: str = Query(...),
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Delete a section"""
    try:
        supabase = get_supabase()
        
        supabase.table("sections").delete().eq("id", id).execute()
        
        return {"success": True}
    
    except Exception as e:
        logger.error(f"Error deleting section: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete section: {str(e)}"
        )


# ============ Campuses ============

@router.get("/campuses")
async def get_campuses(
    schoolId: Optional[str] = Query(None),
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Get campuses"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("campuses").select(
            "*, school:schools(name, code), incharge:users(name, email), principal:principals(user:users(name, email))"
        )
        
        if schoolId:
            query = query.eq("school_id", schoolId)
        
        # Filter by principal's campus
        if user.role == "principal":
            principal_result = supabase.table("principals").select("id").eq(
                "user_id", user.id
            ).maybe_single().execute()
            
            if principal_result.data:
                campus_result = supabase.table("campuses").select("id").eq(
                    "principal_id", principal_result.data["id"]
                ).maybe_single().execute()
                
                if campus_result.data:
                    query = query.eq("id", campus_result.data["id"])
                else:
                    return []
        
        result = query.execute()
        return result.data or []
    
    except Exception as e:
        logger.error(f"Error getting campuses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get campuses: {str(e)}"
        )


class CreateCampusRequest(BaseModel):
    name: str
    schoolId: str
    address: Optional[str] = None
    inchargeId: Optional[str] = None
    principalEmail: str


@router.post("/campuses")
async def create_campus(
    request: CreateCampusRequest,
    user: CurrentUser = Depends(require_admin)
):
    """Create a new campus"""
    try:
        supabase = get_supabase()
        
        # Check if principal user exists
        existing_user_result = supabase.table("users").select("id").eq(
            "email", request.principalEmail.lower()
        ).maybe_single().execute()
        
        principal_user_id = existing_user_result.data["id"] if existing_user_result.data else None
        principal_id = None
        
        if existing_user_result.data:
            # Check if principal exists
            existing_principal_result = supabase.table("principals").select("id").eq(
                "user_id", principal_user_id
            ).maybe_single().execute()
            
            if existing_principal_result.data:
                # Check if already assigned to campus
                campus_result = supabase.table("campuses").select("id").eq(
                    "principal_id", existing_principal_result.data["id"]
                ).maybe_single().execute()
                
                if campus_result.data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This principal is already assigned to another campus"
                    )
                
                principal_id = existing_principal_result.data["id"]
            else:
                # Create principal record
                new_principal = supabase.table("principals").insert({
                    "user_id": principal_user_id,
                    "employee_id": f"EMP-{secrets.token_hex(8)}",
                    "qualification": "Principal",
                    "experience": 0,
                    "school_id": None
                }).select().single().execute()
                
                principal_id = new_principal.data["id"]
        else:
            # Create new user and principal
            email_name = request.principalEmail.split("@")[0]
            temp_password = secrets.token_urlsafe(16)
            hashed_password = pwd_context.hash(temp_password)
            
            new_user = supabase.table("users").insert({
                "email": request.principalEmail.lower(),
                "password": hashed_password,
                "role": "principal",
                "name": email_name.capitalize(),
                "is_active": True
            }).select().single().execute()
            
            if not new_user.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user"
                )
            
            new_principal = supabase.table("principals").insert({
                "user_id": new_user.data["id"],
                "employee_id": f"EMP-{secrets.token_hex(8)}",
                "qualification": "Principal",
                "experience": 0,
                "school_id": None
            }).select().single().execute()
            
            if not new_principal.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create principal"
                )
            
            principal_id = new_principal.data["id"]
            # TODO: Send invite email
        
        # Create campus
        campus = supabase.table("campuses").insert({
            "name": request.name,
            "school_id": request.schoolId,
            "address": request.address or "",
            "incharge_id": request.inchargeId,
            "principal_id": principal_id
        }).select(
            "*, school:schools(name, code), incharge:users(name, email), principal:principals(user:users(name, email))"
        ).single().execute()
        
        return campus.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating campus: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create campus: {str(e)}"
        )


class UpdateCampusRequest(BaseModel):
    id: str
    name: Optional[str] = None
    address: Optional[str] = None
    inchargeId: Optional[str] = None


@router.put("/campuses")
async def update_campus(
    request: UpdateCampusRequest,
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Update a campus"""
    try:
        supabase = get_supabase()
        
        update_data = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.address is not None:
            update_data["address"] = request.address
        if request.inchargeId is not None:
            update_data["incharge_id"] = request.inchargeId
        
        campus = supabase.table("campuses").update(update_data).eq(
            "id", request.id
        ).select(
            "*, school:schools(name, code), incharge:users(name, email), principal:principals(user:users(name, email))"
        ).single().execute()
        
        if not campus.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campus not found"
            )
        
        return campus.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating campus: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update campus: {str(e)}"
        )


@router.delete("/campuses")
async def delete_campus(
    id: str = Query(...),
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Delete a campus"""
    try:
        supabase = get_supabase()
        
        supabase.table("campuses").delete().eq("id", id).execute()
        
        return {"success": True}
    
    except Exception as e:
        logger.error(f"Error deleting campus: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete campus: {str(e)}"
        )


# ============ Analytics ============

@router.get("/analytics")
async def get_analytics(user: CurrentUser = Depends(require_admin_or_principal)):
    """Get analytics data"""
    try:
        supabase = get_supabase()
        
        # Get counts
        schools_count = supabase.table("schools").select("*", count="exact").execute()
        campuses_count = supabase.table("campuses").select("*", count="exact").execute()
        classes_count = supabase.table("classes").select("*", count="exact").execute()
        sections_count = supabase.table("sections").select("*", count="exact").execute()
        students_count = supabase.table("students").select("*", count="exact").execute()
        teachers_count = supabase.table("teachers").select("*", count="exact").execute()
        
        # Get average grades
        grades_result = supabase.table("grades").select("percentage").execute()
        grades = grades_result.data or []
        average_grade = (
            sum(float(g.get("percentage", 0)) for g in grades) / len(grades)
            if grades else 0
        )
        
        # Get attendance stats
        attendance_result = supabase.table("attendance").select("status").execute()
        attendance_records = attendance_result.data or []
        total_attendance = len(attendance_records)
        present_count = len([a for a in attendance_records if a.get("status") == "present"])
        attendance_rate = (present_count / total_attendance * 100) if total_attendance > 0 else 0
        
        # Get class-wise statistics
        classes_result = supabase.table("classes").select(
            "id, name, level, campus:campuses(name)"
        ).execute()
        
        classes = classes_result.data or []
        class_stats = []
        
        for cls in classes:
            sections_result = supabase.table("sections").select("id").eq(
                "class_id", cls["id"]
            ).execute()
            
            students_result = supabase.table("students").select("id").eq(
                "class_id", cls["id"]
            ).execute()
            
            student_ids = [s["id"] for s in (students_result.data or [])]
            
            class_grades = []
            if student_ids:
                grades_result = supabase.table("grades").select("percentage").in_(
                    "student_id", student_ids
                ).execute()
                class_grades = grades_result.data or []
            
            avg_grade = (
                sum(float(g.get("percentage", 0)) for g in class_grades) / len(class_grades)
                if class_grades else 0
            )
            
            class_stats.append({
                "className": cls["name"],
                "level": cls["level"],
                "sections": len(sections_result.data or []),
                "students": len(students_result.data or []),
                "averageGrade": f"{avg_grade:.2f}"
            })
        
        return {
            "overview": {
                "totalSchools": schools_count.count or 0,
                "totalCampuses": campuses_count.count or 0,
                "totalClasses": classes_count.count or 0,
                "totalSections": sections_count.count or 0,
                "totalStudents": students_count.count or 0,
                "totalTeachers": teachers_count.count or 0,
                "averageGrade": f"{average_grade:.2f}",
                "attendanceRate": f"{attendance_rate:.2f}"
            },
            "classStats": class_stats
        }
    
    except Exception as e:
        logger.error(f"Error getting analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get analytics: {str(e)}"
        )


# ============ Insights ============

@router.get("/insights")
async def get_insights(
    type: Optional[str] = Query(None),
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Get AI insights"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("ai_insights").select(
            "*, school:schools(name, code), class:classes(name, level), student:students(user:users(name, email)), teacher:teachers(user:users(name, email))"
        ).order("created_at", desc=True).limit(100)
        
        if type:
            query = query.eq("type", type)
        
        result = query.execute()
        return result.data or []
    
    except Exception as e:
        logger.error(f"Error getting insights: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get insights: {str(e)}"
        )


class GenerateInsightsRequest(BaseModel):
    type: Optional[str] = None


@router.post("/insights")
async def generate_insights(
    request: GenerateInsightsRequest,
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Generate AI insights"""
    try:
        from app.services.ai_service import generate_teacher_insights
        
        supabase = get_supabase()
        
        insights = []
        
        if request.type == "weak_students" or not request.type:
            # Generate weak students insights
            students_result = supabase.table("students").select(
                "id, user:users(name, email), class:classes(name)"
            ).execute()
            
            students = students_result.data or []
            students_with_data = []
            
            for student in students:
                grades_result = supabase.table("grades").select(
                    "marks, total_marks, percentage, subject_id"
                ).eq("student_id", student["id"]).execute()
                
                grades = grades_result.data or []
                total_marks = sum(float(g.get("marks", 0)) for g in grades)
                total_possible = sum(float(g.get("total_marks", 0)) for g in grades)
                average_grade = (total_marks / total_possible * 100) if total_possible > 0 else 0
                
                # Group by subject
                subject_grades = {}
                for g in grades:
                    subject_id = g.get("subject_id", "unknown")
                    if subject_id not in subject_grades:
                        subject_grades[subject_id] = []
                    subject_grades[subject_id].append(float(g.get("percentage", 0)))
                
                subjects = [
                    {"name": "Subject", "grade": sum(percentages) / len(percentages)}
                    for percentages in subject_grades.values()
                ]
                
                students_with_data.append({
                    "name": student.get("user", {}).get("name", "Unknown"),
                    "averageGrade": average_grade,
                    "attendance": 85,  # Placeholder
                    "subjects": subjects
                })
            
            # TODO: Call detectWeakStudents from AI service
            # For now, just return empty
            insights = []
        
        if request.type == "teacher" or not request.type:
            # Generate teacher insights
            teachers_result = supabase.table("teachers").select(
                "id, user:users(name, email)"
            ).execute()
            
            teachers = teachers_result.data or []
            
            for teacher in teachers:
                grades_result = supabase.table("grades").select("percentage").eq(
                    "teacher_id", teacher.get("user_id", "")
                ).execute()
                
                grades = grades_result.data or []
                avg_grade = (
                    sum(float(g.get("percentage", 0)) for g in grades) / len(grades)
                    if grades else 0
                )
                
                insight = await generate_teacher_insights({
                    "subject": "General",
                    "classAverage": avg_grade,
                    "studentCount": len(grades),
                    "weakStudents": len([g for g in grades if float(g.get("percentage", 0)) < 50]),
                    "attendanceRate": 85
                })
                
                supabase.table("ai_insights").insert({
                    "type": "weak_teacher",
                    "teacher_id": teacher["id"],
                    "title": f"Insights for {teacher.get('user', {}).get('name', 'Unknown')}",
                    "description": insight.get("analysis", ""),
                    "severity": "high" if avg_grade < 50 else "medium" if avg_grade < 70 else "low",
                    "recommendations": insight.get("recommendations", []),
                    "data": insight
                }).execute()
        
        # Get all insights
        all_insights_result = supabase.table("ai_insights").select(
            "*, school:schools(name, code), class:classes(name, level), student:students(user:users(name, email)), teacher:teachers(user:users(name, email))"
        ).order("created_at", desc=True).limit(100).execute()
        
        return all_insights_result.data or []
    
    except Exception as e:
        logger.error(f"Error generating insights: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate insights: {str(e)}"
        )


# ============ Warnings ============

@router.get("/warnings")
async def get_warnings(user: CurrentUser = Depends(require_admin_or_principal)):
    """Get early warnings for at-risk students"""
    try:
        supabase = get_supabase()
        
        # Get all students with grades and attendance
        students_result = supabase.table("students").select(
            "id, roll_number, user:users(name, email), class:classes(name, level), section:sections(name)"
        ).execute()
        
        students = students_result.data or []
        students_with_data = []
        
        for student in students:
            grades_result = supabase.table("grades").select(
                "marks, total_marks, percentage"
            ).eq("student_id", student["id"]).execute()
            
            attendance_result = supabase.table("attendance").select("status").eq(
                "student_id", student["id"]
            ).execute()
            
            grades = grades_result.data or []
            attendance = attendance_result.data or []
            
            total_marks = sum(float(g.get("marks", 0)) for g in grades)
            total_possible = sum(float(g.get("total_marks", 0)) for g in grades)
            average_grade = (total_marks / total_possible * 100) if total_possible > 0 else 0
            
            present_count = len([a for a in attendance if a.get("status") == "present"])
            attendance_percentage = (
                (present_count / len(attendance) * 100) if attendance else 0
            )
            
            # Get subject-wise grades
            subject_grades = {}
            for g in grades:
                subject_id = g.get("subject_id", "unknown")
                if subject_id not in subject_grades:
                    subject_grades[subject_id] = {"total": 0, "count": 0}
                subject_grades[subject_id]["total"] += float(g.get("percentage", 0))
                subject_grades[subject_id]["count"] += 1
            
            subjects = [
                {"subjectId": subject_id, "grade": f"{(data['total'] / data['count']):.2f}"}
                for subject_id, data in subject_grades.items()
            ]
            
            students_with_data.append({
                "_id": student["id"],
                "name": student.get("user", {}).get("name", "Unknown"),
                "email": student.get("user", {}).get("email", ""),
                "className": student.get("class", {}).get("name", ""),
                "section": student.get("section", {}).get("name", ""),
                "averageGrade": f"{average_grade:.2f}",
                "attendancePercentage": f"{attendance_percentage:.2f}",
                "subjects": subjects
            })
        
        # Filter at-risk students
        at_risk_students = [
            s for s in students_with_data
            if float(s["averageGrade"]) < 50 or float(s["attendancePercentage"]) < 75
        ]
        
        # Get AI insights
        ai_insights_result = supabase.table("ai_insights").select(
            "*, student:students(user:users(name, email))"
        ).eq("type", "early_warning").order("created_at", desc=True).limit(50).execute()
        
        return {
            "atRiskStudents": at_risk_students,
            "aiInsights": ai_insights_result.data or [],
            "totalAtRisk": len(at_risk_students)
        }
    
    except Exception as e:
        logger.error(f"Error getting warnings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get warnings: {str(e)}"
        )


# ============ User Search ============

@router.get("/users/search")
async def search_users(
    email: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Search users"""
    try:
        if not email or len(email) < 2:
            return {"users": []}
        
        supabase = get_supabase()
        
        query = supabase.table("users").select(
            "email, name, role, phone"
        ).ilike("email", f"%{email}%").eq("is_active", True).limit(10)
        
        if role:
            query = query.eq("role", role)
        
        result = query.execute()
        return {"users": result.data or []}
    
    except Exception as e:
        logger.error(f"Error searching users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search users: {str(e)}"
        )


# ============ Teacher Attendance ============

@router.get("/teacher-attendance")
async def get_teacher_attendance(
    date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: CurrentUser = Depends(require_admin)
):
    """Get teacher attendance"""
    try:
        if not date:
            from datetime import date as date_obj
            date = date_obj.today().isoformat()
        
        supabase = get_supabase()
        
        # Get all teachers
        teachers_result = supabase.table("teachers").select(
            "id, user_id, employee_id, school_id"
        ).execute()
        
        if not teachers_result.data:
            return {"attendance": []}
        
        teacher_ids = [t["id"] for t in teachers_result.data]
        
        # Get attendance
        query = supabase.table("teacher_attendance").select(
            "*, teacher:teachers(id, employee_id, user:users(name, email))"
        ).in_("teacher_id", teacher_ids).eq("date", date)
        
        if status and status != "all":
            query = query.eq("status", status)
        
        result = query.order("check_in_time", desc=False).execute()
        
        attendance = result.data or []
        formatted = [
            {
                "id": a["id"],
                "teacher_id": a["teacher_id"],
                "date": a["date"],
                "check_in_time": a.get("check_in_time"),
                "check_out_time": a.get("check_out_time"),
                "status": a["status"],
                "is_late": a.get("is_late"),
                "late_minutes": a.get("late_minutes"),
                "teacher": {
                    "user": {
                        "name": a.get("teacher", {}).get("user", {}).get("name", "Unknown"),
                        "email": a.get("teacher", {}).get("user", {}).get("email", "")
                    },
                    "employee_id": a.get("teacher", {}).get("employee_id", "")
                }
            }
            for a in attendance
        ]
        
        return {"attendance": formatted}
    
    except Exception as e:
        logger.error(f"Error getting teacher attendance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get teacher attendance: {str(e)}"
        )

