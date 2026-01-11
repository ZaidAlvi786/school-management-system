# API Migration Status

## ✅ Completed Migrations

### Authentication & Profile
- ✅ `/api/auth/me` - Get current user
- ✅ `/api/auth/verify` - Verify token
- ✅ `/api/profile` - Get/Update profile

### Face Recognition & Attendance
- ✅ `/api/face/register` - Register face
- ✅ `/api/attendance/mark` - Mark attendance

### Student Routes
- ✅ `/api/student/info` - Get student info
- ✅ `/api/student/grades` - Get grades
- ✅ `/api/student/attendance` - Get attendance
- ✅ `/api/student/homework` - Get homework
- ✅ `/api/student/materials` - Get materials
- ✅ `/api/student/syllabus` - Get syllabus

## 🔄 In Progress / Templates Created

### Router Templates Created
- ✅ `backend/app/routers/auth.py` - Auth endpoints
- ✅ `backend/app/routers/profile.py` - Profile endpoints
- ✅ `backend/app/routers/student.py` - Student endpoints
- ✅ `backend/app/routers/face.py` - Face recognition
- ✅ `backend/app/routers/attendance.py` - Attendance marking

## 📋 Remaining Routes to Migrate

### Student Routes (4 remaining)
- [ ] `/api/student/homework/mark-done` - Mark homework done
- [ ] `/api/student/qr-code` - Generate QR code
- [ ] `/api/student/forecast` - Grade forecast
- [ ] `/api/student/fingerprint/*` - Fingerprint (4 routes)

### Teacher Routes (15+ remaining)
- [ ] `/api/teacher/students` - Get students
- [ ] `/api/teacher/materials` - CRUD materials (2 routes)
- [ ] `/api/teacher/syllabus` - CRUD syllabus (3 routes)
- [ ] `/api/teacher/homework/*` - Homework (2 routes)
- [ ] `/api/teacher/paper/*` - Paper generation (2 routes)
- [ ] `/api/teacher/classes-subjects` - Get classes/subjects
- [ ] `/api/teacher/attendance` - Get attendance
- [ ] `/api/teacher/fingerprint/*` - Fingerprint (4 routes)

### Admin Routes (15+ remaining)
- [ ] `/api/admin/schools` - CRUD schools
- [ ] `/api/admin/teachers` - CRUD teachers
- [ ] `/api/admin/classes` - CRUD classes
- [ ] `/api/admin/principals` - CRUD principals
- [ ] `/api/admin/sections` - CRUD sections
- [ ] `/api/admin/campuses` - CRUD campuses
- [ ] `/api/admin/timetable` - Timetable management
- [ ] `/api/admin/teacher-attendance` - View attendance
- [ ] `/api/admin/analytics` - Analytics
- [ ] `/api/admin/insights` - AI insights
- [ ] `/api/admin/warnings` - Warnings
- [ ] `/api/admin/users/search` - User search

### Principal Routes (3 remaining)
- [ ] `/api/principal/teachers` - Get teachers
- [ ] `/api/principal/timetable` - Manage timetable
- [ ] `/api/principal/teacher-attendance` - View attendance

### AI Routes (5 remaining)
- [ ] `/api/ai/homework` - Generate homework
- [ ] `/api/ai/insights` - Generate insights
- [ ] `/api/ai/forecast` - Grade forecast
- [ ] `/api/ai/grade` - AI grading
- [ ] `/api/ai/generate-paper` - Generate paper

### General Routes (5+ remaining)
- [ ] `/api/grades` - CRUD grades (GET/POST)
- [ ] `/api/homework` - CRUD homework (GET/POST)
- [ ] `/api/attendance` - Get attendance (GET)
- [ ] `/api/papers` - CRUD papers (GET/POST)
- [ ] `/api/papers/[id]/download` - Download paper

### Profile Routes (2 remaining)
- [ ] `/api/profile/password` - Change password
- [ ] `/api/profile/upload` - Upload picture

### Auth Routes (4 remaining - optional)
- [ ] `/api/auth/signup` - Signup
- [ ] `/api/auth/signout` - Signout
- [ ] `/api/auth/check-domain` - Domain check
- [ ] `/api/auth/admin-signup` - Admin signup
- [x] `/api/auth/[...nextauth]` - Keep in Next.js

### Utility Routes (1 remaining)
- [ ] `/api/network-info` - Network info (optional)

## Migration Strategy

### Phase 1: Core Functionality ✅
- Authentication
- Profile management
- Face recognition
- Basic student routes

### Phase 2: Teacher & Admin Features
- Teacher routes
- Admin CRUD operations
- Timetable management

### Phase 3: AI & Advanced Features
- AI endpoints
- Analytics
- Advanced reporting

### Phase 4: Cleanup
- Remove Next.js routes
- Update all frontend calls
- Testing

## Quick Migration Commands

### Create a new router
```bash
# Copy template
cp backend/app/routers/student.py backend/app/routers/teacher.py

# Edit and add routes
# Register in main.py
```

### Test a route
```bash
# Start FastAPI
cd backend
python -m app.main

# Test endpoint
curl -X GET http://localhost:8000/api/student/info \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Frontend Update Helper

Create a helper function to get JWT token from NextAuth:

```typescript
// lib/api-client.ts
import { getSession } from "next-auth/react";

export async function getAuthHeaders() {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  
  // Get JWT token from NextAuth
  const response = await fetch("/api/auth/session");
  const data = await response.json();
  
  return {
    "Authorization": `Bearer ${data.accessToken}`, // Adjust based on NextAuth setup
    "Content-Type": "application/json",
  };
}

export const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

export async function fastapiFetch(endpoint: string, options: RequestInit = {}) {
  const headers = await getAuthHeaders();
  return fetch(`${FASTAPI_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
}
```

## Next Steps

1. **Create remaining router files:**
   - `backend/app/routers/teacher.py`
   - `backend/app/routers/admin.py`
   - `backend/app/routers/principal.py`
   - `backend/app/routers/ai.py`
   - `backend/app/routers/general.py`

2. **Migrate routes systematically:**
   - Start with most-used routes
   - Follow the patterns in `COMPLETE_MIGRATION_GUIDE.md`
   - Test each route after migration

3. **Update frontend:**
   - Create API client helpers
   - Update all fetch calls
   - Test thoroughly

4. **Cleanup:**
   - Delete Next.js API routes
   - Remove unused dependencies
   - Update documentation

