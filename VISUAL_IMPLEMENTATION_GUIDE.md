# Day Assistant v2 - Visual Implementation Guide

## 🎨 UI Components Added/Updated

### 1. Current Activity Box (NEW)
**Location:** Top of main view, before Queue Stats

```
┌──────────────────────────────────────────────────────────┐
│ 🎯 Aktualnie zajmujesz się:                              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ Napisać raport Q4                                        │
│ Czas: 12:34 / 45min                                      │
│                                                          │
│ Postęp                                         65%       │
│ [━━━━━━━━━━━░░░░░░░░]                                  │
│                                    [⏸ Pauza] [✓ Stop]  │
└──────────────────────────────────────────────────────────┘
```

**Break Mode:**
```
┌──────────────────────────────────────────────────────────┐
│ ☕ Przerwa                                                │
│ Odpoczywasz - zostało 12min                              │
└──────────────────────────────────────────────────────────┘
```

### 2. Energy/Focus Controls with Break Button (UPDATED)
**Location:** After WorkModeSelector

```
┌──────────────────────────────────────────────────────────┐
│ ⚡ Energia                                                │
│ [🔴 Niska] [🟡 Normalna] [🟢 Wysoka]                   │
│                                                          │
│ 🎯 Skupienie                                             │
│ [🔴 Niskie] [🟡 Normalne] [🟢 Wysokie]                 │
│                                                          │
│ [☕ Dodaj przerwę                                      ] │
└──────────────────────────────────────────────────────────┘
```

### 3. Break Timer Modal (NEW)
**Triggered by:** "Dodaj przerwę" button

```
┌──────────────────────────────────────────────────────────┐
│ ☕ Dodaj przerwę                                     [X] │
│ Wybierz długość przerwy                                  │
│                                                          │
│ [☕ 5 min]  [🍵 10 min]                                 │
│ [🥤 15 min] [🍽️ 30 min]                                │
│                                                          │
│                          [Anuluj] [☕ Rozpocznij przerwę] │
└──────────────────────────────────────────────────────────┘
```

**Active Break:**
```
┌──────────────────────────────────────────────────────────┐
│ ☕ Przerwa w toku                                    [X] │
│ Odpoczywaj - zostało jeszcze trochę czasu               │
│                                                          │
│                      14:32                               │
│           Odpoczywasz (15 min)                           │
│                                                          │
│ [━━━━━━━━━░░░░░░░░]                                    │
│                                                          │
│          [⚠️ Zakończ przerwę wcześniej]                │
└──────────────────────────────────────────────────────────┘
```

### 4. Recommendation Panel (REFACTORED)
**Location:** Right sidebar

**Before (Old):**
- Accept/Reject buttons
- Modal for reject reasons
- Complex proposal system

**After (New):**
```
┌──────────────────────────────────────────────────────────┐
│ 💡 Rekomendacje                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Zgrupuj komunikacja (3 zadania)        [✓ Zastosuj]│  │
│ │ Zmniejszysz przełączanie kontekstu                  │  │
│ │ Pewność: 85%                                        │  │
│ └────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Czas na przerwę!                       [✓ Zastosuj]│  │
│ │ Pracujesz już 2h bez przerwy. Odpoczynek           │  │
│ │ zwiększy produktywność.                             │  │
│ │ Pewność: 90%                                        │  │
│ └────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Zadanie MUST jest za trudne            [✓ Zastosuj]│  │
│ │ "Napisać raport" wymaga dużo energii (4/5),        │  │
│ │ a masz tylko 2/5                                    │  │
│ │ Pewność: 75%                                        │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## 🔄 User Flow Examples

### Flow 1: Applying a Recommendation
1. User sees recommendation: "Zgrupuj komunikacja (3 zadania)"
2. Clicks "Zastosuj" button
3. Button shows loading: "Stosuję..."
4. API reorders tasks
5. Queue refreshes automatically
6. Toast notification: "✅ Rekomendacja zastosowana pomyślnie"
7. Decision logged to DecisionLog

### Flow 2: Taking a Break
1. User clicks "Dodaj przerwę" button
2. Modal opens with duration options
3. User selects "15 min"
4. Clicks "Rozpocznij przerwę"
5. Active task timer pauses (if running)
6. Break countdown begins
7. CurrentActivityBox shows "☕ Przerwa"
8. After 15 min: Toast "🎉 Przerwa zakończona! Czas wracać do pracy."

### Flow 3: Working with Timer
1. User clicks "Start" on a task
2. CurrentActivityBox appears at top
3. Shows task title, timer, and progress bar
4. User can pause/resume/stop
5. When completed: Timer stops, task marked complete

### Flow 4: Energy-Based Recommendations
1. User changes energy from 5 to 2 (tired)
2. `useRecommendations` hook triggers (1s debounce)
3. API generates new recommendations:
   - "Przy niskiej energii - lekkie zadania"
   - Lists 3 light tasks to prioritize
4. User clicks "Zastosuj"
5. Light tasks move to top of queue

## 🎯 Recommendation Types Generated

| Type | Trigger | Action | Example |
|------|---------|--------|---------|
| **ADD_BREAK** | >2h work time | Suggest break | "Pracujesz już 2h - czas na przerwę!" |
| **GROUP_SIMILAR** | ≥3 same context | Reorder queue | "Zgrupuj komunikacja (3 zadania)" |
| **ENERGY_MISMATCH** | Hard task + low energy | Change MUST or add break | "Zadanie MUST jest za trudne" |
| **HIGH_ENERGY** | Energy + Focus ≥ 4 | Suggest hard tasks | "Idealny moment na trudne zadania!" |
| **LOW_ENERGY** | Energy ≤ 2 | Suggest light tasks | "Przy niskiej energii - lekkie zadania" |

## 📱 Responsive Behavior

All new components are responsive:
- CurrentActivityBox: Stacks controls on mobile
- BreakTimer modal: Full-width on small screens
- EnergyFocusControls: Buttons stack vertically on mobile
- RecommendationPanel: Cards stack naturally

## 🎨 Color Scheme

- **Purple** (`bg-purple-50`, `border-purple-300`): Active task/timer
- **Green** (`bg-green-50`, `border-green-300`): Breaks
- **Blue** (`bg-blue-50`, `border-blue-200`): Recommendations
- **Amber** (`bg-amber-50`): Warnings

## ✨ Animations & Feedback

1. **Loading States:**
   - Spinner on "Stosuję..." button
   - Spinner in RecommendationPanel while fetching

2. **Progress Bars:**
   - Smooth transitions with `transition-all duration-300`
   - Color-coded by context (purple for tasks, green for breaks)

3. **Toast Notifications:**
   - Success: Green checkmark
   - Error: Red X
   - Info: Blue info icon
   - Auto-dismiss after 5 seconds

4. **Modal Animations:**
   - Fade in background overlay
   - Slide in modal content
   - Smooth close transitions

## 🔧 Integration Points

### With Existing Features:
- ✅ Works with existing task timer (`useTaskTimer`)
- ✅ Integrates with task queue system
- ✅ Uses existing WorkModeSelector
- ✅ Respects existing context filters
- ✅ Maintains decision log
- ✅ Compatible with Todoist sync

### API Endpoints Used:
- `POST /api/day-assistant-v2/recommend` - Generate recommendations
- `POST /api/day-assistant-v2/apply-recommendation` - Apply actions
- `GET /api/day-assistant-v2/dayplan` - Refresh after changes

## 🎯 Success Indicators

When testing, look for:
1. ✅ CurrentActivityBox appears when timer starts
2. ✅ Break button opens modal
3. ✅ Recommendations auto-refresh every 2 minutes
4. ✅ "Zastosuj" button reorders queue
5. ✅ Toast notifications appear
6. ✅ Progress bars animate smoothly
7. ✅ Break timer counts down
8. ✅ Energy changes trigger new recommendations
