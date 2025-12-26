# Supabase CLI Guide - Running Queries from Terminal

This guide shows you how to connect your Supabase project and run SQL queries from the terminal.

## Step 1: Login to Supabase

First, authenticate with your Supabase account:

```bash
supabase login
```

This will:
- Open your browser
- Ask you to authorize the CLI
- Generate an access token that's saved locally

## Step 2: Link Your Project

Link your local project to your Supabase project. You'll need your **Project Reference ID**.

**To find your Project Reference ID:**
1. Go to your Supabase project dashboard
2. Go to **Settings** → **General**
3. Copy the **Reference ID** (looks like: `abcdefghijklmnop`)

**Then run:**
```bash
supabase link --project-ref your-project-ref-id
```

Or if you prefer to select interactively:
```bash
supabase link
```
This will show you a list of your projects to choose from.

## Step 3: Run SQL Queries

Once linked, you can run SQL queries in several ways:

### Option 1: Run a Single Query
```bash
supabase db query "SELECT * FROM users LIMIT 5;"
```

### Option 2: Run a SQL File
```bash
supabase db query < queries.sql
```

Or:
```bash
cat queries.sql | supabase db query
```

### Option 3: Open PostgreSQL Shell
```bash
supabase db shell
```

This opens an interactive PostgreSQL shell where you can run queries directly.

## Common SQL Queries for Your Project

### Check if tables exist:
```bash
supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

### View all users:
```bash
supabase db query "SELECT id, email, name, role, is_active FROM users LIMIT 10;"
```

### Count records in tables:
```bash
supabase db query "SELECT 
  'users' as table_name, COUNT(*) as count FROM users
  UNION ALL
  SELECT 'students', COUNT(*) FROM students
  UNION ALL
  SELECT 'teachers', COUNT(*) FROM teachers
  UNION ALL
  SELECT 'schools', COUNT(*) FROM schools;"
```

### View a specific student:
```bash
supabase db query "SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id LIMIT 5;"
```

### Check database schema:
```bash
supabase db query "\d users"
supabase db query "\d students"
```

## Useful Commands

### Check connection status:
```bash
supabase status
```

### List all linked projects:
```bash
supabase projects list
```

### Generate TypeScript types from database:
```bash
supabase gen types typescript --linked > types/database.types.ts
```

### Reset local database (if using local development):
```bash
supabase db reset
```

### Create a migration:
```bash
supabase migration new migration_name
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `supabase login` | Login to Supabase account |
| `supabase link --project-ref <ref>` | Link to your project |
| `supabase db query "<SQL>"` | Run a SQL query |
| `supabase db shell` | Open interactive SQL shell |
| `supabase status` | Check connection status |
| `supabase projects list` | List your projects |

## Example Workflow

```bash
# 1. Login (first time only)
supabase login

# 2. Link your project (first time only)
supabase link --project-ref abcdefghijklmnop

# 3. Run queries
supabase db query "SELECT COUNT(*) FROM users;"

# 4. Or open interactive shell
supabase db shell
# Then run queries like:
# SELECT * FROM users;
# \q to exit
```

## Troubleshooting

### "Not logged in" error:
```bash
supabase login
```

### "Project not linked" error:
```bash
supabase link --project-ref your-project-ref
```

### "Connection refused" error:
- Check your internet connection
- Verify your project is active in Supabase dashboard
- Try logging in again: `supabase login`

### To unlink and re-link:
```bash
# Remove link
rm -rf .supabase

# Link again
supabase link --project-ref your-project-ref
```

