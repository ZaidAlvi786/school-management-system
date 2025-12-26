// Database type definitions for Supabase PostgreSQL schema

export interface User {
  id: string;
  email: string;
  password: string;
  role: "principal" | "teacher" | "student" | "parent" | "admin";
  name: string;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface School {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  province: string;
  principal_id?: string | null;
  type: "government" | "private";
  domain?: string | null;
  certificate_type?: "upload" | "number" | null;
  certificate_number?: string | null;
  certificate_url?: string | null;
  registration_status?: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface Principal {
  id: string;
  user_id: string;
  employee_id: string;
  school_id?: string | null;
  qualification?: string | null;
  experience: number;
  created_at: string;
  updated_at: string;
}

export interface Campus {
  id: string;
  name: string;
  school_id: string;
  address: string;
  incharge_id?: string | null;
  principal_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  name: string;
  level: number;
  campus_id: string;
  class_incharge_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  name: string;
  class_id: string;
  capacity: number;
  current_strength: number;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  class_id: string;
  teacher_id: string;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  user_id: string;
  employee_id: string;
  school_id: string;
  qualification?: string | null;
  experience: number;
  created_at: string;
  updated_at: string;
}

export interface TeacherSubject {
  teacher_id: string;
  subject_id: string;
}

export interface Parent {
  id: string;
  user_id: string;
  cnic: string;
  occupation?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  user_id: string;
  roll_number: string;
  admission_number: string;
  class_id: string;
  section_id: string;
  parent_id?: string | null;
  date_of_birth: string;
  address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  remarks?: string | null;
  marked_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface Grade {
  id: string;
  student_id: string;
  subject_id: string;
  exam_type: "quiz" | "assignment" | "midterm" | "final" | "project";
  marks: number;
  total_marks: number;
  percentage: number;
  teacher_id: string;
  remarks?: string | null;
  ai_suggested_grade?: number | null;
  ai_explanation?: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  subject_id: string;
  class_id: string;
  section_id?: string | null;
  assigned_by_id: string;
  due_date: string;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface Paper {
  id: string;
  title: string;
  subject_id: string;
  class_id: string;
  syllabus_info: string;
  sample_paper_url?: string | null;
  generated_content: string;
  docx_file_url?: string | null;
  generated_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  title: string;
  description?: string | null;
  subject_id: string;
  class_id: string;
  file_url: string;
  file_type: string;
  uploaded_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface Syllabus {
  id: string;
  subject_id: string;
  class_id: string;
  topic: string;
  status: "pending" | "in-progress" | "completed";
  start_date?: string | null;
  completion_date?: string | null;
  notes?: string | null;
  materials?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface AIInsight {
  id: string;
  type: "weak_student" | "weak_teacher" | "syllabus_delay" | "class_improvement" | "early_warning";
  school_id?: string | null;
  class_id?: string | null;
  student_id?: string | null;
  teacher_id?: string | null;
  subject_id?: string | null;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  recommendations?: string[] | null;
  data?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  domain: string;
  school_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminDomain {
  id: string;
  domain: string;
  description?: string | null;
  is_active: boolean;
  created_by_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminDomainRequest {
  id: string;
  email: string;
  domain: string;
  organization: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by_id?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Helper types for joins/populated data
export interface UserWithRelations extends User {
  principal?: Principal;
  teacher?: Teacher;
  student?: Student;
  parent?: Parent;
}

export interface StudentWithRelations extends Student {
  user?: User;
  class?: Class;
  section?: Section;
  parent?: Parent;
}

export interface TeacherWithRelations extends Teacher {
  user?: User;
  school?: School;
  subjects?: Subject[];
}

