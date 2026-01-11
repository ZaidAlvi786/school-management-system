# Complete API Migration Guide: Next.js → FastAPI

This guide provides patterns and examples for migrating ALL Next.js API routes to FastAPI.

## Migration Pattern

### 1. Authentication Pattern

**Next.js:**
```typescript
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const user_id = session.user.id;
const role = session.user.role;
```

**FastAPI:**
```python
from app.core.auth import get_current_user, require_role, CurrentUser

@router.get("/endpoint")
async def endpoint(user: CurrentUser = Depends(require_role(["teacher"]))):
    user_id = user.id
    role = user.role
    # ... rest of logic
```

### 2. Database Query Pattern

**Next.js:**
```typescript
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('field', value)
  .single();
```

**FastAPI:**
```python
from app.core.database import get_supabase

supabase = get_supabase()
result = supabase.table("table").select("*").eq("field", value).maybe_single().execute()
data = result.data
```

### 3. Request/Response Pattern

**Next.js:**
```typescript
const body = await request.json();
const { field1, field2 } = body;
return NextResponse.json({ data });
```

**FastAPI:**
```python
from pydantic import BaseModel

class RequestModel(BaseModel):
    field1: str
    field2: Optional[int] = None

@router.post("/endpoint")
async def endpoint(request: RequestModel):
    # Use request.field1, request.field2
    return {"data": "result"}
```

### 4. Query Parameters Pattern

**Next.js:**
```typescript
const { searchParams } = new URL(request.url);
const param = searchParams.get("param");
```

**FastAPI:**
```python
from fastapi import Query

@router.get("/endpoint")
async def endpoint(param: Optional[str] = Query(None)):
    # Use param
```

## Route Categories

### ✅ Already Migrated
- `/api/face/register` - Face registration
- `/api/attendance/mark` - Attendance marking
- `/api/auth/me` - Get current user
- `/api/auth/verify` - Verify token
- `/api/profile` - Get/Update profile
- `/api/student/info` - Get student info
- `/api/student/grades` - Get student grades
- `/api/student/attendance` - Get student attendance
- `/api/student/homework` - Get student homework
- `/api/student/materials` - Get student materials
- `/api/student/syllabus` - Get student syllabus

### 🔄 To Migrate

#### Student Routes
- `/api/student/homework/mark-done` - Mark homework as done
- `/api/student/qr-code` - Generate QR code
- `/api/student/forecast` - Get grade forecast
- `/api/student/fingerprint/*` - Fingerprint routes (if needed)

#### Teacher Routes
- `/api/teacher/students` - Get teacher's students
- `/api/teacher/materials` - CRUD materials
- `/api/teacher/syllabus` - CRUD syllabus
- `/api/teacher/homework/*` - Homework management
- `/api/teacher/paper/*` - Paper generation
- `/api/teacher/classes-subjects` - Get classes/subjects
- `/api/teacher/attendance` - Get teacher attendance
- `/api/teacher/fingerprint/*` - Fingerprint routes (if needed)

#### Admin Routes
- `/api/admin/schools` - CRUD schools
- `/api/admin/teachers` - CRUD teachers
- `/api/admin/classes` - CRUD classes
- `/api/admin/principals` - CRUD principals
- `/api/admin/sections` - CRUD sections
- `/api/admin/campuses` - CRUD campuses
- `/api/admin/timetable` - Manage timetable
- `/api/admin/teacher-attendance` - View teacher attendance
- `/api/admin/analytics` - Analytics
- `/api/admin/insights` - AI insights
- `/api/admin/warnings` - Warnings management
- `/api/admin/users/search` - User search

#### Principal Routes
- `/api/principal/teachers` - Get teachers
- `/api/principal/timetable` - Manage timetable
- `/api/principal/teacher-attendance` - View teacher attendance

#### AI Routes
- `/api/ai/homework` - Generate homework questions
- `/api/ai/insights` - Generate insights
- `/api/ai/forecast` - Grade forecasting
- `/api/ai/grade` - AI grading
- `/api/ai/generate-paper` - Generate exam paper

#### General Routes
- `/api/grades` - CRUD grades (GET/POST)
- `/api/homework` - CRUD homework (GET/POST)
- `/api/attendance` - Get attendance (GET)
- `/api/papers` - CRUD papers
- `/api/papers/[id]/download` - Download paper

#### Profile Routes
- `/api/profile/password` - Change password
- `/api/profile/upload` - Upload profile picture

#### Auth Routes (Keep in Next.js)
- `/api/auth/[...nextauth]` - NextAuth handler (keep)
- `/api/auth/signup` - Signup (can migrate)
- `/api/auth/signout` - Signout (can migrate)
- `/api/auth/check-domain` - Domain check (can migrate)
- `/api/auth/admin-signup` - Admin signup (can migrate)

#### Utility Routes
- `/api/network-info` - Network info (can migrate or remove)

## Migration Checklist

For each route:

1. ✅ Create Pydantic models for request/response
2. ✅ Create FastAPI router endpoint
3. ✅ Add authentication/authorization
4. ✅ Migrate database queries
5. ✅ Add error handling
6. ✅ Add logging
7. ✅ Update frontend to call FastAPI
8. ✅ Test endpoint
9. ✅ Delete Next.js route

## Example: Migrating a Route

### Before (Next.js)
```typescript
// app/api/student/homework/mark-done/route.ts
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await request.json();
  const { homeworkId } = body;
  
  // ... logic
  return NextResponse.json({ success: true });
}
```

### After (FastAPI)
```python
# backend/app/routers/student.py
class MarkHomeworkDoneRequest(BaseModel):
    homeworkId: str

@router.post("/homework/mark-done")
async def mark_homework_done(
    request: MarkHomeworkDoneRequest,
    user: CurrentUser = Depends(require_student)
):
    # ... logic
    return {"success": True}
```

## Frontend Update Pattern

### Before
```typescript
const response = await fetch("/api/student/homework/mark-done", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ homeworkId }),
});
```

### After
```typescript
const response = await fetch(`${FASTAPI_URL}/api/student/homework/mark-done`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${sessionToken}`, // Get from NextAuth
  },
  body: JSON.stringify({ homeworkId }),
});
```

## Next Steps

1. Create router files for each domain:
   - `backend/app/routers/teacher.py`
   - `backend/app/routers/admin.py`
   - `backend/app/routers/principal.py`
   - `backend/app/routers/ai.py`
   - `backend/app/routers/general.py`

2. Migrate routes systematically by domain

3. Create frontend API client helpers for each domain

4. Update all frontend API calls

5. Test thoroughly

6. Delete Next.js routes

## Notes

- **NextAuth**: Keep NextAuth in Next.js for login/signup, but use JWT tokens for FastAPI auth
- **File Uploads**: Use `UploadFile` from FastAPI for file uploads
- **Streaming**: Use FastAPI streaming for large responses
- **WebSockets**: Can add WebSocket support in FastAPI if needed
- **Rate Limiting**: Add rate limiting middleware in FastAPI
- **Caching**: Add Redis caching if needed

