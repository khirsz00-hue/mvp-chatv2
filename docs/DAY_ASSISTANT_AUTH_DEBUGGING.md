# Day Assistant Authentication Debugging Guide

## Overview
This guide helps diagnose authentication and session cookie issues with the Day Assistant feature.

## Common Symptoms
- "No authenticated user" in logs
- "AuthSessionMissingError" in Vercel logs
- 401 Unauthorized errors in browser console
- Empty NOW/NEXT/LATER sections despite having tasks
- "Please log in to use Day Assistant" toast message

## Verification Steps

### 1. Check Browser Cookies

**In Chrome/Edge DevTools:**
1. Open DevTools (F12)
2. Go to Application tab
3. Click on Cookies in the left sidebar
4. Select your domain (e.g., `mvp-chatv2.vercel.app`)
5. Look for Supabase auth cookies:
   - `sb-<project-ref>-auth-token`
   - `sb-<project-ref>-auth-token.0`
   - `sb-<project-ref>-auth-token.1`

**Expected Result:** You should see at least one cookie with a long value containing JWT tokens.

**If cookies are missing:**
- Log out and log back in
- Check if your browser is blocking third-party cookies
- Verify you're on the same domain (not switching between localhost and production)

### 2. Check Session in Console

Open browser console and run:
```javascript
// Check if Supabase client has a session
const { data } = await window.supabase.auth.getSession()
console.log('Session:', data.session)
console.log('User:', data.session?.user)
```

**Expected Result:** Should show a valid session object with user information.

**If session is null:**
- User is not logged in
- Cookies expired (session typically lasts 1 hour, refreshed automatically)
- Browser cleared cookies

### 3. Check API Response Headers

In Network tab, check a Day Assistant API call (e.g., `/api/day-assistant/queue`):

**Request Headers:**
- Should include `Cookie: sb-<project>-auth-token=...`

**Response:**
- Status: 200 (if authenticated) or 401 (if not authenticated)
- If 401, response body should be: `{"error": "Unauthorized - Please log in"}`

### 4. Check Vercel Logs (Production)

In Vercel dashboard:
1. Go to your project
2. Click on "Logs" tab
3. Filter for "day-assistant" or "Auth"

**Look for:**
- `[Queue API] No authenticated user - session missing` → User not authenticated
- `[Auth] Authentication error: AuthSessionMissingError` → Cookie not being sent or parsed
- `✅ [Queue API] Queue state: ...` → Success

### 5. Verify Same-Origin Requests

Authentication cookies only work with same-origin requests:
- ✅ Good: `mvp-chatv2.vercel.app` → `mvp-chatv2.vercel.app/api/...`
- ❌ Bad: `localhost:3000` → `mvp-chatv2.vercel.app/api/...` (cross-origin)

## Common Issues & Solutions

### Issue: "Session missing" immediately after login
**Cause:** Cookies not being set properly

**Solutions:**
1. Check browser console for cookie errors
2. Verify Supabase environment variables are correct
3. Clear all cookies and cache, then log in again
4. Check if browser extensions are blocking cookies

### Issue: Session works initially but expires quickly
**Cause:** Token refresh not working

**Solutions:**
1. Check middleware is running (should see it in Network tab)
2. Verify `middleware.ts` is not excluded from your path
3. Check Supabase project settings for session duration

### Issue: Works in development but not in production
**Cause:** Different cookie settings or domain configuration

**Solutions:**
1. Verify environment variables in Vercel match local `.env`
2. Check Supabase URL is the same in both environments
3. Test with Vercel preview deployment first
4. Check browser console for CORS errors

### Issue: 401 errors for some endpoints but not others
**Cause:** Inconsistent authentication implementation

**Solutions:**
1. Verify all Day Assistant API routes use `createAuthenticatedSupabaseClient()`
2. Check all routes return 401 when `!user?.id`
3. Ensure client-side code doesn't send `userId` in query params

## Diagnostic Commands

### Check Current User Session (Browser Console)
```javascript
const { data: { user } } = await window.supabase.auth.getUser()
console.log('Current user:', user?.id)
console.log('Email:', user?.email)
```

### Test Queue Endpoint
```javascript
const response = await fetch('/api/day-assistant/queue')
console.log('Status:', response.status)
const data = await response.json()
console.log('Data:', data)
// Expected: 200 + queue data OR 401 + error message
```

### Test Energy Mode Endpoint
```javascript
const response = await fetch('/api/day-assistant/energy-mode')
console.log('Status:', response.status)
const data = await response.json()
console.log('Data:', data)
// Expected: 200 + mode data OR 401 + error message
```

### Test Chat Endpoint
```javascript
const response = await fetch('/api/day-assistant/chat')
console.log('Status:', response.status)
const data = await response.json()
console.log('Data:', data)
// Expected: 200 + messages OR 401 + error message
```

## Expected Behavior

### Authenticated User
- All Day Assistant APIs return 200 with data
- Queue shows tasks in NOW/NEXT/LATER
- Energy mode shows current setting
- Chat loads message history
- No console errors

### Unauthenticated User
- All Day Assistant APIs return 401 with error message
- UI shows "Please log in to use Day Assistant" toast
- Queue sections show empty state or login prompt
- Console shows "[DayAssistant] Session missing" messages

## Security Notes

**DO NOT:**
- Share Supabase JWT tokens publicly
- Log full cookie values in production
- Bypass authentication checks for debugging

**DO:**
- Always test authentication flow after deployment
- Use preview deployments for testing auth changes
- Clear test user sessions after debugging
- Monitor Vercel logs for authentication errors

## Architecture Reference

### Authentication Flow
1. User logs in → Supabase creates session
2. Session stored in HTTP-only cookies (managed by Supabase)
3. Browser automatically sends cookies with API requests
4. Middleware refreshes session if needed
5. API routes use `createAuthenticatedSupabaseClient()` to read session from cookies
6. Supabase provides `auth.uid()` for Row Level Security (RLS)
7. Database queries automatically filtered by `user_id = auth.uid()`

### Files Involved
- `lib/supabaseAuth.ts` - Auth helper functions
- `middleware.ts` - Session refresh middleware
- `app/api/day-assistant/*/route.ts` - API endpoints
- `components/day-assistant/DayAssistantView.tsx` - Main UI component

## Need More Help?

If you've tried all the steps above and still experiencing issues:

1. Check Supabase dashboard for authentication logs
2. Verify Row Level Security (RLS) policies in database
3. Test with a fresh user account
4. Check if issue occurs in incognito/private browsing mode
5. Review recent changes to authentication code in git history

## Related Documentation
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
