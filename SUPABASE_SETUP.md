# Supabase Setup Guide

This guide will walk you through setting up Supabase for your School Management System.

## Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign in"** if you already have an account
3. Sign up with your GitHub, GitLab, or email account (free tier available)

## Step 2: Create a New Project

1. Once logged in, click **"New Project"**
2. Fill in the project details:
   - **Organization**: Select your organization (or create one)
   - **Name**: `school-management-system` (or any name you prefer)
   - **Database Password**: Create a strong password (save this securely!)
   - **Region**: Choose the region closest to you for best performance
   - **Pricing Plan**: Select **Free** tier (perfect for development and small projects)
3. Click **"Create new project"**
4. Wait 2-3 minutes for your project to be created

## Step 3: Run the Database Schema

1. Once your project is ready, go to the **SQL Editor** in the left sidebar
2. Click **"New query"**
3. Open the file `supabase-schema.sql` from your project root
4. Copy **ALL** the contents from `supabase-schema.sql`
5. Paste it into the SQL Editor
6. Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`)
7. Wait for the execution to complete (should take a few seconds)
8. You should see "Success. No rows returned" - this means all tables were created successfully!

## Step 4: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** (gear icon in left sidebar)
2. Click on **API** in the settings menu
3. You'll see two important values:

   **Project URL** (looks like):
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```
   Copy this - this is your `NEXT_PUBLIC_SUPABASE_URL`

   **anon/public key** (under "Project API keys"):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
   ```
   Copy this - this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 5: Update Your .env File

1. In your project root, open or create a `.env` file
2. Add the following environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# NextAuth Configuration (keep existing or create new)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# JWT Configuration (keep existing or create new)
JWT_SECRET=your-jwt-secret-key-here

# OpenRouter AI Configuration (keep existing)
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Resend Email Configuration (optional, keep existing if you have it)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=School Management <onboarding@resend.dev>
```

3. Replace `your-project-id` and `your-anon-key-here` with the values from Step 4
4. **Remove** the `MONGODB_URI` line if it exists (no longer needed)

## Step 6: Generate Secret Keys (if needed)

If you don't have `NEXTAUTH_SECRET` and `JWT_SECRET`, generate them:

**macOS/Linux:**
```bash
openssl rand -base64 32
```

**Windows (PowerShell):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

Or use Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Run this twice - once for `NEXTAUTH_SECRET` and once for `JWT_SECRET`.

## Step 7: Verify Your Setup

1. Make sure your `.env` file is in the project root (same level as `package.json`)
2. Restart your development server:
   ```bash
   npm run dev
   ```
3. Check the terminal for any connection errors

## Step 8: Test the Connection

You can test if Supabase is connected by:

1. **Check the database tables:**
   - In Supabase dashboard, go to **Table Editor** in the left sidebar
   - You should see all the tables created (users, schools, students, teachers, etc.)

2. **Test an API endpoint:**
   - Try accessing: `http://localhost:3000/api/auth/signup` (should not error about database connection)

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Make sure your `.env` file has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Make sure the `.env` file is in the project root
- Restart your development server after adding environment variables

### Error: "Invalid API key"
- Double-check that you copied the **anon/public** key (not the service_role key)
- Make sure there are no extra spaces or line breaks in your `.env` file

### Tables not showing up
- Go back to SQL Editor and check if there were any errors when running the schema
- Make sure you copied the entire `supabase-schema.sql` file
- Check the SQL Editor history to see if queries completed successfully

### Connection timeout
- Check your internet connection
- Verify the project region matches your location
- Make sure your Supabase project is active (not paused)

## Database Structure

After running the schema, you should have these tables:
- `users` - User accounts
- `schools` - School information
- `campuses` - Campus information
- `classes` - Class information
- `sections` - Section information
- `subjects` - Subject information
- `teachers` - Teacher profiles
- `principals` - Principal profiles
- `students` - Student profiles
- `parents` - Parent profiles
- `attendance` - Attendance records
- `grades` - Grade records
- `homework` - Homework assignments
- `papers` - Generated exam papers
- `materials` - Teaching materials
- `syllabus` - Syllabus information
- `ai_insights` - AI-generated insights
- `domains` - School domains
- `admin_domains` - Admin domains
- `admin_domain_requests` - Domain requests
- `teacher_subjects` - Teacher-subject relationships

## Next Steps

1. ✅ Database is set up and connected
2. ✅ All API routes are migrated to Supabase
3. ⏭️ (Optional) Update seed script to work with Supabase
4. ⏭️ Test all API endpoints
5. ⏭️ Remove mongoose from package.json when ready:
   ```bash
   npm uninstall mongoose
   ```

## Need Help?

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Check your project logs in Supabase dashboard under "Logs"

