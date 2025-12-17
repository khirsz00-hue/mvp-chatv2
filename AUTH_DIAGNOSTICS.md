# Authentication Diagnostics Guide

## Overview
This guide helps diagnose and verify proper authentication setup for the MVP ChatV2 application, particularly for Day Assistant and Todoist integration features.

## Prerequisites
- Modern browser (Chrome, Firefox, Edge, Safari)
- Access to production host: `mvp-chatv2.vercel.app`
- Browser DevTools access

---

## Cookie Verification Checklist

### Expected Cookies for Production Host

When logged in on `mvp-chatv2.vercel.app`, you should see these cookies in DevTools:

1. **Supabase Auth Cookies** (required for authentication):
   - `sb-<project-ref>-auth-token` - Main auth token
   - `sb-<project-ref>-auth-token-code-verifier` - PKCE code verifier (during OAuth flows)

2. **Cookie Attributes**:
   - `Domain`: `.vercel.app` or `mvp-chatv2.vercel.app`
   - `Path`: `/`
   - `SameSite`: `Lax` or `None`
   - `Secure`: `true` (HTTPS only)
   - `HttpOnly`: May be `false` (client-side auth needs access)

### How to Check Cookies in DevTools

#### Chrome / Edge
1. Open DevTools (F12 or right-click → Inspect)
2. Go to **Application** tab
3. Expand **Cookies** in left sidebar
4. Select `https://mvp-chatv2.vercel.app`
5. Look for `sb-*` cookies

#### Firefox
1. Open DevTools (F12)
2. Go to **Storage** tab
3. Expand **Cookies**
4. Select `https://mvp-chatv2.vercel.app`
5. Look for `sb-*` cookies

#### Safari
1. Develop → Show Web Inspector (Cmd+Opt+I)
2. Go to **Storage** tab
3. Select **Cookies** → `mvp-chatv2.vercel.app`
4. Look for `sb-*` cookies

---

## Common Issues and Solutions

### Issue 1: No Cookies Visible
**Symptoms**: DevTools shows no `sb-*` cookies after login

**Possible Causes**:
- Browser blocking third-party cookies
- Incognito/Private mode with strict settings
- Browser extensions (ad blockers, privacy tools)
- Mixed host access (preview.vercel.app vs production)

**Solutions**:
1. **Check browser cookie settings**:
   - Chrome: Settings → Privacy → Cookies → "Allow all cookies"
   - Firefox: Settings → Privacy → Standard or Custom with cookies enabled
   - Safari: Preferences → Privacy → Uncheck "Prevent cross-site tracking"

2. **Disable privacy extensions temporarily**:
   - Ad blockers (uBlock, AdBlock)
   - Privacy Badger
   - Cookie Auto-Delete

3. **Use consistent production host**:
   - Always use `mvp-chatv2.vercel.app`
   - Avoid mixing `preview-xyz.vercel.app` URLs
   - Clear cookies if switching between hosts

4. **Check console logs**:
   - Look for `[Client Cookie]` messages
   - Check for warnings about failed cookie sets

### Issue 2: Day Assistant Returns 401
**Symptoms**: "Unauthorized – Please log in" toast, empty NOW/NEXT/LATER

**Diagnosis Steps**:
1. **Verify you're logged in**:
   ```javascript
   // Run in browser console
   await supabase.auth.getSession()
   // Should return { session: { user: {...} } }
   ```

2. **Check cookies are present** (see checklist above)

3. **Check browser console logs**:
   - Look for `[Auth State Manager]` messages
   - Should see "✓ Session active for user"
   - Should see "✓ Found N Supabase auth cookie(s)"

4. **Check Network tab**:
   - Filter for `/api/day-assistant/queue`
   - Should return status `200`
   - If `401`, check request cookies tab

**Solutions**:
- If logged in but no cookies: Refresh page after login
- If cookies present but still 401: Clear all cookies and log in again
- Check that you're on the correct host (not preview URL)

### Issue 3: Todoist Not Connected (Inconsistent State)
**Symptoms**: TasksAssistant shows tasks, but Integracje shows "Not connected"

**Root Cause**: Token in localStorage but not in database

**Diagnosis**:
```javascript
// Run in browser console
// Check localStorage
localStorage.getItem('todoist_token')  // Old location

// Check database (requires auth)
const { data } = await supabase
  .from('user_profiles')
  .select('todoist_token')
  .single()
console.log('DB token:', data?.todoist_token ? 'EXISTS' : 'MISSING')
```

**Solution**:
1. Go to Profile → Integracje tab
2. Click "Odłącz" (disconnect) if showing as connected
3. Click "Połącz" (connect) to reconnect
4. Follow OAuth flow
5. Token will be saved to database
6. Both views should now show connected status

---

## Step-by-Step Verification Procedure

### 1. Fresh Login Test
1. **Clear all data**:
   - Chrome: DevTools → Application → Clear site data
   - Firefox: DevTools → Storage → Clear All
   - Safari: Develop → Empty Caches

2. **Navigate to login page**:
   ```
   https://mvp-chatv2.vercel.app/login
   ```

3. **Try each login method**:
   - Email + Password
   - Google OAuth
   - Magic Link (check email)

4. **After successful login**:
   - ✅ Should redirect to `/`
   - ✅ Browser console shows `[Auth State Manager] ✓ Session active`
   - ✅ DevTools shows `sb-*` cookies
   - ✅ No error toasts

### 2. Day Assistant API Test
1. **Navigate to Day Assistant**
2. **Check browser console**:
   ```
   [DayAssistant] Current user: <user-id>
   [DayAssistant] Todoist token: FOUND/MISSING
   [DayAssistant Queue GET] === Request received ===
   [DayAssistant Queue GET] ✓ Authenticated user: <user-id>
   ```

3. **Check UI**:
   - ✅ NOW/NEXT/LATER sections visible
   - ✅ Energy mode selector works
   - ✅ No "Zaloguj się" toast
   - ✅ Tasks load (if Todoist connected)

4. **Check Network tab**:
   ```
   GET /api/day-assistant/queue
   Status: 200 OK
   Response: { now: {...}, next: [...], later: [...] }
   ```

### 3. Todoist Integration Test
1. **Connect Todoist** (if not already):
   - Profile → Integracje → Todoist → Połącz
   - Complete OAuth flow
   - Should redirect back with success toast

2. **Verify in both locations**:
   - **Integracje tab**: Shows green "Połączono"
   - **TasksAssistant**: Shows Todoist tasks
   - **Day Assistant**: Syncs tasks automatically

3. **Check browser console**:
   ```
   [Todoist Callback] ✓ Token saved to database for user: <user-id>
   [Integrations] Todoist connected for user ...: YES
   [TasksAssistant] ✓ Todoist token found
   ```

---

## Advanced Diagnostics

### Get Full Auth Diagnostics
Run this in browser console:
```javascript
// Import the diagnostic function
const { getAuthDiagnostics } = await import('/lib/authStateManager')
const diagnostics = await getAuthDiagnostics()
console.table(diagnostics)
```

Expected output:
```
{
  hasSession: true,
  userId: "abc123...",
  userEmail: "user@example.com",
  cookieCount: 1,
  cookieNames: ["sb-xyz-auth-token"],
  error: null,
  host: "mvp-chatv2.vercel.app"
}
```

### Check Server-Side Auth
Make a test API request:
```javascript
// Test auth with actual API call
const response = await fetch('/api/day-assistant/queue', {
  credentials: 'include'
})
console.log('Status:', response.status)
console.log('Response:', await response.json())
```

Expected: Status 200 with queue data
If 401: Server not receiving auth cookies

---

## Best Practices

### For Users
1. **Use production URL consistently**: Always `mvp-chatv2.vercel.app`
2. **Allow cookies**: Ensure browser allows cookies for the site
3. **Refresh after login**: Give cookies time to set (auto-refresh included)
4. **Reconnect integrations**: If status inconsistent, disconnect and reconnect

### For Developers
1. **Check environment variables**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   NEXT_PUBLIC_SITE_URL=https://mvp-chatv2.vercel.app
   ```

2. **Monitor logs** (Vercel Dashboard):
   - Look for `[Auth]` prefix messages
   - Check for cookie warnings
   - Monitor 401 errors

3. **Test in multiple browsers**:
   - Chrome (strict cookies)
   - Firefox (standard privacy)
   - Safari (ITP enabled)
   - Edge (similar to Chrome)

---

## Quick Reference

### Key Log Messages to Look For

✅ **Success indicators**:
- `[Auth State Manager] ✓ Session active for user`
- `[Auth State Manager] ✓ Found N Supabase auth cookie(s)`
- `[Client Cookie] Set: sb-*`
- `[DayAssistant Queue GET] ✓ Authenticated user`
- `[Integrations] Todoist connected for user ...: YES`

⚠️ **Warning indicators**:
- `[Auth State Manager] ⚠️ No Supabase auth cookies found`
- `[Client Cookie] ⚠️ Failed to set cookie`
- `[Auth] ✗ No Supabase auth cookies found`

❌ **Error indicators**:
- `[DayAssistant Queue GET] ✗ No authenticated user - returning 401`
- `[Auth] ✗ Authentication error`
- `❌ [DayAssistant] Session missing - user not authenticated`

### Support Checklist
When reporting auth issues, include:
- [ ] Browser and version
- [ ] Production URL being used
- [ ] Screenshot of DevTools → Cookies
- [ ] Browser console logs (with `[Auth]` messages)
- [ ] Network tab showing API request/response
- [ ] Steps taken before issue occurred

---

## Appendix: Architecture Overview

### Authentication Flow
```
1. User logs in → Supabase Auth
2. Supabase sets cookies via createBrowserClient
3. Cookies sent with every API request
4. Server reads cookies via createServerClient
5. RLS policies filter data by auth.uid()
```

### Cookie Lifecycle
```
Login → Set cookies → Store in browser
         ↓
      Requests include cookies automatically
         ↓
      Server validates session from cookies
         ↓
      Returns user-specific data
         ↓
Logout → Clear cookies → Return to login
```

### Todoist Integration Flow
```
1. User clicks "Połącz" → OAuth redirect
2. Todoist auth → Callback with code
3. Exchange code for token
4. Save token to database (user_profiles.todoist_token)
5. TasksAssistant fetches token from DB
6. Both Integracje and TasksAssistant show "Connected"
```

---

## Getting Help

If issues persist after following this guide:

1. **Clear everything and start fresh**:
   - Clear browser data
   - Log out completely
   - Close all tabs
   - Open new window and log in

2. **Try different browser**: Rules out browser-specific issues

3. **Check Supabase Dashboard**: Verify user exists and has valid session

4. **Contact support** with:
   - This diagnostic checklist completed
   - Browser console logs
   - DevTools screenshots
   - Steps to reproduce
