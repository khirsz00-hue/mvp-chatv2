# Authentication Enhancements - Password Management & OAuth Fixes

## Overview
This document describes the authentication enhancements made to fix Google OAuth login, email/password login, magic link redirects on mobile/incognito, and add password management functionality.

## Changes Made

### 1. Enhanced Auth Callback for Better Mobile/Incognito Support

**File**: `app/auth/callback/page.tsx`

**Changes**:
- Added explicit PKCE code exchange handling for magic links and OAuth flows
- Improved error handling and logging for debugging
- Added support for hash-based authentication flows
- Better handling of different browser contexts (mobile, incognito, webviews)

**Why This Matters**:
- Mobile browsers and incognito mode sometimes have stricter cookie policies
- Some browsers/webviews may not properly handle automatic code exchange
- Explicit code exchange ensures authentication works across all environments

**Code Added**:
```typescript
// Check for hash-based tokens (magic links and some OAuth flows)
const hash = window.location.hash
console.log('🔍 [AuthCallback] Hash:', hash ? 'PRESENT' : 'ABSENT')

// First, let's try to exchange the code if present
const code = params.get('code')
if (code) {
  console.log('🔍 [AuthCallback] Code param found, exchanging...')
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    console.error('❌ [AuthCallback] Code exchange error:', exchangeError)
    setError(exchangeError.message)
    setTimeout(() => router.replace('/login'), ERROR_REDIRECT_DELAY)
    return
  }
}
```

### 2. Improved Google OAuth Configuration

**File**: `app/login/page.tsx`

**Changes**:
- Added `access_type: 'offline'` and `prompt: 'consent'` to OAuth request
- Enhanced error messages for better user feedback
- Added better logging for troubleshooting
- Improved error handling for configuration issues

**Why This Matters**:
- `access_type: 'offline'` ensures refresh tokens are provided
- `prompt: 'consent'` forces consent screen, ensuring proper OAuth flow
- Better error messages help users understand what went wrong
- Improved logging helps developers diagnose issues

**Code Added**:
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${baseUrl}/auth/callback`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
})
```

### 3. Password Management API

**File**: `app/api/auth/update-password/route.ts` (NEW)

**Features**:
- Secure password update endpoint
- Requires authentication (uses session cookies)
- Validates password length (minimum 6 characters)
- Uses Supabase's built-in password update functionality
- Comprehensive logging for security auditing

**API Specification**:
```typescript
POST /api/auth/update-password
Content-Type: application/json

Request Body:
{
  "password": "newpassword123"
}

Response (Success):
{
  "success": true,
  "message": "Password updated successfully"
}

Response (Error):
{
  "error": "Error message here"
}

Status Codes:
- 200: Success
- 400: Invalid password (too short or missing)
- 401: Not authenticated
- 500: Server error
```

### 4. Password Management UI

**File**: `app/profile/page.tsx`

**Changes**:
- Added new "Bezpieczeństwo" (Security) tab to profile page
- Password change form with new password and confirmation fields
- Input validation (passwords must match, minimum 6 characters)
- User-friendly Polish language messages
- Account information display
- Responsive design for mobile and desktop

**UI Components**:
- Password input fields (masked)
- Confirmation field to prevent typos
- Submit button with loading state
- Success/error toast notifications
- Account information card showing login methods

**Features**:
- Works for both OAuth users (to set a password) and email/password users (to change password)
- Real-time validation feedback
- Clear error messages in Polish
- Disabled state during API call to prevent double submission

## Configuration Requirements

### Supabase Configuration

For Google OAuth to work, you must configure Google as an authentication provider in Supabase:

1. **Go to Supabase Dashboard** → Authentication → Providers
2. **Enable Google Provider**
3. **Configure OAuth Client**:
   - Client ID: Your Google OAuth Client ID
   - Client Secret: Your Google OAuth Client Secret
   - Authorized redirect URIs:
     - Production: `https://[your-project].supabase.co/auth/v1/callback`
     - Development: `http://localhost:54321/auth/v1/callback`

### Environment Variables

Ensure these environment variables are set:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Application URL (critical for OAuth and magic links)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com  # or http://localhost:3000 for dev
```

### Google Cloud Console Configuration

For Google OAuth, configure in Google Cloud Console:

1. **Create OAuth 2.0 Client ID** (if not already created)
2. **Add Authorized JavaScript origins**:
   - Production: `https://yourdomain.com`
   - Development: `http://localhost:3000`
3. **Add Authorized redirect URIs**:
   - `https://[your-project].supabase.co/auth/v1/callback`
   - `http://localhost:54321/auth/v1/callback` (for local dev)

## Testing Guide

### Test 1: Google OAuth Login

1. Navigate to `/login`
2. Click "Zaloguj się przez Google"
3. Complete Google authentication
4. Should redirect to `/auth/callback`
5. Should then redirect to `/` (home page)
6. Check browser console for success logs
7. Verify session in DevTools → Application → Cookies

**Expected Console Output**:
```
[Login] Initiating Google OAuth flow...
[Login] Redirect URL: https://yourdomain.com/auth/callback
[Login] ✓ Google OAuth initiated successfully
🔍 [AuthCallback] Starting callback handling
🔍 [AuthCallback] Code param found, exchanging...
✅ [AuthCallback] Session found, refreshing and redirecting
✅ [AuthCallback] Session refreshed successfully
```

### Test 2: Magic Link on Mobile/Incognito

1. Open incognito/private browsing window
2. Navigate to `/login`
3. Click "Lub użyj magic link"
4. Enter email address
5. Check email on mobile device
6. Click magic link from email
7. Should open app and redirect to `/` (not `/login`)
8. Should be logged in successfully

**Expected Behavior**:
- ✅ Opens `/auth/callback` first
- ✅ Shows "Logowanie..." spinner
- ✅ Redirects to `/` after successful authentication
- ✅ Session persists after closing and reopening browser
- ❌ Should NOT redirect back to `/login`
- ❌ Should NOT show "Błąd autoryzacji"

### Test 3: Set/Change Password

1. Log in using any method (Google, email, or magic link)
2. Navigate to Profile page (user icon/avatar)
3. Click "Bezpieczeństwo" (Security) tab
4. Enter new password (min 6 characters)
5. Confirm password (must match)
6. Click "Zmień hasło"
7. Should see success toast: "Hasło zostało zaktualizowane pomyślnie"
8. Log out
9. Log back in using email and new password
10. Should succeed

**Test Cases**:
- ✅ Password length validation (< 6 chars shows error)
- ✅ Password confirmation mismatch shows error
- ✅ Successful password change shows success message
- ✅ Can log in with new password after change
- ✅ Works for OAuth users (sets password for first time)
- ✅ Works for email/password users (changes existing password)

### Test 4: Email/Password Login

1. Navigate to `/login`
2. Enter email and password
3. Click "Zaloguj się"
4. Should redirect to `/` with success toast
5. Verify session persists across page reloads

## Troubleshooting

### Issue: Google OAuth Redirects to Login Page

**Possible Causes**:
1. Google provider not enabled in Supabase
2. Incorrect redirect URI configuration
3. Missing `NEXT_PUBLIC_SITE_URL` environment variable
4. Cookies blocked by browser

**Solutions**:
1. Verify Google provider is enabled in Supabase Dashboard
2. Check redirect URIs match exactly (including protocol and trailing slashes)
3. Set `NEXT_PUBLIC_SITE_URL` in environment variables
4. Enable cookies in browser settings
5. Check browser console for error messages

### Issue: Magic Link Opens But Redirects to Login

**Possible Causes**:
1. Code exchange failing silently
2. Session not being created properly
3. Cookies not being set (mobile/incognito restrictions)

**Solutions**:
1. Check browser console for error messages
2. Verify `NEXT_PUBLIC_SITE_URL` is correct
3. Try in regular browser (not incognito) first
4. Check if third-party cookies are blocked
5. Verify middleware is running (should see cookies being set)

### Issue: Password Change Fails

**Possible Causes**:
1. Not authenticated (session expired)
2. Password too short (< 6 characters)
3. API endpoint not reachable

**Solutions**:
1. Log out and log back in
2. Ensure password is at least 6 characters
3. Check browser console for API errors
4. Verify `/api/auth/update-password` endpoint is accessible
5. Check server logs for detailed error messages

### Issue: "Unauthorized" Error

**Possible Causes**:
1. Session cookies not set
2. Session expired
3. Middleware not running properly

**Solutions**:
1. Clear browser cookies and cache
2. Log out and log back in
3. Check that cookies are present in DevTools
4. Verify middleware.ts is properly configured
5. Check that `createAuthenticatedSupabaseClient()` is working

## Security Considerations

1. **Password Storage**: Passwords are hashed by Supabase using bcrypt
2. **Session Management**: Sessions use HTTP-only cookies (not accessible via JavaScript)
3. **CSRF Protection**: Supabase handles CSRF tokens automatically
4. **Rate Limiting**: Consider adding rate limiting to password change endpoint
5. **Password Requirements**: Currently minimum 6 characters (consider strengthening)
6. **Audit Logging**: All password changes are logged server-side

## Future Enhancements

Potential improvements for future iterations:

1. **Password Strength Meter**: Visual indicator of password strength
2. **2FA Support**: Two-factor authentication option
3. **Password History**: Prevent reuse of recent passwords
4. **Email Confirmation**: Send email on password change
5. **Session Management**: View and revoke active sessions
6. **Account Recovery**: Forgot password flow
7. **Security Notifications**: Alert on suspicious login attempts
8. **Login History**: Show recent login activity

## Files Modified

```
Modified:
├── app/auth/callback/page.tsx          # Enhanced callback handling
├── app/login/page.tsx                  # Improved Google OAuth config
├── app/profile/page.tsx                # Added Security tab and password UI
└── components/day-assistant/DayTimeline.tsx  # Fixed TypeScript error

Created:
└── app/api/auth/update-password/route.ts    # Password management API
```

## Support

For issues or questions:
1. Check browser console for error messages
2. Review this documentation
3. Consult `AUTH_DIAGNOSTICS.md` for general auth troubleshooting
4. Check Supabase logs in dashboard
5. Review server logs (Vercel logs if deployed on Vercel)

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
