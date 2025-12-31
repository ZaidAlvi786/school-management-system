# Vercel Deployment - Authentication Fix

## Common Issues and Solutions

### Issue: Login succeeds but user stays on login page / session not persisting

This is typically caused by cookie configuration issues on Vercel.

### Required Environment Variables on Vercel

Make sure you have these environment variables set in your Vercel project settings:

1. **NEXTAUTH_URL** - Must be set to your Vercel production URL
   - Example: `https://your-app.vercel.app`
   - ⚠️ **IMPORTANT**: This must match your actual Vercel deployment URL exactly

2. **NEXTAUTH_SECRET** - Required for JWT signing
   - Generate using: `openssl rand -base64 32`
   - Or: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

3. **Supabase Variables**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Other required variables**
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - Any other API keys your app uses

### Steps to Fix

1. **Check Environment Variables in Vercel Dashboard:**
   - Go to your project → Settings → Environment Variables
   - Ensure `NEXTAUTH_URL` is set to your production URL (not localhost)
   - Ensure `NEXTAUTH_SECRET` is set

2. **Redeploy After Adding/Changing Environment Variables:**
   - After adding or changing environment variables, you MUST redeploy
   - Go to Deployments → Click the three dots on the latest deployment → Redeploy

3. **Verify Cookie Settings:**
   - The code now includes explicit cookie configuration for production
   - Cookies are set to `secure: true` in production (HTTPS required)
   - Cookies use `sameSite: "lax"` for cross-site compatibility

4. **Check Browser Console:**
   - Open browser DevTools → Network tab
   - After login, check the `/api/auth/session` request
   - Verify the response contains user data
   - Check if cookies are being set (Application → Cookies)

### Testing

1. Clear your browser cookies for the domain
2. Try logging in again
3. Check browser DevTools → Application → Cookies
4. You should see `next-auth.session-token` cookie (or `__Secure-next-auth.session-token` in production)

### Additional Troubleshooting

If issues persist:

1. **Check Vercel Logs:**
   - Go to your Vercel project → Logs
   - Look for any authentication errors

2. **Verify Domain Match:**
   - Ensure `NEXTAUTH_URL` exactly matches your Vercel deployment URL
   - Include `https://` protocol
   - No trailing slash

3. **Try Incognito/Private Mode:**
   - Test in incognito mode to rule out browser cache/cookie issues

4. **Check Middleware:**
   - Ensure middleware is not blocking the session token
   - The middleware should allow `/api/auth/*` routes

### Cookie Configuration

The app now uses the following cookie configuration:

- **Development**: Standard cookie names (no prefixes)
- **Production**: Secure cookies with `__Secure-` prefix (HTTPS required)
- **SameSite**: `lax` (allows top-level navigation redirects)
- **HttpOnly**: `true` (prevents XSS attacks)
- **Secure**: `true` in production (HTTPS only)

This ensures cookies work correctly on Vercel's HTTPS infrastructure.

