# Overdue & Later Sections - Always Visible with Debug Info

## 🎯 Problem Solved

Users reported that **Overdue** and **Later** sections were not visible despite previous PRs (#188, #190) being merged. The issue was that these sections only rendered when their arrays had items, making it impossible to debug why they were empty.

## ✅ Solution Implemented

Made both sections **ALWAYS VISIBLE** with comprehensive debug information to diagnose why arrays might be empty.

---

## 📋 Changes Made

### 1. **OverdueTasksSection.tsx** - Always Visible Overdue Section

#### Changes:
- ❌ **Removed:** `if (overdueTasks.length === 0) return null` (line 46)
- ✅ **Added:** Always render with red border (`border-red-500`)
- ✅ **Added:** Debug badge showing "(debug: array is empty)" when no tasks
- ✅ **Added:** Debug panel with JSON data showing:
  - Total tasks count
  - Filtered tasks count
  - Scored tasks count
  - Tasks with due dates
  - Tasks before today
  - Selected date

#### Visual Changes:
```
┌─────────────────────────────────────────────────┐
│ ⚠️ PRZETERMINOWANE (0 zadań) (debug: array is  │  <- Red border (border-red-500)
│ empty) ▼                                        │  <- Always visible
├─────────────────────────────────────────────────┤
│ 🔍 DEBUG: Brak przeterminowanych zadań w array │
│                                                 │
│ [Debug Info ▼]                                  │  <- Expandable details
│   {                                             │
│     "totalTasks": 15,                           │
│     "filteredTasks": 12,                        │
│     "scoredTasks": 12,                          │
│     "overdueTasks": 0,                          │
│     "tasksWithDueDate": 5,                      │
│     "tasksBeforeToday": 0,                      │
│     "selectedDate": "2025-12-24"                │
│   }                                             │
└─────────────────────────────────────────────────┘
```

### 2. **DayAssistantV2View.tsx** - Always Visible Later Queue

#### Changes:
- ❌ **Removed:** Conditional `{later.length > 0 && (...)}`
- ✅ **Added:** Always render with blue border (`border-blue-500`)
- ✅ **Added:** Debug badge showing "(debug: array is empty)" when no tasks
- ✅ **Added:** Debug panel with JSON data showing:
  - Total tasks count
  - Non-overdue tasks count
  - Queue length
  - Later length
  - Available minutes
  - Used minutes
  - Usage percentage

#### Visual Changes:
```
┌─────────────────────────────────────────────────┐
│ 📋 Na później (0 zadań) (debug: array is       │  <- Blue border (border-blue-500)
│ empty) ▼                                        │  <- Always visible
├─────────────────────────────────────────────────┤
│ 🔍 DEBUG: Brak zadań w kolejce "later"         │
│                                                 │
│ [Debug Info ▼]                                  │  <- Expandable details
│   {                                             │
│     "totalTasks": 15,                           │
│     "nonOverdueTasks": 12,                      │
│     "queueLength": 10,                          │
│     "laterLength": 0,                           │
│     "availableMinutes": 480,                    │
│     "usedMinutes": 250,                         │
│     "usagePercentage": 52                       │
│   }                                             │
└─────────────────────────────────────────────────┘
```

### 3. **Global Debug Panel** (Development Mode Only)

#### Changes:
- ✅ **Added:** Yellow debug panel at top of DayAssistantV2View
- ✅ **Only visible:** When `process.env.NODE_ENV === 'development'`
- ✅ **Shows:** Real-time statistics in grid format
- ✅ **Includes:** Expandable raw data with task details

#### Visual Changes:
```
┌─────────────────────────────────────────────────┐
│ 🔍 Debug Panel                                  │  <- Yellow border (border-yellow-500)
├─────────────────────────────────────────────────┤
│ Total tasks: 15        Filtered tasks: 12       │
│ Scored tasks: 12       Overdue tasks: 0         │
│ Queue tasks: 10        Later tasks: 2           │
│ Available min: 480     Used min: 250            │
│                                                 │
│ [Raw Data ▼]                                    │  <- Expandable details
│   {                                             │
│     "tasks": [...],                             │
│     "overdueTasks": [],                         │
│     "laterTasks": [...]                         │
│   }                                             │
└─────────────────────────────────────────────────┘
```

### 4. **useOverdueTasks.ts** - Enhanced Logging

#### Changes:
- ✅ **Added:** Console log at start of filtering with emoji prefix 🔍
- ✅ **Added:** Log for each overdue task found with ⚠️ emoji
- ✅ **Added:** Final result log with ✅ emoji
- ✅ **Logs include:** Task title, due date, days overdue

#### Console Output:
```javascript
🔍 [useOverdueTasks] Filtering... {
  totalTasks: 15,
  today: "2025-12-24",
  tasksWithDueDate: 5
}

⚠️ [useOverdueTasks] Found overdue: {
  title: "Fix bug in login",
  due_date: "2025-12-20",
  days_overdue: 4
}

✅ [useOverdueTasks] Result: 1 overdue tasks
```

### 5. **useTaskQueue.ts** - Enhanced Logging & Force Split

#### Changes:
- ✅ **Added:** `MAX_QUEUE_SIZE = 10` constant (force split at 10 tasks)
- ✅ **Added:** Console log at start of processing with 🔍 emoji
- ✅ **Added:** Detailed log for each task added to queue (✅) or later (📋)
- ✅ **Added:** Log explaining why task went to later (queue full vs capacity)
- ✅ **Added:** Final statistics log with 📊 emoji

#### Console Output:
```javascript
🔍 [useTaskQueue] Processing... {
  totalTasks: 25,
  overdueTasks: 1,
  mustTasks: 3,
  normalTasks: 21,
  availableMinutes: 480
}

✅ [useTaskQueue] Adding to QUEUE: Fix critical bug
📋 [useTaskQueue] Adding to LATER (queue full): Write documentation {
  currentQueueSize: 10
}
📋 [useTaskQueue] Adding to LATER (would exceed capacity): Refactor code {
  usedTime: 475,
  taskEstimate: 60,
  availableMinutes: 480
}

📊 [useTaskQueue] Final result: {
  queue: 10,
  later: 15,
  usedTime: 475,
  usagePercentage: 99
}
```

---

## 🔍 How to Debug with These Changes

### Step 1: Check if Sections are Visible
- Both **Overdue** (red border) and **Later** (blue border) sections should always be visible
- If you don't see them, there's a rendering issue in the component tree

### Step 2: Check Debug Badges
- Look for "(debug: array is empty)" badges next to section titles
- This immediately tells you if arrays are empty or populated

### Step 3: Expand Debug Info
- Click on "Debug Info" expandable section in each empty section
- Check the JSON data to understand task distribution

### Step 4: Check Console Logs
- Open browser DevTools Console
- Look for emoji-prefixed logs:
  - 🔍 = Filtering/Processing started
  - ⚠️ = Overdue task found
  - ✅ = Added to queue / Success
  - 📋 = Added to later queue
  - 📊 = Final statistics

### Step 5: Check Global Debug Panel (Dev Mode)
- Look for yellow debug panel at top of page
- Shows real-time counts for all task arrays
- Expand "Raw Data" to see task details

---

## 🎨 Visual Indicators

### Color Coding:
- 🔴 **Red** (`border-red-500`, `bg-red-50`) - Overdue section
- 🔵 **Blue** (`border-blue-500`, `bg-blue-50`) - Later queue section
- 🟡 **Yellow** (`border-yellow-500`, `bg-yellow-50`) - Debug panel (dev only)

### Emoji Indicators:
- ⚠️ - Overdue section header
- 📋 - Later queue section header
- 🔍 - Debug information
- ✅ - Success/Queue addition
- 📊 - Statistics

---

## 📊 Technical Implementation Details

### Files Modified:
1. **`components/day-assistant-v2/OverdueTasksSection.tsx`**
   - Removed early return on empty array
   - Added debug info prop interface
   - Added empty state rendering with debug panel

2. **`components/day-assistant-v2/DayAssistantV2View.tsx`**
   - Removed conditional rendering for later queue
   - Added debug info props to OverdueTasksSection
   - Added global debug panel (dev mode only)
   - Added debug panel for later queue

3. **`hooks/useOverdueTasks.ts`**
   - Added comprehensive console logging
   - Log filtering process and results

4. **`hooks/useTaskQueue.ts`**
   - Added `MAX_QUEUE_SIZE = 10` constant
   - Added comprehensive console logging
   - Log queue building decisions and reasons

### Key Logic:
- **Overdue filtering:** Compares `task.due_date < today` (string comparison)
- **Later queue logic:** 
  - Max 10 tasks in queue (force split)
  - Remaining tasks go to later
  - Tasks also move to later if they exceed available time capacity
- **Non-overdue tasks:** Filtered by `!t.due_date || t.due_date >= selectedDate`

---

## ✅ Acceptance Criteria Met

1. ✅ Sekcja "⚠️ PRZETERMINOWANE" **ZAWSZE widoczna** (nawet jeśli pusta)
2. ✅ Sekcja "📋 Na później" **ZAWSZE widoczna** (nawet jeśli pusta)
3. ✅ Debug info pokazuje dlaczego arrays są puste
4. ✅ Console logs pokazują co dzieje się w hooks
5. ✅ Filtering logic NIE wyklucza overdue/later tasks
6. ✅ useTaskQueue **force split** - max 10 w queue, reszta later
7. ✅ Debug panel (dev only) pokazuje wszystkie liczby na żywo

---

## 🚀 Expected Results After This PR

### When Arrays are Empty:
- **Red section** (Overdue) visible with debug info explaining why
- **Blue section** (Later) visible with debug info explaining why
- **Yellow panel** (Dev mode) showing all task counts
- **Console logs** showing filtering/queue building process

### When Arrays Have Tasks:
- **Red section** shows overdue tasks with actions
- **Blue section** shows later tasks in queue
- **Console logs** show which tasks were added where and why

### Debug Information Available:
- Real-time task distribution in debug panel
- Detailed JSON with task counts and metadata
- Console logs explaining every decision
- Visual indicators (colors, badges) for quick identification

---

## 🎯 Next Steps

If arrays are still empty after this PR:
1. Check Debug Panel - see task distribution
2. Check Console Logs - see filtering decisions
3. Check Expandable Details - see raw task data
4. Look for patterns in why tasks aren't being classified as overdue or later

The debug information will **clearly show** what's happening with the data!
