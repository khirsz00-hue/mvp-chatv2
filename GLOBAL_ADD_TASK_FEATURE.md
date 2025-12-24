# Global "Add Task" Feature - Implementation Documentation

## 🎯 Overview

This feature adds a **global floating action button** and **keyboard shortcut (Shift+Q)** that allows users to quickly add tasks from anywhere in the application.

## ✨ Features Implemented

### 1. **Floating Action Button (FAB)**
- **Location**: Fixed position in bottom-right corner (`bottom-6 right-6`)
- **Design**: Purple to pink gradient (`from-purple-600 to-pink-600`)
- **Size**: 56px x 56px (`w-14 h-14`)
- **Icon**: Plus icon from Phosphor Icons (size 28, bold weight)
- **Effects**: 
  - Shadow elevation on hover (`shadow-lg hover:shadow-xl`)
  - Scale animation on hover (`hover:scale-110`)
  - Smooth transitions (`transition-all duration-200`)
- **Accessibility**: 
  - Proper ARIA label
  - Keyboard focus ring
  - Tooltip with keyboard shortcut hint

### 2. **Keyboard Shortcut**
- **Trigger**: `Shift+Q`
- **Scope**: Global (works from anywhere in the app)
- **Smart Detection**: Automatically disabled when user is typing in:
  - Input fields
  - Textareas
  - Contenteditable elements
- **Action**: Opens the same QuickAddModal used in Day Assistant V2

### 3. **Quick Add Modal**
- **Reuses**: Existing `QuickAddModal` component from Day Assistant V2
- **Fields**:
  - Task title (text input)
  - Time estimate (5, 15, 30, 60 minutes)
  - Context type (Deep Work, Admin, Communication)
  - MUST checkbox (priority flag)
- **Validation**: Title required before submission
- **Keyboard Support**: Enter to submit, Esc to cancel

### 4. **API Integration**
- **Endpoint**: `POST /api/day-assistant-v2/task`
- **Authentication**: Uses session token from Supabase
- **Payload**:
  ```json
  {
    "title": "Task title",
    "estimate_min": 25,
    "cognitive_load": 2,
    "is_must": false,
    "is_important": false,
    "due_date": "2025-12-24",
    "context_type": "deep_work",
    "priority": 3
  }
  ```
- **Error Handling**: 
  - Session expiry detection
  - API error messages displayed via toast
  - Network error handling

### 5. **Event System**
- **Custom Event**: `task-added`
- **Event Detail**: `{ task: TaskObject }`
- **Listeners**: 
  - Day Assistant V2 automatically refreshes when new task added
  - Other components can subscribe to this event

### 6. **Gamification Integration**
- **Stats Update**: Automatically updates daily task totals
- **Function**: `recalculateDailyTotal(userId)`
- **Toast Notifications**: 
  - Success: "✅ Zadanie dodane!"
  - Error: Descriptive error messages

## 📁 Files Modified/Created

### New Files
1. **`components/day-assistant-v2/FloatingAddButton.tsx`**
   - Floating action button component
   - Tooltip integration
   - Purple gradient styling

### Modified Files
1. **`components/layout/MainLayout.tsx`**
   - Added `showQuickAdd` state
   - Added Shift+Q keyboard listener
   - Added `handleQuickAdd` API call handler
   - Rendered FloatingAddButton and QuickAddModal
   - Added necessary imports

2. **`components/day-assistant-v2/DayAssistantV2View.tsx`**
   - Added event listener for `task-added` events
   - Auto-refresh on global task creation

## 🎨 Visual Design

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                                         │
│                    Main Content Area                    │
│                                                         │
│                                                         │
│                                                         │
│                                              ┌────┐     │
│                                              │ ➕ │ ←── Floating Button
│                                              └────┘     │
│                                           "Shift+Q"     │
└─────────────────────────────────────────────────────────┘
```

### Tooltip Appearance
```
┌──────────────────────┐
│  Dodaj zadanie       │  ← White text on dark background
│  Shift+Q             │  ← Gray text (keyboard hint)
└──────────────────────┘
```

## 🧪 Testing Checklist

### Visual Tests
- [x] Button visible in bottom-right corner
- [x] Purple-pink gradient displays correctly
- [x] Hover effects work (scale + shadow)
- [x] Tooltip appears on hover with correct text
- [x] Button has proper z-index (appears above other content)

### Functional Tests
- [x] Button click opens QuickAddModal
- [x] Shift+Q keyboard shortcut opens modal
- [x] Shift+Q ignored when typing in input fields
- [x] Shift+Q ignored when typing in textareas
- [x] Modal form validation works
- [x] Task submission calls correct API endpoint
- [x] Success toast appears after task creation
- [x] Error toast appears on API failure
- [x] Modal closes after successful submission

### Integration Tests
- [x] Day Assistant V2 refreshes after task added
- [x] Gamification stats update correctly
- [x] Session expiry handled gracefully
- [x] API authentication works correctly

### Code Quality
- [x] No ESLint errors or warnings
- [x] Build completes successfully
- [x] TypeScript types correct
- [x] No security vulnerabilities (CodeQL passed)
- [x] Code review feedback addressed

## 🔧 Technical Implementation Details

### Keyboard Event Handler
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.shiftKey && e.key === 'Q') {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.isContentEditable) {
        return
      }
      e.preventDefault()
      setShowQuickAdd(true)
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

### API Call Handler
```typescript
const handleQuickAdd = async (task) => {
  const { data: { session } } = await supabase.auth.getSession()
  
  const response = await fetch('/api/day-assistant-v2/task', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ /* task data */ })
  })
  
  const data = await response.json()
  toast.success('✅ Zadanie dodane!')
  
  // Trigger refresh
  window.dispatchEvent(new CustomEvent('task-added', { 
    detail: { task: data.task } 
  }))
  
  // Update stats
  await recalculateDailyTotal(session.user.id)
}
```

### Event Listener in Day Assistant V2
```typescript
useEffect(() => {
  const handleTaskAdded = async (e: Event) => {
    const customEvent = e as CustomEvent
    console.log('🎉 Task added via global quick add:', customEvent.detail?.task)
    
    if (sessionToken) {
      await loadDayPlan(sessionToken)
    }
  }
  
  window.addEventListener('task-added', handleTaskAdded)
  return () => window.removeEventListener('task-added', handleTaskAdded)
}, [sessionToken])
```

## 🚀 Performance Considerations

- **Event Listener**: Cleaned up on component unmount to prevent memory leaks
- **API Calls**: Optimized to reuse session user instead of additional auth calls
- **UI Updates**: Single refresh instead of optimistic + full refresh
- **Toast Notifications**: Non-blocking, automatically dismissed

## 🔒 Security

- **Authentication**: Required for all API calls
- **Session Validation**: Checks for valid session before making requests
- **Error Messages**: Don't expose sensitive information
- **Input Validation**: Server-side validation on API endpoint
- **CodeQL**: No security vulnerabilities detected

## 📝 Usage Example

### For Users
1. **Using Button**: Click the purple ➕ button in bottom-right corner
2. **Using Keyboard**: Press `Shift+Q` from anywhere in the app
3. Fill in task details in the modal
4. Press Enter or click "Dodaj zadanie" to submit
5. Task appears in Day Assistant V2 queue immediately

### For Developers
The feature is fully integrated and works out of the box. To extend:

```typescript
// Listen to task-added events in any component
useEffect(() => {
  const handleTaskAdded = (e: CustomEvent) => {
    const newTask = e.detail.task
    // Handle the new task
  }
  
  window.addEventListener('task-added', handleTaskAdded)
  return () => window.removeEventListener('task-added', handleTaskAdded)
}, [])
```

## ✅ Acceptance Criteria Met

- ✅ Floating button (➕) visible in right bottom corner
- ✅ Hover effect + tooltip "Dodaj zadanie (Shift+Q)"
- ✅ Button click → opens modal
- ✅ Shift+Q → opens modal (works everywhere)
- ✅ Shift+Q DOES NOT work when user types in input/textarea
- ✅ Modal uses QuickAddModal (same as Day Assistant V2)
- ✅ API endpoint `/api/day-assistant-v2/task` works correctly
- ✅ Task saves to database (`day_assistant_v2_tasks`)
- ✅ Task appears in queue (auto-refresh)
- ✅ Toast success: "✅ Zadanie dodane!"
- ✅ Toast error if something goes wrong
- ✅ Gamification stats update after adding
- ✅ Button responsive (can be hidden on mobile with CSS)

## 🐛 Known Issues

None at this time.

## 🔮 Future Enhancements

- Optional: Hide button on mobile screens < 640px
- Optional: Add animation when button first appears
- Optional: Add quick actions dropdown for common tasks
- Optional: Support for templates/recurring tasks

## 📚 Related Documentation

- [Day Assistant V2 Documentation](./DAY_ASSISTANT_V2_VISUAL_GUIDE.md)
- [Gamification System](./ADHD_GAMIFICATION_IMPLEMENTATION.md)
- [API Endpoints](./app/api/day-assistant-v2/task/route.ts)

---

**Implementation Date**: 2025-12-24
**Developer**: GitHub Copilot Agent
**Status**: ✅ Complete and tested
