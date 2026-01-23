# Testing Summary: Unified Time Tracking & Focus Mode

## Overview
This document provides a comprehensive testing checklist for the unified time tracking system and focus mode feature.

## Automated Checks ✅

### Build & Lint Status
- ✅ ESLint: No errors in modified files
- ✅ TypeScript: Compiles without errors (unrelated Badge.tsx error exists)
- ✅ Code Review: All feedback addressed

### Code Quality Checks
- ✅ No duplicate logic
- ✅ Optimized localStorage operations
- ✅ Browser compatibility (UUID fallback)
- ✅ Proper cleanup patterns (timeouts, intervals)
- ✅ Named constants instead of magic numbers
- ✅ CSS custom properties for configurability

## Manual Testing Checklist

### 1. Unified Time Tracking ⏱️

#### Task Assistant Timer (Manual)
- [ ] Start a timer from Task Assistant
- [ ] Let it run for at least 10 seconds
- [ ] Stop the timer
- [ ] Verify session saved to `time_sessions` table in Supabase
- [ ] Check `allTimeSessions` in localStorage has backup
- [ ] Verify session has:
  - ✓ `session_type: 'manual'`
  - ✓ `task_source: 'assistant_tasks'`
  - ✓ Non-empty `task_title`
  - ✓ Correct `duration_seconds`

#### Pomodoro Timer
- [ ] Start a Pomodoro timer from Task Assistant
- [ ] Complete a work session (or skip to next phase)
- [ ] Verify session saved to database
- [ ] Check session has:
  - ✓ `session_type: 'pomodoro'`
  - ✓ `task_source: 'assistant_tasks'`
  - ✓ Duration approximately 25 minutes (or actual elapsed)

#### Day Assistant V2 Timer (Focus)
- [ ] Start a timer from Day Assistant V2
- [ ] Let it run for at least 10 seconds
- [ ] Stop the timer
- [ ] Verify session saved to database
- [ ] Check session has:
  - ✓ `session_type: 'focus'`
  - ✓ `task_source: 'day_assistant_v2'`
  - ✓ Correct `task_title` (not empty)
  - ✓ Correct `duration_seconds`

#### Offline Functionality
- [ ] Disconnect from internet (or turn off Supabase)
- [ ] Start and stop a timer
- [ ] Verify session saved to `allTimeSessions` in localStorage
- [ ] Check session has generated UUID
- [ ] Reconnect and verify data persists in localStorage

### 2. Focus Mode Feature 🎯

#### Button Interaction
- [ ] Navigate to Day Assistant V2
- [ ] Start a timer on a task
- [ ] Verify "FOCUS" button appears
- [ ] Click FOCUS button
- [ ] Verify button changes to "Wyjdź"
- [ ] Verify button turns purple (bg-purple-600)
- [ ] Click "Wyjdź" to exit focus mode
- [ ] Verify button returns to "FOCUS" state

#### Visual Effects
- [ ] Enter focus mode
- [ ] Verify backdrop appears with blur effect
- [ ] Verify timer box remains sharp and visible
- [ ] Verify timer box is above backdrop (z-index hierarchy)
- [ ] Verify you can still interact with timer controls
- [ ] Verify backdrop doesn't block clicks (pointer-events: none)

#### Shake Animation
- [ ] Enter focus mode
- [ ] Wait 5 minutes (or modify REMINDER_INTERVAL_MS for testing)
- [ ] Verify timer box shakes gently
- [ ] Animation should:
  - ✓ Move ±2px horizontally
  - ✓ Repeat 3 times
  - ✓ Last approximately 1.5 seconds total
  - ✓ Be subtle and not aggressive
- [ ] Wait another 5 minutes
- [ ] Verify shake animation triggers again
- [ ] Exit focus mode
- [ ] Verify shake animation stops

#### Cleanup & Memory
- [ ] Enter focus mode
- [ ] Wait 4 minutes (before reminder triggers)
- [ ] Exit focus mode or stop timer
- [ ] Verify no memory leaks (check browser dev tools)
- [ ] Verify intervals are cleared
- [ ] Verify timeouts are cleaned up

### 3. Cross-Component Integration

#### Timer State Consistency
- [ ] Start timer in Task Assistant
- [ ] Open Day Assistant V2 in same tab
- [ ] Verify timer state is consistent
- [ ] Stop timer from Day Assistant V2
- [ ] Verify session saved with correct source

#### Multiple Timers
- [ ] Start a timer from Task Assistant
- [ ] Try to start another timer from Day Assistant V2
- [ ] Verify only one timer runs at a time
- [ ] Stop first timer
- [ ] Verify session saved correctly
- [ ] Start second timer
- [ ] Verify it works independently

### 4. Browser Compatibility

#### Modern Browsers
- [ ] Test in Chrome/Edge (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (latest)
- [ ] Verify UUID generation works (crypto.randomUUID)
- [ ] Verify backdrop blur renders correctly

#### Older Browsers
- [ ] Test in older browser (or simulate by disabling crypto.randomUUID)
- [ ] Verify UUID fallback generates valid IDs
- [ ] Verify localStorage backup still works
- [ ] Verify animations still render

### 5. Mobile Responsiveness

#### Mobile Views
- [ ] Test on mobile device or mobile viewport
- [ ] Verify FOCUS button is accessible
- [ ] Verify backdrop covers entire viewport
- [ ] Verify timer box is visible and interactive
- [ ] Verify shake animation works on mobile
- [ ] Test touch interactions with buttons

### 6. Database & Data Integrity

#### Database Queries
```sql
-- Test query: Get all time sessions for a user
SELECT * FROM time_sessions 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY started_at DESC;

-- Verify session types
SELECT session_type, COUNT(*) as count 
FROM time_sessions 
GROUP BY session_type;

-- Verify task sources
SELECT task_source, COUNT(*) as count 
FROM time_sessions 
GROUP BY task_source;
```

#### Data Validation
- [ ] All sessions have non-null `task_id`
- [ ] All sessions have non-empty `task_title`
- [ ] All sessions have valid `session_type` (manual/pomodoro/focus)
- [ ] All sessions have valid `task_source` (assistant_tasks/day_assistant_v2)
- [ ] All sessions have `duration_seconds > 0`
- [ ] Timestamps are valid and in correct order (started_at < ended_at)

### 7. Edge Cases

#### Zero-Duration Sessions
- [ ] Start timer
- [ ] Immediately stop timer (0-1 seconds)
- [ ] Verify session is NOT saved (duration check)

#### Long-Running Timers
- [ ] Start timer
- [ ] Let run for over 1 hour
- [ ] Stop timer
- [ ] Verify session saved with correct duration
- [ ] Verify no overflow issues

#### Focus Mode + Timer Stop
- [ ] Start timer
- [ ] Enter focus mode
- [ ] Stop timer (which should exit focus mode automatically)
- [ ] Verify focus mode exits
- [ ] Verify backdrop disappears
- [ ] Verify session saved correctly

#### Page Refresh
- [ ] Start timer
- [ ] Enter focus mode
- [ ] Refresh page
- [ ] Verify timer state persists (localStorage)
- [ ] Note: Focus mode state may not persist (by design)

## Performance Testing

### Animation Performance
- [ ] Monitor FPS during shake animation
- [ ] Verify no layout thrashing
- [ ] Check that transform is used (not left/right)
- [ ] Verify GPU acceleration is active

### Memory Usage
- [ ] Open browser performance tools
- [ ] Start/stop timers multiple times
- [ ] Enter/exit focus mode multiple times
- [ ] Monitor memory for leaks
- [ ] Verify all intervals/timeouts are cleaned up

### Database Performance
- [ ] Create 100+ time sessions
- [ ] Query sessions by task_id
- [ ] Verify query completes in < 100ms
- [ ] Check indexes are being used

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab to FOCUS button
- [ ] Press Enter/Space to activate
- [ ] Verify focus mode toggles
- [ ] Tab through timer controls
- [ ] Verify all buttons are keyboard accessible

### Screen Reader
- [ ] Test with screen reader (NVDA/JAWS/VoiceOver)
- [ ] Verify FOCUS button has clear label
- [ ] Verify timer state is announced
- [ ] Verify button state changes are announced

### Motion Sensitivity
- [ ] Verify shake animation is subtle (±2px)
- [ ] Check that animation respects user preferences
- [ ] Consider adding `prefers-reduced-motion` support

## Known Issues & Limitations

### Existing Issues (Not Our Responsibility)
- ⚠️ Badge.tsx has pre-existing TypeScript error (onClick type issue)
- ⚠️ Some admin pages have missing React declarations

### By Design
- ✓ Focus mode state doesn't persist across page refreshes
- ✓ Only one timer can be active at a time
- ✓ Sessions with 0 seconds duration are not saved
- ✓ Shake animation only in focus mode

## Success Criteria

All checkboxes in the following sections must be checked:
- [ ] All "Unified Time Tracking" tests pass
- [ ] All "Focus Mode Feature" tests pass
- [ ] All "Cross-Component Integration" tests pass
- [ ] All "Browser Compatibility" tests pass
- [ ] All "Database & Data Integrity" checks pass
- [ ] No memory leaks detected
- [ ] No accessibility violations

## Post-Deployment Monitoring

### Metrics to Track
1. **Session Success Rate**: % of timer stops that successfully save
2. **Offline Usage**: Number of localStorage-only sessions
3. **Focus Mode Adoption**: % of users who use focus mode
4. **Session Duration Distribution**: Average session length by type
5. **Error Rate**: Database save failures

### Potential Issues to Watch
- Database connection failures
- localStorage quota exceeded
- UUID generation failures on old browsers
- Animation performance on low-end devices

## Testing Tools

### Recommended Tools
- **Browser DevTools**: Network, Performance, Console
- **React DevTools**: Component state inspection
- **Supabase Dashboard**: Database queries and monitoring
- **Lighthouse**: Performance and accessibility audit
- **axe DevTools**: Accessibility testing

### Test Data Cleanup
After testing, clean up test data:
```sql
DELETE FROM time_sessions 
WHERE task_title LIKE '%TEST%' 
OR duration_seconds < 5;
```

## Conclusion

This comprehensive testing plan ensures that:
1. All timer types save sessions correctly
2. Focus mode works as designed
3. No performance or memory issues
4. Cross-browser compatibility
5. Accessibility standards met
6. Data integrity maintained

**Status**: ✅ Implementation Complete - Ready for Manual Testing
**Next Step**: Deploy to staging environment and begin manual testing
