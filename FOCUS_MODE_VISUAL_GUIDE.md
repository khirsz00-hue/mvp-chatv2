# Visual Guide: Focus Mode Feature

## What Users Will See

### Before Focus Mode (Normal View)
```
┌─────────────────────────────────────────────────────────────┐
│  🎯 Aktualnie zajmujesz się:                   [FOCUS] btn  │
│  Zadanie: "Przygotować prezentację"                         │
│  Czas: 05:23 / 25min                                        │
│  Postęp: ████████░░░░░░░░░░░░░░░░░░░░ 35%                 │
│  [Pauza] [Stop] [Ukończone]                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  📋 Zadania na dziś                                          │
│  ✓ Sprawdzić emaile                                         │
│  ○ Przygotować prezentację (AKTYWNE)                        │
│  ○ Spotkanie z zespołem                                     │
└─────────────────────────────────────────────────────────────┘
```

### After Clicking FOCUS (Focus Mode Active)
```
░░░░░░░░░░░░░░░░ BACKGROUND BLURRED (blur: 12px) ░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░                                                         ░░░
░░░  ┌─────────────────────────────────────────────────┐  ░░░
░░░  │  🎯 Aktualnie zajmujesz się:      [Wyjdź] btn  │  ░░░
░░░  │  Zadanie: "Przygotować prezentację"            │  ░░░
░░░  │  Czas: 05:23 / 25min              ← SHARP!    │  ░░░
░░░  │  Postęp: ████████░░░░░░░░░░░░░░░░ 35%        │  ░░░
░░░  │  [Pauza] [Stop] [Ukończone]                   │  ░░░
░░░  └─────────────────────────────────────────────────┘  ░░░
░░░                                                         ░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░ EVERYTHING ELSE BLURRED ░░░░░░░░░░░░░░░░░

Note: Timer box stays at z-index: 90 (sharp and visible)
      Backdrop is at z-index: 80 (blurred overlay)
      Rest of page content is below (blurred behind backdrop)
```

## Focus Mode Button States

### Inactive State (Default)
```
┌──────────────┐
│ 👁 FOCUS     │  ← Purple outline, white background
└──────────────┘
Tooltip: "Włącz tryb focus - ukryje rozpraszające elementy"
```

### Active State
```
┌──────────────┐
│ 👁‍🗨 Wyjdź    │  ← Purple background, white text
└──────────────┘
Tooltip: "Wyjdź z trybu focus"
```

## Shake Animation (Every 5 Minutes)

### Normal Timer Box
```
┌─────────────────────────────┐
│  🎯 Timer Box               │
│  (stationary)               │
└─────────────────────────────┘
```

### During Shake (1.5 seconds)
```
┌─────────────────────────────┐
│  🎯 Timer Box               │  ← Moves left 2px
│  (gentle shake)             │
└─────────────────────────────┘

┌─────────────────────────────┐
│  🎯 Timer Box               │  ← Moves right 2px
│  (gentle shake)             │
└─────────────────────────────┘

... repeats 3 times (0.5s each) = 1.5s total
```

### Animation Timing
```
Time:     0s      5min     10min    15min    20min
          │        │        │        │        │
Shake:    -      [~~~]    [~~~]    [~~~]    [~~~]
               (1.5s)   (1.5s)   (1.5s)   (1.5s)
```

## CSS Classes Used

### Focus Mode Backdrop
```css
.backdrop-blur-md {
  backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.6);
  position: fixed;
  inset: 0;
  z-index: 80;
  pointer-events: none; /* Doesn't block clicks */
}
```

### Timer Box z-index
```css
/* Normal mode */
.z-10 { z-index: 10; }

/* Focus mode active */
.z-[90] { z-index: 90; }
```

### Shake Animation
```css
.focus-reminder-shake {
  animation: gentle-shake 0.5s ease-in-out 3;
  /* Translation: ±2px horizontal, 3 repetitions */
}
```

## User Experience Flow

```
1. User starts timer
   │
   ├─→ Timer box appears at top
   │
2. User clicks [FOCUS] button
   │
   ├─→ Backdrop appears (blurred)
   ├─→ Timer box stays sharp (z-90)
   ├─→ Button changes to [Wyjdź]
   │
3. Every 5 minutes
   │
   ├─→ Timer box shakes gently (3x)
   ├─→ Reminds user to stay focused
   │
4. User clicks [Wyjdź] or stops timer
   │
   └─→ Backdrop disappears
       └─→ Everything returns to normal
```

## Technical Implementation

### Component Structure
```
CurrentActivityBox
├─ FocusMode component
│  ├─ FOCUS/Wyjdź button
│  ├─ Backdrop (conditional render)
│  └─ Shake interval logic
│
└─ Timer box
   ├─ Dynamic z-index
   ├─ Shake class (conditional)
   └─ Timer controls
```

### State Management
```typescript
// In CurrentActivityBox.tsx
const [focusModeActive, setFocusModeActive] = useState(false)
const [applyShake, setApplyShake] = useState(false)

// Shake effect (every 5 minutes when focus active)
useEffect(() => {
  if (!focusModeActive) return
  
  const shakeInterval = setInterval(() => {
    setApplyShake(true)
    setTimeout(() => setApplyShake(false), 1500)
  }, 5 * 60 * 1000) // 300,000ms = 5 minutes
  
  return () => clearInterval(shakeInterval)
}, [focusModeActive])
```

## Mobile Responsiveness

The focus mode works on all screen sizes:
- **Desktop:** Full backdrop blur effect
- **Tablet:** Same effect, timer box adjusts width
- **Mobile:** Backdrop covers entire viewport, timer stays at top

## Accessibility

- **Keyboard accessible:** Focus button can be activated with Enter/Space
- **Screen readers:** Button has clear aria-label
- **Motion sensitivity:** Shake is very subtle (±2px only)
- **No sound:** Only visual feedback (respects quiet environments)

## Color Palette

```
Focus Button (Inactive):
- Border: border-purple-300
- Background: bg-white
- Text: text-gray-700
- Icon: Eye (open)

Focus Button (Active):
- Background: bg-purple-600
- Text: text-white
- Hover: hover:bg-purple-700
- Icon: EyeSlash (closed)

Backdrop:
- Background: bg-white/60 (60% opacity white)
- Blur: backdrop-blur-md (12px)

Timer Box:
- Background: bg-purple-50
- Border: border-purple-300
- Shadow: shadow-md (normal), shadow-2xl (focus mode)
```

## Performance Notes

- Backdrop uses CSS `backdrop-filter` (GPU accelerated)
- Shake animation uses `transform` (not layout-triggering properties)
- Interval cleanup on unmount prevents memory leaks
- No re-renders during shake (only class toggle)
