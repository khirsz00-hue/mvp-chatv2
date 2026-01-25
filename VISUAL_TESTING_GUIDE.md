# Visual Testing Guide - Chat Assistant Enhancements

## Purpose
This guide provides visual examples and testing instructions for the enhanced Chat Assistant UI.

## Prerequisites
- Application running (`npm run dev`)
- Authenticated user session
- Test data in database:
  - At least 5 tasks for today
  - 2-3 overdue tasks
  - Journal entries from last 7 days

## Test Scenarios

### Scenario 1: Opening the Chat Assistant

**Action**: Click the floating chat button (bottom right)

**Expected Visual**:
```
┌─────────────────────────────────────────┐
│ ✨ AI Assistant              [ _ ] [ X ]│
├─────────────────────────────────────────┤
│                                         │
│           ✨                            │
│   Zapytaj o zadania, priorytety,       │
│    dziennik lub wzorce zachowań        │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Co mam na dziś?                   │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ Jakie mam przeterminowane?        │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ Kiedy najlepszy czas na spotkanie?│ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ Nie mogę się skupić               │ │
│  └───────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│ [Type message...]            [Send ▶]  │
└─────────────────────────────────────────┘
```

**Verification Points**:
- [ ] Chat opens as modal on mobile (full screen)
- [ ] Chat opens as floating window on desktop (400x600px)
- [ ] Gradient header (cyan to blue)
- [ ] 4 suggestion buttons visible
- [ ] Input field and send button at bottom

---

### Scenario 2: Today's Tasks Query

**Action**: Type "co mam na dziś?" and send

**Expected Response**:
```
[USER MESSAGE]
┌─────────────────────────────────────────┐
│ co mam na dziś?                         │
└─────────────────────────────────────────┘

[AI RESPONSE]
┌─────────────────────────────────────────┐
│ ✨ 🎯 Dziś masz 6 zadań (3h 20min):    │
└─────────────────────────────────────────┘

[TASK CARD 1]
┌─────────────────────────────────────────┐
│ [P1] Faktury                            │
│ ⏰ 30min 📅 Dziś 💼 Admin              │
│                        [▶ Zacznij]      │
└─────────────────────────────────────────┘

[TASK CARD 2]
┌─────────────────────────────────────────┐
│ [P2] Email Pavel                        │
│ ⏰ 15min 📅 Dziś 💬 Communication      │
│                        [▶ Zacznij]      │
└─────────────────────────────────────────┘

[TASK CARD 3]
┌─────────────────────────────────────────┐
│ [P3] Fix bug #123                       │
│ ⏰ 45min 📅 Dziś 💻 IT 🧠🧠🧠🧠       │
│                        [▶ Zacznij]      │
└─────────────────────────────────────────┘

[FOOTER]
┌─────────────────────────────────────────┐
│ Reszta (3) ma niższy priorytet.         │
│ Od którego zaczniesz?                   │
└─────────────────────────────────────────┘
```

**Verification Points**:
- [ ] Task cards display with proper spacing (mt-2)
- [ ] Priority badges show correct colors:
  - P1: Red background
  - P2: Orange background
  - P3: Blue background
  - P4: Gray background
- [ ] Time estimates show ⏰ icon
- [ ] Due dates show 📅 icon
- [ ] Context type tags display (Admin, IT, etc.)
- [ ] Cognitive load shows brain emojis (1-5 🧠)
- [ ] "Zacznij" button visible and styled (cyan-blue gradient)
- [ ] Cards have hover effect (shadow increases)
- [ ] Footer text in white rounded box

---

### Scenario 3: Overdue Tasks Query

**Action**: Type "co mam przeterminowane?" and send

**Expected Response**:
```
[AI RESPONSE]
┌─────────────────────────────────────────┐
│ ✨ ⚠️ 3 przeterminowane (łącznie 1h    │
│    45min):                              │
└─────────────────────────────────────────┘

[OVERDUE CARD 1 - RED BORDER]
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [P1] [⚠️ Przeterminowane]              ┃
┃ Faktury                                 ┃
┃ ⏰ 30min 📅 20 sty 🟡 3x odłożone      ┃
┃                        [▶ Zacznij]      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

[OVERDUE CARD 2 - RED BORDER]
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [P2] [⚠️ Przeterminowane]              ┃
┃ Email Ani                               ┃
┃ ⏰ 15min 📅 21 sty 🟡 1x odłożone      ┃
┃                        [▶ Zacznij]      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Verification Points**:
- [ ] Cards have RED border (border-red-500)
- [ ] Cards have red background tint (bg-red-50)
- [ ] "Przeterminowane" badge shows (red)
- [ ] Postpone count badges show (yellow with count)
- [ ] Date shows in format "DD mmm" (e.g., "20 sty")
- [ ] Date text is red and bold (text-red-600 font-semibold)
- [ ] Visual urgency is clear

---

### Scenario 4: Emotional Support Flow

**Action**: Type "nie mogę się zebrać" and send

**Step 1 - Discovery**:
```
[AI RESPONSE]
┌─────────────────────────────────────────┐
│ ✨ 💭 Czy umiesz sprecyzować, co Cię   │
│    blokuje?                             │
└─────────────────────────────────────────┘
```

**Action**: Type "wszystko za trudne"

**Step 2 - Narrow Down**:
```
[AI RESPONSE]
┌─────────────────────────────────────────┐
│ ✨ Rozumiem. Masz 3 proste taski:      │
└─────────────────────────────────────────┘

[SIMPLE TASK 1]
┌─────────────────────────────────────────┐
│ [P3] Email Ani                          │
│ ⏰ 5min 🧠 (low)                       │
│                        [▶ Zacznij]      │
└─────────────────────────────────────────┘

[SIMPLE TASK 2]
┌─────────────────────────────────────────┐
│ [P3] Faktury                            │
│ ⏰ 10min 🧠🧠 (medium)                 │
│                        [▶ Zacznij]      │
└─────────────────────────────────────────┘

[SIMPLE TASK 3]
┌─────────────────────────────────────────┐
│ [P4] Spreadsheet update                 │
│ ⏰ 15min 🧠 (low)                      │
│                        [▶ Zacznij]      │
└─────────────────────────────────────────┘

[FOOTER]
┌─────────────────────────────────────────┐
│ Który wydaje Ci się najłatwiejszy?     │
└─────────────────────────────────────────┘
```

**Verification Points**:
- [ ] First response asks clarifying question
- [ ] Second response shows ONLY simple tasks
- [ ] Tasks have ≤30min duration
- [ ] Cognitive load ≤3 (shown as 1-3 🧠)
- [ ] Warm, empathetic tone in messages
- [ ] Footer asks actionable question

---

### Scenario 5: Meeting Scheduling Flow

**Action**: Type "kiedy najlepszy czas na spotkanie?"

**Step 1 - Ask Type**:
```
[AI RESPONSE]
┌─────────────────────────────────────────┐
│ ✨ Czego dotyczy spotkanie i jakiego   │
│    wymaga zaangażowania?                │
│    • Light (rozmowa, check-in)          │
│    • Medium (dyskusja, planning)        │
│    • High (deep work, prezentacja)      │
└─────────────────────────────────────────┘
```

**Action**: Type "light check-in"

**Step 2 - Recommendations**:
```
[AI RESPONSE]
┌─────────────────────────────────────────┐
│ ✨ 📅 W tym tygodniu nie masz żadnych  │
│    spotkań w kalendarzu.                │
│                                         │
│    Analizując Twoje zadania, proponuję:│
└─────────────────────────────────────────┘

[SLOT CARD 1]
┌─────────────────────────────────────────┐
│ Poniedziałek 10:00-11:00                │
│ 60 min • Energia: 8/10                  │
│                                      📅 │
└─────────────────────────────────────────┘

[SLOT CARD 2]
┌─────────────────────────────────────────┐
│ Wtorek 15:00-16:00                      │
│ 60 min • Energia: 7/10                  │
│                                      📅 │
└─────────────────────────────────────────┘

[SLOT CARD 3]
┌─────────────────────────────────────────┐
│ Środa - dowolnie                        │
│ 60 min • Energia: 7/10                  │
│                                      📅 │
└─────────────────────────────────────────┘

[FOOTER]
┌─────────────────────────────────────────┐
│ Który termin pasuje?                    │
└─────────────────────────────────────────┘
```

**Verification Points**:
- [ ] First response asks for meeting type
- [ ] Second response mentions calendar status
- [ ] Slot cards show day and time
- [ ] Energy level displayed (X/10)
- [ ] Calendar icon (📅) visible
- [ ] Cyan border on slot cards (border-cyan-200)
- [ ] Hover effect on cards

---

### Scenario 6: Card Click Interactions

**Action**: Click on any task card

**Expected**:
- [ ] Browser navigates to `/day-assistant-v2?task=[id]`
- [ ] Navigation uses Next.js router (no page reload)
- [ ] Smooth transition

**Action**: Click "Zacznij" button on task card

**Expected**:
- [ ] Browser navigates to `/day-assistant-v2?task=[id]&autostart=true`
- [ ] Event propagation stopped (card doesn't trigger)
- [ ] Smooth transition

---

### Scenario 7: Auto-scroll Behavior

**Action**: Send multiple messages rapidly

**Expected**:
- [ ] Chat scrolls to bottom automatically
- [ ] Scroll is smooth (behavior: 'smooth')
- [ ] Latest message always visible
- [ ] No janky scrolling behavior

**Action**: Scroll up manually, then send new message

**Expected**:
- [ ] If near bottom (< 100px from bottom): auto-scroll
- [ ] If scrolled up far: don't auto-scroll (user is reading)

---

### Scenario 8: Mobile Responsiveness

**Action**: Open chat on mobile device (< 768px width)

**Expected**:
- [ ] Chat takes full screen
- [ ] Header spans full width
- [ ] Cards stack vertically
- [ ] Touch targets are ≥44px
- [ ] Input field is easily tappable
- [ ] Send button is large enough

---

### Scenario 9: Error Handling

**Action**: Send message while offline

**Expected**:
- [ ] Error toast appears
- [ ] Message stays in input field
- [ ] Chat doesn't crash
- [ ] Can retry when back online

**Action**: Send empty message

**Expected**:
- [ ] Send button is disabled
- [ ] No API call made
- [ ] Input placeholder still visible

---

## Visual Checklist

### Colors
- [ ] P1 badge: Red (#EF4444)
- [ ] P2 badge: Orange (#F97316)
- [ ] P3 badge: Blue (#3B82F6)
- [ ] P4 badge: Gray (#6B7280)
- [ ] Overdue border: Red (#EF4444)
- [ ] Overdue background: Light red (#FEE2E2)
- [ ] Postpone badge: Yellow (#FCD34D)
- [ ] Header gradient: Cyan to Blue

### Typography
- [ ] Card title: font-semibold text-sm
- [ ] Metadata: text-xs
- [ ] AI message: text-sm
- [ ] User message: text-sm

### Spacing
- [ ] Card padding: p-4
- [ ] Card margin-top: mt-2
- [ ] Message spacing: space-y-3
- [ ] Button padding: px-3 py-1

### Interactions
- [ ] Card hover: shadow-lg
- [ ] Button hover: scale-105
- [ ] Smooth transitions: transition-all
- [ ] Cursor pointer on clickable items

---

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Performance Checks

- [ ] Cards render without lag (< 100ms)
- [ ] Scroll is smooth (60fps)
- [ ] No memory leaks (check DevTools)
- [ ] No console errors
- [ ] No layout shifts (CLS)

---

## Accessibility

- [ ] Keyboard navigation works
- [ ] Screen reader announces cards
- [ ] Focus indicators visible
- [ ] Contrast ratios meet WCAG AA
- [ ] Touch targets ≥44px

---

## Screenshot Checklist

For documentation, capture:
1. [ ] Chat initial state (empty)
2. [ ] Task cards display
3. [ ] Overdue tasks with red borders
4. [ ] Emotional support flow (2-3 steps)
5. [ ] Meeting scheduling flow
6. [ ] Mobile view
7. [ ] Card hover state
8. [ ] Error state

---

## Known Limitations

1. **Calendar Integration**: Not yet implemented (shows "Brak integracji")
2. **Work Start Time**: Uses default 9:00 (not learned from journal)
3. **Meeting Slot Logic**: Simplified (checks task density only)
4. **Rate Limiting**: Client-side only (2s between messages)

These are documented as TODO items and don't affect core functionality.

---

## Troubleshooting

### Cards Don't Show
- Check: Are tasks returned from API?
- Check: Does task have all required fields (id, title, priority, estimate_min)?
- Check: Console for errors

### Navigation Not Working
- Check: Is Next.js router available?
- Check: Console for navigation errors
- Check: URL format is correct

### Styling Issues
- Check: Tailwind classes are correct
- Check: CSS is built (npm run dev)
- Check: No conflicting styles

---

**Testing Status**: ⏳ Pending manual verification
**Blocked by**: Requires authenticated session with test data
