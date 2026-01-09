# Morning Brief - Testing Guide

## 🧪 Manual Testing Checklist

### Prerequisites
- [ ] User is logged in to the application
- [ ] User has connected Todoist account (token in localStorage)
- [ ] User has some tasks in Todoist (both completed yesterday and scheduled for today)

### Test 1: Access Morning Brief
**Steps:**
1. Navigate to the home page
2. Look at the sidebar
3. Find "Poranny Brief" with sun icon (below "AI Insights")
4. Click on "Poranny Brief"

**Expected Result:**
- ✅ Page loads successfully
- ✅ URL changes to `/morning-brief`
- ✅ Header shows "Poranny Brief" with sunrise icon
- ✅ Loading spinner appears briefly if data is being fetched

### Test 2: View Yesterday's Tasks
**Steps:**
1. On Morning Brief page, scroll to "Wczoraj" section
2. Verify completed tasks from yesterday are displayed
3. Check if "Last activity" subtitle is shown
4. Click "Ukryj wczoraj" button

**Expected Result:**
- ✅ Yesterday section shows completed tasks from previous day
- ✅ Last active task is mentioned in subtitle (if available)
- ✅ Tasks have priority-colored dots (red, orange, blue, gray)
- ✅ Clicking "Ukryj wczoraj" hides the section

### Test 3: View Today's Tasks
**Steps:**
1. Scroll to "Dzisiaj" section
2. Verify tasks scheduled for today are displayed
3. Check task sorting (high priority first)
4. Look for the Focus Task highlight

**Expected Result:**
- ✅ Today section shows tasks with due date = today
- ✅ Tasks are sorted by priority (1-4)
- ✅ Focus Task card appears above (amber/orange gradient)
- ✅ Focus Task shows highest priority incomplete task

### Test 4: Statistics Panel
**Steps:**
1. Look at the "Statystyki" card
2. Check yesterday's completion rate and progress bar
3. Check today's task count
4. Verify high priority vs normal priority breakdown

**Expected Result:**
- ✅ Yesterday stats show: X/Y zadań and completion percentage
- ✅ Progress bar fills proportionally to completion rate
- ✅ Today shows total task count
- ✅ Grid shows high priority count vs normal priority count

### Test 5: Text-to-Speech (TTS)
**Steps:**
1. Look for "Odtwórz dzień" button
2. Click the button
3. Listen to the speech
4. Click "Pauza" during playback
5. Click "Wznów" to resume
6. Click "Stop" to cancel

**Expected Result:**
- ✅ Speech starts in Polish language
- ✅ Button changes to "Pauza" and "Stop" during playback
- ✅ Speech summarizes: yesterday's count, last task, today's count, focus task
- ✅ Pause works and shows "Wznów" button
- ✅ Stop cancels speech and resets to "Odtwórz dzień"

### Test 6: Quick Actions
**Steps:**
1. Click "Tylko dzisiaj" button
2. Verify yesterday section is hidden
3. Click "Ukryj wczoraj" / "Pokaż wczoraj" toggle
4. Click "Odśwież" button

**Expected Result:**
- ✅ "Tylko dzisiaj" hides yesterday section
- ✅ Toggle button switches between hide/show
- ✅ Refresh button fetches fresh data
- ✅ Loading indicator appears briefly during refresh

### Test 7: Caching Behavior
**Steps:**
1. Load Morning Brief page (first visit today)
2. Note the loading time
3. Navigate away and come back
4. Note the loading time again
5. Open browser DevTools > Console
6. Check for cache messages

**Expected Result:**
- ✅ First load fetches from API (slower)
- ✅ Second load uses cache (instant)
- ✅ Console shows: "✅ [useMorningBrief] Using cached data from today"
- ✅ Cache persists across browser tabs

### Test 8: Empty States
**Steps:**
1. Test with no completed tasks yesterday
2. Test with no tasks scheduled for today
3. Test with no Todoist token (logout or clear localStorage)

**Expected Result:**
- ✅ Yesterday: "Brak ukończonych zadań wczoraj"
- ✅ Today: "Brak zadań na dziś"
- ✅ No token: Error message with helpful instructions

### Test 9: Error Handling
**Steps:**
1. Disable network in DevTools
2. Try to refresh data
3. Re-enable network
4. Click "Spróbuj ponownie" button

**Expected Result:**
- ✅ Error message appears when network fails
- ✅ "Spróbuj ponownie" button is shown
- ✅ Retry successfully fetches data when network restored

### Test 10: Responsive Design
**Steps:**
1. Test on desktop (> 1024px width)
2. Resize browser to tablet size (768px - 1023px)
3. Resize to mobile size (< 768px)
4. Check sidebar visibility
5. Check button layout
6. Check card stacking

**Expected Result:**
- ✅ Desktop: Full width cards, max-width 4xl
- ✅ Tablet: Cards stack, sidebar toggleable
- ✅ Mobile: Full-width cards, buttons stack if needed
- ✅ All text remains readable at all sizes

### Test 11: Accessibility
**Steps:**
1. Navigate using only keyboard (Tab, Enter, Escape)
2. Check focus indicators on buttons
3. Test with screen reader (if available)
4. Check color contrast

**Expected Result:**
- ✅ All interactive elements accessible via keyboard
- ✅ Visible focus rings on focused elements
- ✅ Semantic HTML structure
- ✅ Sufficient color contrast (WCAG AA)

### Test 12: Back Navigation
**Steps:**
1. From Morning Brief, click "Powrót" button
2. Verify return to previous page

**Expected Result:**
- ✅ Returns to previous page (usually home)
- ✅ Navigation history works correctly

## 🐛 Known Limitations

1. **TTS Browser Support**: Not all browsers support Polish TTS voices
2. **Cache Invalidation**: Only invalidates at midnight or manual refresh
3. **Completed Tasks**: Only shows recently completed (API limit)
4. **API Rate Limits**: Multiple refreshes may hit Todoist rate limits

## 📊 Test Data Requirements

For comprehensive testing, ensure test account has:
- At least 3-5 completed tasks from yesterday
- At least 5-8 tasks scheduled for today
- Mix of priority levels (1-4)
- Some tasks with due dates, some without
- Tasks with different labels/projects

## 🔍 Console Logs to Monitor

Expected console outputs:
```
🔍 [useMorningBrief] Fetching morning brief data
🔍 [Recap/Summary] Generating daily summary
🔍 [Recap/Yesterday] Fetching tasks for date: 2026-01-08
🔍 [Recap/Today] Fetching tasks for date: 2026-01-09
✅ [Recap/Yesterday] Found X completed tasks
✅ [Recap/Today] Found Y tasks, Z high priority
✅ [Recap/Summary] Summary generated: Dzień dobry! ...
✅ [useMorningBrief] Data fetched successfully
🔊 TTS started
🔇 TTS ended
```

## ⚠️ Error Scenarios to Test

1. **No Todoist Token**
   - Remove `todoist_token` from localStorage
   - Expected: Friendly error message

2. **Invalid Token**
   - Set invalid token in localStorage
   - Expected: API error, "Spróbuj ponownie" button

3. **Network Offline**
   - Disable network in DevTools
   - Expected: Error message, retry option

4. **Empty Task List**
   - Use account with no tasks
   - Expected: Empty state messages

5. **API Timeout**
   - Simulate slow network (DevTools throttling)
   - Expected: Loading state, eventual timeout

## ✅ Success Criteria

The feature is working correctly if:
- ✅ All 12 test cases pass
- ✅ No console errors (except expected warnings)
- ✅ UI is responsive on all screen sizes
- ✅ TTS works in supported browsers
- ✅ Caching reduces API calls
- ✅ Error states are handled gracefully
- ✅ Navigation works smoothly
- ✅ Accessibility is maintained

## 📝 Reporting Issues

When reporting bugs, include:
1. Browser and version
2. Screen size / device
3. Steps to reproduce
4. Expected vs actual behavior
5. Console logs (if relevant)
6. Screenshot (if UI issue)

## 🎯 ADHD User Testing

Additional considerations for ADHD users:
- Is the information overwhelming or just right?
- Are the "quick action" buttons helpful?
- Does the TTS feature work smoothly?
- Is the focus task suggestion relevant?
- Are the tips helpful or distracting?
- How does it fit into morning routine?

## 🚀 Ready for Production

Before deploying:
- [ ] All test cases pass
- [ ] No critical bugs found
- [ ] Performance is acceptable
- [ ] Security scan passed (CodeQL)
- [ ] Documentation is complete
- [ ] User feedback is positive
