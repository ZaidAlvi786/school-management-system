-- School Management System - Supabase PostgreSQL Schema
-- Run this SQL in your Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (central authentication table)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('principal', 'teacher', 'student', 'parent', 'admin')),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  principal_id UUID REFERENCES users(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('government', 'private')),
  domain VARCHAR(255) UNIQUE,
  certificate_type VARCHAR(20) CHECK (certificate_type IN ('upload', 'number')),
  certificate_number VARCHAR(255),
  certificate_url TEXT,
  registration_status VARCHAR(20) DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_schools_code ON schools(code);
CREATE INDEX idx_schools_domain ON schools(domain);

-- Principals table
CREATE TABLE IF NOT EXISTS principals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id VARCHAR(100) UNIQUE NOT NULL,
  school_id UUID REFERENCES schools(id),
  qualification TEXT,
  experience INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_principals_user_id ON principals(user_id);
CREATE INDEX idx_principals_employee_id ON principals(employee_id);

-- Campuses table
CREATE TABLE IF NOT EXISTS campuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  incharge_id UUID REFERENCES users(id),
  principal_id UUID REFERENCES principals(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campuses_school_id ON campuses(school_id);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  level INTEGER NOT NULL,
  campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  class_incharge_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_classes_campus_id ON classes(campus_id);

-- Sections table
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  capacity INTEGER NOT NULL DEFAULT 40,
  current_strength INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sections_class_id ON sections(class_id);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subjects_class_id ON subjects(class_id);
CREATE INDEX idx_subjects_teacher_id ON subjects(teacher_id);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id VARCHAR(100) UNIQUE NOT NULL,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  qualification TEXT,
  experience INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_subjects (
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, subject_id)
);

CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_teachers_employee_id ON teachers(employee_id);
CREATE INDEX idx_teachers_school_id ON teachers(school_id);

-- Parents table
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cnic VARCHAR(50) UNIQUE NOT NULL,
  occupation VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_parents_user_id ON parents(user_id);
CREATE INDEX idx_parents_cnic ON parents(cnic);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roll_number VARCHAR(100) NOT NULL,
  admission_number VARCHAR(100) UNIQUE NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id),
  section_id UUID NOT NULL REFERENCES sections(id),
  parent_id UUID REFERENCES parents(id),
  date_of_birth DATE NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_roll_number ON students(roll_number);
CREATE INDEX idx_students_admission_number ON students(admission_number);
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_section_id ON students(section_id);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  remarks TEXT,
  marked_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, date)
);

CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);

-- Grades table
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN ('quiz', 'assignment', 'midterm', 'final', 'project')),
  marks DECIMAL(10,2) NOT NULL,
  total_marks DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  teacher_id UUID NOT NULL REFERENCES users(id),
  remarks TEXT,
  ai_suggested_grade DECIMAL(10,2),
  ai_explanation TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_subject_id ON grades(subject_id);
CREATE INDEX idx_grades_date ON grades(date);

-- Homework table
CREATE TABLE IF NOT EXISTS homework (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id),
  assigned_by_id UUID NOT NULL REFERENCES users(id),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_homework_subject_id ON homework(subject_id);
CREATE INDEX idx_homework_class_id ON homework(class_id);
CREATE INDEX idx_homework_due_date ON homework(due_date);

-- Papers table
CREATE TABLE IF NOT EXISTS papers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  syllabus_info TEXT NOT NULL,
  sample_paper_url TEXT,
  generated_content TEXT NOT NULL,
  docx_file_url TEXT,
  generated_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_papers_subject_id ON papers(subject_id);
CREATE INDEX idx_papers_class_id ON papers(class_id);
CREATE INDEX idx_papers_generated_by_id ON papers(generated_by_id);

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  uploaded_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_materials_subject_id ON materials(subject_id);
CREATE INDEX idx_materials_class_id ON materials(class_id);

-- Syllabus table
CREATE TABLE IF NOT EXISTS syllabus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  topic VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  start_date DATE,
  completion_date DATE,
  notes TEXT,
  materials TEXT[], -- Array of material strings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_syllabus_subject_id ON syllabus(subject_id);
CREATE INDEX idx_syllabus_class_id ON syllabus(class_id);

-- AI Insights table
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('weak_student', 'weak_teacher', 'syllabus_delay', 'class_improvement', 'early_warning')),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  recommendations TEXT[],
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_insights_type ON ai_insights(type);
CREATE INDEX idx_ai_insights_school_id ON ai_insights(school_id);
CREATE INDEX idx_ai_insights_class_id ON ai_insights(class_id);

-- Domain table (for school domains)
CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_domains_domain ON domains(domain);
CREATE INDEX idx_domains_school_id ON domains(school_id);

-- Admin Domain table
CREATE TABLE IF NOT EXISTS admin_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_domains_domain ON admin_domains(domain);

-- Admin Domain Requests table
CREATE TABLE IF NOT EXISTS admin_domain_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  organization VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_domain_requests_status ON admin_domain_requests(status);
CREATE INDEX idx_admin_domain_requests_domain ON admin_domain_requests(domain);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_principals_updated_at BEFORE UPDATE ON principals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campuses_updated_at BEFORE UPDATE ON campuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parents_updated_at BEFORE UPDATE ON parents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_homework_updated_at BEFORE UPDATE ON homework FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_papers_updated_at BEFORE UPDATE ON papers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_syllabus_updated_at BEFORE UPDATE ON syllabus FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_insights_updated_at BEFORE UPDATE ON ai_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON domains FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_domains_updated_at BEFORE UPDATE ON admin_domains FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_domain_requests_updated_at BEFORE UPDATE ON admin_domain_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

