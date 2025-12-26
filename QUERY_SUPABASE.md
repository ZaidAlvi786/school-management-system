# Running SQL Queries on Supabase (No Docker Required)

You can query your Supabase database directly without Docker. Here are three easy methods:

## Method 1: Use Supabase Dashboard SQL Editor (Easiest)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Type your SQL query and click **Run**

Example queries:
```sql
-- List all tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- View users
SELECT id, email, name, role FROM users LIMIT 10;

-- Count records
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM students;
```

## Method 2: Use psql (PostgreSQL Command Line)

This works if you have `psql` installed (usually comes with PostgreSQL).

### Step 1: Get Your Database Connection String

1. Go to Supabase dashboard
2. **Settings** → **Database**
3. Scroll down to **Connection string** → **URI**
4. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

### Step 2: Install psql (if not installed)

**macOS:**
```bash
brew install postgresql
```

**Or if you don't want to install full PostgreSQL, just psql:**
```bash
brew install libpq
echo 'export PATH="/usr/local/opt/libpq/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Step 3: Connect and Run Queries

Replace the connection string with your actual one:

```bash
psql "postgresql://postgres:YOUR-PASSWORD@db.xxxxx.supabase.co:5432/postgres"
```

Then run queries:
```sql
-- List tables
\dt

-- Run a query
SELECT * FROM users LIMIT 5;

-- Exit
\q
```

### Or run a single query directly:
```bash
psql "postgresql://postgres:YOUR-PASSWORD@db.xxxxx.supabase.co:5432/postgres" -c "SELECT * FROM users LIMIT 5;"
```

## Method 3: Use Supabase CLI (After Linking Project)

The CLI is mainly for local development with Docker, but you can still use it to manage your remote project:

### Link your project (no Docker needed for this):
```bash
supabase link --project-ref your-project-ref-id
```

### Then you can use:
```bash
# Pull schema from remote
supabase db pull

# Other remote operations (no Docker needed)
supabase projects list
```

**Note:** The `db query` command requires local Docker setup, so use Method 1 or 2 instead.

## Quick Reference: Useful SQL Queries

### Check all tables:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### View users:
```sql
SELECT id, email, name, role, is_active, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;
```

### Count records in all tables:
```sql
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'students', COUNT(*) FROM students
UNION ALL SELECT 'teachers', COUNT(*) FROM teachers
UNION ALL SELECT 'schools', COUNT(*) FROM schools
UNION ALL SELECT 'classes', COUNT(*) FROM classes
UNION ALL SELECT 'subjects', COUNT(*) FROM subjects;
```

### View student with user info:
```sql
SELECT 
  s.id,
  s.roll_number,
  u.name,
  u.email,
  c.name as class_name
FROM students s
JOIN users u ON s.user_id = u.id
LEFT JOIN classes c ON s.class_id = c.id
LIMIT 10;
```

### Check recent attendance:
```sql
SELECT 
  a.date,
  a.status,
  s.roll_number,
  u.name as student_name
FROM attendance a
JOIN students s ON a.student_id = s.id
JOIN users u ON s.user_id = u.id
ORDER BY a.date DESC
LIMIT 20;
```

## Recommendation

**For quick queries:** Use **Method 1** (Supabase Dashboard SQL Editor) - it's the easiest and requires no setup.

**For automation/scripts:** Use **Method 2** (psql) with connection string.

**Note:** You can find your database password in:
- Supabase Dashboard → Settings → Database → Database password
- Or reset it if needed

