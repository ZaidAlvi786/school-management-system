"""
Teacher endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from app.core.auth import require_teacher, CurrentUser
from app.core.database import get_supabase
import logging
import secrets
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Students ============

@router.get("/students")
async def get_teacher_students(user: CurrentUser = Depends(require_teacher)):
    """Get students for teacher's class"""
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
        
        teacher = teacher_result.data
        
        # Find class where teacher is incharge
        class_result = supabase.table("classes").select("id").eq(
            "class_incharge_id", user.id
        ).maybe_single().execute()
        
        if not class_result.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned as a class incharge"
            )
        
        class_id = class_result.data["id"]
        
        # Get sections
        sections_result = supabase.table("sections").select(
            "id, name, capacity, current_strength"
        ).eq("class_id", class_id).execute()
        
        # Get students
        students_result = supabase.table("students").select(
            "id, roll_number, user:users(name, email, phone), "
            "section:sections(name), parent:parents(user:users(name, email))"
        ).eq("class_id", class_id).execute()
        
        return {
            "students": students_result.data or [],
            "sections": sections_result.data or [],
            "classId": class_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting students: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get students: {str(e)}"
        )


class CreateStudentRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    rollNumber: str
    admissionNumber: str
    sectionId: str
    parentEmail: Optional[str] = None
    parentName: Optional[str] = None
    parentPhone: Optional[str] = None
    dateOfBirth: str
    address: Optional[str] = None


@router.post("/students")
async def create_student(
    request: CreateStudentRequest,
    user: CurrentUser = Depends(require_teacher)
):
    """Create a new student (class incharge only)"""
    try:
        supabase = get_supabase()
        
        # Validate required fields
        if not all([request.name, request.email, request.rollNumber, 
                   request.admissionNumber, request.sectionId, request.dateOfBirth]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields"
            )
        
        # Get teacher and class
        teacher_result = supabase.table("teachers").select("id").eq(
            "user_id", user.id
        ).maybe_single().execute()
        
        if not teacher_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found"
            )
        
        class_result = supabase.table("classes").select("id").eq(
            "class_incharge_id", user.id
        ).maybe_single().execute()
        
        if not class_result.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned as a class incharge"
            )
        
        class_id = class_result.data["id"]
        
        # Verify section
        section_result = supabase.table("sections").select(
            "id, class_id, capacity, current_strength"
        ).eq("id", request.sectionId).maybe_single().execute()
        
        if not section_result.data or section_result.data["class_id"] != class_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid section for this class"
            )
        
        section = section_result.data
        if (section.get("current_strength", 0) or 0) >= section.get("capacity", 0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Section is at full capacity"
            )
        
        # Check if user exists
        existing_user = supabase.table("users").select("id").eq(
            "email", request.email.lower()
        ).maybe_single().execute()
        
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Check if roll/admission number exists
        existing_student = supabase.table("students").select("id").or_(
            f"roll_number.eq.{request.rollNumber},admission_number.eq.{request.admissionNumber}"
        ).maybe_single().execute()
        
        if existing_student.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student with this roll number or admission number already exists"
            )
        
        # Create parent if provided
        parent_id = None
        if request.parentEmail:
            parent_user_result = supabase.table("users").select("id").eq(
                "email", request.parentEmail.lower()
            ).maybe_single().execute()
            
            if not parent_user_result.data:
                # Create parent user
                temp_password = secrets.token_urlsafe(16)
                hashed_password = pwd_context.hash(temp_password)
                
                new_parent_user = supabase.table("users").insert({
                    "email": request.parentEmail.lower(),
                    "password": hashed_password,
                    "role": "parent",
                    "name": request.parentName or request.parentEmail.split("@")[0],
                    "phone": request.parentPhone,
                    "is_active": True
                }).select().single().execute()
                
                if not new_parent_user.data:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to create parent user"
                    )
                
                # Create parent record
                new_parent = supabase.table("parents").insert({
                    "user_id": new_parent_user.data["id"],
                    "cnic": f"CNIC-{secrets.token_hex(8)}",
                }).select().single().execute()
                
                if new_parent.data:
                    parent_id = new_parent.data["id"]
            else:
                # Find or create parent record
                parent_record = supabase.table("parents").select("id").eq(
                    "user_id", parent_user_result.data["id"]
                ).maybe_single().execute()
                
                if parent_record.data:
                    parent_id = parent_record.data["id"]
                else:
                    new_parent = supabase.table("parents").insert({
                        "user_id": parent_user_result.data["id"],
                        "cnic": f"CNIC-{secrets.token_hex(8)}",
                    }).select().single().execute()
                    
                    if new_parent.data:
                        parent_id = new_parent.data["id"]
        
        # Create student user
        temp_password = secrets.token_urlsafe(16)
        hashed_password = pwd_context.hash(temp_password)
        
        student_user = supabase.table("users").insert({
            "email": request.email.lower(),
            "password": hashed_password,
            "role": "student",
            "name": request.name,
            "phone": request.phone,
            "is_active": True
        }).select().single().execute()
        
        if not student_user.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create student user"
            )
        
        # Create student record
        student = supabase.table("students").insert({
            "user_id": student_user.data["id"],
            "roll_number": request.rollNumber,
            "admission_number": request.admissionNumber,
            "class_id": class_id,
            "section_id": request.sectionId,
            "parent_id": parent_id,
            "date_of_birth": request.dateOfBirth,
            "address": request.address
        }).select().single().execute()
        
        if not student.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create student record"
            )
        
        # Update section strength
        supabase.table("sections").update({
            "current_strength": (section.get("current_strength", 0) or 0) + 1
        }).eq("id", request.sectionId).execute()
        
        # Get student with populated data
        student_with_data = supabase.table("students").select(
            "*, user:users(name, email, phone), section:sections(name), "
            "parent:parents(user:users(name, email))"
        ).eq("id", student.data["id"]).single().execute()
        
        return student_with_data.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating student: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create student: {str(e)}"
        )


# ============ Materials ============

@router.get("/materials")
async def get_teacher_materials(
    classId: Optional[str] = Query(None),
    sectionId: Optional[str] = Query(None),
    subjectId: Optional[str] = Query(None),
    user: CurrentUser = Depends(require_teacher)
):
    """Get teacher's materials"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("materials").select(
            "*, classes:class_id(name, level), subjects:subject_id(name, code)"
        ).eq("uploaded_by_id", user.id).order("created_at", desc=True)
        
        if classId and classId != "all":
            query = query.eq("class_id", classId)
        if subjectId and subjectId != "all":
            query = query.eq("subject_id", subjectId)
        
        result = query.execute()
        return result.data or []
    
    except Exception as e:
        logger.error(f"Error getting materials: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get materials: {str(e)}"
        )


class CreateMaterialRequest(BaseModel):
    title: str
    description: Optional[str] = None
    subject_id: str
    class_id: str
    file_url: str
    file_type: str


@router.post("/materials")
async def create_material(
    request: CreateMaterialRequest,
    user: CurrentUser = Depends(require_teacher)
):
    """Create a new material"""
    try:
        if not all([request.title, request.subject_id, request.class_id, 
                   request.file_url, request.file_type]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields"
            )
        
        supabase = get_supabase()
        
        material = supabase.table("materials").insert({
            "title": request.title,
            "description": request.description,
            "subject_id": request.subject_id,
            "class_id": request.class_id,
            "file_url": request.file_url,
            "file_type": request.file_type,
            "uploaded_by_id": user.id
        }).select().single().execute()
        
        if not material.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create material"
            )
        
        return material.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating material: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create material: {str(e)}"
        )


# ============ Syllabus ============

@router.get("/syllabus")
async def get_teacher_syllabus(user: CurrentUser = Depends(require_teacher)):
    """Get teacher's syllabus"""
    try:
        supabase = get_supabase()
        
        # Get teacher record
        teacher_result = supabase.table("teachers").select("id, school_id").eq(
            "user_id", user.id
        ).maybe_single().execute()
        
        if not teacher_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found"
            )
        
        teacher = teacher_result.data
        
        # Get teacher's subjects
        teacher_subjects_result = supabase.table("teacher_subjects").select(
            "subject_id"
        ).eq("teacher_id", teacher["id"]).execute()
        
        direct_subjects_result = supabase.table("subjects").select("id").eq(
            "teacher_id", user.id
        ).execute()
        
        subject_ids = list(set(
            [ts["subject_id"] for ts in (teacher_subjects_result.data or [])] +
            [s["id"] for s in (direct_subjects_result.data or [])]
        ))
        
        if not subject_ids:
            return {"syllabus": []}
        
        # Get syllabus
        result = supabase.table("syllabus").select(
            "id, topic, description, term, status, is_completed, "
            "start_date, completion_date, completed_at, target_completion_date, "
            "notes, materials, subject:subjects(id, name, code), "
            "class:classes(id, name, level), "
            "assigned_by:users!syllabus_assigned_by_id_fkey(id, name)"
        ).in_("subject_id", subject_ids).eq(
            "assigned_by_id", user.id
        ).order("term", desc=False).order("created_at", desc=False).execute()
        
        return {"syllabus": result.data or []}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting syllabus: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get syllabus: {str(e)}"
        )


class CreateSyllabusRequest(BaseModel):
    topic: str
    description: Optional[str] = None
    subjectId: str
    classId: str
    term: str
    targetCompletionDate: Optional[str] = None
    notes: Optional[str] = None
    materials: Optional[List[str]] = None


@router.post("/syllabus")
async def create_syllabus(
    request: CreateSyllabusRequest,
    user: CurrentUser = Depends(require_teacher)
):
    """Create a new syllabus entry"""
    try:
        if not all([request.topic, request.subjectId, request.classId, request.term]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields"
            )
        
        supabase = get_supabase()
        
        # Verify teacher and subject
        teacher_result = supabase.table("teachers").select("id").eq(
            "user_id", user.id
        ).maybe_single().execute()
        
        if not teacher_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found"
            )
        
        teacher = teacher_result.data
        
        # Verify subject
        subject_result = supabase.table("subjects").select(
            "id, class_id, teacher_id"
        ).eq("id", request.subjectId).maybe_single().execute()
        
        if not subject_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found"
            )
        
        subject = subject_result.data
        
        if subject["class_id"] != request.classId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subject does not belong to this class"
            )
        
        # Check teacher assignment
        teacher_subject_result = supabase.table("teacher_subjects").select(
            "teacher_id, subject_id"
        ).eq("teacher_id", teacher["id"]).eq(
            "subject_id", request.subjectId
        ).maybe_single().execute()
        
        is_directly_assigned = subject.get("teacher_id") and str(subject["teacher_id"]) == str(user.id)
        
        if not teacher_subject_result.data and not is_directly_assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to teach this subject/class"
            )
        
        # Create syllabus
        syllabus = supabase.table("syllabus").insert({
            "topic": request.topic,
            "description": request.description,
            "subject_id": request.subjectId,
            "class_id": request.classId,
            "term": request.term,
            "target_completion_date": request.targetCompletionDate,
            "notes": request.notes,
            "materials": request.materials or [],
            "assigned_by_id": user.id,
            "status": "pending",
            "is_completed": False
        }).select().single().execute()
        
        if not syllabus.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create syllabus"
            )
        
        return {"syllabus": syllabus.data}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating syllabus: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create syllabus: {str(e)}"
        )


# ============ Paper Syllabus ============

@router.get("/paper/syllabus")
async def get_paper_syllabus(
    subjectId: str = Query(...),
    classId: str = Query(...),
    term: Optional[str] = Query(None),
    user: CurrentUser = Depends(require_teacher)
):
    """Get syllabus for paper generation"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("syllabus").select(
            "id, topic, description, term, status, is_completed, target_completion_date"
        ).eq("subject_id", subjectId).eq("class_id", classId).order(
            "term", desc=False
        ).order("created_at", desc=False)
        
        if term and term != "all":
            query = query.eq("term", term)
        
        result = query.execute()
        return {"syllabus": result.data or []}
    
    except Exception as e:
        logger.error(f"Error getting paper syllabus: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get syllabus: {str(e)}"
        )


# ============ Attendance ============

@router.get("/attendance")
async def get_teacher_attendance(user: CurrentUser = Depends(require_teacher)):
    """Get teacher's attendance records"""
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
        
        teacher_id = teacher_result.data["id"]
        
        # Get attendance
        result = supabase.table("attendance").select("*").eq(
            "user_id", user.id
        ).eq("role", "teacher").order("date", desc=True).execute()
        
        return result.data or []
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting attendance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get attendance: {str(e)}"
        )


# ============ Syllabus Subjects-Classes ============

@router.get("/syllabus/subjects-classes")
async def get_syllabus_subjects_classes(user: CurrentUser = Depends(require_teacher)):
    """Get teacher's subjects and classes for syllabus"""
    try:
        supabase = get_supabase()
        
        # Get teacher's subjects
        subjects_result = supabase.table("subjects").select(
            "id, name, code, class_id, class:classes(id, name, level)"
        ).eq("teacher_id", user.id).execute()
        
        if not subjects_result.data:
            return {"classes": [], "subjects": []}
        
        # Group by class
        grouped = {}
        for subject in subjects_result.data:
            class_id = subject["class_id"]
            if class_id not in grouped:
                grouped[class_id] = {
                    "class": subject.get("class"),
                    "subjects": []
                }
            grouped[class_id]["subjects"].append({
                "id": subject["id"],
                "name": subject["name"],
                "code": subject["code"]
            })
        
        return {
            "classes": list(grouped.values()),
            "subjects": [
                {"id": s["id"], "name": s["name"], "code": s["code"]}
                for s in subjects_result.data
            ]
        }
    
    except Exception as e:
        logger.error(f"Error getting subjects-classes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subjects-classes: {str(e)}"
        )


# ============ Materials Update/Delete ============

@router.put("/materials/{material_id}")
async def update_material(
    material_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    user: CurrentUser = Depends(require_teacher)
):
    """Update a material"""
    try:
        supabase = get_supabase()
        
        # Verify material belongs to teacher
        material_result = supabase.table("materials").select(
            "id, uploaded_by_id"
        ).eq("id", material_id).maybe_single().execute()
        
        if not material_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Material not found"
            )
        
        if str(material_result.data["uploaded_by_id"]) != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to update this material"
            )
        
        # Update material
        update_data = {}
        if title is not None:
            update_data["title"] = title
        if description is not None:
            update_data["description"] = description
        
        updated = supabase.table("materials").update(update_data).eq(
            "id", material_id
        ).select().single().execute()
        
        return updated.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating material: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update material: {str(e)}"
        )


@router.delete("/materials/{material_id}")
async def delete_material(
    material_id: str,
    user: CurrentUser = Depends(require_teacher)
):
    """Delete a material"""
    try:
        supabase = get_supabase()
        
        # Verify material belongs to teacher
        material_result = supabase.table("materials").select(
            "id, uploaded_by_id"
        ).eq("id", material_id).maybe_single().execute()
        
        if not material_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Material not found"
            )
        
        if str(material_result.data["uploaded_by_id"]) != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to delete this material"
            )
        
        # Delete material
        supabase.table("materials").delete().eq("id", material_id).execute()
        
        return {"success": True}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting material: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete material: {str(e)}"
        )


# ============ Syllabus Update/Delete ============

@router.put("/syllabus/{syllabus_id}")
async def update_syllabus(
    syllabus_id: str,
    topic: Optional[str] = None,
    description: Optional[str] = None,
    status_value: Optional[str] = None,
    is_completed: Optional[bool] = None,
    user: CurrentUser = Depends(require_teacher)
):
    """Update a syllabus entry"""
    try:
        supabase = get_supabase()
        
        # Verify syllabus belongs to teacher
        syllabus_result = supabase.table("syllabus").select(
            "id, assigned_by_id"
        ).eq("id", syllabus_id).maybe_single().execute()
        
        if not syllabus_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Syllabus not found"
            )
        
        if str(syllabus_result.data["assigned_by_id"]) != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to update this syllabus"
            )
        
        # Update syllabus
        update_data = {}
        if topic is not None:
            update_data["topic"] = topic
        if description is not None:
            update_data["description"] = description
        if status_value is not None:
            update_data["status"] = status_value
        if is_completed is not None:
            update_data["is_completed"] = is_completed
            if is_completed:
                update_data["completed_at"] = "now()"
        
        updated = supabase.table("syllabus").update(update_data).eq(
            "id", syllabus_id
        ).select().single().execute()
        
        return updated.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating syllabus: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update syllabus: {str(e)}"
        )


@router.delete("/syllabus/{syllabus_id}")
async def delete_syllabus(
    syllabus_id: str,
    user: CurrentUser = Depends(require_teacher)
):
    """Delete a syllabus entry"""
    try:
        supabase = get_supabase()
        
        # Verify syllabus belongs to teacher
        syllabus_result = supabase.table("syllabus").select(
            "id, assigned_by_id"
        ).eq("id", syllabus_id).maybe_single().execute()
        
        if not syllabus_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Syllabus not found"
            )
        
        if str(syllabus_result.data["assigned_by_id"]) != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to delete this syllabus"
            )
        
        # Delete syllabus
        supabase.table("syllabus").delete().eq("id", syllabus_id).execute()
        
        return {"success": True}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting syllabus: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete syllabus: {str(e)}"
        )


# ============ Paper Saved Formats ============

@router.get("/paper/saved-formats")
async def get_saved_formats(user: CurrentUser = Depends(require_teacher)):
    """Get saved paper formats"""
    try:
        supabase = get_supabase()
        
        # Get saved formats for teacher
        result = supabase.table("paper_formats").select("*").eq(
            "created_by_id", user.id
        ).order("created_at", desc=True).execute()
        
        return result.data or []
    
    except Exception as e:
        logger.error(f"Error getting saved formats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get saved formats: {str(e)}"
        )


# ============ Manual Attendance Marking ============

class MarkAttendanceRequest(BaseModel):
    studentId: str
    date: str
    status: str
    remarks: Optional[str] = None


@router.post("/attendance/mark")
async def mark_attendance_manual(
    request: MarkAttendanceRequest,
    user: CurrentUser = Depends(require_teacher)
):
    """Mark attendance manually (for teachers)"""
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
        
        # Verify student belongs to teacher's class
        student_result = supabase.table("students").select(
            "id, class_id"
        ).eq("id", request.studentId).maybe_single().execute()
        
        if not student_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        # Verify teacher is class incharge
        class_result = supabase.table("classes").select("id").eq(
            "class_incharge_id", user.id
        ).eq("id", student_result.data["class_id"]).maybe_single().execute()
        
        if not class_result.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not the class incharge for this student"
            )
        
        # Get student user_id
        student_user_result = supabase.table("students").select(
            "user_id"
        ).eq("id", request.studentId).maybe_single().execute()
        
        if not student_user_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student user not found"
            )
        
        # Mark attendance
        attendance = supabase.table("attendance").upsert({
            "user_id": student_user_result.data["user_id"],
            "role": "student",
            "class_id": student_result.data["class_id"],
            "date": request.date,
            "status": request.status,
            "remarks": request.remarks
        }, on_conflict="user_id,date,class_id").select().single().execute()
        
        if not attendance.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to mark attendance"
            )
        
        return attendance.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking attendance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark attendance: {str(e)}"
        )


# ============ Classes & Subjects ============

@router.get("/classes-subjects")
async def get_teacher_classes_subjects(user: CurrentUser = Depends(require_teacher)):
    """Get teacher's assigned classes and subjects"""
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
        
        teacher = teacher_result.data
        
        # Get teacher's subjects
        teacher_subjects_result = supabase.table("teacher_subjects").select(
            "subject_id, subject:subjects(id, name, code, class_id, class:classes(id, name, level))"
        ).eq("teacher_id", teacher["id"]).execute()
        
        # Get direct subjects
        direct_subjects_result = supabase.table("subjects").select(
            "id, name, code, class_id, class:classes(id, name, level)"
        ).eq("teacher_id", user.id).execute()
        
        # Combine results
        all_subjects = (teacher_subjects_result.data or []) + (direct_subjects_result.data or [])
        
        # Get classes
        class_ids = list(set([s.get("class_id") or s.get("subject", {}).get("class_id") for s in all_subjects if s]))
        
        classes_result = supabase.table("classes").select(
            "id, name, level"
        ).in_("id", class_ids).execute() if class_ids else {"data": []}
        
        return {
            "classes": classes_result.data or [],
            "subjects": all_subjects
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting classes-subjects: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get classes-subjects: {str(e)}"
        )


# ============ Homework ============

@router.get("/homework/completions")
async def get_homework_completions(
    homeworkId: str = Query(...),
    user: CurrentUser = Depends(require_teacher)
):
    """Get homework completions"""
    try:
        supabase = get_supabase()
        
        # Verify teacher assigned this homework
        homework_result = supabase.table("homework").select(
            "id, assigned_by_id"
        ).eq("id", homeworkId).maybe_single().execute()
        
        if not homework_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Homework not found"
            )
        
        homework = homework_result.data
        if str(homework["assigned_by_id"]) != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to view this homework"
            )
        
        # Get completions
        result = supabase.table("homework_completions").select(
            "id, status, completed_at, approved_at, rejected_at, "
            "rejection_reason, remarks, "
            "student:students(id, roll_number, user:users(id, name, email))"
        ).eq("homework_id", homeworkId).order("completed_at", desc=True).execute()
        
        return {"completions": result.data or []}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting completions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get completions: {str(e)}"
        )


class ApproveHomeworkRequest(BaseModel):
    completionId: str
    action: str  # 'approve' or 'reject'
    remarks: Optional[str] = None


@router.post("/homework/approve")
async def approve_homework(
    request: ApproveHomeworkRequest,
    user: CurrentUser = Depends(require_teacher)
):
    """Approve or reject homework"""
    try:
        if request.action not in ["approve", "reject"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid action. Use 'approve' or 'reject'"
            )
        
        supabase = get_supabase()
        
        # Get completion
        completion_result = supabase.table("homework_completions").select(
            "id, homework_id, status"
        ).eq("id", request.completionId).maybe_single().execute()
        
        if not completion_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Completion not found"
            )
        
        # Verify teacher assigned this homework
        homework_result = supabase.table("homework").select(
            "id, assigned_by_id"
        ).eq("id", completion_result.data["homework_id"]).maybe_single().execute()
        
        if not homework_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Homework not found"
            )
        
        if str(homework_result.data["assigned_by_id"]) != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to approve this homework"
            )
        
        # Update completion
        update_data = {
            "updated_at": "now()",
            "remarks": request.remarks
        }
        
        if request.action == "approve":
            update_data.update({
                "status": "approved",
                "approved_at": "now()",
                "approved_by_id": user.id,
                "rejected_at": None,
                "rejected_by_id": None,
                "rejection_reason": None
            })
        else:
            update_data.update({
                "status": "rejected",
                "rejected_at": "now()",
                "rejected_by_id": user.id,
                "rejection_reason": request.remarks or "No reason provided",
                "approved_at": None,
                "approved_by_id": None
            })
        
        updated = supabase.table("homework_completions").update(
            update_data
        ).eq("id", request.completionId).select().single().execute()
        
        if not updated.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update completion"
            )
        
        return {
            "message": "Homework approved successfully" if request.action == "approve" else "Homework rejected",
            "completion": updated.data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving homework: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update homework status: {str(e)}"
        )

