# Frontend Migration Guide - Next.js to FastAPI

This guide helps you migrate all frontend API calls from Next.js API routes to FastAPI endpoints.

## Quick Migration Pattern

### Before (Next.js API):
```typescript
const response = await fetch("/api/endpoint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
const result = await response.json();
```

### After (FastAPI):
```typescript
import { functionName } from "@/lib/fastapi-client";

const result = await functionName(data);
```

## Available FastAPI Client Functions

All functions are in `lib/fastapi-client.ts`. They automatically handle:
- JWT token authentication
- Error handling
- Request/response formatting

### Authentication & Profile
- `getCurrentUser()` - Get current user
- `getProfile()` - Get profile
- `updateProfile(data)` - Update profile
- `changePassword(currentPassword, newPassword)` - Change password
- `uploadProfilePicture(file)` - Upload profile picture

### Student
- `getStudentInfo()` - Get student info
- `getStudentGrades()` - Get grades
- `getStudentAttendance(classId?)` - Get attendance
- `getStudentHomework()` - Get homework
- `markHomeworkDone(homeworkId)` - Mark homework done
- `getStudentMaterials()` - Get materials
- `getStudentSyllabus()` - Get syllabus
- `getStudentQRCode()` - Get QR code
- `getStudentForecast()` - Get forecast data

### Teacher
- `getTeacherStudents()` - Get students
- `createStudent(data)` - Create student
- `getTeacherMaterials()` - Get materials
- `createMaterial(formData)` - Create material (FormData)
- `updateMaterial(materialId, data)` - Update material
- `deleteMaterial(materialId)` - Delete material
- `getTeacherSyllabus()` - Get syllabus
- `createSyllabus(data)` - Create syllabus
- `updateSyllabus(syllabusId, data)` - Update syllabus
- `deleteSyllabus(syllabusId)` - Delete syllabus
- `getSyllabusSubjectsClasses()` - Get subjects/classes
- `getPaperSyllabus(subjectId, classId)` - Get paper syllabus
- `getSavedFormats()` - Get saved formats
- `getTeacherAttendance()` - Get attendance
- `markAttendanceManual(data)` - Mark attendance manually
- `getClassesSubjects()` - Get classes/subjects
- `getHomeworkCompletions(homeworkId)` - Get completions
- `approveHomework(data)` - Approve/reject homework

### Admin
- `getSchools()` - Get schools
- `createSchool(data)` - Create school
- `getTeachers()` - Get teachers
- `assignSubject(data)` - Assign subject
- `updateSubjectTeacher(data)` - Update subject teacher
- `getClasses(campusId?)` - Get classes
- `createClass(data)` - Create class
- `updateClass(data)` - Update class
- `deleteClass(id)` - Delete class
- `getPrincipals()` - Get principals
- `createPrincipal(data)` - Create principal
- `updatePrincipal(data)` - Update principal
- `deletePrincipal(id)` - Delete principal
- `createSection(data)` - Create section
- `updateSection(data)` - Update section
- `deleteSection(id)` - Delete section
- `getCampuses(schoolId?)` - Get campuses
- `createCampus(data)` - Create campus
- `updateCampus(data)` - Update campus
- `deleteCampus(id)` - Delete campus
- `getTimetable()` - Get timetable
- `createTimetable(data)` - Create timetable
- `getAnalytics()` - Get analytics
- `getInsights(type?)` - Get insights
- `generateInsights(data)` - Generate insights
- `getWarnings()` - Get warnings
- `searchUsers(email, role?)` - Search users
- `getTeacherAttendanceAdmin(date?, status?)` - Get teacher attendance

### Principal
- `getPrincipalTeachers()` - Get teachers
- `createPrincipalTeacher(data)` - Create teacher
- `getPrincipalTimetable()` - Get timetable
- `createPrincipalTimetable(data)` - Create timetable
- `getPrincipalTeacherAttendance(date?)` - Get teacher attendance

### AI
- `generateHomework(data)` - Generate homework
- `generatePaper(data)` - Generate paper
- `gradeAnswer(data)` - Grade answer
- `predictPerformance(data)` - Predict performance
- `generateInsightsAI(data)` - Generate AI insights

### Papers
- `getPapers()` - Get papers
- `createPaper(formData)` - Create paper (FormData)
- `downloadPaper(paperId)` - Download paper

### General
- `getGrades()` - Get grades
- `createGrade(data)` - Create grade
- `getHomework()` - Get homework
- `createHomework(data)` - Create homework
- `getAttendance(classId?)` - Get attendance

### Face Recognition
- `registerFace(user_id, role, base64_image)` - Register face
- `markAttendance(base64_image, role, class_id?, device_type?)` - Mark attendance

## Migration Steps

### 1. Import FastAPI Client Functions

At the top of your component file:
```typescript
import { functionName1, functionName2 } from "@/lib/fastapi-client";
```

Or use dynamic imports for code splitting:
```typescript
const { functionName } = await import("@/lib/fastapi-client");
```

### 2. Replace Fetch Calls

**Before:**
```typescript
const response = await fetch("/api/profile", {
  method: "GET",
});
const data = await response.json();
```

**After:**
```typescript
const data = await getProfile();
```

### 3. Handle Errors

FastAPI client functions throw errors automatically. Use try-catch:

```typescript
try {
  const data = await getProfile();
  // Use data
} catch (error: any) {
  toast({
    title: "Error",
    description: error.message || "Failed to load profile",
    variant: "destructive",
  });
}
```

### 4. FormData Uploads

For file uploads, use the FastAPI client functions that handle FormData:

```typescript
// Before
const formData = new FormData();
formData.append("file", file);
const response = await fetch("/api/profile/upload", {
  method: "POST",
  body: formData,
});

// After
const { uploadProfilePicture } = await import("@/lib/fastapi-client");
const result = await uploadProfilePicture(file);
```

## Files to Update

### High Priority (Core Features)
1. ✅ `app/student/profile/page.tsx` - Profile management
2. `app/teacher/profile/page.tsx` - Profile management
3. `app/principal/profile/page.tsx` - Profile management
4. `app/admin/profile/page.tsx` - Profile management
5. `components/face-attendance-dialog.tsx` - Already updated ✅
6. `components/face-registration-dialog-simple.tsx` - Face registration
7. `components/teacher-face-attendance-dialog.tsx` - Teacher attendance

### Student Pages
- `app/student/homework/page.tsx`
- `app/student/grades/page.tsx`
- `app/student/attendance/page.tsx`
- `app/student/materials/page.tsx`
- `app/student/syllabus/page.tsx`
- `app/student/forecast/page.tsx`

### Teacher Pages
- `app/teacher/homework/page.tsx`
- `app/teacher/grades/page.tsx`
- `app/teacher/attendance/page.tsx`
- `app/teacher/materials/page.tsx`
- `app/teacher/syllabus/page.tsx`
- `app/teacher/students/page.tsx`
- `app/teacher/paper-generator/page.tsx`
- `app/teacher/qr-codes/page.tsx`

### Admin Pages
- `app/admin/schools/page.tsx`
- `app/admin/teachers/page.tsx`
- `app/admin/classes/page.tsx`
- `app/admin/principals/page.tsx`
- `app/admin/timetable/page.tsx`
- `app/admin/analytics/page.tsx`
- `app/admin/insights/page.tsx`
- `app/admin/warnings/page.tsx`
- `app/admin/teacher-attendance/page.tsx`

### Principal Pages
- `app/principal/teachers/page.tsx`
- `app/principal/classes/page.tsx`
- `app/principal/timetable/page.tsx`
- `app/principal/teacher-attendance/page.tsx`
- `app/principal/schools/page.tsx`

### Components
- `components/material-upload-dialog.tsx`
- `components/fingerprint-registration-dialog.tsx`
- `components/fingerprint-attendance-dialog.tsx`

## Testing Checklist

After migrating each component:

- [ ] Component loads without errors
- [ ] API calls work correctly
- [ ] Error handling works
- [ ] Loading states work
- [ ] Success messages appear
- [ ] Data displays correctly
- [ ] Authentication works (user can access)
- [ ] Authorization works (correct role required)

## Environment Variables

Make sure `.env.local` includes:
```env
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
NEXTAUTH_SECRET=your-secret-key
```

## Common Issues

### 1. CORS Errors
- Ensure FastAPI CORS is configured correctly
- Check `NEXT_PUBLIC_FASTAPI_URL` is correct

### 2. Authentication Errors
- Verify JWT token is being sent
- Check `NEXTAUTH_SECRET` matches in both apps
- Ensure `/api/auth/token` route works

### 3. 404 Errors
- Verify FastAPI endpoint exists
- Check endpoint path matches exactly
- Ensure FastAPI server is running

### 4. Type Errors
- Check function signatures in `fastapi-client.ts`
- Verify request/response types match

## Next Steps After Migration

1. **Test All Endpoints** - Verify each migrated endpoint works
2. **Delete Next.js Routes** - Remove all `app/api/**/route.ts` files
3. **Update Documentation** - Update API documentation
4. **Deploy** - Deploy FastAPI backend and update frontend

## Need Help?

Refer to:
- `lib/fastapi-client.ts` - All available functions
- `backend/app/routers/*.py` - FastAPI endpoint implementations
- `MIGRATION_COMPLETE.md` - Migration status

