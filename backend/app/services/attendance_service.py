"""
Attendance service for handling attendance business logic
"""

from datetime import datetime, date
from typing import Optional, Dict, Any
import logging
from app.core.database import get_supabase

logger = logging.getLogger(__name__)


class AttendanceService:
    """Service for attendance operations"""
    
    def __init__(self):
        self._supabase = None

    @property
    def supabase(self):
        if self._supabase is None:
            self._supabase = get_supabase()
        return self._supabase
    
    def check_student_attendance(
        self, 
        student_user_id: str, 
        class_id: str, 
        attendance_date: date
    ) -> Optional[Dict[str, Any]]:
        """
        Check if student attendance already marked for a specific class and date
        
        Args:
            student_user_id: Student user ID
            class_id: Class ID
            attendance_date: Date to check
            
        Returns:
            Existing attendance record or None
        """
        try:
            result = self.supabase.table("attendance").select("*").eq(
                "user_id", student_user_id
            ).eq("role", "student").eq("class_id", class_id).eq(
                "date", attendance_date.isoformat()
            ).limit(1).execute()
            
            if result.data and len(result.data) > 0:
                logger.info(f"Student {student_user_id} already marked attendance for class {class_id} on {attendance_date}")
                return result.data[0]
            
            return None
        
        except Exception as e:
            logger.error(f"Error checking student attendance: {str(e)}")
            raise
    
    def check_teacher_attendance(
        self, 
        teacher_id: str, 
        attendance_date: date
    ) -> Optional[Dict[str, Any]]:
        """
        Check if teacher attendance already marked for a date
        
        Args:
            teacher_id: Teacher ID
            attendance_date: Date to check
            
        Returns:
            Existing attendance record or None
        """
        try:
            result = self.supabase.table("attendance").select("*").eq(
                "user_id", teacher_id
            ).eq("role", "teacher").eq("date", attendance_date.isoformat()).limit(1).execute()
            
            if result.data and len(result.data) > 0:
                logger.info(f"Teacher {teacher_id} already marked attendance on {attendance_date}")
                return result.data[0]
            
            return None
        
        except Exception as e:
            logger.error(f"Error checking teacher attendance: {str(e)}")
            raise
    
    def mark_student_attendance(
        self,
        student_user_id: str,
        class_id: str,
        device_type: str = "web",
        student_db_id: Optional[str] = None,
        confidence: Optional[float] = None,
        liveness_verified: bool = False
    ) -> Dict[str, Any]:
        """
        Mark student attendance
        
        Args:
            student_user_id: Student user ID
            class_id: Class ID
            device_type: Device type (web/mobile)
            student_db_id: Optional student database ID (for backwards compatibility)
            
        Returns:
            Attendance record
        """
        try:
            today = date.today()
            now = datetime.now()
            
            # Check if already marked
            existing = self.check_student_attendance(student_user_id, class_id, today)
            if existing:
                return {
                    "success": False,
                    "already_marked": True,
                    "attendance": existing
                }
            
            # Get student database ID if not provided
            if not student_db_id:
                student_result = self.supabase.table("students").select("id").eq(
                    "user_id", student_user_id
                ).maybe_single().execute()
                
                if student_result.data:
                    student_db_id = student_result.data["id"]
            
            # Insert attendance record
            attendance_data = {
                "user_id": student_user_id,
                "role": "student",
                "class_id": class_id,
                "date": today.isoformat(),
                "time": now.strftime("%H:%M:%S"),
                "status": "present",
                "device_type": device_type
            }
            
            # Add confidence and liveness verification if provided
            if confidence is not None:
                attendance_data["confidence"] = confidence
            if liveness_verified:
                attendance_data["liveness_verified"] = True
            
            # Add student_id if available (for backwards compatibility)
            if student_db_id:
                attendance_data["student_id"] = student_db_id
            
            result = self.supabase.table("attendance").insert(attendance_data).execute()
            
            if result.data:
                logger.info(f"Student {student_user_id} attendance marked for class {class_id}")
                return {
                    "success": True,
                    "attendance": result.data[0]
                }
            
            raise Exception("Failed to insert attendance record")
        
        except Exception as e:
            logger.error(f"Error marking student attendance: {str(e)}")
            raise
    
    def mark_teacher_attendance(
        self,
        teacher_id: str,
        device_type: str = "web",
        confidence: Optional[float] = None,
        liveness_verified: bool = False
    ) -> Dict[str, Any]:
        """
        Mark teacher attendance
        
        Args:
            teacher_id: Teacher user ID
            device_type: Device type (web/mobile)
            
        Returns:
            Attendance record with late status if applicable
        """
        try:
            today = date.today()
            now = datetime.now()
            
            # Check if already marked
            existing = self.check_teacher_attendance(teacher_id, today)
            if existing:
                return {
                    "success": False,
                    "already_marked": True,
                    "attendance": existing
                }
            
            # Get teacher's school and class to determine timetable
            teacher_result = self.supabase.table("teachers").select(
                "id, school_id"
            ).eq("user_id", teacher_id).limit(1).execute()
            
            if not teacher_result.data or len(teacher_result.data) == 0:
                raise ValueError("Teacher not found")
            
            teacher_record = teacher_result.data[0]
            school_id = teacher_record["school_id"]
            
            # Get teacher's class level
            class_result = self.supabase.table("classes").select(
                "level"
            ).eq("class_incharge_id", teacher_record["id"]).limit(1).execute()
            
            level_type = "senior"  # default
            if class_result.data and len(class_result.data) > 0 and class_result.data[0]["level"] <= 5:
                level_type = "junior"
            
            # Get timetable
            timetable_result = self.supabase.table("timetables").select(
                "start_time, late_threshold_minutes"
            ).eq("school_id", school_id).eq("level_type", level_type).eq(
                "is_active", True
            ).limit(1).execute()
            
            status = "present"
            is_late = False
            late_minutes = 0
            
            if timetable_result.data and len(timetable_result.data) > 0:
                timetable = timetable_result.data[0]
                start_time_str = timetable["start_time"]
                late_threshold = timetable.get("late_threshold_minutes", 15)
                
                # Parse start time
                start_datetime = datetime.combine(today, datetime.strptime(start_time_str, "%H:%M:%S").time())
                check_in_datetime = datetime.combine(today, now.time())
                
                # Calculate late minutes
                diff_minutes = (check_in_datetime - start_datetime).total_seconds() / 60
                
                if diff_minutes > late_threshold:
                    status = "late"
                    is_late = True
                    late_minutes = int(diff_minutes)
            
            # Get teacher database ID (optional, for backwards compatibility)
            teacher_db_id = None
            teacher_result = self.supabase.table("teachers").select("id").eq(
                "user_id", teacher_id
            ).maybe_single().execute()
            
            if teacher_result.data:
                teacher_db_id = teacher_result.data["id"]
            
            # Insert attendance record
            attendance_data = {
                "user_id": teacher_id,
                "role": "teacher",
                "date": today.isoformat(),
                "time": now.strftime("%H:%M:%S"),
                "status": status,
                "device_type": device_type,
                "is_late": is_late,
                "late_minutes": late_minutes,
                # Ensure student_id is explicitly NULL for teachers
                "student_id": None
            }
            
            # Add confidence and liveness verification if provided
            if confidence is not None:
                attendance_data["confidence"] = confidence
            if liveness_verified:
                attendance_data["liveness_verified"] = True
            
            # Optional: Add teacher_id if you have a teachers table
            # if teacher_db_id:
            #     attendance_data["teacher_id"] = teacher_db_id
            
            result = self.supabase.table("attendance").insert(attendance_data).execute()
            
            if result.data:
                logger.info(f"Teacher {teacher_id} attendance marked: status={status}, late={is_late}")
                return {
                    "success": True,
                    "attendance": result.data[0],
                    "is_late": is_late,
                    "late_minutes": late_minutes
                }
            
            raise Exception("Failed to insert attendance record")
        
        except Exception as e:
            logger.error(f"Error marking teacher attendance: {str(e)}")
            raise

