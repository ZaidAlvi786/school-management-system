# Cleanup Guide: Remove Next.js Backend Logic

After migrating to FastAPI, remove the following Next.js API routes and update dependencies.

## API Routes to Delete

### Face Recognition Routes
- `app/api/student/face/register/route.ts`
- `app/api/student/face/register-image/route.ts`
- `app/api/student/face/mark-attendance/route.ts`
- `app/api/student/face/check/route.ts`
- `app/api/teacher/face/register-image/route.ts`
- `app/api/teacher/face/check/route.ts`

### Teacher Attendance Routes
- `app/api/teacher/attendance/mark-face/route.ts`

### Note: Keep These Routes
- `app/api/attendance/route.ts` - Keep if used for viewing attendance (GET)
- Other non-face-recognition routes should remain

## Dependencies to Remove

From `package.json`, you can remove:
```json
"face-api.js": "^0.22.2"
```

However, keep it for now if other parts of the codebase still use it. Remove only after confirming all face recognition is moved to FastAPI.

## Environment Variables

Add to `.env.local`:
```
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

For production, set:
```
NEXT_PUBLIC_FASTAPI_URL=https://your-fastapi-domain.com
```

## Frontend Components Updated

The following components have been updated to use FastAPI:
- ✅ `components/face-registration-dialog-simple.tsx`
- ✅ `components/face-attendance-dialog.tsx`
- ✅ `components/teacher-face-attendance-dialog.tsx`

## Migration Steps

1. ✅ FastAPI backend created
2. ✅ Database migration SQL created
3. ✅ Frontend components updated
4. ⏳ Run database migration in Supabase
5. ⏳ Start FastAPI server
6. ⏳ Test face registration
7. ⏳ Test attendance marking
8. ⏳ Delete Next.js API routes (listed above)
9. ⏳ Remove face-api.js dependency (optional)

## Testing Checklist

- [ ] Face registration for students
- [ ] Face registration for teachers
- [ ] Student attendance marking (with class_id)
- [ ] Teacher attendance marking
- [ ] Duplicate attendance prevention
- [ ] Face not recognized error handling
- [ ] Multiple faces detected error handling
- [ ] No face detected error handling

## Rollback Plan

If issues occur:
1. Keep old Next.js API routes as backup
2. Revert frontend components to previous version
3. Restore old database schema if needed

