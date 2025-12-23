# Fix: "Brak sesji" Error - Root Cause Resolution

## 🎯 Problem
Users get error "Brak sesji - odśwież stronę i spróbuj ponownie" when completing tasks, even though they are logged in and other operations work fine.

## 🔍 Root Cause Analysis

### Previous Fix (PR #180) - Incomplete
The previous fix added retry logic with exponential backoff to `getSessionWithRetry()`, but it **still used the wrong Supabase client**:

```typescript
// ❌ WRONG: Standalone client without cookie access
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Problem:** This client is created using `createClient` from `@supabase/supabase-js`, which:
- Does NOT have access to browser cookies
- Cannot read session stored in cookies
- Is designed for server-side or standalone usage
- Will always fail to get session, no matter how many retries

### Actual Root Cause
The real issue is that `hooks/useTasksQuery.ts` was using a **standalone Supabase client** that has no way to access browser cookies where the session is stored.

Even with retry logic, the client would fail all 3 attempts because it fundamentally cannot access the session stored in `document.cookie`.

## ✅ Correct Fix

Replace the standalone client with the proper **browser client** that has cookie handlers configured:

```typescript
// ✅ CORRECT: Browser client with cookie access
import { supabase } from '@/lib/supabaseClient'
```

### Why This Works

The browser client in `/lib/supabaseClient.ts` is created using `createBrowserClient` from `@supabase/ssr` with proper cookie handlers:

```typescript
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    get(name: string) {
      // ✅ Can access document.cookie
      const cookies = document.cookie.split('; ')
      const cookie = cookies.find(c => c.startsWith(`${name}=`))
      return cookie?.split('=')[1]
    },
    set(name: string, value: string, options: any) {
      // ✅ Can set cookies in browser
      document.cookie = `${name}=${value}...`
    },
    remove(name: string, options: any) {
      // ✅ Can remove cookies
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    }
  }
})
```

This client can:
- ✅ Access browser cookies via `document.cookie`
- ✅ Read session tokens stored in Supabase auth cookies
- ✅ Properly authenticate users for mutations
- ✅ Work consistently across all operations

## 🔄 Changes Made

**File:** `hooks/useTasksQuery.ts`

```diff
- import { createClient } from '@supabase/supabase-js'
+ import { supabase } from '@/lib/supabaseClient'

- const supabase = createClient(
-   process.env.NEXT_PUBLIC_SUPABASE_URL!,
-   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
- )
```

That's it! Just 5 lines removed, 1 line changed. The existing retry logic remains and now actually works because the client can access the session.

## ✅ Benefits

1. **Consistent with codebase**: All other components already use this pattern:
   - `components/day-assistant-v2/DayAssistantV2View.tsx`
   - `components/auth/ProtectedRoute.tsx`
   - `components/journal/JournalAssistantMain.tsx`
   - `components/assistant/TasksAssistant.tsx`
   - And many more...

2. **Minimal change**: Only changed the import, no logic changes needed

3. **Fixes all mutations**: Since all hooks in the file use the same client:
   - `useCompleteTask()` ✅
   - `useDeleteTask()` ✅
   - `useTogglePinTask()` ✅
   - `usePostponeTask()` ✅
   - `useToggleSubtask()` ✅
   - `useAcceptRecommendation()` ✅
   - `useCreateSubtasks()` ✅
   - `useTasksQuery()` ✅

## 🧪 Testing

### Manual Testing Steps
1. ✅ Log in to the application
2. ✅ Navigate to Day Assistant V2
3. ✅ Complete a task - should work without "Brak sesji" error
4. ✅ Delete a task - should work
5. ✅ Pin a task - should work
6. ✅ Postpone a task - should work
7. ✅ Toggle a subtask - should work

### Expected Behavior
- ✅ No more "Brak sesji - odśwież stronę i spróbuj ponownie" errors
- ✅ All task mutations work immediately
- ✅ Session is properly retrieved from cookies
- ✅ Console logs show: `✅ [useCompleteTask] Session obtained, completing task: {taskId}`

### What Was Wrong Before
- ❌ Error: "Brak sesji - odśwież stronę i spróbuj ponownie"
- ❌ All 3 retry attempts failed
- ❌ Session was in cookies but client couldn't access it
- ❌ Console showed: `❌ Session error (attempt 1/3)`, `❌ Session error (attempt 2/3)`, `❌ Session error (attempt 3/3)`

## 📝 Summary

**Previous approach:** Add retry logic to work around race conditions  
**Reality:** The client fundamentally couldn't access cookies, so retries were useless

**Correct approach:** Use the proper browser client with cookie access  
**Result:** Session is retrieved successfully on first attempt

This is the actual root cause fix that addresses the fundamental issue rather than trying to work around it.
