# Environment Variables Setup

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
# Get these from your Supabase project: Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-generate-a-random-string

# OpenRouter AI Configuration
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Resend Email Configuration
RESEND_API_KEY=re_your-resend-api-key-here
RESEND_FROM_EMAIL=School Management <onboarding@resend.dev>

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-generate-a-random-string

# Local Network IP (for mobile QR code access on same WiFi)
# Find your local IP: macOS/Linux: ifconfig | grep "inet " | grep -v 127.0.0.1
# Windows: ipconfig (look for IPv4 Address)
# Example: LOCAL_NETWORK_IP=192.168.1.100
LOCAL_NETWORK_IP=192.168.1.100
```

## Generating Secret Keys

**For Local Development:**
You can use simple values for local development (they don't need to be super secure):
```env
NEXTAUTH_SECRET=local-dev-secret-key-12345
JWT_SECRET=local-jwt-secret-12345
```

**For Production:**
Generate secure random strings for `NEXTAUTH_SECRET` and `JWT_SECRET` using:

**macOS/Linux:**
```bash
openssl rand -base64 32
```

**Or use Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Note:** `NEXTAUTH_SECRET` is **required** even for local development because it's used in the authentication middleware.

## Getting Your Values

1. **NEXT_PUBLIC_SUPABASE_URL** and **NEXT_PUBLIC_SUPABASE_ANON_KEY**: 
   - Create a Supabase project at [https://supabase.com](https://supabase.com)
   - Go to Settings → API in your project dashboard
   - Copy the Project URL and anon/public key
   - See [SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md) for detailed setup instructions
2. **NEXTAUTH_SECRET**: Generate using the command above
3. **JWT_SECRET**: Generate using the command above
4. **OPENROUTER_API_KEY**: Get from [https://openrouter.ai](https://openrouter.ai)
5. **NEXTAUTH_URL**: Use `http://localhost:3000` for development
6. **OPENROUTER_BASE_URL**: Use `https://openrouter.ai/api/v1` (default)
7. **RESEND_API_KEY**: Get from [https://resend.com](https://resend.com) - Sign up for a free account and create an API key
8. **RESEND_FROM_EMAIL**: Your verified sender email in Resend format (e.g., `School Management <noreply@yourdomain.com>`). For testing, you can use `onboarding@resend.dev` which works out of the box

## Local Development with Resend

**Yes, Resend works locally!** Here's how to set it up:

1. **Sign up for a free Resend account** at [https://resend.com](https://resend.com)
   - Free tier includes 3,000 emails/month
   - Perfect for local development and testing

2. **Get your API key:**
   - Go to API Keys in your Resend dashboard
   - Create a new API key
   - Copy it to your `.env` file as `RESEND_API_KEY`

3. **For local testing, use the default sender:**
   ```env
   RESEND_FROM_EMAIL=School Management <onboarding@resend.dev>
   ```
   - This email works out of the box - no domain verification needed
   - Perfect for testing locally

4. **What happens if you don't set it up?**
   - The app won't crash
   - Invite emails won't be sent
   - Instead, invite details will be logged to your console
   - User accounts will still be created successfully

5. **Testing locally:**
   - Set `NEXTAUTH_URL=http://localhost:3000` in your `.env`
   - When you invite a user, check:
     - Your terminal/console for logs
     - The invited user's email inbox (if RESEND_API_KEY is set)
     - Resend dashboard for email delivery status

## Important Notes

- ⚠️ **Never commit `.env` file to Git** (it's already in `.gitignore`)
- ✅ Copy this template and fill in your actual values
- ✅ For production, use different values and secure them properly
- ✅ Keep your secrets safe and rotate them regularly
- ✅ Resend works the same way locally and in production - no code changes needed!

