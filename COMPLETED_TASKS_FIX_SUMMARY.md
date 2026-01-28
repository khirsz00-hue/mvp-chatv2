# Completed Tasks in 7-Day View - Debug & Fix Summary

## Issue Reported
User reported seeing tasks completed 6 months ago appearing in the 7-day board view.

## Investigation Results

### Database Check
Queried `day_assistant_v2_tasks` table:
- ✅ **No uncompleted old tasks found** - All tasks with `due_date` older than 30 days have `completed = true`
- ✅ All 69 tasks in the database have correct `completed` status
- Current date in DB: 2026-01-28

### Code Analysis

#### 1. API Level (`/api/tasks`)
- ✅ Passes `includeCompleted=false` for non-completed views
- Database query correctly uses `.eq('completed', false)`

#### 2. Todoist Fallback API (`/api/todoist/tasks`)
- ✅ Explicitly filters completed tasks:
  ```typescript
  if (t?.completed === true || t?.is_completed === true || t?.completed_at) {
    return false
  }
  ```

#### 3. TasksAssistant Component
- ✅ Filters with `activeTasks = tasks.filter(t => !t.completed)`

#### 4. SevenDaysBoardView Component  
- ✅ Only shows tasks matching specific day columns
- Tasks with `due_date` outside the 7-day window won't display

## Safeguards Added

### 1. Double-Filter in SevenDaysBoardView
Added additional `!task.completed` filter as safeguard:
```typescript
const activeTasks = tasks.filter(task => !task.completed)
```

### 2. Debug Logging in TasksAssistant
Added console warnings for old tasks detection:
```typescript
// Logs any tasks older than 3 months that appear in activeTasks
if (oldTasks.length > 0) {
  console.warn('⚠️ [DEBUG] Old tasks showing in activeTasks...')
}
```

### 3. Active Tasks Count Logging
Added logging to track what's being passed to the 7-day view:
```typescript
console.log('📋 [DEBUG] Active tasks for 7-day view:', activeTasks.length, 'tasks...')
```

## Possible Explanations for User's Issue

1. **Navigation to Past Week**: The 7-day view allows navigating to previous weeks. If user navigated to an old week, they would see tasks from that period.

2. **Browser Caching**: Old data could be cached in the browser.

3. **Sync Delay**: Tasks completed in Todoist may not have synced to the database yet.

4. **Different View Context**: User might have been looking at a different view (e.g., "Completed" filter).

## How to Debug Further

1. **Check Browser Console**: Look for the new debug logs:
   - `⚠️ [DEBUG] Old tasks showing in activeTasks...`
   - `📋 [DEBUG] Active tasks for 7-day view...`

2. **Clear Browser Cache**: Force refresh with Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

3. **Trigger Todoist Sync**: Go to Settings and trigger a manual sync

## Files Modified

| File | Change |
|------|--------|
| `components/assistant/TasksAssistant.tsx` | Added debug logging for old tasks |
| `components/assistant/SevenDaysBoardView.tsx` | Added safeguard filter for completed tasks |

## Date: 2026-01-28
