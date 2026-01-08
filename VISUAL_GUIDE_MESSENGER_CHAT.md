# Visual Guide - Messenger-style Chat Assistant

## UI Overview

### Desktop View (≥ 768px)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                 Main Application Area                   │
│                                                         │
│                                                         │
│                                           ┌───────────┐ │
│                                           │  400×600  │ │
│                                           │  ┌─────┐  │ │
│                                           │  │💬 AI│—│×││ │
│                                           │  └─────┘  │ │
│                                           ├───────────┤ │
│                                           │           │ │
│                                           │ Messages  │ │
│                                           │   Area    │ │
│                                           │           │ │
│                                           │ 👤 User   │ │
│                                           │ 🤖 AI     │ │
│                                           │           │ │
│                                           ├───────────┤ │
│                                           │[Input][→] │ │
│                                           └───────────┘ │
│                                                         │
│                                       ┌──┐              │
│                                       │➕│ Add Task    │
│                                       └──┘              │
│                                       ┌──┐              │
│                                       │💬│ Chat        │
│                                       └──┘              │
│                                       ┌──┐              │
│                                       │🎤│ Voice       │
│                                       └──┘              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Mobile View (< 768px)

```
┌───────────────────────┐
│  💬 AI Assistant  —│×││
├───────────────────────┤
│                       │
│                       │
│     Messages Area     │
│     (Full Screen)     │
│                       │
│  👤 User message      │
│                       │
│  🤖 AI response       │
│                       │
│                       │
├───────────────────────┤
│ [Input field]    [→]  │
└───────────────────────┘
```

### Minimized State (Desktop)

```
│                                       ┌──┐              │
│                                       │➕│ Add Task    │
│                                       └──┘              │
│                                       ┌──┐              │
│                                       │💬│ Chat (min)  │ ← Click to expand
│                                       └──┘              │
│                                       ┌──┐              │
│                                       │🎤│ Voice       │
│                                       └──┘              │
```

## Component Details

### Chat Popup (Desktop)

```
┌─────────────────────────────────┐
│ ┌───┐ AI Assistant          —│×││  ← Header (gradient cyan→blue)
│ │💡│                             │
│ └───┘                            │
├─────────────────────────────────┤
│                                  │  ← Messages area (gray-50 bg)
│                   ┌────────────┐ │
│                   │ User msg   │ │  ← User bubble (purple-pink gradient, right)
│                   └────────────┘ │
│                                  │
│ ┌───┐ ┌───────────┐              │
│ │🤖│ │ AI response│              │  ← AI bubble (white, left with avatar)
│ └───┘ └───────────┘              │
│                                  │
│                   ┌────────────┐ │
│                   │ Another    │ │
│                   │ user msg   │ │
│                   └────────────┘ │
│                                  │
│ ┌───┐ ┌───────────┐              │
│ │🤖│ │ Streaming  │              │  ← Streaming response (growing)
│ └───┘ │ text...    │              │
│       └───────────┘              │
│                                  │
│ • • •                            │  ← Typing indicator (when empty)
│                                  │
├─────────────────────────────────┤
│ [Type message...]          [→]  │  ← Input area (white bg)
└─────────────────────────────────┘
```

### Empty State

```
┌─────────────────────────────────┐
│ ┌───┐ AI Assistant          —│×││
│ │💡│                             │
│ └───┘                            │
├─────────────────────────────────┤
│                                  │
│           ┌───┐                  │
│           │ ✨ │                  │  ← Sparkle icon
│           └───┘                  │
│                                  │
│  Zapytaj o zadania, priorytety,  │
│  dziennik lub wzorce zachowań    │
│                                  │
│  ┌────────────────────────────┐ │
│  │ Jakie mam zadania na dziś? │ │  ← Suggestion 1
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ Kiedy jestem najbardziej   │ │  ← Suggestion 2
│  │ produktywny?               │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ Jak spałem ostatnio?       │ │  ← Suggestion 3
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ Które zadania odkładam?    │ │  ← Suggestion 4
│  └────────────────────────────┘ │
│                                  │
├─────────────────────────────────┤
│ [Type message...]          [→]  │
└─────────────────────────────────┘
```

## Message Styles

### User Message (Right)
```
                   ┌────────────────────┐
                   │ User message here  │  ← Purple-pink gradient
                   │ with text content  │     Rounded except top-right
                   └────────────────────┘     Max 80% width
```

### AI Message (Left)
```
┌───┐ ┌────────────────────┐
│ ✨ │ │ AI response here   │  ← White background
└───┘ │ with text content  │     Border gray-100
      └────────────────────┘     Rounded except top-left
      Avatar                     Max 80% width
      Cyan-blue gradient
      32×32 px
```

## Colors

### Gradients
- **Header**: `from-cyan-600 to-blue-600`
- **User bubble**: `from-purple-600 to-pink-600`
- **AI avatar**: `from-cyan-600 to-blue-600`
- **FAB button**: `from-cyan-600 to-blue-600`

### Text
- **User message**: `text-white`
- **AI message**: `text-gray-900`
- **Input placeholder**: `text-gray-500`
- **Header text**: `text-white`

### Backgrounds
- **Messages area**: `bg-gray-50`
- **AI bubble**: `bg-white`
- **Input area**: `bg-white`
- **Popup**: `bg-white`

## Icons

### Phosphor Icons (weight="fill")
- **Chat button**: `ChatCircle` (28px)
- **AI avatar**: `Sparkle` (16px)
- **Empty state**: `Sparkle` (32px)
- **Close**: `X` (20px)
- **Minimize**: `Minus` (20px)
- **Send**: `PaperPlaneRight` (20px)
- **Loading**: `CircleNotch` (20px, spinning)

## Animations

### Popup Entrance
```css
animate-in fade-in slide-in-from-bottom-4 duration-300
```
- Fades in from 0 to 100% opacity
- Slides up 16px (from-bottom-4)
- Duration: 300ms

### Button Hover
```css
hover:scale-110 transition-all
```
- Scales to 110% on hover
- Smooth transition

### Typing Indicator
```
• • •
```
- 3 dots bouncing
- Delays: 0ms, 150ms, 300ms
- Gray-400 color
- 8px circles (w-2 h-2)

## Spacing

### Popup
- **Width**: 400px (desktop)
- **Height**: 600px (desktop)
- **Position**: bottom-24 right-6
- **Rounded**: rounded-2xl (16px)
- **Shadow**: shadow-2xl

### Messages
- **Padding**: p-4 (16px)
- **Gap**: space-y-3 (12px between messages)
- **Bubble padding**: px-4 py-2 (16px × 8px)
- **Max width**: max-w-[80%]

### Input
- **Padding**: p-3 (12px)
- **Input padding**: px-4 py-2 (16px × 8px)
- **Gap**: gap-2 (8px between input and button)
- **Button size**: w-10 h-10 (40×40px)

### FAB Stack
- **Button size**: w-14 h-14 (56×56px)
- **Gap**: gap-3 (12px)
- **Position**: bottom-6 right-6

## Responsive Breakpoints

### Mobile (< 768px)
- Fullscreen overlay
- No rounded corners
- Fixed positioning: `inset-0`

### Tablet/Desktop (≥ 768px)
- 400×600px popup
- Rounded corners: `rounded-2xl`
- Positioned: `bottom-24 right-6`

## States

### Normal
- Input enabled
- Send button shows plane icon
- No typing indicator

### Sending
- Input disabled (gray background)
- Send button shows spinner
- Last AI message may be empty

### Streaming
- Input disabled
- Send button shows spinner
- AI message grows word-by-word
- Typing dots (if message is empty)

### Minimized
- Only FAB button visible (56×56px)
- Blue gradient background
- ChatCircle icon (28px)
- Click to restore

## Interactions

### Send Message
1. User types in input
2. Press Enter or click send button
3. User message appears immediately (right)
4. AI message placeholder appears (left)
5. Typing dots show
6. Text streams in word-by-word
7. Message completes
8. Input re-enabled

### Minimize
1. Click minimize button (—)
2. Popup fades out
3. Minimized FAB appears
4. Click FAB to restore
5. Popup fades in with messages intact

### Rate Limit
1. User sends message
2. Try to send within 2 seconds
3. Toast error appears
4. Input shake animation (optional)
5. Wait 2 seconds to re-enable

## Example Conversation

```
┌─────────────────────────────────┐
│ ┌───┐ AI Assistant          —│×││
│ │💡│                             │
│ └───┘                            │
├─────────────────────────────────┤
│                   ┌────────────┐ │
│                   │ Jakie mam  │ │  User
│                   │ zadania?   │ │
│                   └────────────┘ │
│                                  │
│ ┌───┐ ┌───────────────────────┐ │
│ │🤖│ │ 8 zadań, 210 min.     │ │  AI
│ └───┘ │ 3 MUST: mvpPost,      │ │
│       │ Faktury, Pavel Lux.   │ │
│       └───────────────────────┘ │
│                                  │
│                   ┌────────────┐ │
│                   │ Co jest    │ │  User
│                   │ najważn?   │ │
│                   └────────────┘ │
│                                  │
│ ┌───┐ ┌───────────────────────┐ │
│ │🤖│ │ mvpPost (60 min), CL4.│ │  AI
│ └───┘ │ Start 10:00 AM.       │ │
│       └───────────────────────┘ │
│                                  │
├─────────────────────────────────┤
│ [Co dalej?...]             [→]  │
└─────────────────────────────────┘
```

## Comparison: Before vs After

### Before (Full-screen Modal)
```
┌─────────────────────────────────┐
│ AI Assistant              [×]   │
├─────────────────────────────────┤
│                                  │
│                                  │
│         Full Screen Modal        │
│         Takes Entire View        │
│                                  │
│                                  │
├─────────────────────────────────┤
│ [Input]                    [→]  │
└─────────────────────────────────┘
```

### After (Messenger Popup)
```
│                                       │
│     Main App Still Visible            │
│                       ┌─────────────┐ │
│                       │ 💬 AI    —│×││
│                       ├─────────────┤ │
│                       │  Compact    │ │
│                       │  400×600    │ │
│                       │  Popup      │ │
│                       ├─────────────┤ │
│                       │[Input]  [→] │ │
│                       └─────────────┘ │
│                                       │
```

## Key Visual Differences

| Feature | Before | After |
|---------|--------|-------|
| **Size** | Full screen | 400×600px popup |
| **Layout** | Modal overlay | Fixed bottom-right |
| **Mobile** | Full modal | Fullscreen overlay |
| **Minimize** | ❌ No | ✅ Yes (to FAB) |
| **Style** | Simple | Messenger-style |
| **Bubbles** | Generic | Rounded with gradients |
| **Avatar** | Emoji only | Gradient circle + icon |
| **Position** | Centered | Bottom-right corner |

## Accessibility

### Focus States
- Input has blue ring on focus
- Buttons have blue ring on focus
- Tab order: minimize → close → input → send

### Screen Reader
- Chat button: "Czat z asystentem"
- Minimize: "Minimalizuj"
- Close: "Zamknij"
- Send: "Wyślij wiadomość"
- Input: "Zapytaj o zadania, priorytety..."

### Keyboard
- **Tab**: Navigate elements
- **Enter**: Send message
- **Shift+C**: Open chat (global)
- **Escape**: Close chat (future enhancement)

## Screenshots Needed

For final documentation, take screenshots of:
1. ✅ Chat popup on desktop
2. ✅ Empty state with suggestions
3. ✅ Conversation with user/AI bubbles
4. ✅ Minimized state (small FAB)
5. ✅ Mobile fullscreen view
6. ✅ Streaming in progress (typing dots)
7. ✅ FAB stack with all three buttons
8. ✅ Rate limit error toast

## CSS Classes Reference

### Popup Container
```tsx
className="fixed bottom-0 left-0 right-0 top-0 z-50
           md:bottom-24 md:right-6 md:left-auto md:top-auto
           md:w-[400px] md:h-[600px]
           bg-white md:rounded-2xl shadow-2xl
           border border-gray-200
           flex flex-col
           animate-in fade-in slide-in-from-bottom-4 duration-300"
```

### Header
```tsx
className="px-4 py-3 
           bg-gradient-to-r from-cyan-600 to-blue-600
           text-white md:rounded-t-2xl
           flex items-center justify-between"
```

### User Bubble
```tsx
className="max-w-[80%] px-4 py-2 rounded-2xl rounded-tr-sm
           bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm"
```

### AI Bubble
```tsx
className="max-w-[80%] px-4 py-2 rounded-2xl rounded-tl-sm
           bg-white text-gray-900 shadow-sm border border-gray-100 text-sm"
```

### AI Avatar
```tsx
className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600
           flex items-center justify-center flex-shrink-0 mt-1"
```

---

**Note**: This is a text-based visual guide. For actual screenshots, run the application and use the testing guide.
