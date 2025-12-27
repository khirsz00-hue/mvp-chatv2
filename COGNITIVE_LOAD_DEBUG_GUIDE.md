# Cognitive Load Display Issue - Debug Guide

## Problem
Tasks display "Load 5/5" for all tasks, even though the database contains different values (e.g., 3, 5, 2).

## Debug Logging Added

The codebase now has comprehensive debug logging at 5 key checkpoints in the data pipeline:

### 1. API Level (Backend)
**Location:** `/app/api/day-assistant-v2/dayplan/route.ts` lines 98-107  
**Log Prefix:** `📊 [dayplan API]`  
**What it shows:** Cognitive load values as they come from the database

```javascript
console.log('📊 [dayplan API] Cognitive load verification (first 5 tasks):')
tasks.slice(0, 5).forEach((t, idx) => {
  console.log(`  #${idx + 1}. "${t.title.substring(0, 40)}"`)
  console.log(`      cognitive_load: ${t.cognitive_load} (type: ${typeof t.cognitive_load})`)
})
```

### 2. State Setting (Frontend)
**Location:** `/components/day-assistant-v2/DayAssistantV2View.tsx` after `setTasks()`  
**Log Prefix:** `🔍 [State Set]`  
**What it shows:** Cognitive load values immediately after React state is updated

### 3. After Filtering
**Location:** `/components/day-assistant-v2/DayAssistantV2View.tsx` in `filteredTasks` useMemo  
**Log Prefix:** `🔍 [Filtered Tasks]`  
**What it shows:** Cognitive load values after applying context and work mode filters

### 4. Before/After Scoring
**Location:** `/hooks/useScoredTasks.ts` lines 28-56  
**Log Prefix:** `📊 [Scoring Debug]`  
**What it shows:** Cognitive load values before and after the scoring algorithm runs

### 5. At Render Time
**Location:** `/components/day-assistant-v2/DayAssistantV2View.tsx` inline in Badge component  
**Log Prefix:** `🔍 [Render]`  
**What it shows:** Cognitive load value at the exact moment it's being rendered in the UI

## How to Use This Debug Logging

1. **Run the application** in development mode
2. **Open browser DevTools** console
3. **Load the Day Assistant V2 view**
4. **Look for the debug logs** in order:
   - Check if API returns correct values (`📊 [dayplan API]`)
   - Check if state is set correctly (`🔍 [State Set]`)
   - Check if filtering preserves values (`🔍 [Filtered Tasks]`)
   - Check if scoring preserves values (`📊 [Scoring Debug] BEFORE/AFTER`)
   - Check if render receives correct value (`🔍 [Render]`)

5. **Identify the checkpoint** where cognitive_load changes from correct value to 5
6. **Report your findings** with the exact log prefix where the value changes

## Possible Causes & Solutions

### If API shows correct values but State Set shows wrong values:
- Issue in `loadDayPlan()` function or JSON parsing
- Check network response in DevTools Network tab

### If State Set is correct but Filtered Tasks shows wrong values:
- Issue in `filteredTasks` useMemo hook
- Check if work mode filtering is corrupting data

### If Filtered Tasks is correct but Scoring shows wrong values:
- Issue in `useScoredTasks` or `scoreAndSortTasks` function
- Check if spread operator is working correctly

### If all logs show correct values but UI shows wrong value:
- Browser cache issue - clear cache and hard reload (Ctrl+Shift+R)
- Service worker issue - unregister service worker
- React DevTools - inspect task object directly in component state

### If API itself shows wrong values (all 5):
- Database issue - run direct SQL query:
  ```sql
  SELECT id, title, cognitive_load FROM day_assistant_v2_tasks LIMIT 10;
  ```
- If database has correct values but API returns 5, check database query in `getTasks()`

## Code Locations

### Display Code
- **Badge:** `/components/day-assistant-v2/DayAssistantV2View.tsx` line 2629
  ```tsx
  <span>Load {task.cognitive_load}/5</span>
  ```
- **Text:** `/components/day-assistant-v2/DayAssistantV2View.tsx` line 2662
  ```tsx
  Estymat: {getFormattedEstimate(task)} • Load {task.cognitive_load} • ...
  ```

### Database Schema
```sql
cognitive_load INTEGER DEFAULT 3 CHECK (cognitive_load BETWEEN 1 AND 5)
```

### Default Values
- **New tasks:** 3 (NewTaskModal.tsx line 32)
- **API creation:** 3 (dayAssistantV2Service.ts line 578)
- **Database:** 3 (schema default)

## Cleanup After Fix

Once the issue is identified and fixed, remove or comment out the temporary debug logging:
- Remove `🔍 [State Set]` logging
- Remove `🔍 [Filtered Tasks]` logging  
- Remove `🔍 [Render]` logging
- Keep `📊 [dayplan API]` logging as it's useful for production debugging
- Keep `📊 [Scoring Debug]` logging as it's gated by process.env.NODE_ENV === 'development'

## Additional Notes

- All debug logs are visible only in development mode (except API logs)
- The render-time logging uses inline console.log in JSX, which is harmless but should be removed after debugging
- The issue affects display only - database stores correct values
- No mutations of cognitive_load were found in the codebase
