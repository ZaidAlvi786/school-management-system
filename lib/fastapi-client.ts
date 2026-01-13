/**
 * FastAPI client helper
 * Centralized configuration for FastAPI backend calls
 */

import type { Campus, Principal, Class, Teacher, Section } from "@/lib/types/database";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

/**
 * Get JWT token from NextAuth token endpoint
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const response = await fetch("/api/auth/token", {
      credentials: "include", // Include cookies for session
    });

    if (response.ok) {
      const data = await response.json();
      return data.token || null;
    }

    return null;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
}

/**
 * Make authenticated request to FastAPI
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as any)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${FASTAPI_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============ Face Recognition ============

export interface FaceRegisterRequest {
  user_id: string;
  role: "student" | "teacher";
  base64_images: string[]; // 1-10 images for better accuracy
  liveness_verified?: boolean;
  challenge_type?: "blink" | "head_left" | "head_right" | "combined";
}

export interface FaceRegisterResponse {
  success: boolean;
  message: string;
}

export async function registerFace(
  user_id: string,
  role: "student" | "teacher",
  base64_images: string[], // Array of 1-10 images
  liveness_verified: boolean = false,
  challenge_type?: "blink" | "head_left" | "head_right" | "combined"
): Promise<FaceRegisterResponse> {
  return apiRequest<FaceRegisterResponse>("/api/face/register", {
    method: "POST",
    body: JSON.stringify({ 
      user_id, 
      role, 
      base64_images, // Send array instead of single image
      liveness_verified,
      challenge_type
    }),
  });
}

export interface AttendanceMarkRequest {
  base64_image: string;
  role: "student" | "teacher";
  class_id?: string;
  device_type?: string;
  liveness_verified?: boolean;
  liveness_images?: string[];
  challenge_type?: "blink" | "head_left" | "head_right" | "combined";
}

export interface AttendanceMarkResponse {
  success: boolean;
  status: string;
  user_id: string;
  message: string;
  already_marked?: boolean;
  is_late?: boolean;
  late_minutes?: number;
  confidence?: number;
}

export async function markAttendance(
  base64_image: string,
  role: "student" | "teacher",
  class_id?: string,
  device_type: string = "web",
  liveness_verified: boolean = false,
  liveness_images?: string[],
  challenge_type?: "blink" | "head_left" | "head_right" | "combined"
): Promise<AttendanceMarkResponse> {
  const requestData: AttendanceMarkRequest = {
    base64_image,
    role,
    class_id,
    device_type,
    liveness_verified,
    liveness_images,
    challenge_type,
  };
  
  return apiRequest<AttendanceMarkResponse>("/api/attendance/mark", {
    method: "POST",
    body: JSON.stringify(requestData),
  });
}

// ============ Auth ============

export async function getCurrentUser() {
  return apiRequest("/api/auth/me");
}

export async function verifyToken(token: string) {
  return apiRequest("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

// ============ Public Auth (Signup/Domain) ============
export async function checkDomain(domain: string): Promise<{ available: boolean; message?: string }> {
  return apiRequest<{ available: boolean; message?: string }>(`/api/auth/check-domain?domain=${encodeURIComponent(domain)}`);
}

export async function userSignup(payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "student" | "teacher" | "parent" | "principal";
}): Promise<{ message: string; user?: any }> {
  return apiRequest<{ message: string; user?: any }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function adminSignup(formData: FormData): Promise<{ message: string; school?: any }> {
  const token = await getAuthToken(); // optional if endpoint requires auth, otherwise can omit
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(`${FASTAPI_URL}/api/auth/admin-signup`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || error.message || "Admin signup failed");
  }
  return response.json();
}

// ============ Profile ============

export interface ProfileResponse {
  name: string;
  email: string;
  phone?: string;
  profilePicture?: string;
}

export async function getProfile(): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>("/api/profile");
}

export async function updateProfile(data: { name?: string; phone?: string }) {
  return apiRequest("/api/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest("/api/profile/password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function uploadProfilePicture(image: File) {
  const formData = new FormData();
  formData.append("image", image);

  const token = await getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${FASTAPI_URL}/api/profile/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || error.message || "Failed to upload picture");
  }

  const data = await response.json();
  // Return in format expected by frontend
  return {
    url: data.profilePicture || data.url,
    profilePicture: data.profilePicture || data.url,
  };
}

// ============ Student ============

export async function getStudentInfo() {
  return apiRequest("/api/student/info");
}

export async function getStudentInfoById(studentId: string): Promise<{ name: string;[key: string]: any }> {
  return apiRequest<{ name: string;[key: string]: any }>(`/api/student/info?id=${encodeURIComponent(studentId)}`);
}

export async function getStudentGrades(): Promise<any[]> {
  return apiRequest<any[]>("/api/student/grades");
}

export async function getStudentAttendance(classId?: string): Promise<any[]> {
  const params = classId ? `?classId=${classId}` : "";
  return apiRequest<any[]>(`/api/student/attendance${params}`);
}

export async function getStudentHomework(): Promise<any[]> {
  return apiRequest<any[]>("/api/student/homework");
}

export async function markHomeworkDone(homeworkId: string) {
  return apiRequest("/api/student/homework/mark-done", {
    method: "POST",
    body: JSON.stringify({ homeworkId }),
  });
}

export async function getStudentMaterials(): Promise<any[]> {
  return apiRequest<any[]>("/api/student/materials");
}

export async function getStudentSyllabus(): Promise<any[]> {
  return apiRequest<any[]>("/api/student/syllabus");
}

export async function getStudentQRCode(): Promise<any> {
  return apiRequest<any>("/api/student/qr-code");
}

export async function getStudentForecast(): Promise<any> {
  return apiRequest<any>("/api/student/forecast");
}

// ============ Teacher ============

export async function getTeacherStudents(): Promise<any> {
  return apiRequest<any>("/api/teacher/students");
}

export async function createStudent(data: any) {
  return apiRequest("/api/teacher/students", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTeacherMaterials(): Promise<any[]> {
  return apiRequest<any[]>("/api/teacher/materials");
}

export async function createMaterial(data: FormData) {
  const token = await getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${FASTAPI_URL}/api/teacher/materials`, {
    method: "POST",
    headers,
    body: data,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || error.message || "Failed to create material");
  }

  return response.json();
}

export async function updateMaterial(materialId: string, data: { title?: string; description?: string }) {
  return apiRequest(`/api/teacher/materials/${materialId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMaterial(materialId: string) {
  return apiRequest(`/api/teacher/materials/${materialId}`, {
    method: "DELETE",
  });
}

export async function getTeacherSyllabus(): Promise<any> {
  return apiRequest<any>("/api/teacher/syllabus");
}

export async function createSyllabus(data: any) {
  return apiRequest("/api/teacher/syllabus", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSyllabus(syllabusId: string, data: any) {
  return apiRequest(`/api/teacher/syllabus/${syllabusId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteSyllabus(syllabusId: string) {
  return apiRequest(`/api/teacher/syllabus/${syllabusId}`, {
    method: "DELETE",
  });
}

export async function getSyllabusSubjectsClasses(): Promise<any> {
  return apiRequest<any>("/api/teacher/syllabus/subjects-classes");
}

export async function getPaperSyllabus(subjectId: string, classId: string): Promise<any> {
  return apiRequest<any>(`/api/teacher/paper/syllabus?subjectId=${subjectId}&classId=${classId}`);
}

export async function getSavedFormats(): Promise<any> {
  return apiRequest<any>("/api/teacher/paper/saved-formats");
}

export async function getTeacherAttendance(): Promise<any[]> {
  return apiRequest<any[]>("/api/teacher/attendance");
}

export async function getFaceStatus(): Promise<{ hasRegisteredFace: boolean }> {
  const response = await apiRequest<{ hasRegisteredFace?: boolean; is_registered?: boolean }>("/api/face/status");
  // Map backend response (is_registered) to frontend format (hasRegisteredFace)
  return {
    hasRegisteredFace: response.hasRegisteredFace ?? response.is_registered ?? false
  };
}

export async function markAttendanceManual(data: {
  studentId: string;
  date: string;
  status: string;
  remarks?: string;
}): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>("/api/teacher/attendance/mark", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getClassesSubjects(): Promise<any> {
  return apiRequest<any>("/api/teacher/classes-subjects");
}

export async function getHomeworkCompletions(homeworkId: string): Promise<any> {
  return apiRequest<any>(`/api/teacher/homework/completions?homeworkId=${homeworkId}`);
}

export async function approveHomework(data: {
  completionId: string;
  status: "approved" | "rejected";
  feedback?: string;
}) {
  return apiRequest("/api/teacher/homework/approve", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ============ Admin ============

export async function getSchools(): Promise<any[]> {
  return apiRequest<any[]>("/api/admin/schools");
}

export async function createSchool(data: any) {
  return apiRequest("/api/admin/schools", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTeachers(): Promise<Teacher[]> {
  return apiRequest<Teacher[]>("/api/admin/teachers");
}

export async function assignSubject(data: any) {
  return apiRequest("/api/admin/teachers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSubjectTeacher(data: any) {
  return apiRequest("/api/admin/teachers", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export interface ClassWithRelations extends Omit<Class, "campus_id"> {
  campus?: {
    id: string;
    name: string;
    school_id: string;
  };
  sections?: Section[];
}

export async function getClasses(campusId?: string): Promise<ClassWithRelations[]> {
  const params = campusId ? `?campusId=${campusId}` : "";
  return apiRequest<ClassWithRelations[]>(`/api/admin/classes${params}`);
}

export async function createClass(data: any) {
  return apiRequest("/api/admin/classes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateClass(data: any) {
  return apiRequest("/api/admin/classes", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteClass(id: string) {
  return apiRequest(`/api/admin/classes?id=${id}`, {
    method: "DELETE",
  });
}

export async function getPrincipals(): Promise<Principal[]> {
  return apiRequest<Principal[]>("/api/admin/principals");
}

export async function createPrincipal(data: any) {
  return apiRequest("/api/admin/principals", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePrincipal(data: any) {
  return apiRequest("/api/admin/principals", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePrincipal(id: string) {
  return apiRequest(`/api/admin/principals?id=${id}`, {
    method: "DELETE",
  });
}

export async function createSection(data: any) {
  return apiRequest("/api/admin/sections", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSection(data: any) {
  return apiRequest("/api/admin/sections", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteSection(id: string) {
  return apiRequest(`/api/admin/sections?id=${id}`, {
    method: "DELETE",
  });
}

export async function getCampuses(schoolId?: string): Promise<Campus[]> {
  const params = schoolId ? `?schoolId=${schoolId}` : "";
  return apiRequest<Campus[]>(`/api/admin/campuses${params}`);
}

export async function createCampus(data: any) {
  return apiRequest("/api/admin/campuses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCampus(data: any) {
  return apiRequest("/api/admin/campuses", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCampus(id: string) {
  return apiRequest(`/api/admin/campuses?id=${id}`, {
    method: "DELETE",
  });
}

export async function getTimetable(): Promise<any> {
  return apiRequest<any>("/api/admin/timetable");
}

export async function createTimetable(data: any) {
  return apiRequest("/api/admin/timetable", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface Analytics {
  overview: {
    totalSchools: number;
    totalCampuses: number;
    totalClasses: number;
    totalSections: number;
    totalStudents: number;
    totalTeachers: number;
    averageGrade: string;
    attendanceRate: string;
  };
  classStats: Array<{
    className: string;
    level: number;
    sections: number;
    students: number;
    averageGrade: string;
  }>;
}

export async function getAnalytics(): Promise<Analytics> {
  return apiRequest<Analytics>("/api/admin/analytics");
}

export async function getInsights(type?: string) {
  const params = type ? `?type=${type}` : "";
  return apiRequest(`/api/admin/insights${params}`);
}

export async function generateInsights(data: { type?: string }) {
  return apiRequest("/api/admin/insights", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface GetWarningsResponse {
  atRiskStudents: Array<{
    _id: string;
    name: string;
    email: string;
    className: string;
    section: string;
    averageGrade: string;
    attendancePercentage: string;
  }>;
  aiInsights: Array<{
    _id: string;
    title: string;
    description: string;
    severity: string;
    student?: {
      user?: {
        name: string;
      };
    };
    createdAt: string;
  }>;
}

export async function getWarnings(): Promise<GetWarningsResponse> {
  return apiRequest<GetWarningsResponse>("/api/admin/warnings");
}

export interface SearchUsersResponse {
  users: Array<{
    _id: string;
    email: string;
    name: string;
    role: string;
    phone?: string;
  }>;
}

export async function searchUsers(email: string, role?: string): Promise<SearchUsersResponse> {
  const params = new URLSearchParams({ email });
  if (role) params.append("role", role);
  return apiRequest<SearchUsersResponse>(`/api/admin/users/search?${params}`);
}

export async function getTeacherAttendanceAdmin(date?: string, status?: string) {
  const params = new URLSearchParams();
  if (date) params.append("date", date);
  if (status) params.append("status", status);
  const query = params.toString() ? `?${params}` : "";
  return apiRequest<any[]>(`/api/admin/teacher-attendance${query}`);
}

// ============ Principal ============

export async function getPrincipalTeachers(): Promise<any[]> {
  return apiRequest<any[]>("/api/principal/teachers");
}

export async function createPrincipalTeacher(data: any) {
  return apiRequest("/api/principal/teachers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function assignTeacher(data: any) {
  return apiRequest("/api/admin/teachers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createTeacher(data: any) {
  return apiRequest("/api/principal/teachers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPrincipalTimetable(): Promise<{ junior?: any; senior?: any }> {
  return apiRequest<{ junior?: any; senior?: any }>("/api/principal/timetable");
}

export async function createPrincipalTimetable(data: any) {
  return apiRequest("/api/principal/timetable", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPrincipalTeacherAttendance(date?: string) {
  const params = date ? `?date=${date}` : "";
  return apiRequest(`/api/principal/teacher-attendance${params}`);
}

// ============ AI ============

export async function generateHomework(data: {
  subject: string;
  topic: string;
  difficulty: string;
  count: number;
}): Promise<any> {
  return apiRequest("/api/ai/homework", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function generatePaper(data: {
  subject: string;
  classLevel: string;
  examType: string;
  topics: string[];
  totalMarks?: number;
}): Promise<any> {
  return apiRequest("/api/ai/generate-paper", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function gradeAnswer(data: {
  studentAnswer: string;
  correctAnswer: string;
  question: string;
  maxMarks: number;
}): Promise<any> {
  return apiRequest("/api/ai/grade", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function predictPerformance(data: {
  pastGrades: any[];
  attendance: any;
  syllabusProgress: any;
}): Promise<any> {
  return apiRequest("/api/ai/forecast", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function generateInsightsAI(data: {
  type: string;
  data: any;
}): Promise<any> {
  return apiRequest("/api/ai/insights", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ============ Papers ============

export async function getPapers(): Promise<any[]> {
  return apiRequest<any[]>("/api/papers");
}

export async function createPaper(data: FormData) {
  const token = await getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${FASTAPI_URL}/api/papers`, {
    method: "POST",
    headers,
    body: data,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || error.message || "Failed to create paper");
  }

  return response.json();
}

export async function downloadPaper(paperId: string) {
  const token = await getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${FASTAPI_URL}/api/papers/${paperId}/download`, {
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || error.message || "Failed to download paper");
  }

  return response;
}

// ============ General ============

export async function getGrades(): Promise<any[]> {
  return apiRequest<any[]>("/api/grades");
}

export async function createGrade(data: any) {
  return apiRequest("/api/grades", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getHomework(): Promise<any[]> {
  return apiRequest<any[]>("/api/homework");
}

export async function createHomework(data: any) {
  return apiRequest("/api/homework", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getAttendance(classId?: string): Promise<any[]> {
  const params = classId ? `?classId=${classId}` : "";
  return apiRequest<any[]>(`/api/attendance${params}`);
}
