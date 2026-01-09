# Morning Brief Testing Guide

## Pre-requisites
1. User account with Todoist connected
2. Google Calendar connected (optional, but needed for meetings)
3. Day Assistant V2 configured
4. Some tasks in the system with different properties:
   - Completed tasks from yesterday
   - Tasks scheduled for today
   - Tasks with different priorities (P1, P2, P3, P4)
   - Tasks with different cognitive loads
   - Tasks with different due dates

## Test Scenarios

### Scenario 1: Yesterday's Completed Tasks Display
**Objective:** Verify that completed tasks from yesterday are displayed correctly

**Steps:**
1. Navigate to Morning Brief page (`/morning-brief`)
2. Check the "Wczoraj" section
3. Verify completed tasks from yesterday are shown
4. Check that the count is accurate (e.g., "5 zadań" not "0/0")

**Expected Results:**
- ✅ Shows list of tasks completed yesterday
- ✅ Shows correct count in stats
- ✅ Shows "Ostatnio pracowałeś nad: [task name]" subtitle
- ✅ If no tasks: shows "Brak ukończonych zadań wczoraj"

**Data Sources:**
- Primary: `day_assistant_v2_tasks` table (completed_at timestamp)
- Fallback: Todoist API (if database empty)

### Scenario 2: Advanced Task Scoring for Focus Task
**Objective:** Verify that focus task uses intelligent scoring

**Setup:**
Create these test tasks for today:
- Task A: P4 priority, due in 2 weeks, cognitive load 1/5
- Task B: P2 priority, due today, cognitive load 3/5
- Task C: P1 priority, overdue, cognitive load 5/5
- Task D: P3 priority, due tomorrow, cognitive load 2/5, postponed 2 times

**Steps:**
1. Navigate to Morning Brief
2. Check "Sugerowane zadanie focus" section
3. Note which task is suggested

**Expected Results:**
- ✅ Task C should be suggested (highest score: overdue + P1)
- ✅ If no overdue tasks, P1/P2 with earliest deadline should win
- ✅ Focus task card shows task title and due date
- ✅ Score breakdown available in console logs

**Scoring Formula:**
```
Score = Deadline (0-150) + Priority (5-50) - Cognitive Load (2-10) + Postpone Bonus (5 per)

Task A: 10 + 5 - 2 + 0 = 13
Task B: 60 + 30 - 6 + 0 = 84
Task C: 150 + 50 - 10 + 0 = 190 ← Winner
Task D: 30 + 10 - 4 + 10 = 46
```

### Scenario 3: Personalized Tips Generation
**Objective:** Verify tips are context-aware and actionable

**Test Cases:**

#### 3.1 High Task Count
**Setup:** 10+ tasks for today
**Expected Tip:** "📋 Masz dziś dużo zadań. Może warto kilka przenieść na jutro?"

#### 3.2 Low Task Count
**Setup:** 1-3 tasks for today
**Expected Tip:** "✨ Spokojny dzień! Idealny moment na trudniejsze zadania."

#### 3.3 Many High Priority Tasks
**Setup:** 5+ P1/P2 tasks
**Expected Tip:** "🔥 Dużo ważnych zadań - pamiętaj o przerwach!"

#### 3.4 High Cognitive Load
**Setup:** Multiple tasks with cognitive load 4-5/5
**Expected Tip:** "🧠 Trudne zadania dzisiaj - zacznij od najłatwiejszego dla rozpędu"

#### 3.5 Meetings Impact
**Setup:** 3 meetings totaling 180 minutes
**Expected Tip:** "📅 3 spotkania dziś (180min). Zostaje Ci ~5h na zadania."

#### 3.6 Context Clustering
**Setup:** 4+ tasks with same context_type (e.g., "deep")
**Expected Tip:** "💻 Dzisiaj głównie deep - świetny dzień na deep focus!"

**Steps:**
1. Set up task conditions
2. Navigate to Morning Brief
3. Check "Wskazówki na dziś" section
4. Verify relevant tips appear

**Expected Results:**
- ✅ Maximum 4 tips shown
- ✅ Tips are relevant to current situation
- ✅ Each tip has emoji indicator
- ✅ Tips are actionable (tell user what to do)

### Scenario 4: Meetings Integration
**Objective:** Verify Google Calendar meetings display correctly

**Setup:**
1. Connect Google Calendar
2. Create 2-3 meetings for today with:
   - Different times
   - Various durations (30min, 60min, etc.)
   - Some with meeting links
   - Some with locations

**Steps:**
1. Navigate to Morning Brief
2. Look at "Dzisiaj" section
3. Scroll to meetings section at bottom

**Expected Results:**
- ✅ Shows "Spotkania dziś (X)" header with count
- ✅ First meeting displayed with:
  - Time in HH:mm format (e.g., "14:30")
  - Meeting title
  - Duration (e.g., "60 min")
  - Location (if available)
  - Clickable link to join (if available)
- ✅ Shows "+ X więcej" if more than 1 meeting
- ✅ Meeting link opens in new tab

**Edge Cases:**
- No Google Calendar: Section not shown (graceful degradation)
- No meetings today: Section not shown
- Invalid date in meeting: Shows "Czas nieznany" instead of crashing

### Scenario 5: Text-to-Speech (TTS) Summary
**Objective:** Verify TTS includes all relevant information

**Steps:**
1. Navigate to Morning Brief
2. Click play button on TTS player
3. Listen to entire summary

**Expected Content:**
1. Greeting: "Dzień dobry!"
2. Yesterday: "Wczoraj ukończyłeś X zadań/zadanie/zadania"
3. Last task: "Ostatnio pracowałeś nad: [task]"
4. Meetings: "Dzisiaj masz X spotkań/spotkanie/spotkania"
5. First meeting: "Pierwsze spotkanie: [title] o [time]"
6. Today: "Dzisiaj masz do zrobienia X zadań"
7. Focus: "Sugeruję zacząć od: [task]"
8. Tip: One personalized tip (no emoji)

**Expected Results:**
- ✅ Audio plays without errors
- ✅ All sections included in proper order
- ✅ Polish grammar is correct (zadanie/zadania/zadań)
- ✅ No emoji characters spoken (removed for TTS)
- ✅ Natural pronunciation

### Scenario 6: Error Handling & Fallbacks
**Objective:** Verify graceful degradation

**Test Cases:**

#### 6.1 No Todoist Token
**Steps:** Remove Todoist token from localStorage
**Expected:** Shows error message with retry button

#### 6.2 No Database Tasks
**Steps:** Clear all tasks from day_assistant_v2_tasks
**Expected:** Falls back to Todoist API, or shows "Brak zadań"

#### 6.3 Google Calendar Not Connected
**Steps:** Disconnect Google Calendar
**Expected:** Meetings section not shown, rest of page works

#### 6.4 Network Error
**Steps:** Go offline, try to refresh
**Expected:** Shows cached data if available, or error message

#### 6.5 Invalid Date in Meeting
**Steps:** Manually insert meeting with null start_time
**Expected:** Shows "Czas nieznany" instead of crashing

**Expected Results:**
- ✅ No page crashes
- ✅ Friendly error messages
- ✅ Retry/refresh options available
- ✅ Partial data shown when possible

### Scenario 7: Caching & Performance
**Objective:** Verify caching works correctly

**Steps:**
1. Open Morning Brief - note load time
2. Refresh page - should load faster from cache
3. Wait until next day
4. Open Morning Brief again - should fetch fresh data

**Expected Results:**
- ✅ Initial load: ~1-2 seconds
- ✅ Cached load: <0.5 seconds
- ✅ Cache invalidated at midnight
- ✅ Manual refresh button fetches fresh data

### Scenario 8: Authentication & Security
**Objective:** Verify security measures

**Steps:**
1. Open Morning Brief without login
2. Try to access API directly without auth
3. Check console for sensitive data

**Expected Results:**
- ✅ Redirects to login if not authenticated
- ✅ API returns 401 without valid session
- ✅ No sensitive data in console (production)
- ✅ Todoist token not in URL
- ✅ User ID from session, not request params

### Scenario 9: Mobile Responsiveness
**Objective:** Verify UI works on mobile

**Steps:**
1. Open Morning Brief on mobile device
2. Check all sections
3. Try TTS player
4. Click meeting links

**Expected Results:**
- ✅ Layout adapts to screen size
- ✅ Text is readable
- ✅ Buttons are tappable
- ✅ TTS controls work
- ✅ Links open correctly

### Scenario 10: Edge Cases

#### 10.1 Zero Tasks Today
**Expected:** Shows "Dzisiaj nie masz żadnych zaplanowanych zadań - dzień na inne rzeczy!"

#### 10.2 Zero Completed Yesterday
**Expected:** Shows "Wczoraj nie ukończyłeś żadnych zadań - dzisiaj nowy start!"

#### 10.3 All Meetings Take Entire Day
**Setup:** Meetings totaling 8+ hours
**Expected:** Tip warns about no time for tasks

#### 10.4 First Time User
**Setup:** No tasks, no meetings
**Expected:** Shows friendly empty states, basic tips

## Console Logging

Check browser console for these logs:

### Successful Flow:
```
🔍 [Recap/Yesterday] Fetching completed tasks for date: 2026-01-09
✅ [Recap/Yesterday] Found 5 completed tasks from database
🔍 [Recap/Today] Fetching tasks for date: 2026-01-09
✅ [Recap/Today] Found 8 tasks, 3 high priority
🎯 [Recap/Today] Focus task: Important Meeting with score: 120
🔍 [Recap/Summary] Generating daily summary
✅ [Recap/Summary] Found 3 meetings
✅ [Recap/Summary] Summary generated with 4 personalized tips
```

### Fallback Flow:
```
⚠️ [Recap/Yesterday] No tasks in database, trying Todoist API as fallback
✅ [Recap/Yesterday] Found 5 completed tasks from Todoist fallback
```

### Error Flow:
```
❌ [Recap/Today] Database error: [error message]
⚠️ [Recap/Summary] Failed to fetch meetings: [error message]
```

## Performance Benchmarks

Expected API response times:
- `/api/recap/yesterday`: <500ms (database) or <1s (Todoist fallback)
- `/api/recap/today`: <500ms (database) or <1s (Todoist fallback)
- `/api/recap/summary`: <1.5s (parallel fetches)
- `/api/day-assistant-v2/meetings`: <200ms (cached) or <1s (Google Calendar)

## Known Limitations

1. Tips generation requires at least some task data
2. Meetings require Google Calendar connection
3. Focus task scoring works best with complete task metadata
4. TTS may have accent/pronunciation quirks in Polish
5. Caching is browser-specific (localStorage)

## Troubleshooting

### "0/0 zadań" shown for yesterday
- Check if tasks have `completed_at` timestamp
- Verify tasks completed within yesterday's date range
- Check database connection and RLS policies

### Focus task is not the expected one
- Check console for score breakdown
- Verify task has all required fields (priority, due_date, cognitive_load)
- Review scoring formula in documentation

### No meetings shown
- Verify Google Calendar is connected
- Check if meetings exist for today
- Look for errors in console
- Check `/api/day-assistant-v2/meetings` directly

### Tips are generic
- Ensure tasks have proper metadata (context_type, cognitive_load)
- Check that meetings are fetched successfully
- Verify task count and priority distribution

### TTS doesn't play
- Check browser audio permissions
- Verify browser supports Web Speech API
- Look for errors in console
- Try different browser

## Success Criteria

✅ **All scenarios pass**
✅ **No console errors**
✅ **No TypeScript errors**
✅ **No security vulnerabilities**
✅ **Response times within benchmarks**
✅ **UI is responsive and accessible**
✅ **Error messages are friendly**
✅ **Fallbacks work correctly**

## Reporting Issues

When reporting issues, include:
1. Scenario number and step
2. Expected vs actual behavior
3. Console errors/warnings
4. Screenshots
5. Browser and device info
6. User account type (test/production)
