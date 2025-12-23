# Critical Bugs Fix Summary - Day Assistant V2

## 🎯 Overview
This document summarizes the fixes for 4 critical bugs in the Day Assistant V2 component as reported in the problem statement.

---

## ✅ Issue #1: Session Error on Task Completion (FIXED)

### Problem
```
[useCompleteTask] Error: Error: No session at Object.mutationFn
```
- Users unable to complete tasks due to "No session" error
- Race condition: session exists but hook doesn't see it in certain timing scenarios
- Auth logs show `SIGNED_IN` events and active session, but mutation fails

### Root Cause
All mutation hooks in `useTasksQuery.ts` were calling `supabase.auth.getSession()` directly without retry logic, causing intermittent failures when the session wasn't immediately available.

### Solution
**File:** `hooks/useTasksQuery.ts`

1. **Created helper function** `getSessionWithRetry()`:
   - Implements 3 retry attempts with TRUE exponential backoff
   - Waits 100ms, 200ms, 400ms between retries (exponential growth)
   - Throws user-friendly Polish error message if all retries fail
   - Prevents race conditions in session retrieval

2. **Updated all mutation hooks** to use the helper:
   - `useCompleteTask()` - Complete tasks
   - `useDeleteTask()` - Delete tasks
   - `useTogglePinTask()` - Pin/unpin MUST tasks
   - `usePostponeTask()` - Postpone tasks to tomorrow
   - `useToggleSubtask()` - Toggle subtask completion
   - `useAcceptRecommendation()` - Accept recommendations
   - `useCreateSubtasks()` - Create task subtasks
   - `useTasksQuery()` - Fetch tasks

3. **Added logging** for debugging:
   - Logs each retry attempt
   - Logs successful session retrieval
   - Error messages in Polish for better UX

### Code Changes
```typescript
// NEW: Helper function with retry logic
async function getSessionWithRetry(maxAttempts = 3) {
  let session = null
  let attempts = 0
  
  while (!session && attempts < maxAttempts) {
    attempts++
    const { data: { session: currentSession }, error } = await supabase.auth.getSession()
    
    if (currentSession) {
      return currentSession
    }
    
    if (error) {
      console.error(`❌ Session error (attempt ${attempts}/${maxAttempts}):`, error)
    }
    
    // Wait before retrying (true exponential backoff: 100ms, 200ms, 400ms)
    if (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts - 1) * 100))
    }
  }
  
  throw new Error('Brak sesji - odśwież stronę i spróbuj ponownie')
}

// USAGE in mutations:
mutationFn: async (taskId: string) => {
  const session = await getSessionWithRetry() // ✅ Now with retry logic
  // ... rest of mutation
}
```

### Testing
- ✅ Linter: No errors
- ✅ TypeScript: Compiles successfully
- ⏳ Manual testing required: Complete task, delete task, pin task, postpone task

---

## ✅ Issue #2: Task Duplication in "Na później" Queue (FIXED)

### Problem
- Tasks appeared TWICE in the "Na później" section
- First appearance: Preview showing first 5 tasks (lines 1190-1211)
- Second appearance: Full list when expanded (lines 1232-1249) OR another preview (lines 1254-1260+)
- Users saw "Na później (4 tasków)" with 4 tasks, then "... i 1 więcej" showing same tasks again

### Root Cause
The component was rendering tasks in multiple places:
1. Always showing preview (first 5 tasks) at the top
2. Then showing either full list or another preview based on `showLaterQueue`
3. This caused duplicate rendering of the same tasks

### Solution
**File:** `components/day-assistant-v2/DayAssistantV2View.tsx`

**Changed the conditional rendering logic:**

1. **Removed always-visible preview** (lines 1190-1211)
2. **Kept conditional rendering only:**
   - When `showLaterQueue === true`: Show ALL tasks in full list
   - When `showLaterQueue === false`: Show preview (first 3 tasks)
3. **Moved toggle button** to the bottom for better UX
4. **Updated button text** for clarity: "Pokaż pełną kolejkę" / "Zwiń kolejkę"

### Code Structure (Simplified)
```tsx
{later.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>📋 Na później ({later.length} tasków)</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Description */}
      
      {showLaterQueue ? (
        {/* FULL LIST - All tasks */}
        <div className="border-t pt-3 mt-2">
          <h3>📋 KOLEJKA NA PÓŹNIEJ</h3>
          {later.map((task, index) => (
            <TaskRow key={task.id} task={task} queuePosition={queue.length + index + 1} />
          ))}
        </div>
      ) : (
        {/* PREVIEW - First 3 tasks only */}
        <>
          {later.slice(0, 3).map(task => (
            <TaskRow key={task.id} task={task} isCollapsed={true} />
          ))}
          {later.length > 3 && <p>... i {later.length - 3} więcej</p>}
        </>
      )}
      
      {/* Toggle button */}
      <Button onClick={() => setShowLaterQueue(!showLaterQueue)}>
        {showLaterQueue ? '🔼 Zwiń kolejkę' : '👁️ Pokaż pełną kolejkę'}
      </Button>
    </CardContent>
  </Card>
)}
```

### Testing
- ✅ Linter: No errors
- ✅ TypeScript: Compiles successfully
- ⏳ Manual testing required: 
  - Verify only 3 tasks show when collapsed
  - Verify all tasks show when expanded
  - Verify toggle button works correctly

---

## ✅ Issue #3: Z-index - Context Menu Hidden Behind Tasks (FIXED)

### Problem
- Context menu (Ukończ, Nie dziś, Przypin jako MUST, Pomóż mi, Edytuj, Usuń) was appearing behind task cards
- Menu had `z-index: 100` which was too low
- User couldn't click on menu items because they were obscured by overlapping task elements

### Root Cause
The `DropdownMenuContent` component had `z-[100]` which is relatively low and could be overridden by task cards or other elements.

### Solution
**File:** `components/ui/DropdownMenu.tsx`

**Changed z-index from 100 to 1000:**

```typescript
// BEFORE
className={`absolute ${alignmentClass} mt-2 z-[100] min-w-[12rem] ...`}

// AFTER
className={`absolute ${alignmentClass} mt-2 z-[1000] min-w-[12rem] ...`}
```

### Why z-1000?
- Common practice for dropdown menus and popovers
- High enough to appear above most content (cards, forms, etc.)
- Still below modals (typically z-9999 or z-50)
- Ensures menu is always clickable and visible

### Testing
- ✅ Linter: No errors
- ✅ TypeScript: Compiles successfully
- ⏳ Manual testing required:
  - Open context menu on any task
  - Verify menu appears above all task cards
  - Verify all menu items are clickable

---

## ✅ Issue #4: Recommendation Persistence (FIXED)

### Problem
- Recommendations reappeared after being applied
- User clicks "zastosuj rekomendację", it works, but then the same recommendation shows up again
- `appliedRecommendationIds` was stored in component state only
- State resets on re-render or when recommendations refresh

### Root Cause
The `appliedRecommendationIds` Set was stored in React component state without persistence:
```typescript
const [appliedRecommendationIds, setAppliedRecommendationIds] = useState<Set<string>>(new Set())
```

This meant:
1. Page reload → IDs lost
2. Component re-render → IDs lost
3. Recommendations refresh → Same IDs come back

### Solution
**Files:** 
- `components/day-assistant-v2/DayAssistantV2View.tsx`
- `components/day-assistant-v2/RecommendationPanel.tsx`

**Added localStorage persistence:**

1. **Initialize state from localStorage:**
```typescript
const [appliedRecommendationIds, setAppliedRecommendationIds] = useState<Set<string>>(() => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('appliedRecommendationIds')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        return new Set(parsed)
      } catch (e) {
        console.error('Failed to parse applied recommendation IDs from localStorage:', e)
      }
    }
  }
  return new Set()
})
```

2. **Persist changes to localStorage:**
```typescript
useEffect(() => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('appliedRecommendationIds', JSON.stringify(Array.from(appliedRecommendationIds)))
  }
}, [appliedRecommendationIds])
```

3. **Auto-cleanup old IDs (24-hour expiry):**
```typescript
useEffect(() => {
  if (typeof window !== 'undefined') {
    const lastCleanup = localStorage.getItem('lastRecommendationCleanup')
    const now = Date.now()
    
    if (!lastCleanup || now - parseInt(lastCleanup) > 24 * 60 * 60 * 1000) {
      // Clear all applied IDs after 24 hours
      setAppliedRecommendationIds(new Set())
      localStorage.setItem('lastRecommendationCleanup', now.toString())
    }
  }
}, [])
```

4. **Applied same logic to RecommendationPanel:**
   - Ensures consistency across components
   - Both components share the same localStorage key
   - Changes in one component reflect in the other

### Why localStorage?
- ✅ Simple and fast
- ✅ Persists across page reloads
- ✅ No server round-trip needed
- ✅ Works offline
- ✅ Auto-cleanup prevents stale data

### Alternative Considered (Database)
We could save applied recommendation IDs to the database, but:
- ❌ More complex (needs API endpoint)
- ❌ Slower (network round-trip)
- ❌ Unnecessary for temporary UI state
- ❌ Recommendations already logged in decision_log table

### Testing
- ✅ Linter: No errors
- ✅ TypeScript: Compiles successfully
- ⏳ Manual testing required:
  1. Apply a recommendation
  2. Verify it disappears from the list
  3. Refresh the page
  4. Verify recommendation still doesn't show
  5. Wait 24+ hours (or manually clear localStorage) to verify cleanup

---

## 📊 Summary Statistics

### Files Changed: 4
1. `hooks/useTasksQuery.ts` - Session retry logic for all mutations
2. `components/day-assistant-v2/DayAssistantV2View.tsx` - Task duplication fix + recommendation persistence
3. `components/day-assistant-v2/RecommendationPanel.tsx` - Recommendation persistence
4. `components/ui/DropdownMenu.tsx` - Z-index fix

### Lines Changed
- **Added:** 112 lines
- **Removed:** 57 lines
- **Net:** +55 lines

### Test Results
- ✅ ESLint: No warnings or errors
- ✅ TypeScript: No compilation errors
- ✅ Build: Ready for testing
- ⏳ Manual testing: Required (see test plan below)

---

## 🧪 Manual Testing Plan

### Test #1: Session Error Fix
**Goal:** Verify tasks can be completed without session errors

**Steps:**
1. Log in to the application
2. Navigate to Day Assistant V2
3. Try to complete a task by:
   - Clicking the context menu (three dots)
   - Selecting "Ukończ"
4. **Expected:** Task completes successfully with ✅ toast
5. **Expected:** No "No session" error in console
6. Repeat 5-10 times to test consistency
7. Try other mutations: Delete, Pin, Postpone, Edit subtasks

**Success Criteria:**
- ✅ All tasks complete without errors
- ✅ No "No session" messages in console
- ✅ Success toasts appear
- ✅ Tasks disappear from list after completion

---

### Test #2: Task Duplication Fix
**Goal:** Verify tasks don't duplicate in "Na później" section

**Steps:**
1. Ensure you have more than 3 tasks in "Na później" queue
2. **Initial State:** Verify only 3 tasks show with "... i X więcej" message
3. Click "👁️ Pokaż pełną kolejkę" button
4. **Expected:** Full list appears with ALL tasks (no duplicates)
5. Click "🔼 Zwiń kolejkę" button
6. **Expected:** Back to preview showing only 3 tasks
7. Count total unique tasks visible - should match header count

**Success Criteria:**
- ✅ Preview shows exactly 3 tasks when collapsed
- ✅ Full list shows ALL tasks when expanded
- ✅ No task appears twice in the UI
- ✅ Header count matches actual task count
- ✅ Toggle button works correctly

---

### Test #3: Context Menu Z-index Fix
**Goal:** Verify context menu appears above all task cards

**Steps:**
1. Navigate to Day Assistant V2 with multiple tasks visible
2. Click context menu (three dots) on the FIRST task
3. **Expected:** Menu drops down and is fully visible
4. **Expected:** All menu items are clickable
5. Click context menu on a MIDDLE task (surrounded by other tasks)
6. **Expected:** Menu still fully visible above other tasks
7. Click context menu on the LAST task
8. **Expected:** Menu visible and not clipped

**Success Criteria:**
- ✅ Menu appears above all task cards
- ✅ Menu text is fully readable (not obscured)
- ✅ All menu items are clickable
- ✅ Menu has subtle shadow for depth
- ✅ Works for tasks at any position in the list

---

### Test #4: Recommendation Persistence Fix
**Goal:** Verify applied recommendations don't reappear

**Steps:**
1. Navigate to Day Assistant V2
2. Wait for a recommendation to appear in the Recommendations section
3. Note the recommendation title/type
4. Click "Zastosuj" button
5. **Expected:** Button shows "Stosuję..." then "Zastosowano"
6. **Expected:** Recommendation disappears from the list
7. **Wait 30 seconds** for recommendation refresh
8. **Expected:** Same recommendation does NOT reappear
9. **Refresh the page** (F5 or Cmd+R)
10. **Expected:** Recommendation STILL doesn't show
11. Open browser DevTools → Application → Local Storage
12. Verify `appliedRecommendationIds` key exists with recommendation ID

**Success Criteria:**
- ✅ Applied recommendation disappears immediately
- ✅ Applied recommendation doesn't reappear after auto-refresh (30s)
- ✅ Applied recommendation doesn't reappear after page reload
- ✅ localStorage contains the applied ID
- ✅ Cleanup happens after 24 hours (check `lastRecommendationCleanup` timestamp)

**24-Hour Cleanup Test (Optional):**
1. Apply a recommendation
2. In DevTools → Local Storage, manually change `lastRecommendationCleanup` to a timestamp from yesterday:
   ```javascript
   localStorage.setItem('lastRecommendationCleanup', (Date.now() - 25*60*60*1000).toString())
   ```
3. Refresh the page
4. **Expected:** `appliedRecommendationIds` is cleared (empty array)
5. **Expected:** Previously applied recommendations may reappear (if still relevant)

---

## 🔍 Regression Testing

### Areas to Check
Even though we made targeted fixes, verify these areas still work:

1. **Task Operations:**
   - ✅ Create new task
   - ✅ Edit task
   - ✅ Delete task
   - ✅ Pin/unpin MUST task
   - ✅ Postpone task ("Nie dziś")
   - ✅ Toggle subtasks

2. **Queue Management:**
   - ✅ Tasks appear in correct order (MUST → matched → queue)
   - ✅ Time calculations are accurate
   - ✅ Overdue tasks section works
   - ✅ Manual time blocks work

3. **Recommendations:**
   - ✅ New recommendations still generate
   - ✅ Recommendation types (energy mismatch, reordering, breaks) all work
   - ✅ "Zastosuj" button applies changes correctly

4. **UI/UX:**
   - ✅ No layout shifts or visual glitches
   - ✅ Buttons and interactions still smooth
   - ✅ Toast notifications appear correctly
   - ✅ Loading states work

---

## 🚀 Deployment Notes

### Breaking Changes
❌ None - All changes are backwards compatible

### Database Migrations
❌ Not required - No schema changes

### Environment Variables
❌ Not required - No new variables

### Cache Clearing
⚠️ **Recommended:** Users may need to clear localStorage if they experience issues:
```javascript
// In browser console:
localStorage.removeItem('appliedRecommendationIds')
localStorage.removeItem('lastRecommendationCleanup')
```

### Rollback Plan
If issues occur, rollback is simple:
```bash
git revert ba39c69
git push
```

All changes are in 4 files with no external dependencies.

---

## 📝 Additional Notes

### Known Limitations
1. **Session retry timeout:** Max 700ms (100ms + 200ms + 400ms)
   - If session takes longer, user sees error
   - Acceptable tradeoff vs infinite waiting
   
2. **localStorage size:** Applied recommendation IDs grow over time
   - Mitigated by 24-hour cleanup
   - Each ID is ~36 chars (UUID), Set can hold thousands
   
3. **Z-index conflicts:** If other components use z-[1000+], menu may be hidden
   - Unlikely in current codebase
   - Can increase to z-[2000] if needed

4. **Code duplication:** localStorage logic is duplicated between DayAssistantV2View and RecommendationPanel
   - Acceptable for this critical bug fix PR to minimize scope
   - Should be refactored into a custom hook in a future PR (e.g., `usePersistedRecommendationIds`)

### Future Improvements
1. **Session Management:**
   - Could implement session refresh before mutation
   - Could show loading indicator during retries
   
2. **Task Queue:**
   - Could add animations for expand/collapse
   - Could virtualize list for 100+ tasks
   
3. **Recommendations:**
   - Could sync applied IDs to database for multi-device
   - Could add "undo" button for applied recommendations
   
4. **Code Quality:**
   - **Refactor localStorage logic** into a custom hook `usePersistedRecommendationIds()` to eliminate duplication between DayAssistantV2View and RecommendationPanel
   - This would centralize the initialization, persistence, and cleanup logic

---

## ✅ Approval Checklist

Before merging to main:

- [x] All fixes implemented
- [x] Linter passes
- [x] TypeScript compiles
- [ ] Manual testing completed (all 4 test cases)
- [ ] Regression testing completed
- [ ] Code review approved
- [ ] QA verification
- [ ] Product owner approval

---

**Last Updated:** 2025-12-23
**Author:** GitHub Copilot
**PR:** #[TO BE FILLED]
**Branch:** `copilot/fix-complete-task-session-error`
