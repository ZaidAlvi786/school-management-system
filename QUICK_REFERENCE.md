# Quick Reference: MongoDB to Supabase Conversion

## Common Conversions

### Import Changes
```typescript
// OLD
import connectDB from "@/lib/db";
import User from "@/lib/models/User";

// NEW
import { supabase } from "@/lib/db";
import type { User } from "@/lib/types/database";
```

### Find One
```typescript
// OLD
await connectDB();
const user = await User.findOne({ email: email });

// NEW
const { data: user, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', email)
  .single();
```

### Find Many
```typescript
// OLD
const users = await User.find({ role: 'teacher' });

// NEW
const { data: users, error } = await supabase
  .from('users')
  .select('*')
  .eq('role', 'teacher');
```

### Find by ID
```typescript
// OLD
const user = await User.findById(id);

// NEW
const { data: user, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', id)
  .single();
```

### Create
```typescript
// OLD
const user = await User.create({ email, password, role, name });

// NEW
const { data: user, error } = await supabase
  .from('users')
  .insert([{ email, password, role, name }])
  .select()
  .single();
```

### Update
```typescript
// OLD
await User.findByIdAndUpdate(id, { name: newName });

// NEW
const { data, error } = await supabase
  .from('users')
  .update({ name: newName })
  .eq('id', id)
  .select()
  .single();
```

### Delete
```typescript
// OLD
await User.findByIdAndDelete(id);

// NEW
const { error } = await supabase
  .from('users')
  .delete()
  .eq('id', id);
```

### Populate/Join
```typescript
// OLD
const student = await Student.findById(id)
  .populate('user', 'name email')
  .populate('class', 'name level');

// NEW
const { data: student, error } = await supabase
  .from('students')
  .select('*, user:users(name, email), class:classes(name, level)')
  .eq('id', id)
  .single();
```

### Sort & Limit
```typescript
// OLD
const items = await Model.find().sort({ createdAt: -1 }).limit(10);

// NEW
const { data: items, error } = await supabase
  .from('table')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);
```

### Complex Query
```typescript
// OLD
let query = {};
if (studentId) query.student = studentId;
if (subjectId) query.subject = subjectId;
const items = await Model.find(query);

// NEW
let query = supabase.from('table').select('*');
if (studentId) query = query.eq('student_id', studentId);
if (subjectId) query = query.eq('subject_id', subjectId);
const { data: items, error } = await query;
```

### Error Handling Pattern
```typescript
const { data, error } = await supabase.from('table').select('*');

if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}

if (!data) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// Use data...
```

## Field Name Mapping

Always convert camelCase to snake_case:
- `rollNumber` → `roll_number`
- `dateOfBirth` → `date_of_birth`
- `employeeId` → `employee_id`
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`
- `_id` → `id`

## Response Format

Supabase returns data in a different format. Update response mappings:

```typescript
// OLD
return NextResponse.json({
  _id: student._id,
  name: student.user.name,
  rollNumber: student.rollNumber,
});

// NEW
return NextResponse.json({
  _id: student.id,  // or just id if frontend updated
  name: student.user.name,
  rollNumber: student.roll_number,
});
```

