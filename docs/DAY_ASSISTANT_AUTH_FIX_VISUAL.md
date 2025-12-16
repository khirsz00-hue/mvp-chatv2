# Day Assistant Authentication Fix - Visual Guide

## Problem Illustrated

### Before Fix: Inconsistent Auth Behavior

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ GET /api/day-assistant/queue
       │ Cookie: (missing or expired)
       ▼
┌─────────────────┐
│   Queue API     │
│  ❌ Returns 200  │  <-- WRONG! Should return 401
│  {              │
│    now: null,   │
│    next: [],    │
│    later: []    │
│  }              │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Browser Log    │
│ "[Queue API] No │  <-- Error in logs
│  authenticated  │      but UI shows "success"
│  user"          │
└─────────────────┘
```

**Result:** Empty UI, confusing logs, no user feedback

---

### After Fix: Consistent 401 Responses

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ GET /api/day-assistant/queue
       │ Cookie: (missing or expired)
       ▼
┌─────────────────┐
│   Queue API     │
│  ✅ Returns 401  │  <-- CORRECT!
│  {              │
│    error: "...  │
│    Please log   │
│    in"          │
│  }              │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  UI Toast       │
│ "Zaloguj się,   │  <-- Clear user feedback
│  aby korzystać  │
│  z Asystenta    │
│  Dnia"          │
└─────────────────┘
```

**Result:** Clear error, user knows what to do

---

## Security Improvement Illustrated

### Before: Client-Controlled User ID (Insecure)

```
┌──────────────┐
│   Browser    │
│              │
│ userId: "123"│  <-- User can change this!
└──────┬───────┘
       │ POST /api/timeline
       │ { userId: "123", eventId: "xyz" }
       │
       ▼
┌──────────────────┐
│  Timeline API    │
│                  │
│  const { userId, │  <-- Trusts client input ❌
│    eventId } =   │
│    req.json()    │
│                  │
│  updateTimeline( │  <-- Could access other
│    userId, ...)  │      user's data!
└──────────────────┘
```

**Risk:** User impersonation, unauthorized access

---

### After: Session-Based Auth (Secure)

```
┌──────────────────────┐
│   Browser            │
│                      │
│ Cookie: sb-xxx-auth- │  <-- HTTP-only, secure
│   token=<jwt>        │      (cannot be read by JS)
└──────┬───────────────┘
       │ POST /api/timeline
       │ { eventId: "xyz" }  <-- No userId!
       │
       ▼
┌──────────────────────────┐
│  Timeline API            │
│                          │
│  const supabase =        │
│    createAuthenticated() │  <-- Reads session
│  const user =            │      from secure cookie
│    getAuthUser(supabase) │
│                          │
│  if (!user?.id)          │  <-- Validates auth
│    return 401            │
│                          │
│  updateTimeline(         │  <-- Uses validated
│    user.id, ...)         │      session user ID
└──────────────────────────┘
```

**Protection:** Server validates identity, client cannot manipulate

---

## Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Successful Login                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase creates session & stores in HTTP-only cookies │
│  Cookie: sb-<project>-auth-token=<JWT>                  │
│  - HttpOnly: true (JS cannot access)                    │
│  - Secure: true (HTTPS only)                            │
│  - SameSite: lax (CSRF protection)                      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│        Browser automatically sends cookie with          │
│        every request to same domain                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Middleware (middleware.ts)                             │
│  - Reads cookies from request                           │
│  - Calls supabase.auth.getUser()                        │
│  - Refreshes session if needed                          │
│  - Updates cookies in response                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  API Route (e.g., queue/route.ts)                       │
│  1. createAuthenticatedSupabaseClient()                 │
│     - Reads cookies from request                        │
│     - Creates Supabase client with cookie context       │
│  2. getAuthenticatedUser(supabase)                      │
│     - Validates JWT from cookie                         │
│     - Returns user object or null                       │
│  3. if (!user?.id) return 401                           │
│  4. Use user.id for database queries                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Database with Row Level Security (RLS)                 │
│  - Supabase provides auth.uid() function                │
│  - RLS policy: WHERE user_id = auth.uid()               │
│  - Automatically filters data by authenticated user     │
└─────────────────────────────────────────────────────────┘
```

---

## Code Changes Overview

### API Route Pattern Change

**Before:**
```typescript
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')  // ❌ From client
  
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }
  
  const data = await getQueueState(userId)  // ❌ Uses client value
  return NextResponse.json(data)
}
```

**After:**
```typescript
export async function GET(req: NextRequest) {
  const supabase = await createAuthenticatedSupabaseClient()  // ✅ Session
  const user = await getAuthenticatedUser(supabase)
  
  if (!user?.id) {  // ✅ Validates auth
    return NextResponse.json(
      { error: 'Unauthorized - Please log in' },
      { status: 401 }
    )
  }
  
  const data = await getQueueState(user.id, ..., supabase)  // ✅ Validated ID
  return NextResponse.json(data)
}
```

---

### Client Component Pattern Change

**Before:**
```typescript
// DayTimeline.tsx
const loadTimeline = async () => {
  const response = await fetch(
    `/api/day-assistant/timeline?userId=${userId}&date=${today}`  // ❌ Sends userId
  )
  // ...
}
```

**After:**
```typescript
// DayTimeline.tsx
const loadTimeline = async () => {
  const response = await fetch(
    `/api/day-assistant/timeline?date=${today}`  // ✅ No userId
  )
  
  if (response.status === 401) {  // ✅ Handles auth error
    console.error('Error loading timeline: Session missing')
  }
  // ...
}
```

---

## Error Handling Flow

### Session Present (Happy Path)

```
User → Browser → API → Database
       [Cookie]   ✅ 200   [User's data]
                  {data}
```

### Session Missing (Error Path)

```
User → Browser → API
       [No cookie]  ❌ 401
                   {error: "Unauthorized"}
         │
         ▼
    Shows Toast:
    "Zaloguj się..."
```

### Session Expired (Middleware Refresh)

```
User → Browser → Middleware → Supabase
       [Old cookie]  Refresh    New session
         │            ↓            ↓
         ▼         [New cookie] → API → Database
    Automatic refresh            ✅ 200  [Data]
```

---

## Monitoring & Debugging

### Log Patterns

**Successful Auth:**
```
[Auth] Found 2 Supabase auth cookie(s) for session
[Auth] User authenticated: 12345678... (dev only)
[Queue API] Fetching queue for user: 12345678-...
✅ [Queue API] Queue state: laterCount: 3
```

**Failed Auth:**
```
[Auth] No Supabase auth cookies found - user likely not authenticated
[Auth] No user found in session
[Queue API] No authenticated user - session missing
```

**Error Path:**
```
[Auth] Authentication error: Auth session missing
[Queue API] No authenticated user - session missing
```

---

## Testing Checklist

### Browser DevTools Checks

1. **Application Tab → Cookies**
   - Look for `sb-<project>-auth-token` cookies
   - Should have `HttpOnly` flag
   - Should have `Secure` flag (production)

2. **Network Tab → Queue API**
   - Request should include `Cookie` header
   - Response: 200 with data OR 401 with error
   - Check response body matches status

3. **Console Tab**
   - No "Unauthorized" errors when logged in
   - Clear error messages when not logged in

### API Testing

```bash
# Test with session (from browser console)
fetch('/api/day-assistant/queue')
  .then(r => r.json())
  .then(console.log)
// Expected: 200 + { now: ..., next: [...], later: [...] }

# Test without session (incognito/new session)
fetch('/api/day-assistant/queue')
  .then(r => r.json())
  .then(console.log)
// Expected: 401 + { error: "Unauthorized - Please log in" }
```

---

## Summary

✅ **10 files changed**
- 6 API routes fixed
- 2 client components updated
- 1 auth helper improved
- 1 debugging guide added

✅ **Security improvements**
- No client-controlled user IDs
- Proper 401 error responses
- HTTP-only session cookies
- Defensive logging

✅ **User experience**
- Clear error messages
- Helpful toast notifications
- Comprehensive debugging docs

✅ **Validation**
- Linter passed
- Build successful
- CodeQL: 0 vulnerabilities
- Code review completed

**Ready for production! 🚀**
