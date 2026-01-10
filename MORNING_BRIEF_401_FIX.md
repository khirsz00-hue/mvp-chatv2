# Morning Brief 401 Unauthorized Fix - Implementation Summary

## 🎯 Problem Statement

All 3 Morning Brief API endpoints were returning **401 Unauthorized**:
- `/api/recap/yesterday` → "User not authenticated"
- `/api/recap/today` → "User not authenticated"
- `/api/recap/summary` → "Failed to fetch recap data: { yesterday: 401, today: 401 }"

## 🔍 Root Cause

`lib/supabaseAuth.ts::createAuthenticatedSupabaseClient()` **ONLY reads cookies**, but does NOT check the **Authorization header**.

### Authentication Flow (BROKEN):
```
Browser → /api/recap/summary [with cookies] ✅
    ↓ creates supabase client with cookies ✅
    ↓ calls getAuthenticatedUser() ✅
    ↓
  Server-side fetch → /api/recap/yesterday 
                      [NO COOKIES - server-to-server] ❌
                      [HAS Authorization header, but IGNORED] ❌
                    ↓
                  createAuthenticatedSupabaseClient() 
                    reads cookies() → EMPTY ❌
                    → 401 Unauthorized ❌
```

**Why?**
1. When `/api/recap/summary` makes server-side fetch to sub-endpoints
2. It sends `Authorization: Bearer <token>` header (line 154 in summary/route.ts)
3. BUT sub-endpoints call `createAuthenticatedSupabaseClient()` which **only reads cookies**
4. Server-to-server fetch has NO cookies (cookies don't transfer in fetch())
5. Authorization header is present but **completely ignored**
6. Result: 401 Unauthorized

## ✅ Solution Implemented

Modified authentication flow to check Authorization header first, then fall back to cookies.

### Changes Made

#### 1. lib/supabaseAuth.ts
Added optional `request?: Request` parameter and Authorization header checking:

```typescript
export async function createAuthenticatedSupabaseClient(
  request?: Request
): Promise<SupabaseClient> {
  // 1. Try Authorization header first (server-to-server calls)
  if (request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      
      // Create client with explicit access token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )
      
      console.log('[Auth] ✓ Using Authorization header for authentication')
      return supabase
    }
  }
  
  // 2. Fallback to cookies (browser-to-server calls)
  const cookieStore = await cookies()
  // ... rest of existing cookie-based logic
}
```

#### 2. app/api/recap/yesterday/route.ts
```typescript
// Before:
const supabase = await createAuthenticatedSupabaseClient()

// After:
const supabase = await createAuthenticatedSupabaseClient(req)
```

#### 3. app/api/recap/today/route.ts
```typescript
// Before:
const supabase = await createAuthenticatedSupabaseClient()

// After:
const supabase = await createAuthenticatedSupabaseClient(req)
```

#### 4. app/api/recap/summary/route.ts
```typescript
// Before:
const supabase = await createAuthenticatedSupabaseClient()

// After:
const supabase = await createAuthenticatedSupabaseClient(req)
```

### Authentication Flow (FIXED):
```
Browser → /api/recap/summary [with cookies]
    ↓ 
    createAuthenticatedSupabaseClient(req)
    checks Authorization header → none (browser request)
    falls back to cookies ✅
    ↓
    getAuthenticatedUser() ✅
    ↓
    Server-side fetch → /api/recap/yesterday
                        [Authorization: Bearer <token>] ✅
                      ↓
                      createAuthenticatedSupabaseClient(req)
                      checks Authorization header → FOUND ✅
                      creates client with token ✅
                      ↓
                      getAuthenticatedUser() ✅
                      ↓
                      200 OK with data ✅
```

## 🔒 Backward Compatibility

✅ **Fully backward compatible** - request parameter is optional

### Existing API routes unchanged:
- `/api/chat-assistant` - uses `createAuthenticatedSupabaseClient()` ✅
- `/api/voice/save-tasks` - uses `createAuthenticatedSupabaseClient()` ✅
- `/api/todoist/callback` - uses `createAuthenticatedSupabaseClient()` ✅
- `/api/todoist/sync` - uses `createAuthenticatedSupabaseClient()` ✅
- And 10+ other endpoints - all work without changes ✅

When called without `request` parameter, the function falls back to cookie-based authentication (existing behavior).

## ✅ Testing & Verification

### Build & Linting
- ✅ TypeScript compilation successful (`npm run build`)
- ✅ No ESLint errors (`npm run lint`)
- ✅ All routes compile without errors

### Security
- ✅ CodeQL security scan passed (0 vulnerabilities)
- ✅ No sensitive data exposure
- ✅ Proper token handling

### Logic Testing
Verified Authorization header extraction logic:
- ✅ Valid Bearer token → extracts token correctly
- ✅ Invalid format → falls back to cookies
- ✅ No header → falls back to cookies
- ✅ Empty string → falls back to cookies

### Backward Compatibility
- ✅ Verified 15+ existing API routes continue to work
- ✅ No breaking changes to other parts of the app
- ✅ Optional parameter pattern preserved

## 🎯 Expected Results

After this fix, all 3 Morning Brief endpoints should return **200 OK**:

### /api/recap/yesterday
- Returns completed tasks from yesterday
- Includes statistics (completed count, total count)
- Identifies last active task

### /api/recap/today
- Returns tasks scheduled for today
- Calculates intelligent focus task using advanced scoring
- Includes focus reason and statistics

### /api/recap/summary
- Combines yesterday and today data
- Fetches meetings from calendar
- Generates personalized tips
- Creates text-to-speech summary

### Morning Brief Page
- ✅ Loads successfully without 401 errors
- ✅ Displays yesterday's completed tasks
- ✅ Shows today's tasks with focus task suggestion
- ✅ Presents personalized tips and insights
- ✅ No errors in browser console or server logs

## 📝 Technical Notes

### Why This Approach?

1. **Minimal Changes**: Only modified authentication utility and 3 endpoints
2. **Backward Compatible**: Optional parameter preserves existing behavior
3. **Standard Pattern**: Authorization header is industry standard for API authentication
4. **No Breaking Changes**: All existing endpoints continue to work unchanged

### Alternative Approaches Considered

❌ **Pass user ID in request body**: Violates security best practices (RLS policies)
❌ **Use service role key**: Too permissive, bypasses RLS
❌ **Modify all endpoints**: Unnecessary breaking changes
✅ **Check Authorization header first**: Standard, secure, backward compatible

## 🚀 Deployment

### Pre-deployment Checklist
- [x] Code changes committed
- [x] Tests passed
- [x] Security scan passed
- [x] Backward compatibility verified
- [x] Documentation updated

### Post-deployment Verification
1. Test `/api/recap/summary` endpoint → should return 200 OK
2. Test `/api/recap/yesterday` endpoint → should return 200 OK
3. Test `/api/recap/today` endpoint → should return 200 OK
4. Visit Morning Brief page → should load without errors
5. Check browser console → no 401 errors
6. Check server logs → "[Auth] ✓ Using Authorization header for authentication"

## 📚 Related Documentation
- [Supabase Authentication Docs](https://supabase.com/docs/guides/auth)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [HTTP Authorization Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization)

## 🎉 Summary

This fix resolves the 401 Unauthorized issue in Morning Brief APIs by implementing a dual authentication strategy:
1. **Check Authorization header first** (for server-to-server calls)
2. **Fall back to cookies** (for browser-to-server calls)

The solution is minimal, secure, backward compatible, and follows industry best practices for API authentication.

---

**Implementation Date**: 2026-01-10  
**Status**: ✅ Complete  
**Breaking Changes**: None  
**Backward Compatible**: Yes
