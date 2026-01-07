# Global AI Chat Assistant - Visual Guide

## 🎨 UI Components Overview

### 1. Floating Chat Button

```
┌─────────────────────────────────────────────┐
│                                             │
│                                    ┌──────┐ │
│                                    │  ➕  │ │ ← Add Task (Purple)
│                                    └──────┘ │
│                                             │
│                                    ┌──────┐ │
│                                    │  💬  │ │ ← Chat Assistant (Blue) **NEW**
│                                    └──────┘ │
│                                             │
│                                    ┌──────┐ │
│                                    │  🎤  │ │ ← Voice Ramble (Indigo)
│                                    └──────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

**Button Properties:**
- Size: 56×56px (w-14 h-14)
- Gradient: `from-cyan-600 to-blue-600`
- Icon: ChatCircle (phosphor-icons)
- Shadow: lg hover:xl
- Hover: scale-110
- Tooltip: "Czat z asystentem (Shift+C)"

### 2. Chat Modal - Empty State

```
┌─────────────────────────────────────────────────────────────┐
│  💬 AI Assistant                              [🗑️] [✕]      │ ← Header
│  Zadania • Dziennik • Decyzje • Wzorce                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                         👋                                  │
│                                                             │
│            Cześć! Jestem twoim AI asystentem               │
│                                                             │
│    Mogę ci pomóc z zadaniami, priorytetami, decyzjami     │
│    i analizą wzorców. Zapytaj mnie o cokolwiek!           │
│                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐     │
│  │ 📋 Jakie mam zadania  │  │ ⭐ Co jest            │     │
│  │    na dziś?           │  │    najważniejsze?     │     │ ← Quick Actions
│  └───────────────────────┘  └───────────────────────┘     │
│                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐     │
│  │ 😴 Jak spałem         │  │ 📅 Kiedy zaplanować   │     │
│  │    ostatnio?          │  │    spotkanie?         │     │
│  └───────────────────────┘  └───────────────────────┘     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────┐      │
│ │ Zapytaj o zadania, priorytety, wzorce...         │ [▶]  │ ← Input Area
│ └───────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 3. Chat Modal - With Messages

```
┌─────────────────────────────────────────────────────────────┐
│  💬 AI Assistant                              [🗑️] [✕]      │
│  Zadania • Dziennik • Decyzje • Wzorce                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🤖 [Cześć! Mogę ci pomóc z zadaniami...]                  │ ← AI Message
│     12:34                                                   │   (Gray bg)
│                                                             │
│                     [Jakie mam zadania na dziś?] 👤        │ ← User Message
│                                             12:35           │   (Purple gradient)
│                                                             │
│  🤖 [Masz 3 zadania MUST na dziś (90 min).                │
│      Twoja energia: 7/10                                   │
│      1. Task A - 30 min                                    │
│      2. Task B - 45 min                                    │
│      3. Task C - 15 min                                    │
│      Zacznij od najtrudniejszych rano! 💪]                 │
│     12:36                                                   │
│                                                             │
│                                    [Dziękuję!] 👤          │
│                                             12:37           │
│                                                             │
│  🤖 [● ● ●]  ← Loading (animated dots)                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────┐      │
│ │ Czy mam czas na nowe zadanie?                     │ [▶]  │
│ └───────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 4. Mobile View

```
┌────────────────────────┐
│ 💬 AI Assistant  [✕]  │
├────────────────────────┤
│                        │
│ 🤖 [Message...]       │
│                        │
│        [Reply...] 👤  │
│                        │
│ 🤖 [Response...]      │
│                        │
│ [● ● ●]               │
│                        │
│                        │
│                        │
├────────────────────────┤
│ [Input field...]  [▶] │
└────────────────────────┘
```

## 🎨 Color Scheme

### Chat Button
```css
Background: linear-gradient(to right, #0891b2, #2563eb)
           from-cyan-600 to-blue-600

Hover: scale(1.1) + shadow-xl
```

### User Messages
```css
Background: linear-gradient(to right, #9333ea, #ec4899)
           from-purple-600 to-pink-600
Color: white
Alignment: right
Max-width: 80%
Border-radius: 1rem (rounded-2xl)
```

### AI Messages
```css
Background: #f3f4f6 (gray-100)
Color: #111827 (gray-900)
Alignment: left
Max-width: 80%
Border-radius: 1rem (rounded-2xl)
```

### Header
```css
Background: linear-gradient(to right, #ecfeff, #dbeafe)
           from-cyan-50 to-blue-50
Border-bottom: 1px solid #e5e7eb (gray-200)
```

## 📱 Responsive Breakpoints

### Desktop (lg: 1024px+)
- Modal: Centered, max-width: 896px (4xl)
- Inset: 64px (inset-16)
- Full chat history visible

### Tablet (md: 768px+)
- Modal: Centered, max-width: 768px
- Inset: 32px (inset-8)
- Slightly narrower

### Mobile (< 768px)
- Modal: Full screen
- Inset: 16px (inset-4)
- Optimized for touch
- Larger tap targets

## 🎯 Interactive Elements

### Floating Button States
```
Normal:    w-14 h-14, shadow-lg
Hover:     scale-110, shadow-xl
Focus:     ring-2 ring-blue-500
Active:    scale-105
```

### Send Button States
```
Enabled:   Blue gradient, pointer cursor
Disabled:  Gray background, not-allowed cursor
Hover:     scale-105, shadow-lg
```

### Quick Action Buttons
```
Normal:    bg-gray-100
Hover:     bg-gray-200
Text:      text-sm, text-left
Padding:   px-4 py-3
```

## 🔄 Animations

### Loading Dots
```
3 dots bouncing with staggered delays:
- Dot 1: animationDelay: 0ms
- Dot 2: animationDelay: 150ms
- Dot 3: animationDelay: 300ms

Size: w-2 h-2
Color: bg-gray-400
```

### Auto-scroll
```
Behavior: smooth
Trigger: On new message
Target: messagesEndRef (bottom of chat)
```

### Modal Open/Close
```
Backdrop: Fade in/out (bg-black/50)
Modal: Instant display (no slide animation)
```

## ⌨️ Keyboard Interactions

### Shortcuts
- `Shift+C` - Open chat (from anywhere)
- `Enter` - Send message
- `Shift+Enter` - New line in textarea
- `ESC` - Close modal

### Input Focus
- Auto-focus on modal open (100ms delay)
- Disabled when loading
- Multi-line support with auto-resize

## 🎭 Visual Hierarchy

### Priority (Z-Index)
1. Backdrop: z-[100]
2. Modal: z-[101]
3. Floating buttons: z-50

### Layout Layers
```
[Backdrop - Dark overlay]
  └─ [Modal - White container]
       ├─ [Header - Gradient, fixed]
       ├─ [Messages - Scrollable, flex-1]
       └─ [Input - Gray bg, fixed]
```

## 🎨 Icon Usage

### Phosphor Icons
- ChatCircle (weight="fill") - Button
- X (size=24) - Close button
- Trash (size=20) - Clear chat
- PaperPlaneRight (weight="fill") - Send

### Emoji Icons
- 💬 - Chat header
- 👤 - User avatar
- 🤖 - AI avatar
- 👋 - Welcome message
- 📋, ⭐, 😴, 📅 - Quick actions

## 📏 Spacing & Sizing

### Modal
- Padding: p-6 (messages area)
- Padding: p-4 (input area)
- Gap: gap-3 (floating buttons)
- Gap: gap-4 (messages)

### Messages
- Bubble padding: px-4 py-3
- Avatar size: w-8 h-8
- Gap between avatar and bubble: gap-3

### Buttons
- Floating: w-14 h-14 (56px)
- Send: px-6 py-3
- Quick action: px-4 py-3

## 🌈 Visual Effects

### Gradients Used
```css
/* Chat Button */
from-cyan-600 to-blue-600

/* User Message */
from-purple-600 to-pink-600

/* Header Background */
from-cyan-50 to-blue-50

/* Existing Buttons */
Add Task: from-purple-600 to-pink-600
Voice: from-blue-600 to-indigo-600
```

### Shadows
```css
Button default: shadow-lg
Button hover: shadow-xl
Modal: shadow-2xl
```

## ✨ Accessibility

### ARIA Labels
- Button: "Czat z asystentem"
- Close: "Zamknij"
- Clear: "Wyczyść czat" (title)

### Focus Management
- Visible focus rings (ring-2)
- Auto-focus input on open
- Tab navigation support
- ESC key to close

### Screen Reader Support
- Semantic HTML structure
- Proper heading hierarchy
- Button roles
- Alt text for actions

---

**Visual Design**: Modern, clean, consistent with existing app
**Color Palette**: Blue gradients for differentiation
**Layout**: Responsive, mobile-first
**Interactions**: Smooth, intuitive, accessible
