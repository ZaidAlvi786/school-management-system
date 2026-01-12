#!/bin/bash

# Backend Environment Setup Script
# This script helps create the .env file for the backend

echo "🔧 Backend Environment Setup"
echo "============================"
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled. Exiting..."
        exit 0
    fi
fi

# Generate secrets
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
NEXTAUTH_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

echo "📝 Creating .env file..."
echo ""

# Create .env file
cat > .env << EOF
# Backend Environment Variables
# Generated on $(date)

# Supabase Configuration (REQUIRED)
# Get these from your Supabase project: Settings → API
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key-here

# Face Recognition Settings
FACE_TOLERANCE=0.5

# CORS Configuration
CORS_ORIGINS=http://localhost:3000

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Logging
LOG_LEVEL=INFO

# Authentication (Auto-generated)
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
JWT_SECRET=${JWT_SECRET}
EOF

echo "✅ .env file created successfully!"
echo ""
echo "⚠️  IMPORTANT: You need to update the following values:"
echo "   1. SUPABASE_URL - Your Supabase project URL"
echo "   2. SUPABASE_KEY - Your Supabase anon key"
echo ""
echo "📝 Edit .env file and add your Supabase credentials"
echo ""
