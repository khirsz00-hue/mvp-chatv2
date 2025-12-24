# 🧪 Manual Testing Checklist - Critical Hotfix

**Date:** 2025-12-24  
**Branch:** `copilot/fix-critical-bugs-and-remove-debug-messages`  
**Tester:** _______________  

---

## ✅ Pre-Testing Setup

Before starting tests, ensure:

- [ ] Branch is checked out: `copilot/fix-critical-bugs-and-remove-debug-messages`
- [ ] Dependencies installed: `npm install`
- [ ] Application runs: `npm run dev`
- [ ] Todoist is connected in user profile
- [ ] At least one overdue task exists in Todoist

---

## 🧪 TEST 1: Complete Overdue Task

**Goal:** Verify "Ukończ" button works and syncs with Todoist

### Steps:

1. [ ] Navigate to Day Assistant v2
2. [ ] Locate the "⚠️ PRZETERMINOWANE" section
3. [ ] Expand the section if collapsed
4. [ ] Find an overdue task
5. [ ] Click the green "✅ Ukończ" button

### Expected Results:

- [ ] Task immediately disappears from overdue section
- [ ] Success toast appears: "✅ Zadanie ukończone!"
- [ ] Confetti animation plays 🎉
- [ ] Task is marked as completed in Todoist (check Todoist app/web)
- [ ] Task remains completed after page refresh
- [ ] DecisionLog shows: "Ukończono przeterminowane zadanie [task name]"
- [ ] Streak/stats update (if applicable)

### Errors to Check:

- [ ] If Todoist API fails: Error is logged to console but task still completes in local DB
- [ ] If DB fails: Task reappears in list + error toast shown

---

## 🧪 TEST 2: Move Overdue Task to Today

**Goal:** Verify "Dziś" button persists changes to DB and Todoist

### Steps:

1. [ ] Navigate to Day Assistant v2
2. [ ] Locate an overdue task in "⚠️ PRZETERMINOWANE" section
3. [ ] Click "Dziś" button

### Expected Results:

- [ ] Task moves from overdue section to today's queue
- [ ] Success toast: "✅ Przeniesiono na dziś"
- [ ] DecisionLog shows: "Przeniesiono przeterminowane zadanie [task name] na dziś"
- [ ] **Hard refresh page (Ctrl+Shift+R / Cmd+Shift+R)**
- [ ] Task stays in today's queue (NOT back in overdue)
- [ ] Check Todoist: Task due_date updated to today
- [ ] Task appears in correct position in queue based on score

### Errors to Check:

- [ ] If Todoist API fails: Error logged but DB still updates
- [ ] If DB fails: Task returns to overdue + error toast

---

## 🧪 TEST 3: Postpone Overdue Task to Tomorrow

**Goal:** Verify "Jutro" button persists changes to DB and Todoist

### Steps:

1. [ ] Navigate to Day Assistant v2
2. [ ] Locate an overdue task in "⚠️ PRZETERMINOWANE" section
3. [ ] Click "Jutro" button

### Expected Results:

- [ ] Task disappears from overdue section
- [ ] Success toast: "✅ Przełożono na jutro"
- [ ] DecisionLog shows: "Przełożono przeterminowane zadanie [task name] na jutro"
- [ ] **Hard refresh page (Ctrl+Shift+R / Cmd+Shift+R)**
- [ ] Task does NOT reappear in overdue section
- [ ] Check Todoist: Task due_date updated to tomorrow
- [ ] Task will appear in tomorrow's day plan

### Errors to Check:

- [ ] If Todoist API fails: Error logged but DB still updates
- [ ] If DB fails: Task returns to overdue + error toast

---

## 🧪 TEST 4: Recommendations Panel Visibility

**Goal:** Verify Recommendations panel is visible and working

### Steps:

1. [ ] Navigate to Day Assistant v2
2. [ ] Look at the **right sidebar** (desktop) or **below main content** (mobile)
3. [ ] Find the "💡 Rekomendacje" card

### Expected Results:

- [ ] Panel is visible with blue gradient title "Rekomendacje"
- [ ] Shows recommendations OR "Brak aktywnych rekomendacji"
- [ ] Recommendations load without errors
- [ ] Can click "Apply" on recommendations
- [ ] Panel updates after applying recommendation

### Errors to Check:

- [ ] Panel missing entirely (BUG - should not happen)
- [ ] Panel crashes on load
- [ ] Recommendations don't load

---

## 🧪 TEST 5: "Na później" Section

**Goal:** Verify "later" queue populates when capacity exceeded

### Prerequisites for this test:

You need to create a scenario where capacity is exceeded:
- Add 15+ tasks with estimates
- OR set work hours to end soon (e.g., if it's 5pm, set work end to 6pm)
- OR add tasks with large estimates that exceed available time

### Steps:

1. [ ] Navigate to Day Assistant v2
2. [ ] Scroll to "📋 Na później" section
3. [ ] Click to expand if collapsed

### Expected Results:

**If capacity NOT exceeded:**
- [ ] Section shows: "Wszystkie zadania mieszczą się w dostępnym czasie pracy"
- [ ] later.length = 0 in console logs
- [ ] This is CORRECT behavior ✅

**If capacity IS exceeded:**
- [ ] Section shows task count: "X zadań"
- [ ] Tasks are listed below
- [ ] Tasks are sorted by score (highest first)
- [ ] Console logs show: "Adding to LATER (would exceed capacity)" or "Adding to LATER (queue full)"
- [ ] Queue has max 10 tasks (rest overflow to later)

### To Force Later Queue to Populate:

Option 1: Add many tasks
```
1. Add 15 tasks via "Dodaj zadanie" form
2. Each with 60 min estimate
3. Later queue should populate
```

Option 2: Reduce available time
```
1. Click gear icon (⚙️) to open config
2. Set work_end_time to 1 hour from now
3. Add several 60-min tasks
4. Later queue should populate
```

---

## 🧪 TEST 6: No Debug Messages in UI

**Goal:** Verify production UI has NO debug messages visible

### Steps:

1. [ ] Navigate to Day Assistant v2
2. [ ] **Thoroughly scan the entire page** for any debug text

### Check These Locations:

**Top of page:**
- [ ] NO yellow "🔍 Debug Panel" card
- [ ] NO grid showing task counts
- [ ] NO "Raw Data" details/summary blocks

**Overdue section:**
- [ ] NO "(debug: array is empty)" badge
- [ ] NO "🔍 DEBUG: Brak przeterminowanych zadań w array"
- [ ] NO details/summary with JSON dump
- [ ] Only shows clean message: "Brak przeterminowanych zadań" if empty

**"Na później" section:**
- [ ] NO "(debug: array is empty)" badge
- [ ] NO "🔍 DEBUG: Brak zadań w kolejce 'later'"
- [ ] NO details/summary with JSON dump
- [ ] Only shows clean message if empty

**Console (F12):**
- [ ] Console.log statements are OK (for development)
- [ ] NO errors or warnings related to our changes

### Expected Results:

- [ ] **ZERO debug messages visible in UI**
- [ ] Clean, professional appearance
- [ ] Only user-facing messages shown
- [ ] Console logs still work (check F12 console for debug info)

---

## 🧪 TEST 7: Error Handling & Rollback

**Goal:** Verify graceful error handling when APIs fail

### Simulate Todoist API Failure:

1. [ ] Disconnect from internet OR block Todoist API in DevTools
2. [ ] Try to complete an overdue task
3. [ ] Expected: Error toast but local DB still updates
4. [ ] Reconnect and verify: Changes persisted locally even though Todoist failed

### Simulate Database Failure:

This is harder to test without mocking, but the code includes:
- Optimistic updates for instant feedback
- Rollback on DB errors
- Error toasts to inform user

---

## 🧪 TEST 8: Gamification Integration

**Goal:** Verify streak/stats update on task completion

### Steps:

1. [ ] Complete an overdue task (or any task)
2. [ ] Observe animations

### Expected Results:

- [ ] Confetti animation plays 🎉
- [ ] Streak display updates (if applicable)
- [ ] Progress ring updates
- [ ] Time stats update
- [ ] If milestone reached: Special toast appears

---

## 📊 Test Summary

### Bugs Fixed:

- [ ] BUG 1: ✅ Complete button works with Todoist sync
- [ ] BUG 2: ✅ Recommendations panel visible
- [ ] BUG 3: ✅ Overdue actions persist after refresh
- [ ] BUG 4: ✅ "Na później" logic correct (populates when needed)
- [ ] BUG 5: ✅ NO debug messages in UI

### Overall Assessment:

- [ ] All features work as expected
- [ ] No regressions found
- [ ] UI is clean and professional
- [ ] Error handling works correctly
- [ ] Ready for production ✅

---

## 🐛 Bugs Found During Testing

**If you find any issues, document them here:**

| Bug # | Description | Severity | Steps to Reproduce |
|-------|-------------|----------|-------------------|
| 1 |  |  |  |
| 2 |  |  |  |
| 3 |  |  |  |

---

## ✅ Sign-off

**Tester:** _______________  
**Date:** _______________  
**Status:** [ ] PASS / [ ] FAIL  
**Notes:**

---

## 🔍 Additional Notes

- Test with different screen sizes (mobile, tablet, desktop)
- Test with different browsers (Chrome, Firefox, Safari)
- Test with slow network connection
- Test with many tasks (stress test)
- Test with empty task list
- Test immediately after login
- Test after long session (token expiry scenarios)

---

## 📝 Checklist Summary

**Total Tests:** 8  
**Passed:** _____ / 8  
**Failed:** _____ / 8  
**Blocked:** _____ / 8  

**Ready for Production?** [ ] YES / [ ] NO

**Approver:** _______________  
**Date:** _______________
