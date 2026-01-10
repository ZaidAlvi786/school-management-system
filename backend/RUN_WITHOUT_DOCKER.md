# Running Backend Without Docker

This guide explains how to run the FastAPI backend locally without using Docker.

## Prerequisites

### 1. Install System Dependencies (macOS)

The `face-recognition` library requires some system dependencies. Install them using Homebrew:

```bash
# Install Homebrew if you don't have it
# /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required system dependencies
brew install cmake
brew install openblas
brew install lapack
```

### 2. Python Environment

Make sure you have Python 3.11 or higher installed. You can check with:
```bash
python3 --version
```

## Setup Steps

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Create Virtual Environment (Recommended)

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
# venv\Scripts\activate
```

### 3. Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Note:** Installing `face-recognition` may take a few minutes as it needs to compile.

### 4. Create Environment File

Create a `.env` file in the `backend` directory with the following variables:

```bash
# Create .env file
touch .env
```

Add these environment variables to `.env`:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here

# Face Recognition
FACE_TOLERANCE=0.6

# CORS Configuration (comma-separated list)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Logging
LOG_LEVEL=INFO
```

**Important:** Replace `your_supabase_url_here` and `your_supabase_key_here` with your actual Supabase credentials.

### 5. Run the Server

You have several options to run the server:

#### Option A: Using Python directly (with auto-reload)

```bash
python -m app.main
```

#### Option B: Using uvicorn directly (recommended for development)

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Option C: Using uvicorn with custom settings

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level info
```

### 6. Verify the Server is Running

Open your browser or use curl to check:

```bash
# Health check
curl http://localhost:8000/health

# Root endpoint
curl http://localhost:8000/
```

You should see:
```json
{
  "status": "healthy",
  "face_recognition": "ready",
  "database": "connected"
}
```

## Troubleshooting

### Issue: `face-recognition` installation fails

**Solution:** Make sure you have installed the system dependencies:
```bash
brew install cmake openblas lapack
```

Then try installing again:
```bash
pip install --upgrade pip
pip install face-recognition --no-cache-dir
```

### Issue: Import errors or module not found

**Solution:** Make sure you're in the virtual environment and have installed all dependencies:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: Database connection errors

**Solution:** 
- Verify your `.env` file has correct `SUPABASE_URL` and `SUPABASE_KEY`
- Make sure the Supabase database is accessible
- Check that you've run the database migrations

### Issue: CORS errors from frontend

**Solution:** 
- Add your frontend URL to `CORS_ORIGINS` in `.env`
- Make sure the server is running on the correct host/port
- Restart the server after changing `.env`

### Issue: Port already in use

**Solution:** Either:
- Stop the process using port 8000, or
- Change the `PORT` in your `.env` file to a different port (e.g., 8001)

## Development Tips

1. **Auto-reload:** The `--reload` flag enables auto-reload on code changes
2. **Logging:** Check console output for detailed logs
3. **API Documentation:** Once running, visit `http://localhost:8000/docs` for interactive API documentation
4. **Alternative docs:** Visit `http://localhost:8000/redoc` for ReDoc documentation

## Production Deployment (Without Docker)

For production, you might want to use a process manager like `systemd` or `supervisor`, or deploy to a platform like:
- Heroku
- Railway
- Render
- AWS Elastic Beanstalk
- Google Cloud Run

Make sure to:
- Set proper environment variables
- Use a production WSGI server like `gunicorn` with uvicorn workers
- Set up proper logging
- Configure reverse proxy (nginx) if needed
- Set up SSL/TLS certificates
