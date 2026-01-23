# Unified Time Tracking and Focus Mode Implementation

## Overview
This implementation provides a unified time tracking system that consolidates time sessions from both "Task Assistant" and "Day Assistant V2" timers, along with a focus mode feature for the Day Assistant V2.

## Features Implemented

### 1. Unified Time Tracking Service ⏱️

**File:** `lib/services/timeTrackingService.ts`

All timers now save their sessions to a single unified location:
- **Database:** `time_sessions` table in Supabase
- **Backup:** `allTimeSessions` in localStorage (for offline support)

#### Session Types:
- `manual` - Regular timer sessions from TaskTimer
- `pomodoro` - Pomodoro work sessions
- `focus` - Focus mode sessions from Day Assistant V2

#### Task Sources:
- `assistant_tasks` - Sessions from the Task Assistant
- `day_assistant_v2` - Sessions from the Day Assistant V2

#### Key Functions:
- `saveTimeSession(session)` - Saves a time session to Supabase with localStorage backup
- `getTaskTimeSessions(taskId, taskSource)` - Retrieves all sessions for a task

### 2. Modified Components

#### `components/assistant/TaskTimer.tsx`
- Both `stopTimer` functions now use `saveTimeSession` from the unified service
- Removed old localStorage-only storage (`timerSessions`)
- Sessions are saved to both database and localStorage backup

#### `components/assistant/PomodoroTimer.tsx`
- `handlePhaseComplete` function now uses unified service
- Pomodoro work sessions saved with `session_type: 'pomodoro'`
- Removed old localStorage-only storage (`pomodoroSessions`)

#### `hooks/useTaskTimer.ts`
- `stopTimer` now saves sessions when timer is stopped
- Sessions saved with `session_type: 'focus'`
- Uses `task_source: 'day_assistant_v2'`

### 3. Focus Mode Feature 🎯

#### `components/day-assistant-v2/FocusMode.tsx`
New component that provides:
- **FOCUS button** - Toggles focus mode on/off
- **Backdrop blur** - Blurs everything around with `backdrop-filter: blur(12px)`
- **Gentle reminders** - Subtle shake animation every 5 minutes
- **z-index management** - Backdrop at z-80, timer box at z-90

#### `components/day-assistant-v2/CurrentActivityBox.tsx`
Enhanced with:
- Integration of FocusMode component
- State management for focus mode active/inactive
- Shake animation trigger every 5 minutes when in focus mode
- Dynamic z-index based on focus mode state

#### `app/globals.css`
Added CSS for gentle shake animation:
```css
@keyframes gentle-shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}

.focus-reminder-shake {
  animation: gentle-shake 0.5s ease-in-out 3;
}
```

### 4. Database Schema

**Migration File:** `supabase/migrations/20251228_time_sessions.sql`

Updated to include `'focus'` in session_type CHECK constraint:
```sql
session_type TEXT DEFAULT 'manual' CHECK (session_type IN ('manual', 'pomodoro', 'focus'))
```

## Benefits

### Unified History
- All time tracking data is now in one place
- Easy to query total time spent across different timer types
- Consistent data structure regardless of timer source

### Offline Support
- localStorage backup ensures data isn't lost if database is unavailable
- Graceful fallback mechanism

### Better UX with Focus Mode
- Reduces distractions by blurring background elements
- Timer box remains sharp and visible (z-index: 90)
- Gentle reminders every 5 minutes (not aggressive)
- Easy toggle on/off with FOCUS button

## Technical Details

### Timer State Flow

1. **Start Timer** → Timer component starts counting
2. **Stop Timer** → `saveTimeSession()` is called
3. **Service Logic:**
   - Try to save to Supabase database
   - On success: Also save to localStorage backup
   - On failure: Save only to localStorage

### Focus Mode Implementation

1. **Button Click** → Toggle `focusModeActive` state
2. **Backdrop Rendering:**
   - Fixed position overlay at z-index 80
   - `backdrop-filter: blur(12px)` for blur effect
   - `pointer-events: none` so it doesn't block interactions
3. **Timer Box:**
   - Dynamic z-index: 90 when focus active, 10 when inactive
   - Remains sharp and interactive above the blur
4. **Shake Reminders:**
   - Interval set when focus mode activates
   - Every 5 minutes (300,000ms)
   - Applies `.focus-reminder-shake` class for 1.5s
   - Clears interval when focus mode deactivates

### CSS Architecture

The shake animation is:
- **Subtle:** Only ±2px horizontal movement
- **Brief:** 0.5s per shake
- **Limited:** 3 repetitions per reminder
- **Gentle:** ease-in-out timing function

## Usage Example

### Starting a Timer (Day Assistant V2)
```typescript
const { startTimer } = useTaskTimer()
startTimer(task) // Automatically tracks with task_source: 'day_assistant_v2'
```

### Stopping a Timer
```typescript
const { stopTimer } = useTaskTimer()
await stopTimer() // Saves session via unified service
```

### Enabling Focus Mode
User clicks the "FOCUS" button in CurrentActivityBox:
- Backdrop appears, blurring everything
- Timer box stays sharp (z-90)
- Gentle shake reminder starts (every 5 min)

## Migration Notes

### Old Storage Keys (Being Phased Out)
- `timerSessions` - Old TaskTimer sessions
- `pomodoroSessions` - Old Pomodoro sessions

### New Storage Keys
- `allTimeSessions` - Unified backup for all sessions

### Database Table
- `time_sessions` - Already exists, now supports all three session types

## Testing Checklist

- [ ] TaskTimer saves sessions to unified service
- [ ] Pomodoro timer saves sessions to unified service
- [ ] Day Assistant V2 timer saves sessions to unified service
- [ ] Focus mode button toggles correctly
- [ ] Backdrop blur appears/disappears
- [ ] Timer box remains visible and interactive in focus mode
- [ ] Shake animation triggers every 5 minutes
- [ ] Database saves work correctly
- [ ] localStorage backup works when database fails

## Future Improvements

1. **Analytics Dashboard** - Show consolidated time tracking across all sources
2. **Export Feature** - Allow users to export their time sessions
3. **Custom Reminder Intervals** - Let users configure shake reminder frequency
4. **Sound Notifications** - Optional gentle sound with shake reminder
5. **Focus Mode Themes** - Different blur intensities or background colors
