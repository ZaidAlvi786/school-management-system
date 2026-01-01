-- Syllabus Term-Based System Migration
-- Run this SQL in your Supabase SQL Editor

-- Update syllabus table to support terms
ALTER TABLE syllabus 
ADD COLUMN IF NOT EXISTS term VARCHAR(20) CHECK (term IN ('term1', 'term2', 'term3', 'final')),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS assigned_by_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS target_completion_date DATE;

-- Create index for term-based queries
CREATE INDEX IF NOT EXISTS idx_syllabus_term ON syllabus(term);
CREATE INDEX IF NOT EXISTS idx_syllabus_subject_class_term ON syllabus(subject_id, class_id, term);
CREATE INDEX IF NOT EXISTS idx_syllabus_is_completed ON syllabus(is_completed);

-- Update existing syllabus records to have term1 as default
UPDATE syllabus SET term = 'term1' WHERE term IS NULL;

-- Add comments
COMMENT ON COLUMN syllabus.term IS 'Term identifier: term1, term2, term3, or final';
COMMENT ON COLUMN syllabus.is_completed IS 'Whether this syllabus topic has been completed before final term papers';
COMMENT ON COLUMN syllabus.target_completion_date IS 'Target date to complete this topic before final term';

