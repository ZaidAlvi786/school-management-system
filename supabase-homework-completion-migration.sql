-- Homework Completion Tracking Migration
-- Run this SQL in your Supabase SQL Editor

-- Homework completions table
CREATE TABLE IF NOT EXISTS homework_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  homework_id UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'approved', 'rejected')),
  completed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by_id UUID REFERENCES users(id),
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by_id UUID REFERENCES users(id),
  rejection_reason TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(homework_id, student_id)
);

CREATE INDEX idx_homework_completions_homework_id ON homework_completions(homework_id);
CREATE INDEX idx_homework_completions_student_id ON homework_completions(student_id);
CREATE INDEX idx_homework_completions_status ON homework_completions(status);

-- Add comments
COMMENT ON TABLE homework_completions IS 'Tracks homework completion status for each student, including approval workflow';
COMMENT ON COLUMN homework_completions.status IS 'pending: student marked as done, awaiting teacher approval; completed: student marked as done; approved: teacher approved; rejected: teacher rejected';

