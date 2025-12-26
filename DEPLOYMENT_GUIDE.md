# Deployment Guide - Vercel

This guide will help you deploy your School Management System to Vercel.

## Step 1: Prepare Your Code

### 1.1 Initialize Git Repository (if not done)
```bash
git init
git add .
git commit -m "Initial commit: Migrated to Supabase"
```

### 1.2 Check .gitignore
Make sure your `.env` file is ignored (it should be - we already checked this).

## Step 2: Create GitHub Repository

### Option A: Using GitHub Web Interface

1. Go to [https://github.com/new](https://github.com/new)
2. Fill in:
   - **Repository name**: `school-management-system` (or any name you prefer)
   - **Description**: "School Management System with Supabase"
   - **Visibility**: Public or Private (your choice)
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
3. Click **"Create repository"**
4. GitHub will show you commands - **copy the repository URL** (looks like: `https://github.com/yourusername/school-management-system.git`)

### Option B: Using GitHub CLI (if you have it)

```bash
gh repo create school-management-system --public --source=. --remote=origin --push
```

## Step 3: Push to GitHub

After creating the repo, run these commands (replace with your actual repo URL):

```bash
# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/school-management-system.git

# Rename branch to main (if needed)
git branch -M main

# Add all files
git add .

# Commit
git commit -m "Initial commit: School Management System with Supabase"

# Push to GitHub
git push -u origin main
```

If you get authentication errors, you may need to:
- Use a Personal Access Token instead of password
- Or set up SSH keys

## Step 4: Deploy to Vercel

### 4.1 Create Vercel Account

1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Sign up with your **GitHub account** (easiest way)

### 4.2 Import Your Project

1. Once logged in, click **"Add New..."** → **"Project"**
2. You'll see your GitHub repositories
3. Find `school-management-system` and click **"Import"**

### 4.3 Configure Project

Vercel will auto-detect Next.js. Leave settings as default:
- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### 4.4 Add Environment Variables

**IMPORTANT:** Add all these environment variables in Vercel:

Click **"Environment Variables"** and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-secret-key-here
JWT_SECRET=your-jwt-secret-here
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
RESEND_API_KEY=your-resend-api-key (if you have it)
RESEND_FROM_EMAIL=School Management <onboarding@resend.dev>
```

**Notes:**
- Replace all placeholder values with your actual values
- For `NEXTAUTH_URL`, use your Vercel domain (e.g., `https://school-management-system.vercel.app`)
- You can update `NEXTAUTH_URL` after first deployment once you know your actual domain
- **DO NOT** commit your `.env` file - it should stay local

### 4.5 Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (2-5 minutes)
3. Once done, click **"Visit"** to see your live app!

## Step 5: Update Environment Variables After First Deploy

After your first deployment, you'll get a URL like: `https://school-management-system.vercel.app`

1. Go to your Vercel project **Settings** → **Environment Variables**
2. Update `NEXTAUTH_URL` to your actual Vercel domain:
   ```
   NEXTAUTH_URL=https://school-management-system.vercel.app
   ```
3. Go to **Deployments** tab
4. Click the three dots (⋯) on the latest deployment
5. Click **"Redeploy"** to apply the updated environment variable

## Step 6: Update Supabase Settings (if needed)

If your Supabase project has any domain restrictions:

1. Go to Supabase Dashboard → **Settings** → **API**
2. Add your Vercel domain to allowed origins if needed

## Quick Command Reference

```bash
# Initialize git (if not done)
git init

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/school-management-system.git

# Set main branch
git branch -M main

# Add and commit
git add .
git commit -m "Initial commit"

# Push to GitHub
git push -u origin main
```

## Troubleshooting

### Build Errors

**Error: "Missing environment variables"**
- Make sure all environment variables are added in Vercel
- Check that variable names match exactly (case-sensitive)

**Error: "Module not found"**
- Run `npm install` locally to ensure package.json is correct
- Check that all dependencies are in `package.json`

### Authentication Issues with Git

**If GitHub requires authentication:**
1. Use Personal Access Token instead of password
2. Create token: GitHub → Settings → Developer settings → Personal access tokens → Generate new token
3. Use token as password when pushing

**Or use SSH:**
```bash
git remote set-url origin git@github.com:YOUR_USERNAME/school-management-system.git
```

### Deployment Issues

**Vercel build fails:**
- Check build logs in Vercel dashboard
- Make sure all environment variables are set
- Ensure `package.json` has correct build scripts

**App works locally but not on Vercel:**
- Check environment variables are set correctly
- Verify `NEXTAUTH_URL` matches your Vercel domain
- Check Supabase settings allow requests from your domain

## Post-Deployment Checklist

- [ ] All environment variables added to Vercel
- [ ] `NEXTAUTH_URL` updated to Vercel domain
- [ ] Build completed successfully
- [ ] App is accessible at Vercel URL
- [ ] Test login/signup functionality
- [ ] Verify database connection works
- [ ] Check API routes are working

## Continuous Deployment

Once set up, Vercel will automatically deploy:
- Every push to `main` branch
- Every pull request (creates preview deployment)

You can disable auto-deploy in Vercel project settings if needed.

