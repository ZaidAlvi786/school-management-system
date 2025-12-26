# MongoDB to Supabase Migration Guide

This document outlines the migration from MongoDB/Mongoose to Supabase (PostgreSQL).

## Overview

The project has been migrated from MongoDB with Mongoose to Supabase (PostgreSQL) with the Supabase JavaScript client.

## Setup Steps

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Wait for the database to be set up (takes a few minutes)

### 2. Run the Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-schema.sql`
4. Click **Run** to execute the SQL and create all tables

### 3. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon/public key** (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### 4. Update Environment Variables

Update your `.env` file (or create one if it doesn't exist):

```env
# Supabase Configuration (replace with your values)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Keep existing variables
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
JWT_SECRET=your-jwt-secret
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

**Note:** Remove the `MONGODB_URI` variable as it's no longer needed.

## Key Changes

### Database Connection

**Before (MongoDB):**
```typescript
import connectDB from "@/lib/db";
await connectDB();
```

**After (Supabase):**
```typescript
import { supabase } from "@/lib/db";
// No need to await - supabase client is already initialized
```

### Querying Data

**Before (Mongoose):**
```typescript
const student = await Student.findById(id)
  .populate("user", "name email")
  .lean();
```

**After (Supabase):**
```typescript
const { data: student, error } = await supabase
  .from('students')
  .select('*, user:users(name, email)')
  .eq('id', id)
  .single();

if (error) {
  // Handle error
}
```

### Finding Documents

**Before (Mongoose):**
```typescript
const user = await User.findOne({ email: email });
const users = await User.find({ role: 'teacher' });
```

**After (Supabase):**
```typescript
// Single record
const { data: user, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', email)
  .single();

// Multiple records
const { data: users, error } = await supabase
  .from('users')
  .select('*')
  .eq('role', 'teacher');
```

### Creating Documents

**Before (Mongoose):**
```typescript
const user = await User.create({
  email: email,
  password: hashedPassword,
  role: 'teacher',
  name: name
});
```

**After (Supabase):**
```typescript
const { data: user, error } = await supabase
  .from('users')
  .insert([{
    email: email,
    password: hashedPassword,
    role: 'teacher',
    name: name
  }])
  .select()
  .single();

if (error) throw error;
```

### Updating Documents

**Before (Mongoose):**
```typescript
await User.findByIdAndUpdate(id, { name: newName });
```

**After (Supabase):**
```typescript
const { data, error } = await supabase
  .from('users')
  .update({ name: newName })
  .eq('id', id)
  .select()
  .single();
```

### Deleting Documents

**Before (Mongoose):**
```typescript
await User.findByIdAndDelete(id);
```

**After (Supabase):**
```typescript
const { error } = await supabase
  .from('users')
  .delete()
  .eq('id', id);
```

### Joins (Populate in Mongoose)

**Before (Mongoose):**
```typescript
const student = await Student.findById(id)
  .populate('user', 'name email')
  .populate('class', 'name level')
  .populate('section', 'name');
```

**After (Supabase):**
```typescript
const { data: student, error } = await supabase
  .from('students')
  .select('*, user:users(name, email), class:classes(name, level), section:sections(name)')
  .eq('id', id)
  .single();
```

### Sorting and Filtering

**Before (Mongoose):**
```typescript
const grades = await Grade.find(query)
  .sort({ date: -1 })
  .limit(10);
```

**After (Supabase):**
```typescript
const { data: grades, error } = await supabase
  .from('grades')
  .select('*')
  .eq('student_id', studentId)
  .order('date', { ascending: false })
  .limit(10);
```

### Field Name Changes

The following field name changes apply (MongoDB → PostgreSQL):

- `_id` → `id` (UUID instead of ObjectId)
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`
- `camelCase` → `snake_case` for all field names

Examples:
- `rollNumber` → `roll_number`
- `dateOfBirth` → `date_of_birth`
- `employeeId` → `employee_id`
- `classIncharge` → `class_incharge_id`

## Type Definitions

Type definitions are available in `lib/types/database.ts`. Import types like this:

```typescript
import type { User, Student, Teacher } from '@/lib/types/database';
```

## Migration Checklist

- [x] Install Supabase client library
- [x] Create Supabase database connection utility
- [x] Create SQL schema file
- [x] Create TypeScript type definitions
- [ ] Update all API routes (23 files)
  - [ ] `app/api/student/info/route.ts` - ✅ DONE
  - [ ] `app/api/student/qr-code/route.ts`
  - [ ] `app/api/attendance/route.ts`
  - [ ] `app/api/grades/route.ts`
  - [ ] `app/api/homework/route.ts`
  - [ ] `app/api/papers/route.ts`
  - [ ] `app/api/papers/[id]/download/route.ts`
  - [ ] `app/api/auth/signup/route.ts`
  - [ ] `app/api/auth/admin-signup/route.ts`
  - [ ] `app/api/auth/check-domain/route.ts`
  - [ ] `app/api/admin/analytics/route.ts`
  - [ ] `app/api/admin/campuses/route.ts`
  - [ ] `app/api/admin/classes/route.ts`
  - [ ] `app/api/admin/insights/route.ts`
  - [ ] `app/api/admin/principals/route.ts`
  - [ ] `app/api/admin/schools/route.ts`
  - [ ] `app/api/admin/sections/route.ts`
  - [ ] `app/api/admin/teachers/route.ts`
  - [ ] `app/api/admin/users/search/route.ts`
  - [ ] `app/api/admin/warnings/route.ts`
  - [ ] `app/api/principal/teachers/route.ts`
  - [ ] `app/api/teacher/classes-subjects/route.ts`
  - [ ] `app/api/teacher/students/route.ts`
- [ ] Update seed script
- [ ] Update authentication code (lib/auth.ts)
- [ ] Remove mongoose dependency from package.json
- [ ] Test all API endpoints

## Removing MongoDB Dependencies

Once migration is complete, you can remove Mongoose:

```bash
npm uninstall mongoose
```

## Common Patterns

### Error Handling

Always check for errors in Supabase responses:

```typescript
const { data, error } = await supabase.from('table').select('*');

if (error) {
  console.error('Supabase error:', error);
  return NextResponse.json({ error: error.message }, { status: 500 });
}

if (!data) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

### Complex Queries

For more complex queries, you can use Supabase's PostgREST query builder:

```typescript
let query = supabase.from('grades').select('*');

if (studentId) {
  query = query.eq('student_id', studentId);
}

if (subjectId) {
  query = query.eq('subject_id', subjectId);
}

const { data, error } = await query
  .order('date', { ascending: false });
```

## Need Help?

- Supabase Documentation: https://supabase.com/docs
- Supabase JavaScript Client: https://supabase.com/docs/reference/javascript/introduction
- PostgREST API Reference: https://postgrest.org/en/stable/api.html

