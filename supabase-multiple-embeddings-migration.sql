-- Face Attendance System - Multiple Embeddings & Model Versioning Migration
-- Run this SQL in your Supabase SQL Editor
-- This migration enables multiple face embeddings per user and model versioning

-- ============================================
-- 1. Modify face_encodings table to support multiple embeddings per user
-- ============================================

-- Drop the unique constraint on user_id (if exists) to allow multiple embeddings per user
DO $$ 
BEGIN
  -- Remove unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'face_encodings_user_id_key'
  ) THEN
    ALTER TABLE face_encodings DROP CONSTRAINT face_encodings_user_id_key;
  END IF;
  
  -- Remove unique index if it exists
  DROP INDEX IF EXISTS idx_face_encodings_user_id_unique;
END $$;

-- Add model_version column for tracking which model generated the embedding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'face_encodings' AND column_name = 'model_version'
  ) THEN
    ALTER TABLE face_encodings ADD COLUMN model_version VARCHAR(50) DEFAULT 'dlib-face-recognition-1.3.0';
    COMMENT ON COLUMN face_encodings.model_version IS 'Version of the face recognition model used (e.g., dlib-face-recognition-1.3.0, arcface-1.0, facenet-1.0)';
  END IF;
END $$;

-- Add registration_index to track order of images during registration (1, 2, 3, ...)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'face_encodings' AND column_name = 'registration_index'
  ) THEN
    ALTER TABLE face_encodings ADD COLUMN registration_index INTEGER DEFAULT 1;
    COMMENT ON COLUMN face_encodings.registration_index IS 'Index of this embedding in the registration sequence (1-10 for 5-10 images)';
  END IF;
END $$;

-- Add is_primary flag to mark the best/primary embedding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'face_encodings' AND column_name = 'is_primary'
  ) THEN
    ALTER TABLE face_encodings ADD COLUMN is_primary BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN face_encodings.is_primary IS 'True if this is the primary/best quality embedding for the user';
  END IF;
END $$;

-- Add embedding_dimension to track vector size (128 for dlib, 512 for ArcFace, etc.)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'face_encodings' AND column_name = 'embedding_dimension'
  ) THEN
    ALTER TABLE face_encodings ADD COLUMN embedding_dimension INTEGER DEFAULT 128;
    COMMENT ON COLUMN face_encodings.embedding_dimension IS 'Dimension of the embedding vector (128 for dlib, 512 for ArcFace, etc.)';
  END IF;
END $$;

-- Add liveness_verified column to track if liveness detection was used during registration
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'face_encodings' AND column_name = 'liveness_verified'
  ) THEN
    ALTER TABLE face_encodings ADD COLUMN liveness_verified BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN face_encodings.liveness_verified IS 'True if liveness detection (blink, head movement) was verified during registration';
  END IF;
END $$;

-- ============================================
-- 2. Create indexes for performance
-- ============================================

-- Index for querying all embeddings for a user
CREATE INDEX IF NOT EXISTS idx_face_encodings_user_id ON face_encodings(user_id);
CREATE INDEX IF NOT EXISTS idx_face_encodings_user_primary ON face_encodings(user_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_face_encodings_model_version ON face_encodings(model_version);

-- Composite index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_face_encodings_user_model ON face_encodings(user_id, model_version);

-- ============================================
-- 3. Create a view for easy querying of primary embeddings
-- ============================================

CREATE OR REPLACE VIEW face_encodings_primary AS
SELECT DISTINCT ON (user_id) 
    id,
    user_id,
    encoding_vector,
    model_version,
    embedding_dimension,
    quality_score,
    face_size,
    registration_index,
    is_primary,
    liveness_verified,
    created_at,
    updated_at
FROM face_encodings
WHERE is_primary = TRUE OR (
    -- If no primary is set, get the one with highest quality_score
    NOT EXISTS (
        SELECT 1 FROM face_encodings fe2 
        WHERE fe2.user_id = face_encodings.user_id AND fe2.is_primary = TRUE
    )
    AND quality_score = (
        SELECT MAX(quality_score) 
        FROM face_encodings fe3 
        WHERE fe3.user_id = face_encodings.user_id
    )
)
ORDER BY user_id, is_primary DESC, quality_score DESC NULLS LAST, created_at DESC;

-- ============================================
-- 4. Update existing records to have primary flag and model version
-- ============================================

-- Mark existing embeddings as primary (one per user)
UPDATE face_encodings
SET is_primary = TRUE,
    model_version = COALESCE(model_version, 'dlib-face-recognition-1.3.0'),
    embedding_dimension = COALESCE(embedding_dimension, 128),
    registration_index = 1
WHERE id IN (
    SELECT DISTINCT ON (user_id) id
    FROM face_encodings
    ORDER BY user_id, created_at ASC
);

-- ============================================
-- 5. Add constraint to ensure at least one primary embedding per user (optional)
-- ============================================

-- Note: This is a soft constraint - application logic should ensure this
-- We'll add a function to help with this

CREATE OR REPLACE FUNCTION ensure_primary_embedding()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting is_primary = TRUE, unset others for the same user
    IF NEW.is_primary = TRUE THEN
        UPDATE face_encodings
        SET is_primary = FALSE
        WHERE user_id = NEW.user_id AND id != NEW.id AND is_primary = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_ensure_primary_embedding ON face_encodings;
CREATE TRIGGER trigger_ensure_primary_embedding
    BEFORE INSERT OR UPDATE ON face_encodings
    FOR EACH ROW
    EXECUTE FUNCTION ensure_primary_embedding();

-- ============================================
-- 6. Add table for tracking liveness detection attempts during attendance
-- ============================================

CREATE TABLE IF NOT EXISTS liveness_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_type VARCHAR(50) NOT NULL, -- 'registration', 'attendance'
    challenge_type VARCHAR(50) NOT NULL, -- 'blink', 'head_left', 'head_right', 'combined'
    success BOOLEAN NOT NULL DEFAULT FALSE,
    confidence FLOAT,
    metadata JSONB, -- Store additional data like blink count, head angle, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liveness_attempts_user_id ON liveness_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_liveness_attempts_type ON liveness_attempts(attempt_type);
CREATE INDEX IF NOT EXISTS idx_liveness_attempts_created_at ON liveness_attempts(created_at);

COMMENT ON TABLE liveness_attempts IS 'Tracks liveness detection attempts for security auditing';

-- ============================================
-- 7. Add liveness_verified column to attendance table
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'liveness_verified'
  ) THEN
    ALTER TABLE attendance ADD COLUMN liveness_verified BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN attendance.liveness_verified IS 'True if liveness detection was successfully verified during attendance marking';
  END IF;
END $$;

-- ============================================
-- Migration Complete
-- ============================================

SELECT 'Migration completed successfully! Multiple embeddings per user and model versioning are now supported.' AS status;
