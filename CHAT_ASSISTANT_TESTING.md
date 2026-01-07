# Global AI Chat Assistant - Testing Checklist

## ✅ Automated Tests (Completed)

### Build & Compilation
- [x] `npm run build` passes without errors
- [x] `npm run lint` passes (only unrelated warning in TasksAssistant.tsx)
- [x] TypeScript type checking passes
- [x] No console errors during build

### Code Quality
- [x] Code review completed and feedback addressed
- [x] Error messages sanitized for security
- [x] Accessibility attributes added (ARIA)
- [x] Date calculations extracted to constants
- [x] Animation delays use Tailwind approach

## 🧪 Manual Testing Required

### 1. UI Components

#### Floating Chat Button
- [ ] Button visible in bottom-right corner
- [ ] Button positioned between Add Task (top) and Voice Ramble (bottom)
- [ ] Button has blue gradient (cyan-600 to blue-600)
- [ ] Button displays ChatCircle icon
- [ ] Tooltip shows "Czat z asystentem (Shift+C)"
- [ ] Hover effect: scale + shadow increase
- [ ] Click opens chat modal

#### Chat Modal
- [ ] Modal opens on button click
- [ ] Modal opens with Shift+C keyboard shortcut
- [ ] Modal displays header with "💬 AI Assistant"
- [ ] Close button (X) works
- [ ] ESC key closes modal
- [ ] Clear chat button (trash icon) works
- [ ] Backdrop click closes modal

### 2. Chat Interface

#### Welcome State (Empty Chat)
- [ ] Shows welcome message with 👋 emoji
- [ ] Displays 4 quick action buttons
- [ ] Quick action buttons populate input on click
- [ ] Input field auto-focuses after quick action click

#### Message Display
- [ ] User messages align right with purple gradient
- [ ] AI messages align left with gray background
- [ ] Messages show timestamps (HH:MM format)
- [ ] User avatar (👤) displays correctly
- [ ] AI avatar (🤖) displays correctly
- [ ] Long messages wrap properly
- [ ] Auto-scroll to bottom on new message

#### Loading State
- [ ] Loading dots (● ● ●) appear while waiting for AI
- [ ] Loading dots animate with bounce effect
- [ ] Loading dots have staggered animation
- [ ] Input disabled during loading
- [ ] Send button disabled during loading

### 3. Input & Sending

#### Textarea Input
- [ ] Placeholder text shows: "Zapytaj o zadania, priorytety, wzorce..."
- [ ] Input expands as user types (multi-line)
- [ ] Input max height prevents overflow
- [ ] Input auto-focuses when modal opens
- [ ] Enter key sends message
- [ ] Shift+Enter creates new line
- [ ] Input clears after sending

#### Send Button
- [ ] Button disabled when input empty
- [ ] Button disabled during loading
- [ ] Button shows plane icon (▶)
- [ ] Button has blue gradient when enabled
- [ ] Button has gray background when disabled
- [ ] Hover effect works when enabled

### 4. Keyboard Shortcuts

#### Global Shortcuts
- [ ] Shift+C opens chat from any page
- [ ] Shift+C doesn't trigger while typing in input fields
- [ ] Shift+C doesn't trigger while typing in textareas
- [ ] Shift+C doesn't trigger in contentEditable elements

#### Modal Shortcuts
- [ ] ESC closes modal
- [ ] Enter sends message
- [ ] Shift+Enter adds new line
- [ ] Tab navigation works properly

### 5. AI Functionality

#### Context Fetching
- [ ] API fetches today's tasks correctly
- [ ] API fetches upcoming tasks (7 days)
- [ ] API fetches overdue tasks
- [ ] API fetches completed tasks today
- [ ] API fetches journal entries (last 7 days)
- [ ] API fetches active decisions
- [ ] API calculates behavior patterns

#### AI Responses
- [ ] AI responds in Polish
- [ ] AI uses user context in responses
- [ ] AI mentions task counts accurately
- [ ] AI references energy levels from journal
- [ ] AI suggests concrete actions
- [ ] AI uses emojis appropriately
- [ ] AI handles missing data gracefully

#### Sample Queries
Test these queries and verify responses:
- [ ] "Jakie mam zadania na dziś?"
- [ ] "Co jest najważniejsze do zrobienia?"
- [ ] "Jak spałem ostatnio?"
- [ ] "Czy mam czas na nowe zadanie?"
- [ ] "Które zadania odkładam najczęściej?"
- [ ] "Kiedy najlepiej zaplanować spotkanie?"
- [ ] "Jakie mam aktywne decyzje?"

### 6. Error Handling

#### Network Errors
- [ ] Shows user-friendly message on network error
- [ ] Shows "Problem z połączeniem" message
- [ ] Error message appears in chat as AI message
- [ ] Toast notification appears

#### Session Errors
- [ ] Shows "Sesja wygasła" for expired session
- [ ] Redirects to login if unauthorized
- [ ] Session token validated on every request

#### Rate Limiting
- [ ] Shows "Zbyt wiele zapytań" for rate limit
- [ ] Suggests waiting before retry
- [ ] Handles OpenAI API rate limits

#### Input Validation
- [ ] Validates message not empty
- [ ] Validates message length (max 500 chars)
- [ ] Shows error for too long messages
- [ ] Prevents sending while loading

### 7. Responsive Design

#### Desktop (> 1024px)
- [ ] Modal centered on screen
- [ ] Modal max-width: 896px (4xl)
- [ ] Modal inset: 64px
- [ ] All features accessible
- [ ] Button tooltips work

#### Tablet (768px - 1024px)
- [ ] Modal centered and scaled appropriately
- [ ] Modal inset: 32px
- [ ] Touch interactions work
- [ ] All features accessible

#### Mobile (< 768px)
- [ ] Modal nearly full-screen
- [ ] Modal inset: 16px (small margins)
- [ ] Buttons have adequate touch targets
- [ ] Scrolling works smoothly
- [ ] Input doesn't get hidden by keyboard
- [ ] All features accessible

### 8. Security

#### Authentication
- [ ] Unauthenticated requests return 401
- [ ] User can only see own data
- [ ] Session token validated
- [ ] RLS policies enforced

#### Data Privacy
- [ ] User sees only their tasks
- [ ] User sees only their journal
- [ ] User sees only their decisions
- [ ] No data leaked in errors

#### Input Sanitization
- [ ] SQL injection prevented (RLS)
- [ ] XSS prevented (React escaping)
- [ ] Message length validated
- [ ] Special characters handled

### 9. Performance

#### Loading Times
- [ ] Modal opens instantly
- [ ] Context fetching < 2 seconds
- [ ] AI response < 10 seconds
- [ ] No lag during typing
- [ ] Auto-scroll smooth

#### Resource Usage
- [ ] No memory leaks
- [ ] Conversation history limited
- [ ] Old messages cleaned up
- [ ] No console errors
- [ ] No console warnings (related to chat)

### 10. Integration

#### Floating Button Stack
- [ ] Three buttons visible
- [ ] Correct order (Add Task, Chat, Voice)
- [ ] Consistent spacing (gap-3)
- [ ] All buttons same size (56px)
- [ ] No overlapping
- [ ] Z-index correct (z-50)

#### Modal Layers
- [ ] Backdrop above page content (z-100)
- [ ] Modal above backdrop (z-101)
- [ ] No interference with other modals
- [ ] Click backdrop closes chat

#### Subscription Wall
- [ ] Chat works with subscription wall enabled
- [ ] Chat works with subscription wall disabled
- [ ] No conflicts with trial banner

### 11. Accessibility

#### Screen Readers
- [ ] Button has proper aria-label
- [ ] Textarea has aria-label
- [ ] Textarea has aria-describedby
- [ ] Help text exists (sr-only)
- [ ] Semantic HTML structure
- [ ] Heading hierarchy correct

#### Keyboard Navigation
- [ ] All interactive elements focusable
- [ ] Tab order logical
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Skip links available

#### Visual
- [ ] Sufficient color contrast
- [ ] Focus rings visible
- [ ] Text readable (font size)
- [ ] Icons have text alternatives
- [ ] No information by color alone

## 🔧 Environment Setup

### Required Environment Variables
```bash
OPENAI_API_KEY=sk-xxx                    # Required for AI
NEXT_PUBLIC_SUPABASE_URL=xxx            # Required for DB
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx       # Required for DB
```

### Database Requirements
- [ ] `day_assistant_v2_tasks` table exists
- [ ] `journal_entries` table exists
- [ ] `decisions` table exists
- [ ] RLS policies enabled
- [ ] Test user has sample data

## 📊 Test Data Setup

### Sample Tasks
Create test tasks with:
- [ ] Tasks due today (at least 3)
- [ ] Tasks due in next 7 days (at least 2)
- [ ] Overdue tasks (at least 1)
- [ ] Completed tasks today (at least 1)
- [ ] Mix of MUST and regular tasks
- [ ] Various cognitive loads (1-5)

### Sample Journal Entries
Create journal entries for:
- [ ] Last 7 days with metrics
- [ ] Energy levels (0-10)
- [ ] Motivation levels (0-10)
- [ ] Sleep quality (0-10)
- [ ] Hours slept

### Sample Decisions
Create decisions with:
- [ ] At least 1 draft decision
- [ ] At least 1 in_progress decision
- [ ] Various titles and descriptions

## 🐛 Known Issues

### To Monitor
- Animation delays may need adjustment for accessibility
- Long conversations may need pagination
- Mobile keyboard may hide input on some devices

### Not Issues (By Design)
- Conversation history not persisted (stored in memory)
- OpenAI key required at runtime (not build time)
- No markdown rendering (plain text only)

## ✅ Sign-Off Checklist

### Developer
- [ ] All code committed
- [ ] Documentation complete
- [ ] Build passing
- [ ] Lint passing
- [ ] Code review addressed

### QA Testing
- [ ] Desktop testing complete
- [ ] Mobile testing complete
- [ ] Accessibility testing complete
- [ ] Security testing complete
- [ ] Performance testing complete

### Product Review
- [ ] UI matches design
- [ ] Features complete
- [ ] User experience smooth
- [ ] Error messages clear
- [ ] Documentation accurate

## 🎯 Success Criteria

The implementation is considered complete when:
- ✅ All automated tests pass
- ⏳ 90%+ of manual tests pass
- ⏳ No critical bugs found
- ⏳ Accessibility requirements met
- ⏳ Performance acceptable
- ⏳ Security verified
- ⏳ Documentation complete

## 📝 Testing Notes

**Environment**: Sandbox (limited testing)
**Database**: Requires live Supabase instance
**AI**: Requires OpenAI API key
**Browser**: Requires browser for visual testing

### Recommended Testing Order
1. Start dev server: `npm run dev`
2. Login with test user
3. Verify floating button visible
4. Test Shift+C shortcut
5. Test chat interface
6. Test quick actions
7. Test AI responses
8. Test error handling
9. Test responsive design
10. Test accessibility

### Test User Requirements
- Active Supabase account
- Sample tasks in database
- Sample journal entries
- Sample decisions
- Valid OpenAI API key

---

**Last Updated**: January 7, 2026
**Status**: Ready for Manual Testing
**Automated Tests**: ✅ All Passing
