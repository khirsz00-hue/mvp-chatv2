# Day Assistant V2 - Visual Feature Guide

## UI Components Overview

### 1. Current Activity Box (When Timer Active)

**Location:** Top of the page, sticky header
**Component:** `CurrentActivityBox.tsx`

```
┌───────────────────────────────────────────────────────────────┐
│  🎯 Aktualnie zajmujesz się:                                   │
│                                                                 │
│  Fix authentication bug in login flow                          │
│                                                                 │
│  Czas: 15:23 / 30min                                           │
│                                                                 │
│  Postęp                                              51%        │
│  [████████████████████████░░░░░░░░░░░░░░░░░░░░░░]             │
│                                                                 │
│  [⏸️ Pauza]  [⏹️ Stop]  [✅ Ukończone]                         │
└───────────────────────────────────────────────────────────────┘
```

**Visual Styling:**
- Purple gradient background (#F3E8FF - purple-50)
- Bold purple border (#C084FC - purple-300)
- Shadow for elevation
- Responsive buttons

**States:**
- **Active**: Shows elapsed time, progress bar, Pause button
- **Paused**: Shows paused indicator, Resume button
- **Break**: Shows coffee emoji, remaining break time

---

### 2. "Dodaj przerwę" Button

**Location:** Below work mode selector, above queue stats
**File:** `DayAssistantV2View.tsx` lines 1057-1066

```
┌───────────────────────────────────────────────────┐
│                                                   │
│  ☕ Dodaj przerwę                                 │
│                                                   │
└───────────────────────────────────────────────────┘
```

**Visual Styling:**
- Full width button
- Light green border (#86EFAC - green-300)
- Green hover effect (#F0FDF4 - green-50)
- Coffee icon (20px)

---

### 3. Break Timer Modal

**Component:** `BreakTimer.tsx`
**Triggered by:** "Dodaj przerwę" button

#### Selection State:
```
┌─────────────────────────────────────────────────┐
│  ☕ Dodaj przerwę                            [X] │
│  Wybierz długość przerwy                        │
│                                                  │
│  ┌──────────┐  ┌──────────┐                     │
│  │    ☕    │  │    🍵    │                     │
│  │  5 min   │  │  10 min  │                     │
│  └──────────┘  └──────────┘                     │
│                                                  │
│  ┌──────────┐  ┌──────────┐                     │
│  │    🥤    │  │    🍽️    │                     │
│  │  15 min  │  │  30 min  │   (SELECTED)        │
│  └──────────┘  └──────────┘                     │
│                                                  │
│             [Anuluj] [☕ Rozpocznij przerwę]     │
└─────────────────────────────────────────────────┘
```

#### Active Timer State:
```
┌─────────────────────────────────────────────────┐
│  ☕ Przerwa w toku                           [X] │
│  Odpoczywaj - zostało jeszcze trochę czasu     │
│                                                  │
│                  29:45                          │
│                                                  │
│         Odpoczywasz (30 min)                    │
│                                                  │
│  Progress: [████████████████████░░░░░░]  99%    │
│                                                  │
│       [Zakończ przerwę wcześniej]               │
└─────────────────────────────────────────────────┘
```

**Visual Styling:**
- White background with shadow
- Rounded corners (rounded-2xl)
- Grid layout for duration buttons
- Large countdown timer (text-6xl)
- Animated progress bar

---

### 4. Recommendation Panel

**Location:** Right sidebar
**Component:** `RecommendationPanel.tsx`

```
┌───────────────────────────────────────────────────┐
│  Rekomendacje                                     │
├───────────────────────────────────────────────────┤
│                                                   │
│  ┌───────────────────────────────────────────┐   │
│  │ Zmień kolejność zadań                     │   │
│  │                                           │   │
│  │ Zacznij od "Fix bug" - jest pilne i      │   │
│  │ pasuje do Twojej obecnej energii         │   │
│  │                                           │   │
│  │ Pewność: 85%                              │   │
│  │                              [✓ Zastosuj] │   │
│  └───────────────────────────────────────────┘   │
│                                                   │
│  ┌───────────────────────────────────────────┐   │
│  │ Dodaj przerwę 15 min                      │   │
│  │                                           │   │
│  │ Pracujesz już 2h - czas na krótką         │   │
│  │ przerwę dla lepszej produktywności        │   │
│  │                                           │   │
│  │ Pewność: 92%                              │   │
│  │                              [✓ Zastosuj] │   │
│  └───────────────────────────────────────────┘   │
│                                                   │
└───────────────────────────────────────────────────┘
```

**Visual Styling:**
- Blue background (#EFF6FF - blue-50)
- Blue border (#BFDBFE - blue-200)
- Green "Zastosuj" button (#059669 - green-600)
- Loading spinner when applying
- Checkmark when applied

**Button States:**
1. **Default**: "✓ Zastosuj" (green background)
2. **Loading**: Spinner + "Stosuję..."
3. **Applied**: Checkmark + "Zastosowano" (disabled)

---

### 5. Queue Display (With Current Task)

```
┌───────────────────────────────────────────────────────────┐
│  📊 KOLEJKA NA DZIŚ (8h 0min dostępne)      [➕ Dodaj czas]│
│                                                            │
│  ⏱️ Wykorzystane: 3h 45min / 8h 0min              47%      │
│  [███████████████████░░░░░░░░░░░░░]                       │
│                                                            │
│  📋 3 tasków pozostaje na później                          │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  📌 MUST (najpilniejsze) — 2/3                            │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  #1  [MUST]  Fix authentication bug                       │
│              Estymat: 30 min • Load 4 • Przeniesienia: 0  │
│              [▶ Start]  [⋮]                                │
│                                                            │
│  #2  [MUST]  Update documentation                         │
│              Estymat: 45 min • Load 2 • Przeniesienia: 1  │
│              [▶ Start]  [⋮]                                │
│                                                            │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  📊 Kolejka na dziś (Top 3) — 3 zadań                     │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  #3  [deep_work]  Implement new feature                   │
│      Estymat: 120 min • Load 5 • Przeniesienia: 0         │
│      [▶ Start]  [⋮]                                        │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

**Visual Styling:**
- Purple border for MUST tasks (#C084FC)
- Green border for #1 (highest priority)
- Blue border for #2
- Purple border for #3
- Gray for rest
- Badge colors: MUST (purple), context types (gray)

---

## Color Palette

### Primary Colors
- **Purple** (#9333EA): Primary brand color, MUST badges
- **Green** (#059669): Success, #1 priority, break buttons
- **Blue** (#2563EB): Info, #2 priority, recommendations
- **Orange** (#EA580C): Warnings, overdue tasks

### Background Colors
- **Purple-50** (#F3E8FF): Active timer box
- **Blue-50** (#EFF6FF): Recommendation cards
- **Green-50** (#F0FDF4): Break button hover
- **Amber-50** (#FFFBEB): Warnings

### Border Colors
- **Purple-300** (#C084FC): Active timer, MUST tasks
- **Green-300** (#86EFAC): Break button
- **Blue-200** (#BFDBFE): Recommendations
- **Gray-200** (#E5E7EB): Default cards

---

## Icons Used

- 🎯 Current activity
- ☕ Break / Coffee
- ⏸️ Pause
- ▶️ Resume / Start
- ⏹️ Stop
- ✅ Complete / Check
- 📌 MUST / Pinned
- 📊 Queue / Stats
- 💡 Light bulb (suggestions)
- 🔼 Collapse
- 👁️ Show/Expand
- ⚡ Energy
- 🎯 Focus

---

## Responsive Behavior

### Desktop (>1024px)
- Two-column layout: Main content (2fr) | Sidebar (1fr)
- Current Activity Box: Full width, sticky
- Recommendations: Fixed sidebar

### Tablet (768px - 1024px)
- Single column layout
- Current Activity Box: Full width
- Recommendations: Below main content

### Mobile (<768px)
- Single column, stacked
- Buttons: Full width
- Controls: Horizontal scroll if needed
- Modal: Full screen overlay

---

## Accessibility

### Keyboard Navigation
- `Tab`: Navigate through interactive elements
- `Enter/Space`: Activate buttons
- `Esc`: Close modals

### Screen Readers
- Semantic HTML (header, main, aside)
- ARIA labels on icon buttons
- Status announcements for timer changes
- Role="progressbar" for progress indicators

### Focus Indicators
- Visible focus ring on all interactive elements
- Focus trap in modals
- Skip to content link

---

## Animation & Transitions

### Progress Bars
- Smooth width transition (duration-300)
- Color change on completion

### Button States
- Hover: Scale 1.02, shadow increase
- Active: Scale 0.98
- Disabled: Opacity 0.5, cursor not-allowed

### Modal
- Fade in/out: opacity transition
- Scale in: from 0.95 to 1
- Backdrop blur: blur(4px)

### Timer Countdown
- Number flip animation
- Pulse on last 10 seconds
- Color change: green → yellow → red

---

## Toast Notifications

### Success (Green)
```
┌──────────────────────────────────┐
│  ✅ Rekomendacja zastosowana     │
│     pomyślnie                    │
└──────────────────────────────────┘
```

### Error (Red)
```
┌──────────────────────────────────┐
│  ❌ Nie udało się zastosować      │
│     rekomendacji                 │
└──────────────────────────────────┘
```

### Info (Blue)
```
┌──────────────────────────────────┐
│  ℹ️  Timer zatrzymany             │
└──────────────────────────────────┘
```

**Position:** Top-right
**Duration:** 3-5 seconds
**Dismissible:** Click or auto-dismiss

---

## State Indicators

### Loading States
```
[⟳ Stosuję...]  (spinner + text)
[⟳]             (icon only for compact)
```

### Success States
```
[✓ Zastosowano]  (checkmark + text)
[✓]              (icon only for compact)
```

### Empty States
```
Brak aktywnych rekomendacji
Brak zadań do wykonania 🎉
```

---

## Interactive Elements

### Primary Actions
- Large buttons (px-4 py-2 or larger)
- High contrast (purple-600 on white)
- Prominent placement

### Secondary Actions
- Outline buttons
- Lower contrast (gray-600 border)
- Smaller size

### Tertiary Actions
- Ghost buttons (no border)
- Icon-only or minimal text
- Subtle hover effect

---

This visual guide complements the technical documentation and provides a reference for UI implementation and testing.
