-- Add face recognition support for students
-- Run this SQL in your Supabase SQL Editor

-- Student face data table to store face embeddings
CREATE TABLE IF NOT EXISTS student_face_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  face_encoding TEXT NOT NULL, -- JSON array of face encoding/embedding
  image_url TEXT, -- Optional: URL to stored face image
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_student_face_data_student_id ON student_face_data(student_id);

-- Add comment
COMMENT ON TABLE student_face_data IS 'Stores face recognition data for students to enable face-based attendance marking';

