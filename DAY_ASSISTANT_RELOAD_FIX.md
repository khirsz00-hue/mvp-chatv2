# Day Assistant Reload Fix

## Problem Statement

Day Assistant was intermittently reloading with "Ładowanie asystenta dnia" spinner after user actions (generate subtasks, mark "not today", "mega ważne"), making the UI unusable. The issue was caused by:

1. **Token Retrieval Instability**: Todoist token would flap between "FOUND" and "MISSING" states, causing sync failures
2. **Concurrent Refresh Calls**: Multiple simultaneous `refreshQueue` calls triggered by actions
3. **Global Loading State**: Every refresh would show the full-screen spinner instead of a light refresh
4. **Toast/Log Spam**: Repeated 401 errors and missing token messages flooded the console and UI

## Solution Implemented

### 1. Token Caching (`lib/services/dayAssistantSync.ts`)

**Changes:**
- Added `getCachedTodoistToken()` function with 5-minute in-memory cache
- Token retrieval priority: memory cache → localStorage → database
- Implemented `clearTodoistTokenCache()` for cleanup on disconnect
- Debounced "missing token" logs to 30-second intervals

**Benefits:**
- ✅ Token state is stable (no FOUND/MISSING flapping)
- ✅ Reduced database queries
- ✅ Faster token access for sync operations
- ✅ Less console spam

**Code:**
```typescript
// Cached token with 5-minute TTL
let cachedTodoistToken: string | null = null
let tokenCacheTimestamp: number = 0
const TOKEN_CACHE_DURATION = 5 * 60 * 1000

async function getCachedTodoistToken(userId: string): Promise<string | null> {
  // Check cache first
  if (cachedTodoistToken && (Date.now() - tokenCacheTimestamp) < TOKEN_CACHE_DURATION) {
    return cachedTodoistToken
  }
  
  // Try localStorage, then DB
  // Cache result in memory + localStorage
}
```

### 2. Refresh Debouncing (`components/day-assistant/DayAssistantView.tsx`)

**Changes:**
- Added separate `refreshing` state for light refreshes (no global spinner)
- Implemented `refreshLockRef` to prevent concurrent calls
- Added 500ms debounce after refresh completes
- Cleanup effect for refresh timeout on unmount

**Benefits:**
- ✅ No more concurrent refresh race conditions
- ✅ Actions trigger light refresh (no full-screen spinner)
- ✅ Prevents rapid-fire refresh calls
- ✅ UI remains interactive during refresh

**Code:**
```typescript
const refreshLockRef = useRef(false)
const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

const refreshQueue = useCallback(async (includeLater = false) => {
  // Check lock to prevent concurrent refreshes
  if (refreshLockRef.current) {
    console.log('⏳ Refresh already in progress, skipping...')
    return
  }
  
  refreshLockRef.current = true
  setRefreshing(true) // Light refresh indicator, not global loading
  
  try {
    // Fetch queue...
  } finally {
    setRefreshing(false)
    // Release lock after 500ms debounce
    refreshTimeoutRef.current = setTimeout(() => {
      refreshLockRef.current = false
    }, 500)
  }
}, [userId])
```

### 3. Reduced Toast/Log Spam

**Changes:**
- Single 401 toast per session using `hasShown401Toast` flag
- Debounced missing token logs to 30-second intervals
- Removed duplicate authentication error toasts

**Benefits:**
- ✅ User sees single error message instead of multiple
- ✅ Console logs are cleaner and more useful
- ✅ Better UX during authentication issues

## Verification Steps

### 1. Check No Reload After Actions

1. Open Day Assistant view
2. Perform these actions on a task:
   - Pin task (📌)
   - Mark as "not today" (🧊 postpone)
   - Mark as "mega ważne" (🔥 escalate)
   - Generate subtasks (🧠)
3. **Expected**: UI updates immediately without "Ładowanie asystenta dnia" spinner
4. **Console**: No "Todoist token: MISSING" messages after initial sync

### 2. Verify Token Stability

1. Open browser DevTools console
2. Refresh Day Assistant view
3. **Expected**: See "Todoist token found" once on initial load
4. Perform multiple actions
5. **Expected**: No token status changes, no "MISSING – skipping sync" logs

### 3. Check Auth Error Handling

1. Clear all cookies/localStorage (simulate logged out state)
2. Try to use Day Assistant
3. **Expected**: Single toast "Zaloguj się, aby korzystać z Asystenta Dnia"
4. **Expected**: No repeated 401 error toasts

### 4. Test Todoist Sync

1. Have Todoist connected with active token
2. Open Day Assistant
3. **Expected**: Initial sync completes successfully
4. Make changes in Todoist
5. Wait 12+ seconds for background sync
6. **Expected**: Changes appear without full reload/spinner

## Technical Details

### Debounce Timing
- **Refresh Lock Duration**: 500ms after each refresh
- **Token Cache TTL**: 5 minutes
- **Background Sync Interval**: 12 seconds
- **Sync Throttle**: 60 seconds (via `shouldSync()`)
- **Missing Token Log Interval**: 30 seconds

### State Management
- **Initial Load**: `loading` state (shows full spinner)
- **Light Refresh**: `refreshing` state (no spinner, optional indicator)
- **Refresh Lock**: `refreshLockRef` (prevents concurrent calls)
- **Token Cache**: In-memory + localStorage (dual-layer cache)

### Files Modified
1. `lib/services/dayAssistantSync.ts` - Token caching and sync improvements
2. `components/day-assistant/DayAssistantView.tsx` - Debouncing and loading states

## Future Improvements

1. **Optional Light Refresh Indicator**: Add a small, non-intrusive loading indicator during `refreshing` state
2. **Token Refresh**: Implement automatic token refresh when near expiration
3. **Optimistic Updates**: Update UI immediately before API call completes
4. **Error Recovery**: Retry failed syncs with exponential backoff

## Related Issues

- Fixes intermittent "Ładowanie asystenta dnia" reloads
- Resolves "Todoist token: MISSING – skipping sync" flapping
- Reduces 401 error toast spam
- Improves Day Assistant responsiveness and stability
