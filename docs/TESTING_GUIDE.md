# Testing Guide - AI Assistant Modal Changes

## Setup

1. **Pull latest changes:**
   ```bash
   git checkout copilot/fix-modal-flow-progress
   git pull origin copilot/fix-modal-flow-progress
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Apply database migration:**
   ```bash
   supabase db push
   ```
   Or manually run: `supabase/migrations/20231218_ai_assistant_progress.sql`

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Clear browser cache** (important!):
   - Chrome: Ctrl+Shift+Del → Clear cached images and files
   - Or open in incognito mode

## Testing Checklist

### ✅ Test 1: Auto-create Subtasks
1. Open a task card
2. Click the Brain icon (🧠) to open AI Assistant Modal
3. Select any mode (Light/Stuck/Crisis)
4. Wait for AI to generate subtasks
5. **Expected:** Toast notification "Automatycznie utworzono X kroków"
6. **Expected:** Subtasks are created in task list (check parent task)

### ✅ Test 2: "Zrobione" Button (Not "Dodaj do zadań")
1. After subtasks are generated, look at the button at bottom right
2. **Expected:** Green button saying "✓ Zrobione" (NOT "Dodaj do zadań")
3. **Expected:** Button color is green gradient (from-green-600 to-emerald-600)

### ✅ Test 3: Progress Bar
1. Modal is open with subtasks
2. Look at the top of the modal, below the task name
3. **Expected:** Text "Krok 1 z X" where X is total steps
4. **Expected:** Purple progress bar showing percentage
5. **Expected:** Percentage text on the right (e.g., "33%")

### ✅ Test 4: Step Completion & Auto-Advance
1. Click "✓ Zrobione" button
2. **Expected:** Toast "✓ Krok ukończony!"
3. **Expected:** Modal automatically shows next step (Krok 2)
4. **Expected:** Progress bar updates (e.g., from 33% to 66%)
5. **Expected:** Previous step is NOT closed, just marked as complete

### ✅ Test 5: Completed Steps Display
1. After completing step 1, look above current step
2. **Expected:** Green box showing "✓ Krok 1: [title]" with strikethrough
3. Complete step 2
4. **Expected:** Now TWO green boxes showing completed steps

### ✅ Test 6: Save Progress & Close
1. Complete step 1 (or any step, but not the last)
2. Click X button in top right corner
3. **Expected:** Toast "Postęp zapisany. Możesz wrócić później!"
4. **Expected:** Modal closes
5. **Expected:** Task is still in list with subtasks

### ✅ Test 7: Resume Progress
1. After closing in Test 6, wait a moment
2. Click Brain icon (🧠) again on the same task
3. **Expected:** Toast "Witaj z powrotem! Ostatnio byłeś na kroku X z Y"
4. **Expected:** Modal shows mode selection first, but you can continue
5. Click on mode again to continue
6. **Expected:** Should resume where you left off

### ✅ Test 8: Last Step Completion
1. Get to the last step (e.g., Krok 3 z 3)
2. Click "✓ Zrobione"
3. **Expected:** Toast "✓ Krok ukończony!"
4. **Expected:** Toast "🎉 Wszystkie kroki ukończone!"
5. **Expected:** Modal closes automatically after 1.5 seconds

### ✅ Test 9: Cancel Button
1. Start modal, complete a step
2. Click "Anuluj" button (gray button)
3. **Expected:** Modal closes immediately
4. **Expected:** Progress is deleted (not saved)
5. Reopen modal
6. **Expected:** Starts from beginning (no "Witaj z powrotem" message)

### ✅ Test 10: Back Button
1. Complete step 1 to get to step 2
2. Look for "← Cofnij" button (should be on left side)
3. Click it
4. **Expected:** Modal shows step 1 again
5. **Expected:** Step 1 still shows as completed (green box above)
6. Can click forward again to step 2

## Common Issues

### Issue: Changes not visible
**Solution:** 
- Make sure you're on the correct branch: `git branch`
- Rebuild: `npm run build && npm run dev`
- Clear browser cache or use incognito mode

### Issue: "Dodaj do zadań" button still visible
**Solution:**
- You're on the wrong branch
- Or: Need to hard refresh (Ctrl+Shift+R)

### Issue: Subtasks not auto-creating
**Solution:**
- Check browser console for errors
- Make sure Todoist token is valid
- Check network tab for failed API calls

### Issue: Progress not saving
**Solution:**
- Database migration not applied: run `supabase db push`
- Check Supabase connection
- Check browser console for database errors

### Issue: "Witaj z powrotem" not showing
**Solution:**
- Database migration not applied
- Or: Clicked "Anuluj" instead of "X" (cancel deletes progress)

## Expected File Changes

To verify you have the correct code:

```bash
# Should show these files changed
git diff 717ee81..HEAD --name-only
```

Expected output:
- app/api/day-assistant/subtasks/route.ts
- components/assistant/AITaskBreakdownModal.tsx
- docs/AI_ASSISTANT_MODAL_CHANGES.md
- docs/UI_CHANGES_DESCRIPTION.md
- lib/services/aiAssistantProgressService.ts
- supabase/migrations/20231218_ai_assistant_progress.sql

## Verification Commands

```bash
# Verify "Zrobione" button exists
grep "Zrobione" components/assistant/AITaskBreakdownModal.tsx

# Verify "Dodaj do zadań" is removed
grep "Dodaj do zadań" components/assistant/AITaskBreakdownModal.tsx
# (should return nothing)

# Verify auto-create function exists
grep "autoCreateAllSubtasks" components/assistant/AITaskBreakdownModal.tsx

# Verify progress service exists
ls -la lib/services/aiAssistantProgressService.ts

# Verify migration exists
ls -la supabase/migrations/20231218_ai_assistant_progress.sql
```

## Screenshots to Take

When testing, take screenshots of:
1. Modal with progress bar visible
2. Modal with "✓ Zrobione" button (green)
3. Modal showing completed step with green checkmark
4. Toast notifications
5. Modal after reopening showing "Witaj z powrotem"

Share these screenshots if reporting issues.
