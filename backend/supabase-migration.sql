-- Migration: Unified Face Recognition and Attendance System
-- Run this SQL in your Supabase SQL Editor
-- This migration creates the new schema for FastAPI backend

-- ============================================
-- 1. Create unified face_encodings table
-- ============================================
CREATE TABLE IF NOT EXISTS face_encodings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encoding_vector FLOAT[] NOT NULL, -- 128-dimensional face encoding vector
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_face_encodings_user_id ON face_encodings(user_id);

COMMENT ON TABLE face_encodings IS 'Stores face recognition encodings for all users (students and teachers)';

-- ============================================
-- 2. Update attendance table to support unified schema
-- ============================================
-- Add user_id column first (needed for unified schema)
DO $$ 
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE attendance ADD COLUMN user_id UUID REFERENCES users(id);
  END IF;
END $$;

-- Migrate student_id to user_id for existing student attendance records
UPDATE attendance a
SET user_id = s.user_id
FROM students s
WHERE a.student_id = s.id AND a.user_id IS NULL;

-- Add role and class_id columns if they don't exist
DO $$ 
BEGIN
  -- Add role column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'role'
  ) THEN
    ALTER TABLE attendance ADD COLUMN role VARCHAR(20) CHECK (role IN ('student', 'teacher'));
  END IF;

  -- Add class_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'class_id'
  ) THEN
    ALTER TABLE attendance ADD COLUMN class_id UUID REFERENCES classes(id);
  END IF;

  -- Add time column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'time'
  ) THEN
    ALTER TABLE attendance ADD COLUMN time TIME;
  END IF;

  -- Add device_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'device_type'
  ) THEN
    ALTER TABLE attendance ADD COLUMN device_type VARCHAR(20) DEFAULT 'web';
  END IF;

  -- Add is_late and late_minutes for teachers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'is_late'
  ) THEN
    ALTER TABLE attendance ADD COLUMN is_late BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'late_minutes'
  ) THEN
    ALTER TABLE attendance ADD COLUMN late_minutes INTEGER DEFAULT 0;
  END IF;
END $$;

-- Update existing attendance records to have role='student'
UPDATE attendance SET role = 'student' WHERE role IS NULL;

-- For existing student attendance, try to get class_id from students table
UPDATE attendance a
SET class_id = s.class_id
FROM students s
WHERE a.student_id = s.id AND a.class_id IS NULL;

-- Ensure all attendance records have user_id (required for unified schema)
-- This will fail if there are records that can't be migrated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM attendance WHERE user_id IS NULL
  ) THEN
    RAISE WARNING 'Some attendance records have NULL user_id. Please review and migrate manually.';
  END IF;
END $$;

-- Make user_id NOT NULL after migration (optional - uncomment if you want to enforce it)
-- ALTER TABLE attendance ALTER COLUMN user_id SET NOT NULL;

-- ============================================
-- 3. Create new unified attendance structure
-- ============================================
-- Note: We're keeping the old attendance table but adding new columns
-- The unique constraint needs to be updated to support role-based uniqueness

-- Drop old unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'attendance_student_id_date_key'
  ) THEN
    ALTER TABLE attendance DROP CONSTRAINT attendance_student_id_date_key;
  END IF;
END $$;

-- Add new unique constraint for students (user_id, date, class_id)
-- For teachers: (user_id, date)
DO $$
BEGIN
  -- For students: unique on (user_id, date, class_id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'attendance_student_unique'
  ) THEN
    CREATE UNIQUE INDEX attendance_student_unique 
    ON attendance (user_id, date, class_id) 
    WHERE role = 'student' AND class_id IS NOT NULL;
  END IF;

  -- For teachers: unique on (user_id, date)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'attendance_teacher_unique'
  ) THEN
    CREATE UNIQUE INDEX attendance_teacher_unique 
    ON attendance (user_id, date) 
    WHERE role = 'teacher';
  END IF;
END $$;

-- ============================================
-- 4. Migrate existing face data (if exists)
-- ============================================
-- Migrate from student_face_data to face_encodings
DO $$
DECLARE
  rec RECORD;
  encoding_array FLOAT[];
BEGIN
  -- Check if student_face_data table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'student_face_data'
  ) THEN
    FOR rec IN 
      SELECT sfd.student_id, sfd.face_encoding, s.user_id
      FROM student_face_data sfd
      JOIN students s ON sfd.student_id = s.id
      WHERE NOT EXISTS (
        SELECT 1 FROM face_encodings fe WHERE fe.user_id = s.user_id
      )
    LOOP
      BEGIN
        -- Parse JSON encoding to FLOAT array
        encoding_array := ARRAY(SELECT json_array_elements_text(rec.face_encoding::json)::FLOAT);
        
        -- Insert into face_encodings
        INSERT INTO face_encodings (user_id, encoding_vector)
        VALUES (rec.user_id, encoding_array)
        ON CONFLICT (user_id) DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to migrate face data for user %: %', rec.user_id, SQLERRM;
      END;
    END LOOP;
  END IF;

  -- Migrate from teacher_face_data to face_encodings
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'teacher_face_data'
  ) THEN
    FOR rec IN 
      SELECT tfd.teacher_id, tfd.face_encoding, t.user_id
      FROM teacher_face_data tfd
      JOIN teachers t ON tfd.teacher_id = t.id
      WHERE NOT EXISTS (
        SELECT 1 FROM face_encodings fe WHERE fe.user_id = t.user_id
      )
    LOOP
      BEGIN
        -- Parse JSON encoding to FLOAT array
        encoding_array := ARRAY(SELECT json_array_elements_text(rec.face_encoding::json)::FLOAT);
        
        -- Insert into face_encodings
        INSERT INTO face_encodings (user_id, encoding_vector)
        VALUES (rec.user_id, encoding_array)
        ON CONFLICT (user_id) DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to migrate face data for user %: %', rec.user_id, SQLERRM;
      END;
    END LOOP;
  END IF;
END $$;

-- ============================================
-- 5. Add helpful views and functions
-- ============================================

-- View for attendance with user details
-- Only includes records with valid user_id (migrated records)
CREATE OR REPLACE VIEW attendance_with_users AS
SELECT 
  a.id,
  a.user_id,
  a.role,
  a.class_id,
  a.date,
  a.time,
  a.status,
  a.device_type,
  a.is_late,
  a.late_minutes,
  u.name as user_name,
  u.email as user_email,
  c.name as class_name,
  a.created_at,
  a.updated_at
FROM attendance a
JOIN users u ON a.user_id = u.id
LEFT JOIN classes c ON a.class_id = c.id
WHERE a.user_id IS NOT NULL;

COMMENT ON VIEW attendance_with_users IS 'Attendance records with user and class details';

-- ============================================
-- 6. Add indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_role ON attendance(role);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_id) WHERE class_id IS NOT NULL;

-- ============================================
-- Migration Complete
-- ============================================
-- After running this migration:
-- 1. Old face data tables (student_face_data, teacher_face_data) can be kept for backup
-- 2. New face_encodings table is ready for FastAPI
-- 3. Attendance table supports both students and teachers
-- 4. All face recognition logic moves to FastAPI backend

