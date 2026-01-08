# Testing Guide - Messenger-style Chat Assistant

## Prerequisites

1. **OpenAI API Key**: Set in `.env.local`
   ```bash
   OPENAI_API_KEY=sk-...
   ```

2. **Development Server Running**
   ```bash
   npm run dev
   ```

3. **Authenticated User**: Log in to the application

## Manual Testing Checklist

### 1. Basic Functionality

#### ✅ Chat Opens/Closes
- [ ] Click floating chat button (blue bubble, middle of FAB stack)
- [ ] Chat opens as 400×600px popup in bottom-right corner
- [ ] Click X button → Chat closes
- [ ] Reopen chat → Previous messages are cleared (no persistence)

#### ✅ Minimize/Maximize
- [ ] Click minimize button (—) in header
- [ ] Chat minimizes to small blue FAB button
- [ ] Click minimized button → Chat reopens with same messages

#### ✅ Keyboard Shortcut
- [ ] Press Shift+C anywhere in app
- [ ] Chat opens (if not already open)
- [ ] Shortcut doesn't trigger when typing in input fields

### 2. Messaging

#### ✅ Send Message
- [ ] Type "Jakie mam zadania na dziś?" in input
- [ ] Press Enter or click send button
- [ ] User message appears on right (purple-pink gradient)
- [ ] AI response starts streaming word-by-word
- [ ] AI message appears on left with avatar (cyan-blue circle with Sparkle icon)

#### ✅ Streaming Response
- [ ] Observe typing dots when AI starts responding
- [ ] Text appears incrementally (not all at once)
- [ ] Response completes in 1-2 seconds
- [ ] Final response is 1-2 sentences (ultra-short)
- [ ] No teaching language ("powinieneś", "sugeruję", "warto")

#### ✅ Rate Limiting
- [ ] Send a message
- [ ] Try to send another immediately (within 2 seconds)
- [ ] Toast error appears: "Poczekaj chwilę przed następnym pytaniem"
- [ ] Wait 2+ seconds → Can send next message

#### ✅ Empty State
- [ ] Open chat with no messages
- [ ] See Sparkle icon and welcome text
- [ ] See 4 suggestion buttons
- [ ] Click a suggestion → Input field populates
- [ ] Send suggestion → Works normally

### 3. UI/UX

#### ✅ Message Bubbles
- [ ] User messages: Right-aligned, purple-pink gradient, rounded-tr-sm
- [ ] AI messages: Left-aligned, white background, rounded-tl-sm
- [ ] AI avatar: Cyan-blue circle with white Sparkle icon
- [ ] Text is readable (sm text size)
- [ ] Max width is 80% of container

#### ✅ Auto-Scroll
- [ ] Send multiple messages (5+)
- [ ] Chat auto-scrolls to bottom after each message
- [ ] Scroll up manually
- [ ] Send new message → Scrolls back to bottom

#### ✅ Input Field
- [ ] Input is disabled during streaming
- [ ] Send button shows spinner during streaming
- [ ] Send button is disabled when input is empty
- [ ] Input placeholder: "Zapytaj o zadania, priorytety..."

#### ✅ Animations
- [ ] Chat opens with fade-in and slide-up animation
- [ ] Buttons have hover scale effect
- [ ] Typing dots bounce with staggered delays

### 4. Mobile Responsiveness

#### ✅ Mobile View (< 768px)
- [ ] Open DevTools and set viewport to 375×667 (iPhone SE)
- [ ] Click chat button
- [ ] Chat takes full screen (not popup)
- [ ] Header at top (no rounded corners)
- [ ] Messages area scrollable
- [ ] Input at bottom (no rounded corners)
- [ ] Minimize button works → Returns to FAB
- [ ] All functionality works

#### ✅ Desktop View (≥ 768px)
- [ ] Set viewport to 1920×1080
- [ ] Chat opens as 400×600px popup
- [ ] Positioned bottom-right (above FAB stack)
- [ ] Rounded corners (rounded-2xl)
- [ ] Shadow visible (shadow-2xl)
- [ ] Doesn't cover entire screen

#### ✅ Tablet View (768px - 1024px)
- [ ] Set viewport to 768×1024 (iPad)
- [ ] Chat appears as popup (desktop mode)
- [ ] All features work

### 5. Content Quality

#### ✅ Ultra-Short Responses
Test queries and expected response length:

1. **"Jakie mam zadania na dziś?"**
   - Expected: "X zadań, Y min. Z MUST: [titles]."
   - Length: 1-2 sentences max

2. **"Jak spałem ostatnio?"**
   - Expected: "Ostatnie 7 dni: X.Xh średnio. Najlepiej/Najgorzej: [day]."
   - Length: 1-2 sentences max

3. **"Które zadania odkładam?"**
   - Expected: Facts about postpone patterns with numbers
   - Length: 1-2 sentences max

4. **"Co jest najważniejsze?"**
   - Expected: List of MUST tasks with times
   - Length: 1-2 sentences max

#### ✅ No Teaching Language
- [ ] Response doesn't contain "powinieneś"
- [ ] Response doesn't contain "sugeruję"
- [ ] Response doesn't contain "warto"
- [ ] Response doesn't contain "polecam"
- [ ] Response is pure facts and numbers

#### ✅ Context Awareness
- [ ] AI knows about today's tasks
- [ ] AI knows about overdue tasks
- [ ] AI knows about journal entries
- [ ] AI knows about active decisions
- [ ] AI can reference specific task names

### 6. Error Handling

#### ✅ Network Errors
- [ ] Disconnect internet
- [ ] Try to send message
- [ ] Error toast appears
- [ ] Chat remains functional when reconnected

#### ✅ Session Expiry
- [ ] Clear session (delete cookies)
- [ ] Try to send message
- [ ] Error toast: "Musisz być zalogowany"
- [ ] Chat remains open but can't send

#### ✅ Long Message
- [ ] Type message > 500 characters
- [ ] Try to send
- [ ] Server returns error: "Message too long"
- [ ] Chat shows error message

#### ✅ No OpenAI Key
- [ ] Comment out OPENAI_API_KEY in .env.local
- [ ] Restart dev server
- [ ] Try to send message
- [ ] Error: "Chat assistant is not configured"

### 7. Integration

#### ✅ FAB Stack
- [ ] Check FAB stack positioning (bottom-right, z-50)
- [ ] Order from top to bottom:
   1. ➕ Add Task (purple gradient)
   2. 💬 Chat Assistant (cyan-blue gradient)
   3. 🎤 Voice Ramble (indigo gradient)
- [ ] All buttons are 56×56px (w-14 h-14)
- [ ] Gap between buttons: 12px (gap-3)

#### ✅ Shift+C Shortcut
- [ ] Press Shift+C in Tasks view
- [ ] Chat opens
- [ ] Press Shift+C in Journal view
- [ ] Chat opens
- [ ] Try Shift+C while typing in task input
- [ ] Shortcut doesn't trigger (respects input focus)

#### ✅ Tooltip
- [ ] Hover over chat button
- [ ] Tooltip appears: "Czat z asystentem"
- [ ] Second line: "Shift+C"
- [ ] Tooltip positioned to left of button

### 8. Performance

#### ✅ Load Time
- [ ] Open chat for first time
- [ ] Chat appears instantly (< 100ms)
- [ ] No lag or jank

#### ✅ Streaming Speed
- [ ] Send message
- [ ] First word appears in < 2 seconds
- [ ] Full response completes in 2-4 seconds
- [ ] Faster than previous implementation (gpt-4-turbo)

#### ✅ Memory Usage
- [ ] Open chat
- [ ] Send 20 messages
- [ ] Check browser DevTools → Performance → Memory
- [ ] No memory leaks
- [ ] Messages clear on close

### 9. Accessibility

#### ✅ Keyboard Navigation
- [ ] Tab to chat button → Can focus
- [ ] Press Enter on focused button → Opens
- [ ] Tab through chat UI elements
- [ ] All interactive elements focusable

#### ✅ Screen Reader
- [ ] Enable screen reader (if available)
- [ ] Chat button has aria-label: "Czat z asystentem"
- [ ] Messages are announced
- [ ] Send button has aria-label: "Wyślij wiadomość"

#### ✅ Focus Management
- [ ] Open chat
- [ ] Input field automatically focused
- [ ] Can type immediately without clicking

### 10. Edge Cases

#### ✅ Empty Context
- [ ] Use fresh account with no tasks/journal
- [ ] Send "Jakie mam zadania na dziś?"
- [ ] AI responds gracefully (e.g., "Brak zadań na dziś.")

#### ✅ Long Task Names
- [ ] Create task with very long title (100+ chars)
- [ ] Ask about tasks
- [ ] AI response handles long names (may truncate)

#### ✅ Special Characters
- [ ] Send message with emojis: "Co zrobić? 🤔"
- [ ] Send message with Polish characters: "łódź, żółć"
- [ ] Both handled correctly

#### ✅ Multiple Tabs
- [ ] Open app in two browser tabs
- [ ] Send message in tab 1
- [ ] Check tab 2 → Chat is independent
- [ ] Each tab has own chat state

## Test Scenarios

### Scenario 1: First-time User
1. New user logs in
2. Sees chat button in FAB stack
3. Clicks chat button (or presses Shift+C)
4. Sees empty state with suggestions
5. Clicks suggestion "Jakie mam zadania na dziś?"
6. Gets ultra-short response about empty task list
7. Types "Jak mogę dodać zadanie?"
8. Gets response directing to Add Task button

### Scenario 2: Power User
1. User has 10 tasks, 3 MUST, journal entries
2. Opens chat with Shift+C
3. Asks "Co jest najważniejsze?"
4. Gets list of 3 MUST tasks with times
5. Minimizes chat
6. Works in app
7. Clicks minimized chat → Reopens with context
8. Asks "Jak spałem?" → Gets 7-day sleep average
9. Closes chat with X

### Scenario 3: Mobile User
1. User on iPhone (375×667)
2. Taps chat button
3. Chat takes full screen
4. Types question with on-screen keyboard
5. Sends message
6. Reads response
7. Minimizes chat → Returns to FAB
8. Task continues without interruption

## Performance Benchmarks

### Expected Metrics
- **Chat open time**: < 100ms
- **First token time**: < 2s
- **Full response time**: 2-4s
- **Message render time**: < 50ms
- **Scroll performance**: 60fps
- **Memory per message**: < 1KB

### Comparison (vs. Previous)
| Metric | Old (GPT-4-turbo) | New (GPT-4o-mini) | Improvement |
|--------|-------------------|-------------------|-------------|
| Response time | 3-5s | 1-2s | 50-60% faster |
| Response length | 150-500 chars | 50-150 chars | 70% shorter |
| Cost per message | $0.10 | $0.0015 | 98% cheaper |
| Max tokens | 500 | 150 | 70% reduction |
| Context size | Verbose text | Compact JSON | 50% smaller |

## Automated Tests (Future)

### Unit Tests
```typescript
// hooks/useChatStream.test.ts
describe('useChatStream', () => {
  test('handles streaming chunks correctly', async () => {
    // Test SSE parsing
  })
  
  test('calls onChunk for each text fragment', async () => {
    // Test callback invocation
  })
})

// components/chat/ChatAssistant.test.tsx
describe('ChatAssistant', () => {
  test('renders minimized state', () => {
    // Test minimize functionality
  })
  
  test('applies rate limiting', () => {
    // Test 2s throttle
  })
})
```

### Integration Tests
```typescript
// e2e/chat-assistant.spec.ts
describe('Chat Assistant E2E', () => {
  test('full conversation flow', async () => {
    await page.click('[aria-label="Czat z asystentem"]')
    await page.type('input', 'Jakie mam zadania na dziś?')
    await page.click('[aria-label="Wyślij wiadomość"]')
    await page.waitForSelector('.ai-message')
    // Assert response appears and is short
  })
})
```

## Bug Report Template

If you find a bug, report using this template:

```markdown
**Description**: [Brief description]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected**: [What should happen]

**Actual**: [What actually happened]

**Environment**:
- Browser: [Chrome 120 / Safari 17 / etc.]
- Device: [Desktop / iPhone 14 / etc.]
- Screen size: [1920×1080 / 375×667 / etc.]

**Screenshots**: [If applicable]

**Console Errors**: [Copy from DevTools Console]
```

## Success Criteria

All items must pass:
- ✅ Chat opens/closes correctly
- ✅ Streaming works (word-by-word)
- ✅ Responses are 1-2 sentences max
- ✅ No teaching language
- ✅ Rate limiting works (2s min)
- ✅ Minimize/maximize works
- ✅ Mobile responsive (fullscreen)
- ✅ Desktop responsive (popup)
- ✅ Shift+C shortcut works
- ✅ Error handling graceful
- ✅ No console errors
- ✅ Performance acceptable

## Notes for Testers

1. **Test with real data**: Create tasks, journal entries, decisions before testing
2. **Test edge cases**: Empty states, long names, special characters
3. **Test on multiple devices**: Desktop, tablet, mobile
4. **Test on multiple browsers**: Chrome, Safari, Firefox
5. **Check console**: No errors or warnings should appear
6. **Record issues**: Use bug report template above

## Contact

For questions or issues during testing, contact the development team.
