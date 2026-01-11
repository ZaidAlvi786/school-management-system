# Next.js API Routes to Delete

After migrating all frontend components to use FastAPI, delete these Next.js API route files:

## ✅ Safe to Delete (All Migrated)

### Authentication & Profile
- `app/api/auth/me/route.ts` ✅
- `app/api/auth/verify/route.ts` ✅
- `app/api/profile/route.ts` ✅
- `app/api/profile/password/route.ts` ✅
- `app/api/profile/upload/route.ts` ✅

### Face Recognition & Attendance
- `app/api/face/register/route.ts` ✅
- `app/api/attendance/mark/route.ts` ✅
- `app/api/student/face/mark-attendance/route.ts` ✅
- `app/api/student/face/register/route.ts` ✅
- `app/api/student/face/register-image/route.ts` ✅
- `app/api/student/face/check/route.ts` ✅
- `app/api/teacher/face/register-image/route.ts` ✅
- `app/api/teacher/face/check/route.ts` ✅
- `app/api/teacher/attendance/mark-face/route.ts` ✅

### Student Routes
- `app/api/student/info/route.ts` ✅
- `app/api/student/grades/route.ts` ✅
- `app/api/student/attendance/route.ts` ✅
- `app/api/student/homework/route.ts` ✅
- `app/api/student/homework/mark-done/route.ts` ✅
- `app/api/student/materials/route.ts` ✅
- `app/api/student/syllabus/route.ts` ✅
- `app/api/student/qr-code/route.ts` ✅
- `app/api/student/forecast/route.ts` ✅

### Teacher Routes
- `app/api/teacher/students/route.ts` ✅
- `app/api/teacher/materials/route.ts` ✅
- `app/api/teacher/syllabus/route.ts` ✅
- `app/api/teacher/syllabus/subjects-classes/route.ts` ✅
- `app/api/teacher/paper/syllabus/route.ts` ✅
- `app/api/teacher/paper/saved-formats/route.ts` ✅
- `app/api/teacher/attendance/route.ts` ✅
- `app/api/teacher/attendance/mark/route.ts` ✅
- `app/api/teacher/classes-subjects/route.ts` ✅
- `app/api/teacher/homework/approve/route.ts` ✅
- `app/api/teacher/homework/completions/route.ts` ✅

### Admin Routes
- `app/api/admin/schools/route.ts` ✅
- `app/api/admin/teachers/route.ts` ✅
- `app/api/admin/classes/route.ts` ✅
- `app/api/admin/principals/route.ts` ✅
- `app/api/admin/sections/route.ts` ✅
- `app/api/admin/campuses/route.ts` ✅
- `app/api/admin/timetable/route.ts` ✅
- `app/api/admin/teacher-attendance/route.ts` ✅
- `app/api/admin/analytics/route.ts` ✅
- `app/api/admin/insights/route.ts` ✅
- `app/api/admin/warnings/route.ts` ✅
- `app/api/admin/users/search/route.ts` ✅

### Principal Routes
- `app/api/principal/teachers/route.ts` ✅
- `app/api/principal/timetable/route.ts` ✅
- `app/api/principal/teacher-attendance/route.ts` ✅

### AI Routes
- `app/api/ai/homework/route.ts` ✅
- `app/api/ai/insights/route.ts` ✅
- `app/api/ai/forecast/route.ts` ✅
- `app/api/ai/grade/route.ts` ✅
- `app/api/ai/generate-paper/route.ts` ✅

### Papers Routes
- `app/api/papers/route.ts` ✅
- `app/api/papers/[id]/download/route.ts` ✅

### General Routes
- `app/api/grades/route.ts` ✅
- `app/api/homework/route.ts` ✅
- `app/api/attendance/route.ts` ✅

## ⚠️ Keep These (NextAuth)

- `app/api/auth/[...nextauth]/route.ts` - Keep for NextAuth
- `app/api/auth/token/route.ts` - Keep for JWT token generation

## ⚠️ Optional (Can Keep or Migrate)

- `app/api/auth/signup/route.ts` - Can stay in Next.js
- `app/api/auth/signout/route.ts` - Can stay in Next.js
- `app/api/auth/check-domain/route.ts` - Can stay in Next.js
- `app/api/auth/admin-signup/route.ts` - Can stay in Next.js
- `app/api/network-info/route.ts` - Can be removed if not needed

## Deletion Command

After testing all frontend components:

```bash
# Delete all migrated routes (be careful!)
find app/api -name "route.ts" -type f ! -path "*/auth/[...nextauth]/*" ! -path "*/auth/token/*" -delete

# Or delete manually to be safe
```

## Verification

Before deleting, verify:
1. ✅ All frontend components use FastAPI client
2. ✅ All endpoints tested and working
3. ✅ No references to deleted routes in code
4. ✅ FastAPI backend is running and accessible

## After Deletion

1. Test the application thoroughly
2. Check for any broken imports
3. Update any documentation
4. Commit changes with clear message
