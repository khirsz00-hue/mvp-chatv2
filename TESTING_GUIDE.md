# Day Assistant v2 - Testing Guide

## 🧪 Manual Testing Checklist

### Prerequisites
1. Start the application: `npm run dev`
2. Navigate to Day Assistant v2 page
3. Ensure you have at least 5-6 tasks in your queue
4. Have at least 1-2 MUST tasks pinned

---

## Test Suite 1: Energy/Focus Sliders

### Test 1.1: Energy Slider Response
**Steps:**
1. Click on "Niska" energy button
2. Observe UI changes

**Expected Results:**
- ✅ "Aktualizuję..." indicator appears in top-right of controls (< 100ms)
- ✅ Button becomes disabled with reduced opacity
- ✅ Queue sections show "Przebudowuję kolejkę..." overlay
- ✅ Overlay disappears after ~300ms
- ✅ Queue order updates based on new energy level
- ✅ NO full page reload

**Pass Criteria:**
- Visual feedback appears instantly
- User sees loading state
- Queue reorders smoothly

---

### Test 1.2: Focus Slider Response
**Steps:**
1. Click on "Wysokie" focus button
2. Observe UI changes

**Expected Results:**
- ✅ Same as Test 1.1 but for focus slider
- ✅ Tasks reorder based on cognitive load vs focus level

**Pass Criteria:**
- Same as Test 1.1

---

### Test 1.3: Multiple Rapid Changes
**Steps:**
1. Quickly change energy: Niska → Wysoka → Normalna
2. Observe behavior

**Expected Results:**
- ✅ Each change shows loading indicator
- ✅ No race conditions or errors
- ✅ Final state reflects last selection
- ✅ Debouncing works (API calls are throttled)

---

## Test Suite 2: Task Actions

### Test 2.1: Complete Task
**Steps:**
1. Find a task in queue
2. Click "Oznacz jako wykonane" (or complete button)
3. Observe feedback

**Expected Results:**
- ✅ Toast notification appears: "✅ Zadanie ukończone!"
- ✅ Toast is in top-right corner
- ✅ Toast auto-dismisses after 3 seconds
- ✅ Task disappears from queue
- ✅ Queue positions renumber correctly
- ✅ NO browser alert dialog

**Pass Criteria:**
- Beautiful toast notification (not browser alert)
- Task removed from UI
- Smooth transition

---

### Test 2.2: Delete Task
**Steps:**
1. Find a task in queue
2. Click delete button (trash icon)
3. Confirm deletion in browser confirm dialog
4. Observe feedback

**Expected Results:**
- ✅ Browser confirmation dialog appears (expected)
- ✅ After confirming: Toast notification "🗑️ Zadanie usunięte"
- ✅ Task disappears from queue
- ✅ If task was in recommendations, those proposals disappear
- ✅ NO browser alert for success message

**Pass Criteria:**
- Confirmation works
- Toast shows success
- Stale recommendations removed

---

### Test 2.3: Pin Task as MUST
**Steps:**
1. Find a non-MUST task in regular queue
2. Click pin button
3. Observe changes

**Expected Results:**
- ✅ Toast notification: "📌 Przypięto jako MUST"
- ✅ Task moves to MUST section at top
- ✅ MUST section shows updated count (e.g., "2/3" → "3/3")
- ✅ Queue positions renumber

**Pass Criteria:**
- Task moves to MUST section
- Toast confirms action
- Visual update is smooth

---

### Test 2.4: Pin Task When Limit Reached
**Steps:**
1. Ensure you have 3 MUST tasks already
2. Try to pin another task
3. Observe feedback

**Expected Results:**
- ✅ Toast warning: "Maksymalnie 3 zadania MUST! Odepnij coś najpierw."
- ✅ Task does NOT get pinned
- ✅ Warning toast is orange/yellow
- ✅ NO browser alert

**Pass Criteria:**
- Warning toast appears
- Limit is enforced
- User understands why it failed

---

### Test 2.5: Unpin MUST Task
**Steps:**
1. Find a MUST task
2. Click unpin button
3. Observe changes

**Expected Results:**
- ✅ Toast notification: "📌 Odpięto z MUST"
- ✅ Task moves to regular queue
- ✅ MUST section count decreases (e.g., "3/3" → "2/3")
- ✅ Task gets appropriate queue position

---

## Test Suite 3: Queue Structure

### Test 3.1: MUST Section Display
**Steps:**
1. Ensure you have 1-3 MUST tasks
2. Observe MUST section

**Expected Results:**
- ✅ Section title: "📌 MUST (najpilniejsze) — X/3"
- ✅ Purple/branded border around section
- ✅ MUST tasks show at top of page
- ✅ Tasks numbered #1, #2, #3...

**Visual Check:**
```
┌─────────────────────────────────┐ ← Purple border
│ 📌 MUST (najpilniejsze) — 2/3  │
│ ├─ #1 First MUST task          │
│ └─ #2 Second MUST task         │
└─────────────────────────────────┘
```

---

### Test 3.2: Top 3 Section Display
**Steps:**
1. Ensure you have non-MUST tasks
2. Scroll to Top 3 section

**Expected Results:**
- ✅ Section title: "📊 Kolejka na dziś (Top 3) — 3 zadań"
- ✅ Shows top 3 non-MUST tasks
- ✅ Tasks continue numbering after MUST (e.g., #3, #4, #5)
- ✅ Standard border (not purple)

---

### Test 3.3: Expandable Queue
**Steps:**
1. Ensure you have more than 3 non-MUST tasks
2. Find "Pokaż pozostałe zadania" button
3. Click to expand
4. Click to collapse

**Expected Results:**
- ✅ Button shows: "👁️ Pokaż pozostałe zadania (X zadań)"
- ✅ Clicking expands to show all remaining tasks
- ✅ Button changes to: "🔼 Zwiń kolejkę"
- ✅ Clicking again collapses section
- ✅ Smooth expand/collapse animation

---

### Test 3.4: Empty Queue State
**Steps:**
1. Complete or postpone all tasks
2. Observe empty state

**Expected Results:**
- ✅ Message: "Brak zadań w kolejce"
- ✅ Message is centered and styled appropriately
- ✅ No JavaScript errors

---

## Test Suite 4: Loading Indicators

### Test 4.1: Queue Reordering Overlay
**Steps:**
1. Change energy or focus slider
2. Watch queue sections

**Expected Results:**
- ✅ Semi-transparent overlay appears over queue cards
- ✅ Overlay shows: "⏳ Przebudowuję kolejkę..."
- ✅ Overlay has backdrop blur effect
- ✅ Overlay disappears after brief moment
- ✅ Tasks underneath are dimmed/less visible during overlay

**Visual Check:**
```
┌─────────────────────────────────┐
│ 📊 Kolejka na dziś (Top 3)     │
│ ┌───────────────────────────┐  │
│ │ ⏳ Przebudowuję kolejkę...│  │ ← Semi-transparent
│ └───────────────────────────┘  │
│ ├─ #3 Task C (dimmed)         │
└─────────────────────────────────┘
```

---

### Test 4.2: Energy/Focus Controls Indicator
**Steps:**
1. Click energy or focus button
2. Observe controls area

**Expected Results:**
- ✅ "Aktualizuję...⏳" appears in top-right corner
- ✅ Text is small and unobtrusive
- ✅ Spinner icon animates
- ✅ Buttons are disabled during update
- ✅ Indicator disappears when done

---

## Test Suite 5: Stale Recommendations

### Test 5.1: Delete Task in Recommendation
**Setup:**
1. Add a new task (e.g., "trening")
2. Wait for AI to generate recommendation mentioning it
3. Delete the task
4. Observe recommendations section

**Expected Results:**
- ✅ Recommendation mentioning deleted task disappears
- ✅ Toast: "🗑️ Zadanie usunięte"
- ✅ Other recommendations (not mentioning task) remain
- ✅ NO stale references to deleted task

**Pass Criteria:**
- Recommendations auto-invalidate on task delete
- User sees clean, accurate state

---

## Test Suite 6: Toast Notifications

### Test 6.1: Toast Appearance
**Steps:**
1. Perform any action (complete, delete, pin)
2. Observe toast

**Expected Results:**
- ✅ Toast appears in **top-right corner**
- ✅ Toast has beautiful styling (not browser default)
- ✅ Toast has appropriate icon (✅, 🗑️, 📌, ⚠️)
- ✅ Toast auto-dismisses after ~3 seconds
- ✅ Toast can be manually dismissed by clicking X

---

### Test 6.2: Multiple Toasts
**Steps:**
1. Quickly perform 3 actions (e.g., complete 3 tasks)
2. Observe toasts

**Expected Results:**
- ✅ Toasts stack vertically
- ✅ Each toast is visible
- ✅ Oldest toast dismisses first
- ✅ No overlap or visual glitches

---

### Test 6.3: Toast Types
**Actions to Test:**
- ✅ **Success:** Complete task, pin task, unpin task
- ✅ **Error:** (Force by API failure) - Red toast with error message
- ⚠️ **Warning:** Try to pin 4th MUST task - Yellow/orange toast
- ℹ️ **Info:** (If used anywhere) - Blue toast

**Pass Criteria:**
- Each type has distinct color
- Icons are appropriate
- Messages are clear

---

## Test Suite 7: Accessibility

### Test 7.1: Keyboard Navigation
**Steps:**
1. Use Tab key to navigate through page
2. Press Enter on buttons

**Expected Results:**
- ✅ All interactive elements are focusable
- ✅ Focus indicators are visible
- ✅ Enter key triggers button actions
- ✅ Escape key closes expandable sections

---

### Test 7.2: Screen Reader
**Steps:**
1. Enable screen reader (VoiceOver, NVDA, etc.)
2. Navigate through page

**Expected Results:**
- ✅ Sections are announced clearly
- ✅ Button purposes are clear
- ✅ Loading states are announced
- ✅ Toast messages are read aloud

---

## Test Suite 8: Edge Cases

### Test 8.1: No MUST Tasks
**Setup:**
1. Unpin all MUST tasks
2. Observe page

**Expected Results:**
- ✅ MUST section does NOT appear
- ✅ Queue starts with Top 3 section
- ✅ No JavaScript errors
- ✅ Page looks clean

---

### Test 8.2: Only MUST Tasks
**Setup:**
1. Ensure only MUST tasks exist (max 3)
2. No other tasks

**Expected Results:**
- ✅ Only MUST section appears
- ✅ Top 3 section does NOT appear
- ✅ Expandable section does NOT appear
- ✅ Page looks clean

---

### Test 8.3: Exactly 3 Non-MUST Tasks
**Setup:**
1. Have exactly 3 non-MUST tasks
2. Observe sections

**Expected Results:**
- ✅ Top 3 section shows all 3 tasks
- ✅ Expandable section does NOT appear
- ✅ No "show more" button

---

## Performance Testing

### Test P1: Rapid Slider Changes
**Steps:**
1. Rapidly click between energy levels 20 times
2. Observe behavior

**Expected Results:**
- ✅ No lag or freeze
- ✅ Loading indicators appear/disappear smoothly
- ✅ Final state is correct
- ✅ No console errors

---

### Test P2: Large Queue
**Setup:**
1. Have 20+ tasks in queue
2. Change sliders

**Expected Results:**
- ✅ Reordering completes in < 1 second
- ✅ Page remains responsive
- ✅ No performance degradation

---

## Browser Compatibility

Test in these browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile Safari (iOS)
- ✅ Mobile Chrome (Android)

**Pass Criteria:**
- All features work in all browsers
- Toasts render correctly
- Loading overlays appear
- No console errors

---

## Sign-Off Checklist

Before marking complete, verify:
- [ ] All Test Suites pass
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] ESLint passes
- [ ] Visual appearance is polished
- [ ] Performance is acceptable
- [ ] Accessibility works
- [ ] Mobile responsive

---

## Known Issues / Limitations

1. **Browser Confirm:** Still uses `window.confirm()` for delete action (intentional - good UX)
2. **Full API Integration:** Zustand store created but not fully integrated (future enhancement)
3. **Legacy Toast:** Some places may still use old `showToast()` - these can be migrated gradually

---

## Reporting Issues

If you find bugs during testing:
1. Note the test number (e.g., "Test 2.3 failed")
2. Describe expected vs actual behavior
3. Include browser and OS info
4. Check browser console for errors
5. Take screenshot if visual issue

---

## Success Metrics

After testing, the app should feel:
- ⚡ **Instant** - Visual feedback in < 100ms
- 🎨 **Polished** - Beautiful toasts, smooth transitions
- 📊 **Organized** - Clear visual hierarchy
- 💪 **Confident** - User always knows what's happening
- 🚀 **Professional** - Enterprise-grade UX

**Target:** 9/10 user satisfaction with responsiveness!
