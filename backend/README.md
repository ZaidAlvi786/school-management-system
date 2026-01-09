# FastAPI Backend - School Management System

Backend API for face recognition and attendance system.

## Architecture

- **FastAPI**: Modern Python web framework
- **face_recognition**: Python library for face recognition
- **Supabase**: PostgreSQL database
- **Docker**: Containerization

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase service role key
- `FACE_TOLERANCE`: Face matching tolerance (default: 0.6)
- `CORS_ORIGINS`: Comma-separated list of allowed origins

### 3. Run Database Migration

Run the SQL migration in Supabase SQL Editor:
```sql
-- Copy and run supabase-migration.sql
```

### 4. Run the Server

**Development:**
```bash
python -m app.main
```

**Production with Docker:**
```bash
docker-compose up -d
```

## API Endpoints

### POST /api/face/register
Register a face for a user.

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
Mark attendance using face recognition.

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
  "message": "Attendance marked successfully",
  "confidence": 0.95
}
```

## Features

- ✅ Face detection and encoding
- ✅ Face matching with configurable tolerance
- ✅ Duplicate face prevention
- ✅ Role-based attendance rules
- ✅ Student: per class per day
- ✅ Teacher: once per day with late tracking
- ✅ Proper error handling
- ✅ Logging for debugging

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Testing

```bash
# Health check
curl http://localhost:8000/health

# Test face registration
curl -X POST http://localhost:8000/api/face/register \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "uuid",
    "role": "student",
    "base64_image": "data:image/jpeg;base64,..."
  }'
```

## Production Deployment

1. Set up environment variables
2. Run database migration
3. Build and run Docker container:
   ```bash
   docker-compose up -d
   ```
4. Configure reverse proxy (nginx) if needed
5. Set up SSL/TLS certificates

## Security Notes

- Never store raw images
- Face encodings are stored as FLOAT[] vectors
- Configurable face matching tolerance
- Input validation on all endpoints
- CORS configured for specific origins

## Troubleshooting

**Face recognition not working:**
- Ensure `face_recognition` library is installed correctly
- Check that images contain exactly one face
- Verify face tolerance setting

**Database connection errors:**
- Verify Supabase URL and key
- Check network connectivity
- Ensure database migration has been run

**CORS errors:**
- Add your frontend URL to `CORS_ORIGINS`
- Ensure FastAPI is running and accessible

