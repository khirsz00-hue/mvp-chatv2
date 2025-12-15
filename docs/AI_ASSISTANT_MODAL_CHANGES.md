# AI Assistant Modal - Progress Tracking Implementation

## Overview
This document describes the changes made to implement progress tracking, auto-creation of subtasks, and improved user flow in the AI Assistant Modal.

## Changes Made

### 1. Database Schema
**File:** `supabase/migrations/20231218_ai_assistant_progress.sql`

Created new table `ai_assistant_progress` to track:
- User ID and task ID
- Selected mode (light/stuck/crisis)
- Total steps and current step index
- Array of subtask IDs
- Array of completed step indices
- Q&A context for stuck mode

### 2. Progress Service
**File:** `lib/services/aiAssistantProgressService.ts`

New service to manage progress tracking:
- `getProgress()` - Load existing progress for a task
- `createProgress()` - Create new progress entry
- `updateProgress()` - Update current step or subtask IDs
- `completeStep()` - Mark a step as completed and advance
- `deleteProgress()` - Remove progress (when user cancels)
- `addSubtaskToProgress()` - Add subtask ID to tracking

### 3. Modal Component Updates
**File:** `components/assistant/AITaskBreakdownModal.tsx`

#### Key Changes:
1. **Progress Bar** - Shows "Krok X z Y" with visual progress indicator
2. **Auto-create Subtasks** - Subtasks are automatically created when generated
3. **"Zrobione" Button** - Replaced "Dodaj do zadań" with "✓ Zrobione"
4. **Step Completion** - Clicking "Zrobione" marks step as complete and advances
5. **Completed Steps Display** - Shows checkmarks for completed steps
6. **Navigation** - "← Cofnij" button to go back to previous steps
7. **Save & Close** - "Zamknij i wróć później" preserves progress
8. **Cancel** - "Anuluj" deletes progress and resets

#### New Functions:
- `loadProgress()` - Restore progress when modal reopens
- `autoCreateAllSubtasks()` - Automatically create all subtasks in database
- `handleMarkStepDone()` - Mark current step as done and advance
- `handleSaveAndClose()` - Save progress and close modal
- `handleCancel()` - Delete progress and reset
- `handlePreviousStep()` - Navigate back one step

### 4. API Enhancements
**File:** `app/api/day-assistant/subtasks/route.ts`

Added PATCH endpoint to mark subtasks as completed:
```typescript
PATCH /api/day-assistant/subtasks
Body: { subtask_id: string, completed: boolean }
```

### 5. User ID Management
- Added Supabase auth integration to get user ID
- Progress is tied to user ID for multi-user support
- Falls back gracefully if user is not authenticated

## User Flow

### Initial Flow
1. User opens modal from task card
2. Selects mode (Light/Stuck/Crisis)
3. AI generates subtasks
4. **Subtasks are automatically created in database**
5. Modal shows first step with progress bar

### Completing Steps
1. User reads step description
2. Clicks "✓ Zrobione" button
3. Step is marked as completed (shown with checkmark)
4. **Modal automatically advances to next step**
5. Progress is saved to database

### Last Step
1. User completes final step
2. Modal shows "🎉 Wszystkie kroki ukończone!"
3. Modal automatically closes after 1.5 seconds
4. All subtasks remain in the task list

### Closing and Returning
1. User clicks X to close modal mid-flow
2. Progress is automatically saved
3. When user reopens modal later:
   - Modal shows "Witaj z powrotem!" message
   - Displays current progress (Krok X z Y)
   - Shows completed steps with checkmarks
   - User can continue from where they left off

### Canceling
1. User clicks "Anuluj" button
2. Progress is deleted from database
3. Modal resets to initial state

## UI Components

### Progress Bar
```
Krok 2 z 3                                    66%
████████████████░░░░░░░░ 
```

### Completed Steps
```
✓ Krok 1: Zidentyfikuj pytanie (ukończony)
```

### Current Step
```
▶ Krok 2: Przygotuj zapytanie SQL
  [opis kroku...]
  
[← Cofnij] [Anuluj] [✓ Zrobione →]
```

## Technical Details

### Progress Tracking
- Progress is stored per (user_id, task_id) pair
- Multiple users can work on same task independently
- Progress includes:
  - Mode selection
  - Current step index
  - Completed step indices
  - Subtask IDs (for future completion tracking)

### Subtask Auto-Creation
When AI generates subtasks, they are immediately created via:
```typescript
await onCreateSubtasks([
  { content, description, duration, duration_unit }
])
```

This creates Todoist subtasks with:
- Parent task ID
- Same project and priority as parent
- Estimated duration

### State Management
- Local state for UI (current step, subtasks array)
- Database for persistence (progress table)
- Supabase RLS for security (user can only see their own progress)

## Known Limitations

1. **Todoist Subtask Completion**
   - Currently tracking completion in progress table
   - Need to enhance `onCreateSubtasks` to return created subtask IDs
   - Then can call `/api/todoist/complete` to mark subtasks as done in Todoist

2. **Subtask Details in Progress**
   - Subtask titles/descriptions not stored in progress table
   - If user returns later, subtasks need to be regenerated
   - Consider storing full subtask details in progress metadata

3. **Concurrent Editing**
   - No conflict resolution if user opens same task in multiple tabs
   - Latest update wins (last-write-wins semantics)

## Future Enhancements

1. **Enhanced Todoist Integration**
   - Return subtask IDs from creation
   - Mark Todoist subtasks as completed when user clicks "Zrobione"
   - Sync completion status bidirectionally

2. **Subtask Persistence**
   - Store subtask details in progress table
   - No need to regenerate when returning to modal

3. **Analytics**
   - Track completion time per step
   - Identify which steps users struggle with
   - Use data to improve AI suggestions

4. **Notifications**
   - Remind user to complete pending steps
   - Show progress in task list

5. **Undo Functionality**
   - Allow unchecking completed steps
   - Revert to previous step if needed

## Testing Checklist

- [ ] Mode selection (Light/Stuck/Crisis) works
- [ ] Subtasks are auto-created when generated
- [ ] Progress bar shows correct percentage
- [ ] "Zrobione" button marks step as complete
- [ ] Modal auto-advances to next step
- [ ] Completed steps show with checkmarks
- [ ] "← Cofnij" button navigates back
- [ ] "Zamknij i wróć później" saves progress
- [ ] Reopening modal restores progress
- [ ] "Anuluj" deletes progress
- [ ] Last step completion closes modal
- [ ] Toast notifications appear correctly
- [ ] Multiple users can use independently
- [ ] Progress persists across browser sessions

## Migration Instructions

To apply database changes:
```sql
-- Run migration
psql -d your_database -f supabase/migrations/20231218_ai_assistant_progress.sql
```

Or using Supabase CLI:
```bash
supabase db push
```

## Dependencies

No new dependencies added. Uses existing:
- `framer-motion` for animations
- `@phosphor-icons/react` for icons
- `@supabase/supabase-js` for database
- Next.js API routes
