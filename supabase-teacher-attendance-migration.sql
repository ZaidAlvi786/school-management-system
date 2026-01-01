-- Teacher Attendance and Timetable Migration
-- Run this SQL in your Supabase SQL Editor

-- Teacher face data table (similar to student)
CREATE TABLE IF NOT EXISTS teacher_face_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID UNIQUE NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  face_encoding TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_teacher_face_data_teacher_id ON teacher_face_data(teacher_id);

-- Teacher biometric data table (for fingerprint)
CREATE TABLE IF NOT EXISTS teacher_biometric_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID UNIQUE NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  device_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_teacher_biometric_data_teacher_id ON teacher_biometric_data(teacher_id);
CREATE INDEX idx_teacher_biometric_data_credential_id ON teacher_biometric_data(credential_id);

-- Teacher attendance table
CREATE TABLE IF NOT EXISTS teacher_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave')),
  is_late BOOLEAN DEFAULT false,
  late_minutes INTEGER DEFAULT 0,
  marked_by_id UUID REFERENCES users(id),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, date)
);

CREATE INDEX idx_teacher_attendance_teacher_id ON teacher_attendance(teacher_id);
CREATE INDEX idx_teacher_attendance_date ON teacher_attendance(date);
CREATE INDEX idx_teacher_attendance_status ON teacher_attendance(status);

-- Timetable table (for school timings)
CREATE TABLE IF NOT EXISTS timetables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  level_type VARCHAR(20) NOT NULL CHECK (level_type IN ('junior', 'senior')),
  level_range VARCHAR(50) NOT NULL, -- e.g., "1-5" for junior, "6-10" for senior
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  late_threshold_minutes INTEGER DEFAULT 15, -- Minutes after start_time to be considered late
  is_active BOOLEAN DEFAULT true,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_timetables_school_id ON timetables(school_id);
CREATE INDEX idx_timetables_level_type ON timetables(level_type);
CREATE INDEX idx_timetables_is_active ON timetables(is_active);

-- Add comments
COMMENT ON TABLE teacher_face_data IS 'Stores face recognition data for teachers';
COMMENT ON TABLE teacher_biometric_data IS 'Stores WebAuthn biometric credentials for teachers';
COMMENT ON TABLE teacher_attendance IS 'Stores teacher attendance records with check-in/out times';
COMMENT ON TABLE timetables IS 'Stores school timetable with different timings for junior and senior levels';

