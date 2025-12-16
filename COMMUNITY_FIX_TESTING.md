# Community Fix Testing Guide

## Overview
This document provides step-by-step testing instructions to verify that the community login and navigation issues have been fixed.

## Problem Statement Verification

### Issue 1: "Komunikat ze nie jestem zalogowany" (Not logged in message)
**Before:** Community page showed error "Musisz być zalogowany, aby przeglądać posty"  
**After:** Users are redirected to login page if not authenticated

### Issue 2: "Nie ma przycisku wróć do pozostałych asystentów" (No back button)
**Before:** No sidebar navigation on community page  
**After:** Sidebar with all assistants is present on community page

### Issue 3: "Przenosi mnie do strony społeczność automatycznie" (Auto-redirects to community)
**Before:** Main page auto-redirected to community when 'community' was in localStorage  
**After:** Main page stays on main page, no auto-redirect

## Test Cases

### Test 1: Authentication Check (Issue 1)
**Scenario:** Access community page while not logged in

**Steps:**
1. Open browser in incognito/private mode (or clear cookies)
2. Navigate to `http://localhost:3000/community`

**Expected Result:**
- Should show loading spinner briefly
- Should redirect to `/login` page
- Should see login form

**Verification:**
- [ ] Redirected to login page
- [ ] No error message shown about not being logged in
- [ ] Can see "Zaloguj się za pomocą magic link" text

---

### Test 2: Navigation from Community (Issue 2)
**Scenario:** Navigate back to other assistants from community

**Steps:**
1. Log in to the application
2. Navigate to community page via sidebar
3. Observe that sidebar is visible with all assistants
4. Click on "Zadania" (Tasks) in sidebar

**Expected Result:**
- Sidebar should be visible on community page
- "Społeczność" should be highlighted in sidebar
- Clicking "Zadania" should navigate to main page with tasks view

**Verification:**
- [ ] Sidebar is visible on community page
- [ ] "Społeczność" is highlighted (has purple gradient background)
- [ ] Can see all other assistants in sidebar
- [ ] Clicking "Zadania" navigates to `/` with tasks view
- [ ] Clicking "Dziennik" navigates to `/` with journal view
- [ ] Clicking "Decyzje" navigates to `/` with decisions view

---

### Test 3: No Auto-Redirect (Issue 3)
**Scenario:** Visit main page after being on community page

**Steps:**
1. Log in to the application
2. Navigate to community page (click "Społeczność" in sidebar)
3. Wait for page to load
4. Navigate to main page by:
   - Option A: Click on "Zadania" in sidebar
   - Option B: Type `http://localhost:3000/` in address bar
5. Observe the page that loads

**Expected Result:**
- Should stay on main page (`/`)
- Should show tasks view (or other assistant, but NOT community)
- Should NOT auto-redirect to `/community`

**Verification:**
- [ ] URL stays at `/` (main page)
- [ ] Does NOT redirect to `/community`
- [ ] Shows one of the assistants (tasks, day-assistant, etc.)
- [ ] Sidebar shows selected assistant, not community

---

### Test 4: Community Post Detail Page
**Scenario:** Verify navigation on post detail page

**Steps:**
1. Log in and navigate to community page
2. Create a test post or click on existing post
3. Observe the post detail page
4. Look for "Wróć do społeczności" link
5. Try clicking on sidebar items

**Expected Result:**
- Post detail page should have sidebar
- "Wróć do społeczności" link should be present
- Can navigate to other assistants from post detail page

**Verification:**
- [ ] Sidebar is visible on post detail page
- [ ] "Wróć do społeczności" link is present
- [ ] Clicking "Wróć do społeczności" goes to `/community`
- [ ] Can click on other assistants in sidebar to navigate away

---

### Test 5: Mobile Navigation
**Scenario:** Test mobile menu on community page

**Steps:**
1. Open browser dev tools and set to mobile viewport (e.g., iPhone)
2. Log in and navigate to community page
3. Click on hamburger menu (three lines icon)
4. Observe mobile menu
5. Click on "Zadania" in mobile menu

**Expected Result:**
- Mobile menu should open
- Should show all assistants
- Clicking an assistant should close menu and navigate

**Verification:**
- [ ] Hamburger menu icon is visible on mobile
- [ ] Clicking hamburger opens sidebar
- [ ] Sidebar overlays page content
- [ ] Clicking outside sidebar closes it
- [ ] Clicking an assistant in menu navigates and closes menu

---

### Test 6: Authentication Timeout
**Scenario:** Verify timeout handling if auth check is slow

**Steps:**
1. Open browser dev tools
2. Go to Network tab and set throttling to "Slow 3G"
3. Navigate to `/community`
4. Observe loading behavior

**Expected Result:**
- Should show loading spinner
- After 10 seconds (AUTH_CHECK_TIMEOUT_MS), should stop loading
- Should either redirect to login or show page (depending on auth state)

**Verification:**
- [ ] Loading spinner shows
- [ ] Does not load indefinitely
- [ ] Timeout works (check console for timeout message)
- [ ] Eventually shows either login redirect or community page

---

### Test 7: localStorage Edge Cases
**Scenario:** Test localStorage quota and disabled cookies

**Steps:**
1. Open browser dev tools console
2. Navigate to community, then to "Zadania"
3. Check console for any localStorage errors
4. Disable localStorage (in dev tools: Application > Storage > Local Storage > Delete All)
5. Try navigating between assistants

**Expected Result:**
- Should handle localStorage errors gracefully
- Should not crash if localStorage is disabled
- Should log warning in console if localStorage fails

**Verification:**
- [ ] No unhandled localStorage errors
- [ ] Console shows warning for localStorage failures
- [ ] Navigation still works even if localStorage disabled

---

### Test 8: Session Persistence
**Scenario:** Verify session is maintained across page navigations

**Steps:**
1. Log in to the application
2. Navigate to community page
3. Navigate to another assistant (e.g., Zadania)
4. Navigate back to community page
5. Check if still logged in

**Expected Result:**
- Should stay logged in throughout navigation
- Should not need to re-authenticate

**Verification:**
- [ ] Session persists across navigations
- [ ] No login prompts during navigation
- [ ] Can access all pages without re-authentication

---

## Browser Compatibility Testing

Test the fixes on multiple browsers:

- [ ] **Chrome** (latest version)
- [ ] **Firefox** (latest version)
- [ ] **Safari** (if on Mac)
- [ ] **Edge** (latest version)
- [ ] **Mobile Safari** (iOS)
- [ ] **Mobile Chrome** (Android)

## Console Error Checks

During testing, keep browser console open and verify:

- [ ] No unhandled errors in console
- [ ] No React warnings about missing dependencies
- [ ] Authentication logs show expected flow
- [ ] localStorage warnings appear only when appropriate

## Performance Checks

- [ ] Page load time is reasonable (< 2 seconds)
- [ ] Navigation between assistants is smooth
- [ ] No memory leaks (check with dev tools profiler)
- [ ] Mobile performance is acceptable

## Accessibility Checks

- [ ] Sidebar can be navigated with keyboard (Tab key)
- [ ] Screen reader announces navigation changes
- [ ] Focus is managed properly during navigation
- [ ] All interactive elements are keyboard accessible

## Known Issues to Watch For

1. **Auth cookies not set:** If login fails, check Supabase configuration
2. **CORS errors:** Ensure NEXT_PUBLIC_SUPABASE_URL is correct
3. **Infinite redirects:** Check middleware and layout auth logic
4. **Missing sidebar:** Check that layout is properly wrapping community pages

## Rollback Plan

If critical issues are found:

1. Revert the layout file: `git checkout HEAD~1 -- app/community/layout.tsx`
2. Revert MainLayout changes: `git checkout HEAD~1 -- components/layout/MainLayout.tsx`
3. Push revert: `git commit -m "Revert community fixes" && git push`

## Success Criteria

All three original issues should be resolved:

- ✅ **Issue 1:** No "not logged in" error message on community page
- ✅ **Issue 2:** Sidebar navigation is present on community page
- ✅ **Issue 3:** Main page does not auto-redirect to community

---

## Test Results

Date: __________  
Tester: __________

| Test Case | Status | Notes |
|-----------|--------|-------|
| Test 1: Authentication Check | ⬜ Pass / ⬜ Fail | |
| Test 2: Navigation from Community | ⬜ Pass / ⬜ Fail | |
| Test 3: No Auto-Redirect | ⬜ Pass / ⬜ Fail | |
| Test 4: Post Detail Page | ⬜ Pass / ⬜ Fail | |
| Test 5: Mobile Navigation | ⬜ Pass / ⬜ Fail | |
| Test 6: Authentication Timeout | ⬜ Pass / ⬜ Fail | |
| Test 7: localStorage Edge Cases | ⬜ Pass / ⬜ Fail | |
| Test 8: Session Persistence | ⬜ Pass / ⬜ Fail | |

**Overall Result:** ⬜ PASS / ⬜ FAIL

**Additional Comments:**
_______________________________________________
_______________________________________________
_______________________________________________

---

**Document Version:** 1.0  
**Last Updated:** December 16, 2024
