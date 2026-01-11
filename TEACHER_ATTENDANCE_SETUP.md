# Teacher Attendance System Setup Guide

This guide explains the teacher attendance system with face recognition, timetable management, and late tracking.

## Features

### For Teachers
- **Face Registration**: Register face for attendance marking
- **Mark Attendance**: Mark daily attendance using face recognition
- **View Attendance**: View personal attendance records and statistics
- **Late Tracking**: Automatic late detection based on school timetable

### For Principal/Admin
- **Timetable Management**: Set different timings for junior (1-5) and senior (6-10) levels
- **View Teacher Attendance**: View all teacher attendance records
- **Late Tracking**: See late counts and minutes for each teacher
- **Filtering**: Filter by date and status

## Database Setup

### Step 1: Run Migration

Run the SQL migration in Supabase SQL Editor:

```sql
-- Copy and run the SQL from supabase-teacher-attendance-migration.sql
```

This creates:
- `teacher_face_data` - Stores teacher face images
- `teacher_biometric_data` - Stores fingerprint credentials
- `teacher_attendance` - Stores attendance records with check-in/out times
- `timetables` - Stores school timings for junior and senior levels

## How It Works

### 1. Timetable Setup (Principal/Admin)

1. Go to **Timetable** page
2. Set start/end times for:
   - **Junior Level** (Classes 1-5)
   - **Senior Level** (Classes 6-10)
3. Set late threshold (default: 15 minutes)
4. Save timetable

### 2. Teacher Face Registration

1. Teacher goes to **My Attendance** page
2. Clicks "Register Face"
3. Takes a photo
4. Face is registered

### 3. Marking Attendance

1. Teacher goes to **My Attendance** page
2. Clicks "Mark Attendance"
3. Takes a photo for verification
4. System:
   - Checks current time against timetable
   - Determines if teacher is late
   - Calculates late minutes
   - Marks attendance as "present" or "late"

### 4. Late Detection Logic

- Gets teacher's class level (from class_incharge assignment)
- Determines if junior (≤5) or senior (>5)
- Gets corresponding timetable
- Compares check-in time with start_time + late_threshold_minutes
- Marks as "late" if exceeds threshold

### 5. Viewing Attendance (Principal/Admin)

1. Go to **Teacher Attendance** page
2. Select date
3. Filter by status (all, present, late, absent)
4. View:
   - Total teachers
   - Present count
   - Absent count
   - Late count with minutes

## API Endpoints

### Teacher Face
- `GET /api/teacher/face/check` - Check if face is registered
- `POST /api/teacher/face/register-image` - Register face from image

### Teacher Attendance
- `GET /api/teacher/attendance` - Get teacher's own attendance
- `POST /api/teacher/attendance/mark` - Mark attendance (simple)
- `POST /api/teacher/attendance/mark-face` - Mark attendance with face verification

### Timetable
- `GET /api/principal/timetable` - Get timetable (principal)
- `POST /api/principal/timetable` - Save timetable (principal)
- `GET /api/admin/timetable` - Get timetable (admin)
- `POST /api/admin/timetable` - Save timetable (admin)

### View Attendance
- `GET /api/principal/teacher-attendance` - Get all teacher attendance (principal)
- `GET /api/admin/teacher-attendance` - Get all teacher attendance (admin)

## Pages Created

### Teacher
- `/teacher/my-attendance` - Teacher's personal attendance page

### Principal
- `/principal/timetable` - Timetable management
- `/principal/teacher-attendance` - View all teacher attendance

### Admin
- `/admin/timetable` - Timetable management
- `/admin/teacher-attendance` - View all teacher attendance

## Components Created

- `components/teacher-face-attendance-dialog.tsx` - Face attendance marking for teachers
- Updated `components/face-registration-dialog-simple.tsx` - Now supports both student and teacher

## Navigation Updates

- Added "My Attendance" to teacher sidebar
- Added "Teacher Attendance" and "Timetable" to principal sidebar
- Added "Teacher Attendance" and "Timetable" to admin sidebar

## Late Tracking Logic

```typescript
// 1. Get teacher's class level
const classLevel = teacher.class.level; // 1-10

// 2. Determine level type
const levelType = classLevel <= 5 ? 'junior' : 'senior';

// 3. Get timetable
const timetable = getTimetable(schoolId, levelType);

// 4. Calculate late
const checkInTime = new Date(`${today}T${currentTime}`);
const startTime = new Date(`${today}T${timetable.start_time}`);
const diffMinutes = (checkInTime - startTime) / (1000 * 60);

// 5. Mark as late if exceeds threshold
if (diffMinutes > timetable.late_threshold_minutes) {
  status = 'late';
  isLate = true;
  lateMinutes = diffMinutes;
}
```

## Usage Flow

### Teacher Flow
1. Register face → `/teacher/my-attendance` → "Register Face"
2. Mark attendance → `/teacher/my-attendance` → "Mark Attendance" → Take photo
3. View records → See attendance history and stats

### Principal/Admin Flow
1. Set timetable → `/principal/timetable` or `/admin/timetable` → Set times → Save
2. View attendance → `/principal/teacher-attendance` or `/admin/teacher-attendance` → Select date → View records

## Features Summary

✅ Teacher face registration
✅ Teacher attendance marking with face verification
✅ Automatic late detection based on timetable
✅ Different timings for junior (1-5) and senior (6-10) levels
✅ Principal/Admin can view all teacher attendance
✅ Late count tracking with minutes
✅ Date and status filtering
✅ Check-in/check-out time tracking

## Next Steps

1. Run the database migration: `supabase-teacher-attendance-migration.sql`
2. Set timetable: Go to Timetable page and configure timings
3. Teachers register faces: Go to My Attendance → Register Face
4. Teachers mark attendance: Go to My Attendance → Mark Attendance
5. Principal/Admin view: Go to Teacher Attendance page

The system is now ready to use! 🎉

