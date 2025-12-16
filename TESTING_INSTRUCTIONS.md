# Testing Instructions - Day Assistant Authentication Fix

## Overview
This PR fixes the Day Assistant feature that was not displaying tasks due to authentication issues. The fix has been implemented and is ready for testing.

## What Was Fixed
- **Root Issue**: Deprecated authentication package causing "No authenticated user" errors
- **Solution**: Migrated to official `@supabase/ssr` package
- **Impact**: All Day Assistant API routes now properly authenticate users

## Pre-Testing Checklist
Before deploying and testing:
1. ✅ Code review completed - all feedback addressed
2. ✅ Security scan passed - 0 vulnerabilities found
3. ✅ TypeScript compilation successful - no type errors
4. ✅ All authentication patterns updated consistently
5. ✅ Documentation created (DAY_ASSISTANT_AUTH_FIX.md)

## How to Test

### Step 1: Deploy to Vercel Preview
1. Push the branch or create PR
2. Wait for Vercel preview deployment
3. Get preview URL from Vercel dashboard or PR comments

### Step 2: Clear State and Login
1. Open preview URL in **incognito/private window** (important!)
2. Open browser DevTools (F12)
3. Go to Console tab
4. Login with your test account
5. Navigate to Day Assistant page

### Step 3: Verify Tasks Display
**Expected Behavior:**
- Tasks should appear in NOW/NEXT/LATER sections
- If you have no tasks, you should see "Brak aktywnego zadania" message
- You should NOT see "Loading..." indefinitely
- Console should NOT show "No authenticated user" errors

**Check:**
- [ ] NOW section displays correctly
- [ ] NEXT section shows list of tasks or "Brak zadań w kolejce"
- [ ] LATER section shows count (e.g., "+24 zadań")
- [ ] No authentication errors in console
- [ ] No "No authenticated user" in Vercel logs

### Step 4: Test Todoist Sync
**If you have Todoist connected:**
1. Make sure you have some tasks in Todoist (at least 3-5)
2. In the app, the sync should happen automatically
3. Wait 10-15 seconds for sync to complete
4. Tasks from Todoist should appear in Day Assistant

**Check:**
- [ ] Tasks sync from Todoist
- [ ] Task titles match Todoist
- [ ] Task priorities are correctly mapped (NOW/NEXT/LATER)
- [ ] Console shows sync success messages

**If sync doesn't work:**
- Check if you have Todoist token in localStorage: `localStorage.getItem('todoist_token')`
- Check console for sync errors
- Try reconnecting Todoist from settings

### Step 5: Test Task Actions
Test each action to ensure they work without authentication errors:

**Pin Action (📌):**
1. Select a task from NEXT section
2. Click pin action
3. Task should move to NOW or be marked as pinned
4. [ ] Pin action works without errors

**Postpone Action (🧊):**
1. Select a task from NOW or NEXT
2. Click postpone action
3. Task should move to LATER
4. [ ] Postpone action works without errors

**Escalate Action (🔥):**
1. Select a task from NEXT or LATER
2. Click escalate action
3. Task should move to NOW
4. [ ] Escalate action works without errors

**Undo Action (↻):**
1. Perform any action above
2. Click Undo button in header
3. Last action should be reverted
4. [ ] Undo works without errors

### Step 6: Test Subtasks
1. Select any task with "🧠 Generuj kroki" button
2. Click to open subtask modal
3. Choose detail level (minimum/standard/detailed)
4. Click generate
5. Wait for AI to generate subtasks
6. Click "OK" to accept or adjust detail level

**Check:**
- [ ] Subtask modal opens
- [ ] Generation works without errors
- [ ] Subtasks are saved successfully
- [ ] No authentication errors

### Step 7: Test Chat Interface
1. Switch to "💬 Czat" tab in right panel
2. Type a message (e.g., "Co teraz?")
3. Send message
4. Wait for AI response

**Check:**
- [ ] Chat history loads (if any)
- [ ] Can send messages
- [ ] Receive AI responses
- [ ] No authentication errors in console

### Step 8: Check Vercel Logs
1. Go to Vercel dashboard
2. Navigate to deployment logs
3. Look for API request logs

**Should NOT see:**
- ❌ "No authenticated user" errors
- ❌ 401 Unauthorized errors
- ❌ "Please log in" errors

**Should see:**
- ✅ "Fetching queue for user: [uuid]"
- ✅ "Queue state: laterCount: [number]"
- ✅ Successful API responses (200 status)

## Common Issues and Solutions

### Issue: Tasks still don't appear
**Check:**
1. Are you logged in? (Check network tab for auth cookies)
2. Do you have any tasks in Todoist?
3. Is Todoist connected? (Check localStorage for todoist_token)
4. Any errors in console?

**Try:**
- Logout and login again
- Reconnect Todoist
- Create a test task manually with "+ Dodaj zadanie" button

### Issue: "Unauthorized" errors
**This means:**
- Authentication is not working properly
- Need to check if cookies are being sent

**Debug:**
1. Check Application tab > Cookies
2. Look for cookies starting with "sb-"
3. If missing, logout and login again
4. If present but still getting 401, check Vercel logs

### Issue: Actions return errors
**Check:**
1. Network tab in DevTools
2. Look at request/response for the failing action
3. Check if error is 401 (auth) or 500 (server)
4. Share error details with developer

## Success Criteria
✅ All items in checklist above are working
✅ No "No authenticated user" in Vercel logs
✅ No 401 errors in browser console
✅ Tasks display correctly in all sections
✅ All actions (pin/postpone/escalate/undo) work
✅ Subtask generation works
✅ Chat interface works

## Reporting Results

### If Tests Pass ✅
Comment on PR:
```
✅ Testing passed!
- Tasks display correctly
- All actions work
- No authentication errors
- Ready to merge
```

### If Tests Fail ❌
Comment on PR with:
1. Which step failed
2. What error you saw
3. Screenshot of error (if possible)
4. Browser console log
5. Vercel logs (if accessible)

## Additional Notes

### Browser Compatibility
Test on at least one of:
- Chrome/Edge (Chromium)
- Firefox
- Safari (if on Mac)

### Mobile Testing
If possible, test on mobile:
- Open preview URL on phone
- Test basic functionality
- Report any mobile-specific issues

### Performance
Note if:
- Page loads significantly slower
- Actions take too long to complete
- Any UI freezing or lag

## Questions?
If you encounter any issues or have questions:
1. Check DAY_ASSISTANT_AUTH_FIX.md for technical details
2. Comment on the PR with specific questions
3. Include screenshots/logs when reporting issues
