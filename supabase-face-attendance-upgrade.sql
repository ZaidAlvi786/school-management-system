-- Face Attendance System Upgrade Migration
-- Run this SQL in your Supabase SQL Editor
-- This migration adds confidence tracking and improves the face_encodings table

-- ============================================
-- 1. Add confidence column to attendance table
-- ============================================
DO $$ 
BEGIN
  -- Add confidence column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'confidence'
  ) THEN
    ALTER TABLE attendance ADD COLUMN confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1);
    COMMENT ON COLUMN attendance.confidence IS 'Face recognition confidence score (0-1) for attendance marked via face recognition';
  END IF;
END $$;

-- ============================================
-- 2. Add quality tracking to face_encodings table
-- ============================================
DO $$ 
BEGIN
  -- Add quality_score column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'face_encodings' AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE face_encodings ADD COLUMN quality_score FLOAT;
    COMMENT ON COLUMN face_encodings.quality_score IS 'Image quality score (0-100) when face was registered';
  END IF;

  -- Add face_size column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'face_encodings' AND column_name = 'face_size'
  ) THEN
    ALTER TABLE face_encodings ADD COLUMN face_size INTEGER;
    COMMENT ON COLUMN face_encodings.face_size IS 'Face size in pixels when registered';
  END IF;
END $$;

-- ============================================
-- 3. Add index for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_attendance_confidence ON attendance(confidence) WHERE confidence IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_face_encodings_quality ON face_encodings(quality_score) WHERE quality_score IS NOT NULL;

-- ============================================
-- 4. Add function to get attendance statistics
-- ============================================
CREATE OR REPLACE FUNCTION get_face_attendance_stats(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_face_attendance BIGINT,
  avg_confidence NUMERIC,
  min_confidence NUMERIC,
  max_confidence NUMERIC,
  low_confidence_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_face_attendance,
    ROUND(AVG(confidence)::numeric, 4) as avg_confidence,
    ROUND(MIN(confidence)::numeric, 4) as min_confidence,
    ROUND(MAX(confidence)::numeric, 4) as max_confidence,
    COUNT(*) FILTER (WHERE confidence < 0.6) as low_confidence_count
  FROM attendance
  WHERE confidence IS NOT NULL
    AND date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_face_attendance_stats IS 'Get statistics about face-based attendance including average confidence scores';

-- ============================================
-- 5. Add view for face attendance with confidence
-- ============================================
CREATE OR REPLACE VIEW face_attendance_with_confidence AS
SELECT 
  a.id,
  a.user_id,
  a.role,
  a.class_id,
  a.date,
  a.time,
  a.status,
  a.confidence,
  a.device_type,
  a.is_late,
  a.late_minutes,
  u.name as user_name,
  u.email as user_email,
  c.name as class_name,
  CASE 
    WHEN a.confidence >= 0.8 THEN 'high'
    WHEN a.confidence >= 0.6 THEN 'medium'
    WHEN a.confidence < 0.6 THEN 'low'
    ELSE NULL
  END as confidence_level,
  a.created_at,
  a.updated_at
FROM attendance a
JOIN users u ON a.user_id = u.id
LEFT JOIN classes c ON a.class_id = c.id
WHERE a.confidence IS NOT NULL;

COMMENT ON VIEW face_attendance_with_confidence IS 'Attendance records marked via face recognition with confidence scores';

-- ============================================
-- Migration Complete
-- ============================================
-- This migration adds:
-- 1. Confidence tracking for face-based attendance
-- 2. Quality metrics for face registrations
-- 3. Performance indexes
-- 4. Statistics function for monitoring
-- 5. View for easy querying of face attendance with confidence
