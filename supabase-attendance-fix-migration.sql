-- Fix Attendance Table for Unified Schema
-- This migration fixes the NOT NULL constraint on student_id to allow teachers

-- ============================================
-- 1. Make student_id nullable (for teachers)
-- ============================================
DO $$ 
BEGIN
  -- Check if student_id is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' 
      AND column_name = 'student_id' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE attendance ALTER COLUMN student_id DROP NOT NULL;
    RAISE NOTICE 'Made student_id nullable';
  ELSE
    RAISE NOTICE 'student_id is already nullable';
  END IF;
END $$;

-- ============================================
-- 2. Make marked_by_id nullable (optional for face-based attendance)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' 
      AND column_name = 'marked_by_id' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE attendance ALTER COLUMN marked_by_id DROP NOT NULL;
    RAISE NOTICE 'Made marked_by_id nullable';
  END IF;
END $$;

-- ============================================
-- 3. Ensure user_id exists and add constraint
-- ============================================
DO $$ 
BEGIN
  -- Add user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE attendance ADD COLUMN user_id UUID REFERENCES users(id);
    RAISE NOTICE 'Added user_id column';
  END IF;

  -- Ensure role exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'role'
  ) THEN
    ALTER TABLE attendance ADD COLUMN role VARCHAR(20) CHECK (role IN ('student', 'teacher'));
    RAISE NOTICE 'Added role column';
  END IF;
END $$;

-- ============================================
-- 4. Add constraint: For students, student_id should be set
-- For teachers, student_id should be NULL
-- ============================================
DO $$ 
BEGIN
  -- Drop existing constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'attendance_student_id_check'
  ) THEN
    ALTER TABLE attendance DROP CONSTRAINT attendance_student_id_check;
  END IF;

  -- Add check constraint: student_id must be NULL for teachers, NOT NULL for students
  ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_check 
    CHECK (
      (role = 'student' AND student_id IS NOT NULL) OR
      (role = 'teacher' AND student_id IS NULL) OR
      (role IS NULL AND student_id IS NOT NULL)  -- Legacy records
    );
  
  RAISE NOTICE 'Added check constraint for student_id';
END $$;

-- ============================================
-- 5. Migrate existing records if needed
-- ============================================
-- Update existing student attendance to have user_id from student_id
UPDATE attendance a
SET user_id = s.user_id
FROM students s
WHERE a.student_id = s.id 
  AND a.user_id IS NULL 
  AND a.student_id IS NOT NULL;

-- Set role for existing records
UPDATE attendance 
SET role = 'student' 
WHERE role IS NULL 
  AND student_id IS NOT NULL;

-- ============================================
-- 6. Update indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_role ON attendance(role);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id) WHERE student_id IS NOT NULL;

-- ============================================
-- Migration Complete
-- ============================================
-- Now:
-- - Teachers can have NULL student_id
-- - Students must have student_id
-- - Both use user_id for unified access
-- - Face-based attendance works for both
