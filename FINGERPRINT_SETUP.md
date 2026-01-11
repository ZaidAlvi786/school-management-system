# Fingerprint & Face Recognition Setup Guide

This guide explains the biometric authentication system for student attendance marking.

## Features

- **Face Recognition**: Students can register their face and mark attendance using face recognition
- **Fingerprint/Biometric**: Students can register their fingerprint (or device biometric) and mark attendance using WebAuthn
- **Dual Support**: Students can use either face recognition OR fingerprint to mark attendance

## Database Setup

### Step 1: Run Face Recognition Migration

If you haven't already, run the face recognition migration:

```sql
-- Run in Supabase SQL Editor
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

### Step 2: Run Fingerprint Migration

Run the fingerprint/biometric migration:

```sql
-- Run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS student_biometric_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  device_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_student_biometric_data_student_id ON student_biometric_data(student_id);
CREATE INDEX idx_student_biometric_data_credential_id ON student_biometric_data(credential_id);
```

Or use the provided migration files:
- `supabase-face-recognition-migration.sql`
- `supabase-fingerprint-migration.sql`

## How It Works

### Face Recognition

1. **Registration**: Student clicks "Register Face" button
2. Camera opens and detects face in real-time
3. When face is detected (green border), student clicks "Capture & Register"
4. Face encoding is extracted and stored in database
5. Student can now mark attendance using face recognition

### Fingerprint/Biometric (WebAuthn)

1. **Registration**: Student clicks "Register Fingerprint" button
2. Browser prompts for biometric authentication (fingerprint/face ID)
3. WebAuthn credential is created and stored in database
4. Student can now mark attendance using fingerprint/biometric

### Attendance Marking

Students can mark attendance using:
- **Face Recognition**: Opens camera, detects face, verifies against stored encoding
- **Fingerprint**: Uses device biometric sensor via WebAuthn

## Requirements

### Face Recognition
- Modern browser with camera access
- `face-api.js` library (already installed)
- Face recognition models in `public/models/` directory

### Fingerprint/Biometric
- **HTTPS or localhost** (required for WebAuthn)
- Device with biometric authentication (fingerprint scanner or face unlock)
- Modern browser supporting WebAuthn API
- For mobile devices, ensure HTTPS is configured (see `HTTPS_SETUP.md`)

## API Endpoints

### Face Recognition
- `GET /api/student/face/check` - Check if face is registered
- `POST /api/student/face/register` - Register face encoding
- `POST /api/student/face/mark-attendance` - Mark attendance with face

### Fingerprint/Biometric
- `POST /api/student/fingerprint/register-challenge` - Get registration challenge
- `POST /api/student/fingerprint/register` - Register fingerprint credential
- `POST /api/student/fingerprint/attendance-challenge` - Get attendance challenge
- `POST /api/student/fingerprint/mark-attendance` - Mark attendance with fingerprint

## Components

- `components/face-registration-dialog.tsx` - Face registration UI
- `components/face-attendance-dialog.tsx` - Face attendance marking UI
- `components/fingerprint-registration-dialog.tsx` - Fingerprint registration UI
- `components/fingerprint-attendance-dialog.tsx` - Fingerprint attendance marking UI

## Security Notes

1. **Face Recognition**: Uses cosine similarity with threshold of 0.6
2. **Fingerprint**: Uses WebAuthn standard with cryptographic verification
3. Both methods require HTTPS in production (except localhost)
4. Fingerprint credentials are stored securely and verified on each use

## Troubleshooting

### Face Registration Not Working
- Check browser console for errors
- Ensure camera permissions are granted
- Verify face-api.js models are loaded correctly
- Check that models are in `public/models/` directory

### Fingerprint Not Working
- Ensure you're using HTTPS or localhost
- Check that device has biometric authentication enabled
- Verify browser supports WebAuthn (Chrome, Firefox, Safari, Edge)
- On mobile, ensure HTTPS is properly configured

### Dialog Not Opening
- Fixed z-index issues in dialog components
- Ensure no other elements are blocking the dialog
- Check browser console for JavaScript errors

## Next Steps

1. Run the database migrations in Supabase SQL Editor
2. Test face registration on a device with camera
3. Test fingerprint registration on a device with biometric sensor
4. Ensure HTTPS is configured for production deployment

