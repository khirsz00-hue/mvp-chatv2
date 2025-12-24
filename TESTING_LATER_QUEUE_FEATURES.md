# Testing Guide: Later Queue & Overdue Tasks System

## ✅ Features Implemented

### 1. **"Na później" (Later Queue) Section**
- Collapsible section showing tasks that don't fit in available time
- Badge showing task count
- Full TaskCard with all actions

### 2. **"Pozostałe w kolejce dzisiaj" Section**
- Separate collapsible section for tasks #4+ in today's queue
- Tasks that fit in time but are beyond Top 3

### 3. **Morning Review Modal**
- Automatically shows once per day when overdue tasks exist
- Quick actions: Add to Today, Move to Tomorrow, Reschedule, Delete
- Uses localStorage to track if shown today

### 4. **Overdue Tasks Section**
- Always visible at top when overdue tasks exist
- Red border and background for urgency
- Shows days overdue for each task
- Quick actions available

### 5. **Smart Recommendations for Overdue**
- Easy overdue tasks recommended at low energy
- Task debt warning for 10+ overdue tasks
- Moderate warning for 5+ overdue tasks

### 6. **UI Improvements**
- Gradient headers (purple/pink for Top 3, blue/cyan for Recommendations)
- Smooth animations with framer-motion
- Better spacing and shadows
- Hover effects on cards
- Improved button colors

---

## 🧪 Testing Checklist

### Test 1: Later Queue Visibility
**Setup:**
1. Create 10+ tasks with estimates
2. Set work hours to ensure limited time (e.g., 9 AM - 2 PM)
3. Navigate to Day Assistant v2

**Expected Results:**
- [ ] "📋 Na później" section appears at bottom
- [ ] Badge shows correct count of tasks
- [ ] Section is collapsed by default
- [ ] Clicking header expands/collapses with smooth animation
- [ ] CaretDown icon rotates when expanding
- [ ] All later tasks are visible when expanded
- [ ] Each task has full context menu

### Test 2: Rest of Queue Section
**Setup:**
1. Ensure queue has 4+ tasks that fit in time
2. Verify Top 3 section shows first 3 tasks

**Expected Results:**
- [ ] "📋 Pozostałe w kolejce dzisiaj" section appears after Top 3
- [ ] Shows tasks #4, #5, #6, etc.
- [ ] Section is collapsible
- [ ] Tasks have queue positions (#4, #5, #6...)
- [ ] Badge shows correct count

### Test 3: Morning Review Modal
**Setup:**
1. Create 3+ overdue tasks (set due_date to yesterday or earlier)
2. Clear localStorage item `overdue_reviewed_[today's date]`
3. Refresh page

**Expected Results:**
- [ ] Modal appears automatically on page load
- [ ] Shows "🌅 Dzień dobry!" greeting
- [ ] Lists all overdue tasks with red background
- [ ] Shows "X dni temu" / "wczoraj" for each task
- [ ] "Dodaj na dziś" button works
- [ ] "Jutro" button works
- [ ] "Przenieś" button works
- [ ] "Usuń" button works
- [ ] "Przejrzę później" closes modal
- [ ] Modal doesn't reappear after refresh (same day)

### Test 4: Overdue Section Always Visible
**Setup:**
1. Have 2+ overdue tasks
2. Navigate through different parts of the app

**Expected Results:**
- [ ] Overdue section appears at top
- [ ] Red border (border-2 border-red-200)
- [ ] Red background (bg-red-50)
- [ ] Shows "⚠️ PRZETERMINOWANE" header
- [ ] Badge shows count when collapsed
- [ ] Collapsible with smooth animation
- [ ] Shows days overdue for each task
- [ ] "Dziś" button works
- [ ] "📅" (postpone) button works

### Test 5: Smart Recommendations - Overdue
**Setup:**
1. Set energy to 1-2 (low)
2. Have easy overdue task (cognitive_load ≤ 2)
3. Check recommendations panel

**Expected Results:**
- [ ] Recommendation appears: "Zacznij od łatwego przeterminowanego"
- [ ] Shows task title and cognitive load
- [ ] "Zastosuj" button reorders task to top

**Setup 2:**
1. Create 10+ overdue tasks

**Expected Results:**
- [ ] Recommendation appears: "⚠️ Duży dług zadaniowy"
- [ ] Suggests reviewing tasks
- [ ] Mentions deleting outdated tasks

### Test 6: UI Visual Improvements
**Expected Results:**
- [ ] Gradient header on "Kolejka na dziś (Top 3)" (purple to pink)
- [ ] Gradient header on "Rekomendacje" (blue to cyan)
- [ ] Gradient on "MUST (najpilniejsze)" title
- [ ] Cards have shadow effects
- [ ] Hover on cards increases shadow and changes border to purple
- [ ] Smooth fade-in animations when tasks appear
- [ ] Start button has green icon
- [ ] Better spacing (6 units between sections)
- [ ] Badges have improved colors and padding

### Test 7: Collapse/Expand Animations
**Expected Results:**
- [ ] CaretDown icon rotates smoothly when expanding
- [ ] Content fades in/out smoothly
- [ ] No layout shifts or jumps
- [ ] Smooth transitions (transition-all, duration-200)

### Test 8: Responsive Design
**Test on different screen sizes:**
- [ ] Desktop (>1024px): 2-column layout works
- [ ] Tablet (768-1024px): sections stack properly
- [ ] Mobile (<768px): all elements are accessible
- [ ] Touch targets are large enough on mobile
- [ ] Text is readable at all sizes

### Test 9: No Tasks Missing
**Critical Test:**
1. Create 20 tasks with various properties
2. Set different due dates (today, tomorrow, overdue)
3. Set different priorities and MUST flags

**Expected Results:**
- [ ] ALL tasks are visible somewhere:
  - Overdue tasks in Overdue section
  - MUST tasks in MUST section
  - Top 3 in Top 3 section
  - Tasks #4+ in "Pozostałe w kolejce"
  - Tasks beyond time in "Na później"
- [ ] No task disappears or becomes inaccessible
- [ ] Can access context menu for every task

### Test 10: Build & Production
**Commands to run:**
```bash
npm install
npx tsc --noEmit
npm run build
```

**Expected Results:**
- [ ] TypeScript compiles without errors
- [ ] Build succeeds without errors
- [ ] No console errors in browser
- [ ] All features work in production build

---

## 🎨 Visual Hierarchy Verification

Expected order (top to bottom):
1. 🔴 **PRZETERMINOWANE** (red, largest, if any)
2. 📌 **MUST (najpilniejsze)** (purple gradient, if any)
3. 📊 **Kolejka na dziś (Top 3)** (purple/pink gradient)
4. 📋 **Pozostałe w kolejce dzisiaj** (gray, if tasks #4+)
5. 📋 **Na później** (gray, if tasks beyond time)
6. 💡 **Rekomendacje** (blue/cyan gradient, sidebar)

---

## 🐛 Known Issues / Edge Cases

### Edge Case 1: Zero Available Time
- If work hours have passed, all tasks go to "Na później"
- Manual time blocks can be added to bring tasks back to queue

### Edge Case 2: Many Overdue Tasks
- Performance should be acceptable with 50+ overdue tasks
- Pagination not implemented (acceptable for MVP)

### Edge Case 3: Conflicting Recommendations
- Multiple recommendations may appear simultaneously
- This is expected behavior - user chooses which to apply

---

## 📸 Screenshots to Take

1. **Full view with all sections visible**
   - Overdue (red), MUST (purple), Top 3 (gradient), Later (gray)

2. **Later Queue expanded**
   - Show all tasks in later queue

3. **Morning Review Modal**
   - Modal with overdue tasks and action buttons

4. **Recommendations Panel**
   - Show overdue-specific recommendations

5. **Hover effects**
   - Card with hover state (increased shadow, purple border)

6. **Mobile view**
   - Responsive layout on mobile screen

---

## ✅ Success Criteria

All features must:
1. Work without console errors
2. Be accessible via keyboard
3. Have proper Polish translations
4. Animate smoothly
5. Be responsive on all screen sizes
6. Persist state correctly (localStorage for Morning Review)
7. Show all tasks (no data loss)

**Definition of Done:**
- [ ] All tests in checklist pass
- [ ] TypeScript compiles
- [ ] Build succeeds
- [ ] No console errors
- [ ] Screenshots documented
- [ ] User can accomplish all tasks in problem statement
