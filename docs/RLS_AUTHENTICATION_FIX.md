# RLS Authentication Fix - Day Assistant API

## Problem
The Day Assistant Queue API was returning empty results (`laterCount: 0`) despite having 24 tasks successfully synced to the database. This was caused by Row Level Security (RLS) blocking access because the API routes lacked proper authentication context.

## Root Cause
The API routes were using `supabaseServer` with service role key, which bypasses RLS. However, the proper pattern for Next.js App Router is to use authenticated clients that maintain user session context through cookies. This allows RLS policies to work correctly by providing the authenticated user's ID via `auth.uid()`.

## Solution

### 1. Authentication Utility (`lib/supabaseAuth.ts`)
Created a shared utility module with helper functions:

```typescript
// Creates authenticated Supabase client using cookies
export async function createAuthenticatedSupabaseClient(): Promise<SupabaseClient>

// Gets authenticated user from the client
export async function getAuthenticatedUser(supabase: SupabaseClient)
```

This utility uses `createServerClient` from `@supabase/auth-helpers-nextjs` with cookie methods to maintain session state.

### 2. Updated API Routes

#### Queue API (`app/api/day-assistant/queue/route.ts`)
- ✅ Removed `userId` query parameter requirement
- ✅ Uses authenticated Supabase client
- ✅ Gets user from session cookies
- ✅ Returns 401 if not authenticated
- ✅ Added detailed logging for debugging

#### Energy Mode API (`app/api/day-assistant/energy-mode/route.ts`)
- ✅ Updated both GET and POST handlers
- ✅ Removed `userId` from request body
- ✅ Uses authenticated context
- ✅ Added error handling and logging

#### Tasks API (`app/api/day-assistant/tasks/route.ts`)
- ✅ Updated all handlers (GET, POST, PUT, DELETE)
- ✅ Removed `userId` parameters
- ✅ Uses shared authentication utility
- ✅ Maintains RLS security

### 3. Client-Side Updates (`components/day-assistant/DayAssistantView.tsx`)
- ✅ Removed `userId` from API call query parameters
- ✅ API now uses session cookies automatically
- ✅ Added error logging for failed requests
- ✅ Simplified API calls

## Technical Details

### How Authentication Works

1. **Client Side**: User's session is stored in browser cookies
2. **API Route**: Reads cookies using Next.js `cookies()` helper
3. **Supabase Client**: Creates authenticated client with cookie access
4. **RLS Context**: Client provides `auth.uid()` for RLS policies
5. **Data Access**: RLS policies filter data by `user_id = auth.uid()`

### RLS Policies
All day assistant tables have policies like:
```sql
CREATE POLICY "Users can view their own tasks"
  ON day_assistant_tasks FOR SELECT
  USING (auth.uid() = user_id);
```

These policies require `auth.uid()` to be non-null and match the `user_id` column.

## Benefits

1. **Security**: Prevents users from accessing other users' data by manipulating parameters
2. **Correctness**: RLS policies now work as intended
3. **Maintainability**: Centralized authentication logic in `lib/supabaseAuth.ts`
4. **Consistency**: All API routes follow the same authentication pattern
5. **Debugging**: Enhanced logging helps troubleshoot authentication issues

## Testing Recommendations

1. **Authenticated Access**: Verify logged-in users can access their tasks
2. **Unauthorized Access**: Verify unauthenticated requests return 401
3. **Data Isolation**: Verify users can only see their own data
4. **Queue Count**: Verify `laterCount` reflects actual number of tasks
5. **Error Cases**: Test with expired sessions, invalid cookies, etc.

## Future Work

Consider updating these remaining routes to use the same pattern:
- `/api/day-assistant/chat/route.ts`
- `/api/day-assistant/timeline/route.ts`
- `/api/day-assistant/actions/route.ts`
- `/api/day-assistant/recommendations/route.ts`
- `/api/day-assistant/subtasks/*`
- `/api/day-assistant/undo/route.ts`

## References

- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side)
- [Next.js App Router API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [RLS Migration](supabase/migrations/20231217_day_assistant.sql)
