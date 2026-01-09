# Morning Brief - Visual Guide

## 🎨 UI Overview

This document provides a visual description of the Morning Brief feature UI.

## 📱 Main Layout

### Header Section
```
┌─────────────────────────────────────────────────────────────┐
│ ← Powrót                                     🔄 Odśwież      │
│                                                               │
│ 🌅 Poranny Brief                                             │
│    Twoje codzienne podsumowanie                              │
│                                                               │
│ ▶ Odtwórz dzień                                              │
│                                                               │
│ [ 👁 Ukryj wczoraj ]  [ 🎯 Tylko dzisiaj ]                   │
└─────────────────────────────────────────────────────────────┘
```

### Statistics Card
```
┌─────────────────────────────────────────────────────────────┐
│ Statystyki                                                    │
│                                                               │
│ Wczoraj                                      5/8 zadań       │
│ ████████████░░░░░░                          62% ukończonych  │
│                                                               │
│ Dzisiaj                                      6 zadań          │
│ ┌──────────────┐  ┌──────────────┐                          │
│ │      3       │  │      3       │                           │
│ │ Wysoki       │  │ Normalny     │                           │
│ │ priorytet    │  │ priorytet    │                           │
│ └──────────────┘  └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### Focus Task Highlight (when available)
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Sugerowane zadanie focus                                  │
│                                                               │
│ Ukończyć prezentację dla klienta                            │
│ Termin: 2026-01-10                                          │
└─────────────────────────────────────────────────────────────┘
```
**Colors**: Amber/Orange gradient background (from-amber-50 to-orange-50)

### Yesterday's Tasks Card (collapsible)
```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Wczoraj                                                   │
│    Ostatnio pracowałeś nad: Napisać raport tygodniowy       │
│                                                               │
│ ● Napisać raport tygodniowy                                 │
│   2026-01-08                                                 │
│                                                               │
│ ● Zrobić zakupy                                             │
│   2026-01-08                                                 │
│                                                               │
│ ● Przeczytać dokumentację                                   │
│   2026-01-08                                                 │
└─────────────────────────────────────────────────────────────┘
```
**Priority Dots**:
- 🔴 Red dot = Priority 1 (highest)
- 🟠 Orange dot = Priority 2
- 🔵 Blue dot = Priority 3
- ⚪ Gray dot = Priority 4 (lowest)

### Today's Tasks Card
```
┌─────────────────────────────────────────────────────────────┐
│ 🕐 Dzisiaj                                                   │
│    6 zadań do zrobienia                                      │
│                                                               │
│ ● Ukończyć prezentację dla klienta                         │
│   2026-01-09                                                 │
│                                                               │
│ ● Spotkanie z zespołem o 14:00                             │
│   2026-01-09                                                 │
│                                                               │
│ ● Sprawdzić e-maile                                         │
│   2026-01-09                                                 │
└─────────────────────────────────────────────────────────────┘
```

### ADHD Tips Card
```
┌─────────────────────────────────────────────────────────────┐
│ 💡 Wskazówki na dziś                                         │
│                                                               │
│ • Zacznij od najprostszego zadania, aby nabrać rozpędu      │
│ • Użyj timera (technika Pomodoro) - 25 minut pracy,        │
│   5 minut przerwy                                            │
│ • Jeśli czujesz się przytłoczony, podziel zadanie na        │
│   mniejsze kroki                                             │
│ • Pamiętaj o przerwach - twój mózg potrzebuje odpoczynku    │
└─────────────────────────────────────────────────────────────┘
```
**Colors**: Blue tint (bg-blue-50, border-blue-200)

## 🎨 Color Palette

### Brand Colors
- **Amber/Orange**: Main theme color (text-amber-500, text-orange-500)
- **Purple**: Links and accents (text-purple-500)
- **Green**: Completed tasks (text-green-500, bg-green-500)
- **Blue**: Tips and info (text-blue-500, bg-blue-50)

### Priority Colors
- **Priority 1**: Red (bg-red-500)
- **Priority 2**: Orange (bg-orange-500)
- **Priority 3**: Blue (bg-blue-500)
- **Priority 4**: Gray (bg-gray-400)

### Background & Borders
- **Cards**: White with soft shadow (bg-white, shadow-soft)
- **Hover**: Light gray (hover:bg-gray-100)
- **Borders**: Light gray (border-gray-200)

## 🔊 TTS Player States

### Initial State (Not Playing)
```
┌──────────────────────────┐
│ ▶ Odtwórz dzień         │
└──────────────────────────┘
```

### Playing State
```
┌──────────────────────────┬──────────────────┐
│ ⏸ Pauza                 │  ⏹ Stop         │
└──────────────────────────┴──────────────────┘
```

### Paused State
```
┌──────────────────────────┬──────────────────┐
│ ▶ Wznów                  │  ⏹ Stop         │
└──────────────────────────┴──────────────────┘
```

## 📐 Responsive Breakpoints

### Desktop (>= 1024px)
- Full sidebar visible
- Cards in single column, max-width 4xl (896px)
- All features visible

### Tablet (768px - 1023px)
- Sidebar toggleable
- Cards stack vertically
- Buttons remain full-size

### Mobile (< 768px)
- Sidebar hidden by default (toggle button)
- Cards full-width with padding
- Statistics grid adjusts (2 columns instead of 4)
- Buttons stack vertically if needed

## 🎯 Interactive Elements

### Buttons
- **Size**: Large (lg) - px-6 py-3 text-lg
- **Hover**: Background change with transition
- **Active**: Visual feedback (border, shadow)
- **Disabled**: Opacity 50%, cursor not-allowed

### Cards
- **Padding**: 6 units (p-6 = 1.5rem)
- **Radius**: Extra large (rounded-xl)
- **Shadow**: Soft shadow (shadow-soft)
- **Hover**: Subtle background change on task items

### Task Items
- **Background**: Gray 50 (bg-gray-50)
- **Hover**: Gray 100 (hover:bg-gray-100)
- **Padding**: 3 units (p-3)
- **Gap**: 3 units between elements

## 📊 Visual Hierarchy

### Level 1: Page Title
- **Size**: 4xl (text-4xl = 2.25rem)
- **Weight**: Bold (font-bold)
- **Color**: Gradient (amber-500 to orange-500)

### Level 2: Section Titles
- **Size**: 2xl (text-2xl = 1.5rem)
- **Weight**: Bold
- **Color**: Default text

### Level 3: Card Titles
- **Size**: lg (text-lg = 1.125rem)
- **Weight**: Semibold
- **Color**: Default text

### Body Text
- **Size**: Base (text-base = 1rem)
- **Weight**: Medium or Regular
- **Color**: Gray-700 for main, Gray-600 for secondary

## 🎭 Icons

All icons from `@phosphor-icons/react`:
- **SunHorizon**: Main feature icon (sidebar)
- **ArrowLeft**: Back button
- **ArrowsClockwise**: Refresh button
- **Play/Pause/Stop**: TTS controls
- **Target**: Focus task indicator
- **Eye/EyeSlash**: Toggle yesterday visibility
- **CheckCircle**: Yesterday section (filled)
- **Clock**: Today section (filled)

## 🌈 Empty States

### No Todoist Token
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Nie udało się załadować danych                           │
│                                                               │
│ Musisz połączyć konto Todoist, aby korzystać z              │
│ Porannego Briefu                                             │
│                                                               │
│ [ Spróbuj ponownie ]                                         │
└─────────────────────────────────────────────────────────────┘
```

### No Tasks Yesterday
```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Wczoraj                                                   │
│                                                               │
│ Brak ukończonych zadań wczoraj                              │
└─────────────────────────────────────────────────────────────┘
```

### No Tasks Today
```
┌─────────────────────────────────────────────────────────────┐
│ 🕐 Dzisiaj                                                   │
│    0 zadań do zrobienia                                      │
│                                                               │
│ Brak zadań na dziś                                          │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 Design Philosophy

### ADHD-Friendly Principles
1. **Minimal Cognitive Load**: Most important info first
2. **Clear Visual Hierarchy**: Size, color, and spacing guide the eye
3. **Large Touch Targets**: Easy to interact with
4. **Progress Indicators**: Visual feedback on completion
5. **Quick Actions**: One-click toggles for different views
6. **Helpful Context**: Tips and suggestions without overwhelming

### Accessibility
- **Contrast**: All text meets WCAG AA standards
- **Focus States**: Visible focus rings on interactive elements
- **Semantic HTML**: Proper heading hierarchy
- **ARIA Labels**: Where appropriate for screen readers
- **Keyboard Navigation**: All interactive elements accessible via keyboard
