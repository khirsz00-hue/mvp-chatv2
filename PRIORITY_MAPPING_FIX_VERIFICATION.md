# Priority Mapping Bug Fix - Verification Guide

## Summary of Changes

Fixed the priority mapping inconsistency where the application's internal model (1=P1 highest) was being confused with Todoist's priority model (4=P1 highest).

## Priority Systems

### Application's Internal Model (CORRECT)
- **P1** (highest priority, red 🔴) = `priority: 1`
- **P2** (orange 🟠) = `priority: 2`
- **P3** (blue 🔵) = `priority: 3`
- **P4** (lowest priority, gray ⚪) = `priority: 4`

### Todoist API (External System)
- **P1** (highest priority, red 🔴) = `priority: 4`
- **P2** (orange 🟠) = `priority: 3`
- **P3** (blue 🔵) = `priority: 2`
- **P4** (lowest priority, gray ⚪) = `priority: 1`

## Files Changed

### 1. Core Scoring Logic
**File:** `lib/services/advancedTaskScoring.ts`

**Changes:**
- Updated `calculatePriorityScore()` to use app's internal model: `1=P1 (50pts), 2=P2 (30pts), 3=P3 (10pts), 4=P4 (5pts)`
- Updated function documentation to reflect app's internal format
- Removed outdated Todoist format comments

**Impact:** Tasks are now scored correctly based on their priority. P1 tasks (priority=1) get 50 points instead of 5 points.

### 2. Todoist API Sync
**File:** `app/api/day-assistant-v2/task/route.ts`

**Changes:**
- Added priority conversion in `createTodoistTask()`: `todoistPriority = 5 - appPriority`
- Ensures app P1 (value=1) syncs to Todoist as priority 4 (P1 in Todoist)

**Impact:** Tasks created in the app now sync correctly to Todoist with the right priority level.

### 3. Recommendation Engine
**File:** `lib/services/dayAssistantV2RecommendationEngine.ts`

**Changes:**
- Updated priority label mapping: `1='P1', 2='P2', 3='P3', 4='P4'`
- Fixed priority scoring logic in detailed recommendations
- Updated priority explanation text

**Impact:** Recommendations now display correct priority labels and calculate scores correctly.

### 4. Type Definitions
**File:** `lib/types/dayAssistantV2.ts`

**Changes:**
- Updated priority field comment to document app's internal model

**Impact:** Documentation clarity for developers.

### 5. Database Schema
**File:** `supabase/migrations/20251217_test_day_assistant.sql`

**Changes:**
- Updated priority field comment to document app's internal model

**Impact:** Database documentation clarity.

### 6. Unit Tests
**File:** `lib/services/__tests__/advancedTaskScoring.test.ts`

**Changes:**
- Updated all test cases to use app's internal model
- Changed priority values in test scenarios from Todoist format to app format
- Updated test descriptions to reference "app's internal model" instead of "Todoist"

**Impact:** Tests now validate the correct behavior.

## Conversion Logic

### ✅ When TO Sync to Todoist (CONVERSION REQUIRED)
```typescript
// In createTodoistTask()
const todoistPriority = appPriority ? 5 - appPriority : 2
// Examples:
// App P1 (1) → Todoist P1 (4): 5 - 1 = 4 ✓
// App P2 (2) → Todoist P2 (3): 5 - 2 = 3 ✓
// App P3 (3) → Todoist P3 (2): 5 - 3 = 2 ✓
// App P4 (4) → Todoist P4 (1): 5 - 4 = 1 ✓
```

### ✅ When FROM User Input to Database (NO CONVERSION)
```typescript
// In handleTaskSave() and POST /api/day-assistant-v2/task
const payload = {
  priority: taskData.priority  // Use as-is: 1, 2, 3, or 4
}
```

### ✅ When Displaying to User (NO CONVERSION)
```typescript
// In PriorityBadge component
const variants = {
  1: { label: 'P1', className: 'text-red-600' },     // Highest
  2: { label: 'P2', className: 'text-orange-600' },
  3: { label: 'P3', className: 'text-blue-600' },
  4: { label: 'P4', className: 'text-slate-500' }    // Lowest
}
```

### ✅ When Scoring Tasks (NO CONVERSION)
```typescript
// In calculatePriorityScore()
switch (priority) {
  case 1: return 50  // P1 - highest
  case 2: return 30  // P2
  case 3: return 10  // P3
  case 4: return 5   // P4 - lowest
}
```

## Manual Verification Steps

### Test 1: Create P1 Task
1. Open Day Assistant V2
2. Click "Add Task"
3. Enter task details
4. Select **P1** priority (red button)
5. Save task

**Expected Results:**
- ✅ Database stores `priority: 1`
- ✅ Badge displays red "P1"
- ✅ Task appears at top of queue (highest score)
- ✅ If Todoist sync enabled, task appears in Todoist with P1 (priority 4)

### Test 2: Create P4 Task
1. Open Day Assistant V2
2. Click "Add Task"
3. Enter task details
4. Select **P4** priority (gray button)
5. Save task

**Expected Results:**
- ✅ Database stores `priority: 4`
- ✅ Badge displays gray "P4"
- ✅ Task appears near bottom of queue (low score)
- ✅ If Todoist sync enabled, task appears in Todoist with P4 (priority 1)

### Test 3: Edit Task Priority
1. Open existing P4 task
2. Change priority to P1
3. Save

**Expected Results:**
- ✅ Database updates to `priority: 1`
- ✅ Badge changes to red "P1"
- ✅ Task moves to top of queue
- ✅ Scoring reflects new priority (gains ~45 points)

### Test 4: Queue Sorting
Create 4 tasks with same deadline but different priorities:
- Task A: P1, 30min, CL 3
- Task B: P2, 30min, CL 3
- Task C: P3, 30min, CL 3
- Task D: P4, 30min, CL 3

**Expected Order:**
1. Task A (P1) - Score: ~80 deadline + 50 priority - 6 CL = 124
2. Task B (P2) - Score: ~80 deadline + 30 priority - 6 CL = 104
3. Task C (P3) - Score: ~80 deadline + 10 priority - 6 CL = 84
4. Task D (P4) - Score: ~80 deadline + 5 priority - 6 CL = 79

### Test 5: Todoist Sync (if enabled)
1. Create P1 task in app
2. Check Todoist

**Expected:**
- ✅ Task appears in Todoist with red flag (priority 4)

3. Create P1 task in Todoist (priority 4)
4. If there's a sync mechanism to fetch from Todoist, check app

**Expected:**
- ✅ Task appears in app with P1 badge (priority 1)
- ⚠️ **Note:** Currently Day Assistant V2 doesn't have automatic Todoist import, so this test only applies if that feature is added in the future.

## Rollback Plan

If issues are found, revert commit with:
```bash
git revert ac91b71
```

This will restore the old behavior (Todoist-style priorities in scoring).

## Known Limitations

1. **No Todoist Import for Day Assistant V2:** Currently, Day Assistant V2 doesn't automatically import tasks from Todoist. Tasks are only synced TO Todoist when created.

2. **Old Day Assistant (v1):** The old Day Assistant uses a different priority system (now/next/later) and is not affected by these changes.

3. **Existing Tasks:** Tasks created before this fix will have correct values in the database (since the bug was in scoring/sync, not storage), so no migration is needed.

## Success Criteria

- [x] P1 in modal → saves as 1 in DB
- [x] P1 displays red badge
- [x] P1 scores 50 points (highest)
- [x] P1 syncs to Todoist as priority 4
- [x] P4 in modal → saves as 4 in DB
- [x] P4 displays gray badge
- [x] P4 scores 5 points (lowest)
- [x] P4 syncs to Todoist as priority 1
- [x] No priority conversion in internal app flows
- [x] Priority conversion only at Todoist API boundary
- [x] Tests updated to use app's internal model
- [x] Documentation updated
