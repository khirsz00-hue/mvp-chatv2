# Overdue Tasks Management System - Testing Guide

## Overview
This document describes how to test the 3-level overdue tasks management system.

## Components Implemented

### 1. Morning Review Modal (`MorningReviewModal.tsx`)
**Purpose**: Shows once daily at first open to review overdue tasks.

**Location**: Appears as a modal overlay on app start

**Features**:
- Shows all overdue tasks with days overdue
- Quick actions: Dodaj na dziś, Jutro, Przenieś, Usuń
- "Przejrzę później" to dismiss without processing
- localStorage tracking: `overdue_reviewed_YYYY-MM-DD`

**Testing**:
1. Create tasks with past due dates
2. Open Day Assistant - modal should appear
3. Click "Przejrzę później" - modal closes
4. Reload page - modal should NOT appear again today
5. Change system date to tomorrow - modal should appear again

### 2. Enhanced Overdue Section (`OverdueTasksSection.tsx`)
**Purpose**: Persistent section showing overdue tasks with collapse/expand.

**Location**: Above "Kolejka na dziś" section

**Features**:
- Collapsible with badge showing count
- Sorted by priority DESC, date ASC (oldest first)
- Quick actions on each task
- localStorage state: `overdue_section_collapsed`

**Testing**:
1. Create overdue tasks with different priorities
2. Section should show with all tasks expanded
3. Click "zwiń" - section collapses to badge with count
4. Badge should pulse/animate
5. Reload page - section should remember collapsed state
6. Click "rozwiń" - tasks appear again

### 3. Overdue Recommendations (`aiRecommendationEngine.ts`)
**Purpose**: Suggests adding overdue tasks when time/energy matches.

**Location**: Recommendations section below queue

**Features**:
- Matches overdue tasks to available time
- Considers energy/focus mode
- Shows multiple tasks if they fit
- High priority recommendations

**Testing**:
1. Create overdue tasks with various estimates
2. Set energy/focus levels
3. Check recommendations section
4. Should see "💡 Nadrobienie zaległości" or "⚠️ Przeterminowane zadanie"
5. Click "Zastosuj" - tasks should be added to queue

## Test Scenarios

### Scenario 1: First Morning Open
```
Given: 3 tasks with due dates in the past
When: User opens Day Assistant for first time today
Then: Morning Review Modal appears with all 3 tasks
And: User can process each task individually
And: Modal persists until "Przejrzę później" clicked
```

### Scenario 2: Collapse/Expand Persistence
```
Given: Overdue section is expanded
When: User clicks "zwiń"
Then: Section collapses to badge
When: User reloads page
Then: Section remains collapsed
When: User clicks "rozwiń"
Then: All tasks appear
```

### Scenario 3: Overdue Recommendations
```
Given: User has 2 overdue tasks (30min each)
And: Available time is 90min
And: Energy matches task cognitive load
When: Recommendations are generated
Then: System suggests adding both tasks
And: Shows total time (60min)
When: User applies recommendation
Then: Both tasks move to today's queue
```

### Scenario 4: Days Overdue Formatting
```
Task due yesterday -> "wczoraj"
Task due 2 days ago -> "2 dni temu"
Task due 7 days ago -> "7 dni temu"
Task due 14 days ago -> "2 tygodnie temu"
Task due 40 days ago -> "miesiąc temu"
```

## localStorage Keys

### Morning Review
- Key: `overdue_reviewed_YYYY-MM-DD`
- Value: `"true"` or absent
- Cleared: Automatically next day

### Section Collapsed State
- Key: `overdue_section_collapsed`
- Value: `"true"` or `"false"`
- Cleared: Never (persists across sessions)

## Hook: useOverdueTasks

```typescript
const { overdueTasks, hasOverdueTasks, overdueCount } = useOverdueTasks(tasks, selectedDate)
```

**Returns**:
- `overdueTasks`: Filtered and sorted array
- `hasOverdueTasks`: Boolean flag
- `overdueCount`: Number of overdue tasks

**Sorting**: Priority DESC, then due_date ASC (oldest first)

## Utilities

### getDaysOverdueText(dueDate, currentDate)
Formats overdue duration in Polish:
- 0 days: "dziś"
- 1 day: "wczoraj"
- 2-7 days: "X dni temu"
- 8-27 days: "X tygodnie temu"
- 28+ days: "X miesięcy temu"

### getDaysOverdue(dueDate, currentDate)
Returns numeric days overdue (for calculations)

## CSS Classes

### Animations
- `.animate-pulse`: Badge pulse animation
- `.animate-pulse-overdue`: Custom overdue pulse

### Colors
- `--overdue-critical`: #DC2626 (>3 days)
- `--overdue-warning`: #F59E0B (1-3 days)
- `--overdue-bg`: #FEF2F2 (background)
- `--overdue-border`: #FCA5A5 (border)

## Integration Points

### DayAssistantV2View
1. Import and use `useOverdueTasks` hook
2. Add `MorningReviewModal` component
3. Pass handlers for morning review actions
4. OverdueTasksSection receives filtered tasks

### Recommendation Engine
- `detectOverdueOpportunity()` generates recommendations
- Called first in `generateSmartRecommendations()`
- Returns HIGH impact recommendations

## Known Limitations

1. No date picker for reschedule (uses tomorrow by default)
2. Morning review modal processes tasks one by one
3. Recommendations limited to 3 tasks max
4. No "snooze" or "remind later" options

## Future Enhancements

1. Add date picker modal for flexible rescheduling
2. Swipe gestures on mobile
3. Bulk actions in morning review
4. Weekly overdue summary
5. Overdue task aging (color intensity)
