# ADHD-Friendly Focus Bar & Top Bar Implementation

## 🎯 Overview

This implementation adds two new UI components specifically designed for users with ADHD to help them stay focused on their current task and manage their work hours effectively.

## 📦 New Components

### 1. DayAssistantV2FocusBar.tsx

**Location**: `components/day-assistant-v2/DayAssistantV2FocusBar.tsx`

**Purpose**: Ultra-visible black bar that appears when a timer is active, providing constant reminder of current task.

**Props Interface**:
```typescript
interface FocusBarProps {
  task: TestDayTask | null
  elapsedSeconds: number
  isPaused: boolean
  onPause: () => void
  onResume: () => void
  onComplete: () => void
  onStop: () => void
}
```

**Key Features**:
- Black background with white text for maximum contrast
- Animated red pulsing dot (changes to yellow when paused)
- Large, bold task title
- Live timer in HH:MM:SS format
- Pause/Resume toggle button
- Complete and Stop action buttons
- Sticky positioning (z-index 100) - always on top
- Accessibility: ARIA labels for timer status

**Visual States**:
```
Active Timer:
┌─────────────────────────────────────────────────────────────────────┐
│ 🔴 PRACUJESZ NAD: Napisać raport kwartalny    ⏱ 00:23:45  [⏸] [✓] [×] │
└─────────────────────────────────────────────────────────────────────┘

Paused Timer:
┌─────────────────────────────────────────────────────────────────────┐
│ 🟡 PAUZA - PRACOWAŁEŚ NAD: Napisać raport     ⏱ 00:23:45  [▶] [✓] [×] │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 2. DayAssistantV2TopBar.tsx

**Location**: `components/day-assistant-v2/DayAssistantV2TopBar.tsx`

**Purpose**: Clean status bar with inline editable work hours and progress tracking.

**Props Interface**:
```typescript
interface DayAssistantV2TopBarProps {
  selectedDate: string
  workHoursStart: string
  workHoursEnd: string
  capacityMinutes: number
  workMode: WorkMode
  completedMinutes: number
  onWorkHoursChange: (start: string, end: string) => void
  onWorkModeChange: (mode: WorkMode) => void
}
```

**Key Features**:
- Formatted date in Polish (e.g., "Czwartek, 28 grudnia")
- Inline time inputs for work hours
- Auto-calculated capacity display
- Work mode dropdown (Low Focus, Standard, HyperFocus, Quick Wins)
- Progress tracking with percentage
- Sticky positioning (z-index 50) - below focus bar
- Accessibility: ARIA labels for progress display

**Visual Layout**:
```
┌──────────────────────────────────────────────────────────────────────┐
│  📅 Czwartek, 28 grudnia                                             │
│  ⏰ [09:00] → [13:00] • 4h   │  ⚡ [Standard ▼]  │  📊 0/240 min (0%) │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Integration in DayAssistantV2View.tsx

### New State Variables

```typescript
// Work hours state
const [workHoursStart, setWorkHoursStart] = useState<string>('09:00')
const [workHoursEnd, setWorkHoursEnd] = useState<string>('17:00')
const [capacityMinutes, setCapacityMinutes] = useState<number>(480)
```

### New Handler Functions

#### 1. handleWorkHoursChange
```typescript
const handleWorkHoursChange = async (start: string, end: string) => {
  // Calculate capacity
  // Validate: end must be after start, no zero capacity
  // Update local state
  // Save to database via PUT /api/day-assistant-v2/dayplan
  // Revert on error
}
```

**Validation Rules**:
- End time must be after start time
- Cannot have zero capacity (identical times)
- Shows error toast on validation failure
- Reverts to previous values on save error

#### 2. handleWorkModeChange
```typescript
const handleWorkModeChange = (mode: WorkMode) => {
  // Update work mode
  // Trigger queue reordering
  // Log decision
}
```

#### 3. revertWorkHours (Helper)
```typescript
const revertWorkHours = () => {
  // Loads previous values from dayPlan metadata
  // Fallback to defaults (09:00, 17:00, 480 min)
}
```

### Render Structure

```typescript
return (
  <>
    <Toaster position="top-right" />
    
    {/* Focus Bar - Only when timer is active */}
    {activeTimer && (
      <DayAssistantV2FocusBar
        task={tasks.find(t => t.id === activeTimer.taskId) || null}
        elapsedSeconds={activeTimer.elapsedSeconds}
        isPaused={activeTimer.isPaused}
        onPause={pauseTimer}
        onResume={resumeTimer}
        onComplete={handleTimerComplete}
        onStop={handleTimerStop}
      />
    )}
    
    {/* Top Bar - Always visible */}
    <DayAssistantV2TopBar
      selectedDate={selectedDate}
      workHoursStart={workHoursStart}
      workHoursEnd={workHoursEnd}
      capacityMinutes={capacityMinutes}
      workMode={workMode}
      completedMinutes={usedMinutes}
      onWorkHoursChange={handleWorkHoursChange}
      onWorkModeChange={handleWorkModeChange}
    />
    
    {/* Rest of the view... */}
  </>
)
```

---

## 🗄️ API Changes

### New PUT Endpoint

**File**: `app/api/day-assistant-v2/dayplan/route.ts`

**Endpoint**: `PUT /api/day-assistant-v2/dayplan`

**Purpose**: Update day plan metadata (work hours, capacity)

**Request Body**:
```typescript
{
  date: string           // ISO date (e.g., "2025-12-28")
  metadata: {
    work_hours_start?: string    // "09:00"
    work_hours_end?: string      // "17:00"
    capacity_minutes?: number    // 480
  }
}
```

**Response**:
```typescript
{
  dayPlan: DayPlan
  message: string
}
```

**Type Safety**:
```typescript
interface DayPlanMetadata {
  work_hours_start?: string
  work_hours_end?: string
  capacity_minutes?: number
  [key: string]: any
}
```

---

## 🧪 Testing Guide

### Focus Bar Tests

1. **Appearance Test**
   - Click "Start" on any task
   - Focus bar should appear instantly at the top
   - Black background, white text
   - Task title should be visible and not truncated (unless very long)

2. **Timer Test**
   - Timer should count up from 00:00:00
   - Format: HH:MM:SS
   - Updates every second
   - Timer continues counting even when scrolling

3. **Animation Test**
   - Red dot should pulse continuously
   - Red dot should also have "ping" animation (expanding circle)
   - When paused, dot turns yellow and stops animating

4. **Pause/Resume Test**
   - Click "Pauza" button
   - Button changes to "Wznów" with play icon
   - Timer stops counting
   - Click "Wznów" to resume
   - Timer continues from where it stopped

5. **Complete Test**
   - Click "Ukończ" button
   - Task should be marked as complete
   - Focus bar should disappear
   - Task should be removed from queue

6. **Stop Test**
   - Click X button
   - Focus bar should disappear
   - Timer should stop
   - Task remains in queue

7. **Scroll Test**
   - Start a timer
   - Scroll down the page
   - Focus bar should stay at the top (sticky)

### Top Bar Tests

1. **Date Display Test**
   - Check that date is in Polish
   - Format: "Czwartek, 28 grudnia"
   - First letter of weekday capitalized

2. **Work Hours Edit Test**
   - Click start time input
   - Change to different time (e.g., 10:00)
   - Capacity should auto-update
   - Check that value persists after page refresh

3. **Capacity Calculation Test**
   - Set start: 09:00, end: 17:00
   - Capacity should show: 8h (480 min)
   - Set start: 09:00, end: 13:00
   - Capacity should show: 4h (240 min)

4. **Validation Tests**
   - Try setting end time before start time
   - Should show error toast
   - Should not save invalid values
   - Try setting identical times
   - Should show error toast

5. **Work Mode Test**
   - Click work mode dropdown
   - Select different mode (e.g., HyperFocus)
   - Queue should reorder
   - Selected mode should show in dropdown

6. **Progress Test**
   - Complete some tasks
   - Progress should update (e.g., 30/480 min)
   - Percentage should calculate correctly
   - Format: "Progress: 30/480 min (6%)"

7. **Sticky Test**
   - Scroll down the page
   - Top bar should stay at the top

### Integration Tests

1. **Both Bars Stack Test**
   - Start a timer
   - Both bars should be visible
   - Focus bar should be on top (black)
   - Top bar should be below (white)
   - No overlap or visual issues

2. **Z-Index Test**
   - Start a timer
   - Scroll to see other UI elements
   - Focus bar should be above everything else
   - Top bar should be above content but below focus bar

3. **Responsive Test**
   - Test on mobile viewport
   - Button text should hide on small screens (only icons visible)
   - Inputs should remain editable

4. **Persistence Test**
   - Set work hours to 10:00 - 18:00
   - Refresh the page
   - Work hours should load from database
   - Values should be 10:00 - 18:00

5. **Error Recovery Test**
   - Disconnect network
   - Try to change work hours
   - Should show error toast
   - Values should revert to previous state
   - Reconnect network
   - Change should work now

---

## 🎨 Visual Design

### Focus Bar (Active Timer)

```css
Background: bg-black
Text: text-white
Z-Index: z-[100]
Position: sticky top-0
Shadow: shadow-2xl

Status Indicator (Active):
- Red dot: bg-red-500, animate-pulse
- Ping effect: bg-red-500, animate-ping

Status Indicator (Paused):
- Yellow dot: bg-yellow-500

Buttons:
- Pause: bg-yellow-600 hover:bg-yellow-700
- Resume: bg-green-600 hover:bg-green-700
- Complete: bg-green-600 hover:bg-green-700
- Stop: variant="ghost" hover:bg-gray-800
```

### Top Bar

```css
Background: bg-white
Border: border-b shadow-md
Z-Index: z-50
Position: sticky top-0

Time Inputs:
- Border: border-gray-300
- Hover: border-purple-500
- Focus: border-purple-600, ring-2 ring-purple-200

Dropdown:
- Border: border-gray-300
- Hover: border-purple-500
- Focus: border-purple-600, ring-2 ring-purple-200

Icons:
- Clock: text-purple-600
- Lightning: text-purple-600, weight="fill"
- ChartBar: text-purple-600
```

---

## ♿ Accessibility Features

### ARIA Labels

**Focus Bar**:
- Timer status container: `role="status" aria-label="Timer aktywny/wstrzymany"`
- Visual indicators: `aria-hidden="true"` (decorative only)

**Top Bar**:
- Progress section: `aria-label="Postęp dnia pracy"`
- Decorative icons: `aria-hidden="true"`

### Screen Reader Announcements

- Timer state changes announced via text content
- Button actions are clear from button text
- All interactive elements have proper labels

### Keyboard Navigation

- All inputs are keyboard accessible
- Dropdown works with keyboard
- Buttons focusable and activatable via Enter/Space

---

## 🔍 Troubleshooting

### Focus Bar Not Appearing

**Problem**: Focus bar doesn't show when clicking "Start"

**Solution**:
1. Check that `activeTimer` is not null
2. Verify `tasks.find()` returns a valid task
3. Check console for errors
4. Verify `useTaskTimer` hook is working

### Work Hours Not Saving

**Problem**: Work hours revert after page refresh

**Solution**:
1. Check network tab for PUT request to `/api/day-assistant-v2/dayplan`
2. Verify request includes correct metadata
3. Check database for `day_assistant_v2_plan` table
4. Verify metadata column contains work hours

### Timer Not Counting

**Problem**: Timer shows 00:00:00 and doesn't update

**Solution**:
1. Check `useTaskTimer` hook implementation
2. Verify `elapsedSeconds` is updating
3. Check if timer interval is running
4. Look for JavaScript errors in console

### Validation Not Working

**Problem**: Can set end time before start time

**Solution**:
1. Check `handleWorkHoursChange` validation logic
2. Verify comparison uses `<=` not `<`
3. Check if toast notifications are working
4. Verify early return after validation failure

---

## 📝 Notes

- The focus bar replaces the old `TopStatusBar` component when timer is active
- Both bars use the existing `useTaskTimer` hook for timer state
- Work hours are stored in `day_assistant_v2_plan.metadata` column
- Progress uses existing `usedMinutes` and `availableMinutes` from `useTaskQueue`
- All changes are backward compatible with existing functionality

---

## 🚀 Future Enhancements

Possible improvements for future iterations:

1. **Timer Persistence**: Save timer state to localStorage to survive page refresh
2. **Break Reminders**: Show notification after X minutes of continuous work
3. **Sound Notifications**: Play sound when timer completes
4. **Keyboard Shortcuts**: Add shortcuts for pause/resume (e.g., Ctrl+P)
5. **Work Hours History**: Track and display work hour patterns over time
6. **Custom Themes**: Allow users to customize focus bar colors
7. **Multiple Timers**: Support parallel timers for different tasks
8. **Timer Analytics**: Track time spent per task/context

---

**Implementation Complete** ✅
