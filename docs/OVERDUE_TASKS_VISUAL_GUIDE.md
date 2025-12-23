# Overdue Tasks Management System - Visual Guide

## 🎯 Feature Overview

The Overdue Tasks Management System provides 3 levels of protection against forgotten overdue tasks:

1. **Morning Review Modal** - Daily forced review
2. **Persistent Overdue Section** - Always visible section
3. **Smart Recommendations** - AI suggestions

---

## 1️⃣ Morning Review Modal

### When It Appears
- **Once per day** at first app open
- Only if there are overdue tasks
- Tracked via localStorage: `overdue_reviewed_YYYY-MM-DD`

### Visual Layout
```
┌──────────────────────────────────────────────┐
│  🌅 Dzień dobry! Masz 2 przeterminowane      │
│     zadania                                   │
│                                               │
│  ⚠️ Przejrzyj i zdecyduj co zrobić z...      │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │ 🔴 Wysłać ofertę do klienta            │  │
│  │ Termin: wczoraj                         │  │
│  │ ⏱ 30 min  📊 Priorytet: 4              │  │
│  │                                         │  │
│  │ [✅ Dodaj na dziś] [➡️ Jutro]           │  │
│  │ [📅 Przenieś] [🗑️ Usuń]                │  │
│  └────────────────────────────────────────┘  │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │ 🔴 Zadzwonić do kontrahenta            │  │
│  │ Termin: 2 dni temu                     │  │
│  │ ⏱ 15 min  📊 Priorytet: 3              │  │
│  │                                         │  │
│  │ [✅ Dodaj na dziś] [➡️ Jutro]           │  │
│  │ [📅 Przenieś] [🗑️ Usuń]                │  │
│  └────────────────────────────────────────┘  │
│                                               │
│           [❌ Przejrzę później]               │
│   Zadania zostaną w sekcji przeterminowane   │
└──────────────────────────────────────────────┘
```

### Actions
1. **Dodaj na dziś** - Task stays in today's queue
2. **Jutro** - Moves to tomorrow
3. **Przenieś** - Reschedule (currently same as Jutro)
4. **Usuń** - Delete task permanently
5. **Przejrzę później** - Dismiss modal, tasks remain visible

### Colors
- Background: `bg-red-50` (#FEF2F2)
- Border: `border-red-200`
- Text: `text-red-900`, `text-red-700`

---

## 2️⃣ Persistent Overdue Section

### Location
Above "Kolejka na dziś" section, below Work Mode selector

### Expanded State
```
┌──────────────────────────────────────────────┐
│ ⚠️ PRZETERMINOWANE (2 zadania) [zwiń ▲]     │
│                                              │
│ ⚠️ Zadecyduj czy robić dziś                 │
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ 🔴 Wysłać ofertę                         ││
│ │ wczoraj • ⏱ 30min • 📊 P:4 • deep_work  ││
│ │                                          ││
│ │ [✅ + Dziś] [📅] [⋮]                     ││
│ └──────────────────────────────────────────┘│
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ 🔴 Zadzwonić                             ││
│ │ 2 dni temu • ⏱ 15min • 📊 P:3           ││
│ │                                          ││
│ │ [✅ + Dziś] [📅] [⋮]                     ││
│ └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

### Collapsed State
```
┌──────────────────────────────────────────────┐
│ ⚠️ PRZETERMINOWANE [! 2] [rozwiń ▼]          │
│ Masz 2 zadania wymagające uwagi              │
└──────────────────────────────────────────────┘
```

### Features
- **Badge with count**: Pulses when collapsed
- **Hover effects**: Cards get shadow on hover
- **Quick actions**: Direct buttons without extra clicks
- **Sorting**: Priority DESC → Date ASC (oldest first)

### State Persistence
- Collapsed state saved in `localStorage.overdue_section_collapsed`
- Survives page reloads
- Per-browser setting

---

## 3️⃣ Smart Recommendations

### When Generated
- Continuously in background
- Triggered by:
  - Available time slots
  - Energy/focus changes
  - New tasks added

### Single Task Recommendation
```
┌──────────────────────────────────────────────┐
│ 💡 REKOMENDACJA                              │
│                                              │
│ ⚠️ Przeterminowane zadanie wymaga uwagi     │
│                                              │
│ • Zadanie "Wysłać ofertę" jest              │
│   przeterminowane 1 dzień                   │
│ • Priorytet: 4/4                            │
│ • Warto rozważyć dodanie do kolejki na dziś │
│                                              │
│ Pewność: 85% | Wpływ: HIGH                  │
│                                              │
│ [✅ Zastosuj] [Nie, dzięki]                  │
└──────────────────────────────────────────────┘
```

### Multiple Tasks Recommendation
```
┌──────────────────────────────────────────────┐
│ 💡 REKOMENDACJA                              │
│                                              │
│ 💡 Nadrobienie zaległości                   │
│                                              │
│ • Masz 90 min wolnego czasu                 │
│ • 2 przeterminowane zadania pasują do       │
│   Twojego trybu pracy                       │
│ • Łączny czas: 45 min - wyrobisz się!      │
│                                              │
│ 1. "Wysłać ofertę" (1 dzień temu,          │
│    30min, P:4)                              │
│ 2. "Zadzwonić" (2 dni temu, 15min, P:3)    │
│                                              │
│ Pewność: 90% | Wpływ: HIGH                  │
│                                              │
│ [✅ Zastosuj] [Nie, dzięki]                  │
└──────────────────────────────────────────────┘
```

### Recommendation Logic
1. Filter overdue tasks
2. Sort by priority + age
3. Match to available time
4. Match to energy/focus mode
5. Suggest 1-3 tasks that fit

---

## 📱 Mobile Optimizations

### Morning Review Modal
- Fullscreen on mobile
- Larger touch targets
- Scrollable content
- Swipe gestures (future)

### Overdue Section
- Default: **Collapsed** on mobile
- Badge always visible
- Tap to expand
- Horizontal scroll for actions (future)

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## 🎨 Visual Design System

### Color Palette
```css
--overdue-critical: #DC2626  /* Red - >3 days */
--overdue-warning: #F59E0B   /* Orange - 1-3 days */
--overdue-bg: #FEF2F2        /* Light red bg */
--overdue-border: #FCA5A5    /* Red border */
```

### Typography
- **Section Headers**: font-semibold text-lg
- **Task Titles**: font-medium text-base
- **Metadata**: text-xs text-gray-600
- **Days Overdue**: font-medium text-red-600

### Spacing
- Section padding: p-4
- Card spacing: space-y-2, space-y-3
- Button gaps: gap-2

### Animations
```css
/* Badge Pulse */
@keyframes pulse-overdue {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

/* Collapse/Expand */
transition-all duration-300
```

---

## 🔧 Technical Implementation

### Component Hierarchy
```
DayAssistantV2View
├── MorningReviewModal (shows once daily)
│   ├── Task cards with actions
│   └── "Przejrzę później" button
├── OverdueTasksSection (persistent)
│   ├── Header (clickable to toggle)
│   └── Task cards (when expanded)
└── RecommendationPanel
    └── Overdue recommendations
```

### Data Flow
```
tasks (all) 
  → useOverdueTasks hook
    → overdueTasks (filtered & sorted)
      → MorningReviewModal
      → OverdueTasksSection
      → detectOverdueOpportunity()
        → SmartRecommendation
```

### State Management
- React useState for UI state
- localStorage for persistence
- React Query for data fetching
- Optimistic updates for actions

---

## ✅ Acceptance Criteria Status

### Morning Review ✅
- [x] Shows once daily
- [x] localStorage tracking
- [x] Quick actions
- [x] Dismissible
- [x] Mobile-friendly

### Overdue Section ✅
- [x] Always visible when tasks exist
- [x] Collapse/expand
- [x] Badge with count
- [x] Proper sorting
- [x] Quick actions
- [x] Days overdue display

### Smart Recommendations ✅
- [x] Generated for overdue tasks
- [x] Time-based matching
- [x] Energy/focus matching
- [x] One-click apply
- [x] Dismissible

### Polish Text ✅
- [x] "wczoraj", "2 dni temu"
- [x] "zadanie" / "zadania" / "zadań"
- [x] "tydzień" / "tygodnie"
- [x] Proper pluralization

---

## 🐛 Known Issues & Limitations

1. **No date picker** - Reschedule defaults to tomorrow
2. **No bulk actions** - Process tasks one by one
3. **No snooze** - Can only dismiss or process
4. **No color coding** - Age doesn't affect color intensity
5. **No swipe gestures** - Mobile uses tap only

## 🚀 Future Enhancements

1. **Date Picker Modal** for flexible rescheduling
2. **Swipe Actions** on mobile (left/right for quick actions)
3. **Bulk Selection** in morning review
4. **Age-based Colors** (red gradient based on days overdue)
5. **Weekly Summary** of overdue tasks
6. **Snooze Option** (remind in X hours)
7. **Priority Escalation** (auto-increase priority after N days)
