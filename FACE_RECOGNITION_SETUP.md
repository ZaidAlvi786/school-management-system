# Face Recognition Setup Guide

This guide will help you set up face recognition for student attendance marking.

## Prerequisites

1. Install face-api.js library:
```bash
npm install face-api.js
```

## Step 1: Download Face Recognition Models

Face-api.js requires pre-trained models to work. You need to download the models and place them in the `public/models` directory.

### Option 1: Manual Download

1. Create the models directory:
```bash
mkdir -p public/models
```

2. Download the following model files from the face-api.js repository and place them in `public/models/`:
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1`
   - `face_recognition_model-shard2`

You can find these files at: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

### Option 2: Using CDN (Recommended for Production)

If you prefer to use CDN, you can modify the components to load models from a CDN:

```typescript
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
```

Or use the official face-api.js CDN:
```typescript
const MODEL_URL = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
```

## Step 2: Database Migration

Run the SQL migration to create the `student_face_data` table:

```sql
-- Run this in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS student_face_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  face_encoding TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_student_face_data_student_id ON student_face_data(student_id);
```

Or use the provided migration file:
```bash
# Copy the SQL from supabase-face-recognition-migration.sql and run it in Supabase SQL Editor
```

## Step 3: Verify Setup

1. Start your development server:
```bash
npm run dev
```

2. Navigate to the Student Attendance page
3. Click "Register Face" (if face is not registered)
4. Allow camera permissions when prompted
5. Position your face in the circle guide
6. Click "Capture & Register" when the border turns green

## How It Works

1. **Face Registration**: 
   - Student registers their face by capturing an image
   - Face descriptor (128-dimensional vector) is extracted
   - Descriptor is stored in the database

2. **Face Recognition for Attendance**:
   - Student opens camera to mark attendance
   - Current face is detected and descriptor is extracted
   - Descriptor is compared with stored descriptor using cosine similarity
   - If similarity > 0.6 (threshold), attendance is marked

## API Endpoints

- `GET /api/student/face/check` - Check if student has registered face
- `POST /api/student/face/register` - Register student face
- `POST /api/student/face/mark-attendance` - Mark attendance using face recognition

## Troubleshooting

### Models not loading
- Ensure models are in `public/models/` directory
- Check browser console for 404 errors
- Verify file names match exactly

### Camera not working
- Check browser permissions for camera access
- Ensure you're using HTTPS (required for camera access in production)
- Try in a different browser

### Face detection not working
- Ensure good lighting
- Face should be clearly visible
- Remove glasses or mask if causing issues

### Low recognition accuracy
- Adjust similarity threshold in `app/api/student/face/mark-attendance/route.ts`
- Current threshold is 0.6 (60% similarity)
- Increase for stricter matching, decrease for more lenient

## Notes

- Face recognition works entirely in the browser - no images are sent to the server, only face descriptors (128 numbers)
- Privacy-friendly: Actual face images are not stored unless you add image_url support
- Works on all modern browsers with WebRTC support

