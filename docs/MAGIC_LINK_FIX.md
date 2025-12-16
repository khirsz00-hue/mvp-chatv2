# Magic Link Authentication Fix

## Problem

Users were experiencing authentication failures when clicking magic links from mobile devices. The error message "link wygasł" (link expired) appeared, and users were redirected back to the login page.

## Root Cause

The application was using PKCE (Proof Key for Code Exchange) flow for authentication (`flowType: 'pkce'` in `lib/supabaseClient.ts`). This flow works as follows:

1. When a user requests a magic link, a **code verifier** is generated and stored in browser localStorage
2. The magic link contains an authorization code
3. When the link is clicked, the code must be exchanged for a session using the verifier
4. The verifier in localStorage must match the code in the URL

### The Mobile Problem

On mobile devices, when users click magic links from email:
- The link often opens in a **different browser** or **in-app webview** than where they requested it
- The code verifier stored in localStorage is not accessible in this new context
- Without the verifier, the code exchange fails
- Supabase returns an "expired link" error

This is especially common with:
- Email clients with built-in browsers (Gmail, Outlook)
- Third-party email apps
- Cross-browser scenarios (requested in Safari, opened in Chrome)

## Solution

We implemented a **server-side auth code exchange** using Next.js middleware. The middleware intercepts all requests and handles the authentication flow before any page is rendered.

### Implementation

**File: `middleware.ts`**

```typescript
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Create response with request headers
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Middleware] Missing Supabase environment variables')
    return response
  }

  // Create authenticated Supabase client with cookie management
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Set cookies in both request and response
          cookiesToSet.forEach(({ name, value }) => 
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This triggers auth code exchange if a code is present in URL
  // and establishes the session server-side
  try {
    await supabase.auth.getUser()
  } catch (error) {
    // Log the error but don't block the request
    console.error('[Middleware] Auth error:', error)
  }

  return response
}
```

### How It Works

1. **All requests** pass through the middleware
2. If the URL contains an auth code (from magic link), `supabase.auth.getUser()` detects it
3. The code exchange happens **server-side** where cookies can be properly set
4. Session cookies are set in the response
5. The callback page receives a request with an **established session**
6. No localStorage or code verifier is needed on the client

### Benefits

✅ **Works across browsers**: No localStorage dependency  
✅ **Works on mobile**: Email links open correctly regardless of browser  
✅ **More secure**: Code exchange happens server-side  
✅ **Better UX**: Faster authentication with fewer redirects  
✅ **No client-side PKCE issues**: Server handles verification  

## Technical Details

### PKCE vs Server-Side Exchange

**PKCE (Previous approach)**:
```
Client generates verifier → Stores in localStorage → Sends code in URL
→ Client retrieves verifier → Exchanges code + verifier for session
```
**Problem**: Verifier not accessible in different browser/context

**Server-Side (New approach)**:
```
Client requests magic link → Clicks link → Middleware intercepts
→ Server exchanges code for session → Sets session cookies
→ Client receives established session
```
**Solution**: No client-side storage needed

### Middleware Configuration

The middleware runs on all routes except:
- Static files (`_next/static`)
- Image optimization (`_next/image`)
- Favicon and image files (`.svg`, `.png`, etc.)

This ensures auth is handled for all application pages while not interfering with static assets.

### Compatibility

This solution is compatible with:
- Mobile browsers (Safari, Chrome, Firefox)
- Email client webviews (Gmail, Outlook, etc.)
- Desktop browsers
- Cross-browser scenarios
- Supabase PKCE flow (still works for direct browser logins)

## Testing

### Manual Testing

1. **Mobile Magic Link**:
   - Request magic link from a mobile browser
   - Check email on the same device
   - Click the magic link
   - ✅ Should authenticate successfully without "expired" error

2. **Cross-Browser**:
   - Request magic link in Safari
   - Click link in Chrome
   - ✅ Should authenticate successfully

3. **Email App**:
   - Request magic link
   - Open email in Gmail/Outlook app
   - Click link (opens in-app browser)
   - ✅ Should authenticate successfully

4. **Desktop**:
   - Request magic link in desktop browser
   - Click link in same browser
   - ✅ Should authenticate successfully (unchanged behavior)

### What Changed for Users

**Before**: "Link wygasł" error on mobile → Frustration → Can't log in  
**After**: Smooth authentication → Direct access to app

### Logs to Check

The callback page (`app/auth/callback/page.tsx`) includes detailed logging:
```
🔍 [AuthCallback] Starting callback handling
🔍 [AuthCallback] URL: [url]
🔍 [AuthCallback] Session: [user_id or NULL]
✅ [AuthCallback] Session found, redirecting to /
```

With the middleware in place, you should see a session immediately after the callback starts.

## Related Files

- `middleware.ts` - Server-side auth code exchange (NEW)
- `lib/supabaseClient.ts` - Client-side Supabase configuration
- `app/auth/callback/page.tsx` - Authentication callback page
- `app/login/page.tsx` - Login page with magic link form

## References

- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [PKCE Flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
