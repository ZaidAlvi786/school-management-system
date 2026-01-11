# Migration Plan: Next.js Backend → Python FastAPI

## Why Next.js Backend Fails

### Critical Issues:

1. **Face Recognition in Browser is Unreliable**
   - `face-api.js` runs in browser with limited resources
   - Model loading is slow and unreliable (CDN dependencies)
   - Inconsistent performance across devices/browsers
   - Client-side processing exposes face encodings in network traffic
   - No server-side validation of face quality

2. **Security Vulnerabilities**
   - Face encodings generated client-side can be manipulated
   - No server-side verification of face detection
   - Business logic exposed in client-accessible API routes
   - Session-based auth in Next.js is less secure than token-based

3. **Performance & Scalability**
   - Next.js API routes are not optimized for CPU-intensive tasks
   - Face recognition is computationally expensive
   - No proper async task queue for heavy processing
   - Limited ability to scale face recognition workloads

4. **Architecture Violations**
   - Mixing frontend and backend concerns
   - Face recognition should be server-side only
   - Database queries mixed with business logic in API routes
   - Hard to test and maintain

5. **Technology Mismatch**
   - JavaScript/TypeScript not ideal for ML/computer vision
   - Python ecosystem (face_recognition, numpy) is industry standard
   - Better libraries and tooling in Python for face recognition

## Step-by-Step Migration Plan

### Phase 1: Database Schema Migration
1. Create unified `face_encodings` table with FLOAT[] vector type
2. Migrate existing face data from TEXT JSON to FLOAT[] arrays
3. Update `attendance` table to support both students and teachers
4. Add proper indexes for performance

### Phase 2: FastAPI Backend Setup
1. Create FastAPI project structure
2. Set up Supabase client in Python
3. Implement face recognition using `face_recognition` library
4. Create endpoints:
   - `POST /api/face/register` - Register face
   - `POST /api/attendance/mark` - Mark attendance
5. Add CORS configuration for Next.js frontend
6. Implement proper error handling and logging

### Phase 3: Frontend Updates
1. Remove `face-api.js` dependency
2. Update components to capture base64 images only
3. Update API calls to point to FastAPI endpoints
4. Remove all face recognition logic from frontend
5. Simplify components to only handle camera and UI

### Phase 4: Cleanup
1. Delete all Next.js API routes related to face recognition
2. Delete attendance API routes
3. Remove unused dependencies
4. Update documentation

### Phase 5: Testing & Deployment
1. Test face registration flow
2. Test attendance marking for students and teachers
3. Test duplicate prevention
4. Test error cases (no face, multiple faces, mismatch)
5. Set up Docker for FastAPI
6. Configure environment variables

## Architecture Overview

```
┌─────────────────┐
│   Next.js App   │  (Frontend Only)
│  - Camera UI    │
│  - Base64 Image │
└────────┬────────┘
         │ HTTP POST (base64 image)
         ▼
┌─────────────────┐
│  FastAPI Server │  (Backend Only)
│  - Face Detect  │
│  - Face Match   │
│  - Business Logic│
└────────┬────────┘
         │ Query/Insert
         ▼
┌─────────────────┐
│    Supabase     │  (Database Only)
│  - face_encodings│
│  - attendance   │
│  - users        │
└─────────────────┘
```

## Environment Variables

### FastAPI (.env)
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
FACE_TOLERANCE=0.6
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Next.js (.env.local)
```
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

## API Endpoints

### POST /api/face/register
**Request:**
```json
{
  "user_id": "uuid",
  "role": "student" | "teacher",
  "base64_image": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Face registered successfully"
}
```

### POST /api/attendance/mark
**Request:**
```json
{
  "base64_image": "data:image/jpeg;base64,...",
  "role": "student" | "teacher",
  "class_id": "uuid" (required for students),
  "device_type": "web" | "mobile"
}
```

**Response:**
```json
{
  "success": true,
  "status": "present" | "late",
  "user_id": "uuid",
  "message": "Attendance marked successfully"
}
```

## Security Considerations

1. **Never store raw images** - Only store face encodings
2. **Configurable tolerance** - Adjust face matching threshold
3. **Input validation** - Validate all inputs server-side
4. **Rate limiting** - Prevent abuse (bonus feature)
5. **Liveness detection** - Prevent photo spoofing (bonus feature)
6. **Error handling** - Proper error messages without exposing internals

## Migration Checklist

- [ ] Create FastAPI project structure
- [ ] Set up Supabase client in Python
- [ ] Implement face recognition endpoints
- [ ] Create database migration SQL
- [ ] Update frontend components
- [ ] Remove Next.js API routes
- [ ] Test face registration
- [ ] Test attendance marking
- [ ] Set up Docker
- [ ] Update documentation
- [ ] Deploy FastAPI service

