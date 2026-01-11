# Complete Route Migration Checklist

## ✅ Migrated Routes

### Authentication & Profile
- ✅ `/api/auth/me` - Get current user
- ✅ `/api/auth/verify` - Verify token
- ✅ `/api/profile` - Get/Update profile

### Face Recognition & Attendance
- ✅ `/api/face/register` - Register face
- ✅ `/api/attendance/mark` - Mark attendance

### Student Routes
- ✅ `/api/student/info` - Get student info
- ✅ `/api/student/grades` - Get grades
- ✅ `/api/student/attendance` - Get attendance
- ✅ `/api/student/homework` - Get homework
- ✅ `/api/student/materials` - Get materials
- ✅ `/api/student/syllabus` - Get syllabus

### Teacher Routes
- ✅ `/api/teacher/students` - Get/Create students
- ✅ `/api/teacher/materials` - Get/Create materials
- ✅ `/api/teacher/syllabus` - Get/Create syllabus
- ✅ `/api/teacher/paper/syllabus` - Get syllabus for paper
- ✅ `/api/teacher/attendance` - Get attendance
- ✅ `/api/teacher/classes-subjects` - Get classes/subjects

### General Routes
- ✅ `/api/grades` - Get/Create grades
- ✅ `/api/homework` - Get/Create homework
- ✅ `/api/attendance` - Get attendance (GET)

## 🔄 Remaining Routes to Migrate

### Student Routes (4)
- [ ] `/api/student/homework/mark-done` - Mark homework done
- [ ] `/api/student/qr-code` - Generate QR code
- [ ] `/api/student/forecast` - Grade forecast
- [ ] `/api/student/fingerprint/*` - Fingerprint (4 routes) - Optional

### Teacher Routes (10+)
- [ ] `/api/teacher/materials/[id]` - Update/Delete material
- [ ] `/api/teacher/syllabus/[id]` - Update/Delete syllabus
- [ ] `/api/teacher/syllabus/subjects-classes` - Get subjects/classes
- [ ] `/api/teacher/homework/approve` - Approve homework
- [ ] `/api/teacher/homework/completions` - Get completions
- [ ] `/api/teacher/paper/saved-formats` - Get saved formats
- [ ] `/api/teacher/attendance/mark` - Mark attendance (manual)
- [ ] `/api/teacher/fingerprint/*` - Fingerprint (4 routes) - Optional

### Admin Routes (15+)
- [ ] `/api/admin/schools` - CRUD schools
- [ ] `/api/admin/teachers` - CRUD teachers
- [ ] `/api/admin/classes` - CRUD classes
- [ ] `/api/admin/principals` - CRUD principals
- [ ] `/api/admin/sections` - CRUD sections
- [ ] `/api/admin/campuses` - CRUD campuses
- [ ] `/api/admin/timetable` - Manage timetable
- [ ] `/api/admin/teacher-attendance` - View teacher attendance
- [ ] `/api/admin/analytics` - Analytics
- [ ] `/api/admin/insights` - AI insights
- [ ] `/api/admin/warnings` - Warnings
- [ ] `/api/admin/users/search` - User search

### Principal Routes (3)
- [ ] `/api/principal/teachers` - Get teachers
- [ ] `/api/principal/timetable` - Manage timetable
- [ ] `/api/principal/teacher-attendance` - View attendance

### AI Routes (5)
- [ ] `/api/ai/homework` - Generate homework
- [ ] `/api/ai/insights` - Generate insights
- [ ] `/api/ai/forecast` - Grade forecast
- [ ] `/api/ai/grade` - AI grading
- [ ] `/api/ai/generate-paper` - Generate paper

### Papers Routes (2)
- [ ] `/api/papers` - Get/Create papers
- [ ] `/api/papers/[id]/download` - Download paper

### Profile Routes (2)
- [ ] `/api/profile/password` - Change password
- [ ] `/api/profile/upload` - Upload picture

### Auth Routes (4 - Optional, can stay in Next.js)
- [ ] `/api/auth/signup` - Signup
- [ ] `/api/auth/signout` - Signout
- [ ] `/api/auth/check-domain` - Domain check
- [ ] `/api/auth/admin-signup` - Admin signup
- [x] `/api/auth/[...nextauth]` - Keep in Next.js

### Utility Routes (1 - Optional)
- [ ] `/api/network-info` - Network info

## Migration Progress

**Total Routes:** ~65
**Migrated:** ~20 (31%)
**Remaining:** ~45 (69%)

## Next Steps

1. Continue migrating routes by domain
2. Create admin router
3. Create principal router
4. Create AI router
5. Create papers router
6. Update frontend API calls
7. Delete Next.js routes

