# Testing Guide: Decision Log & AI Insights

## Prerequisites

### Environment Setup

1. **Environment Variables** (`.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
```

2. **Database Setup**:
- Ensure Supabase project is running
- Tables exist: `day_assistant_v2_decision_log`, `day_assistant_v2_tasks`, `journal_entries`, `day_assistant_v2_plan`
- RLS policies are enabled
- User account is created and authenticated

3. **Dependencies**:
```bash
npm install
```

## Manual Testing Checklist

### Part 1: Decision Log Testing

#### Test 1.1: View Existing Decisions
**Steps:**
1. Start the app: `npm run dev`
2. Navigate to Day Assistant V2 (`/day-assistant-v2`)
3. Scroll to bottom of page
4. Locate "Decision Log" panel

**Expected Results:**
- ✅ Panel displays with "📝 Decision Log" title
- ✅ Shows existing decisions (if any)
- ✅ Each decision shows text and timestamp (HH:MM format)
- ✅ If no decisions: "Brak zapisanych decyzji" message
- ✅ Plus (+) button visible in top-right corner

**Test Data Check:**
```sql
-- Verify decisions in database
SELECT id, action, reason, timestamp 
FROM day_assistant_v2_decision_log 
WHERE user_id = 'your-user-id'
ORDER BY timestamp DESC
LIMIT 10;
```

#### Test 1.2: Add New Decision
**Steps:**
1. Click the + button in Decision Log panel
2. Input field should appear with placeholder "Opisz swoją decyzję..."
3. Type: "Test decision: Przełożyłem zadanie X na jutro"
4. Click "Zapisz" button

**Expected Results:**
- ✅ Success toast: "Decyzja zapisana!"
- ✅ New decision appears at top of list
- ✅ Timestamp shows current time in Polish format (HH:MM)
- ✅ Input field closes after save
- ✅ Decision persists after page refresh

**Database Verification:**
```sql
-- Check latest decision
SELECT * FROM day_assistant_v2_decision_log 
WHERE user_id = 'your-user-id'
ORDER BY timestamp DESC
LIMIT 1;
```

#### Test 1.3: Cancel Add Decision
**Steps:**
1. Click + button
2. Type some text
3. Click "Anuluj" button

**Expected Results:**
- ✅ Input field closes
- ✅ Text is cleared
- ✅ No new decision added
- ✅ No database changes

#### Test 1.4: Empty Decision Validation
**Steps:**
1. Click + button
2. Leave input empty or add only whitespace
3. Click "Zapisz"

**Expected Results:**
- ✅ "Zapisz" button should be disabled
- ✅ No save action occurs
- ✅ No error message needed (button disabled prevents action)

#### Test 1.5: Decision Log Persistence
**Steps:**
1. Add a decision
2. Navigate away from Day Assistant V2
3. Navigate back to Day Assistant V2
4. Scroll to Decision Log

**Expected Results:**
- ✅ Decision is still visible
- ✅ Correct timestamp
- ✅ Correct text

### Part 2: AI Insights Testing

#### Test 2.1: Navigate to AI Insights
**Steps:**
1. Look at left sidebar
2. Find "AI Insights" with Sparkle icon (✨)
3. Click on it

**Expected Results:**
- ✅ "AI Insights" link visible in sidebar
- ✅ Purple text color
- ✅ Navigates to `/ai-insights` page
- ✅ URL changes to `/ai-insights`

#### Test 2.2: AI Insights Page Load
**Steps:**
1. Page should load with loading spinner
2. Wait for insights to generate (2-10 seconds)

**Expected Results:**
- ✅ Loading spinner with text "Analizuję Twoje dane..." (if implemented)
- ✅ OR immediate content display (if data cached)
- ✅ No console errors
- ✅ No TypeScript errors

#### Test 2.3: Info Card Display
**Steps:**
1. After page loads, check top section

**Expected Results:**
- ✅ Purple card with title "✨ Czym są AI Insights?"
- ✅ Description text present
- ✅ 4 metrics displayed in grid:
  - Journal entries count
  - Completed tasks count
  - Postponements count
  - Days with plan count
- ✅ Numbers match actual data in database

**Data Verification:**
```sql
-- Journal entries (last 30 days)
SELECT COUNT(*) FROM journal_entries 
WHERE user_id = 'your-user-id' 
AND date >= CURRENT_DATE - INTERVAL '30 days';

-- Completed tasks (last 30 days)
SELECT COUNT(*) FROM day_assistant_v2_tasks 
WHERE user_id = 'your-user-id' 
AND completed = true 
AND completed_at >= NOW() - INTERVAL '30 days';

-- Postponements (last 30 days)
SELECT COUNT(*) FROM day_assistant_v2_decision_log 
WHERE user_id = 'your-user-id' 
AND action = 'postpone' 
AND timestamp >= NOW() - INTERVAL '30 days';

-- Days with plan (last 30 days)
SELECT COUNT(*) FROM day_assistant_v2_plan 
WHERE user_id = 'your-user-id' 
AND plan_date >= CURRENT_DATE - INTERVAL '30 days';
```

#### Test 2.4: Insights Display
**Steps:**
1. Scroll down to see insight cards

**Expected Results:**
- ✅ 5-7 insight cards displayed
- ✅ Each card has:
  - Type icon (ℹ️ blue, ⚠️ orange, or ✅ green)
  - Title (max ~50 characters)
  - Description with specific numbers
  - Details section with key-value pairs
- ✅ Cards are color-coded by type:
  - Info: Blue background (`bg-blue-50`)
  - Warning: Orange background (`bg-orange-50`)
  - Success: Green background (`bg-green-50`)

#### Test 2.5: Summary Stats Display
**Steps:**
1. Scroll to bottom of page
2. Check "📊 Podsumowanie ostatnich 30 dni" section

**Expected Results:**
- ✅ 4 cards in grid layout:
  1. **Sleep Card (Blue)**:
     - Shows avg hours (e.g., "7.3h")
     - Shows quality (e.g., "jakość 7/10")
  2. **Energy Card (Green)**:
     - Shows avg energy (e.g., "5.7/10")
  3. **Motivation Card (Purple)**:
     - Shows avg motivation (e.g., "5.7/10")
  4. **Success Rate Card (Orange)**:
     - Shows percentage (e.g., "100%")
     - Shows completed/total (e.g., "12/12 zadań (7 dni)")

**Calculation Verification:**
```sql
-- Average sleep (last 30 days)
SELECT AVG(hours_slept), AVG(sleep_quality) 
FROM journal_entries 
WHERE user_id = 'your-user-id' 
AND date >= CURRENT_DATE - INTERVAL '30 days';

-- Average energy and motivation
SELECT AVG(energy), AVG(motivation) 
FROM journal_entries 
WHERE user_id = 'your-user-id' 
AND date >= CURRENT_DATE - INTERVAL '30 days';

-- Success rate (last 7 days)
WITH added AS (
  SELECT COUNT(*) as total 
  FROM day_assistant_v2_tasks 
  WHERE user_id = 'your-user-id' 
  AND created_at >= NOW() - INTERVAL '7 days'
),
completed AS (
  SELECT COUNT(*) as done 
  FROM day_assistant_v2_tasks 
  WHERE user_id = 'your-user-id' 
  AND completed = true 
  AND completed_at >= NOW() - INTERVAL '7 days'
)
SELECT 
  completed.done,
  added.total,
  ROUND((completed.done::float / added.total::float) * 100) as percentage
FROM added, completed;
```

#### Test 2.6: Empty State
**Steps:**
1. Test with a new user account (no data)
2. Navigate to AI Insights

**Expected Results:**
- ✅ Shows message: "Brak wystarczających danych do wygenerowania insightów"
- ✅ Suggestion: "Wypełnij dziennik i ukończ kilka zadań"
- ✅ No error cards
- ✅ Info card shows 0s for all metrics

#### Test 2.7: Error Handling
**Steps:**
1. Temporarily disable OpenAI API key or set to invalid value
2. Navigate to AI Insights

**Expected Results:**
- ✅ Error card displayed with red background
- ✅ Error message shown
- ✅ Console logs error details
- ✅ App doesn't crash

#### Test 2.8: Back Navigation
**Steps:**
1. On AI Insights page
2. Click "← Powrót" button (top-left)

**Expected Results:**
- ✅ Navigates back to previous page
- ✅ Uses browser history (router.back())

### Part 3: Integration Testing

#### Test 3.1: End-to-End Flow
**Steps:**
1. Add journal entries for 7 days
2. Create and complete 10 tasks
3. Postpone 2 tasks
4. View Day Assistant V2 - check Decision Log
5. Navigate to AI Insights
6. Wait for insights generation

**Expected Results:**
- ✅ Decision Log shows postpone actions
- ✅ AI Insights shows:
  - 7 journal entries
  - 10 completed tasks
  - 2 postponements
- ✅ Insights reference actual user data
- ✅ Summary stats accurate

#### Test 3.2: Real-time Updates
**Steps:**
1. Open AI Insights in one tab
2. Add journal entry in another tab
3. Refresh AI Insights tab

**Expected Results:**
- ✅ Stats update to include new journal entry
- ✅ Insights may reference new data (if regenerated)

### Part 4: Performance Testing

#### Test 4.1: Page Load Time
**Metrics to Check:**
- Decision Log fetch: Should be < 500ms
- AI Insights page load: Should be < 1s (excluding AI generation)
- AI generation: 2-10 seconds (acceptable)

**How to Test:**
```javascript
// In browser console
performance.getEntriesByType("navigation")[0].loadEventEnd
```

#### Test 4.2: Large Dataset
**Steps:**
1. Create user with 30+ journal entries
2. Create 100+ tasks
3. Load AI Insights

**Expected Results:**
- ✅ Page doesn't hang
- ✅ Insights still generate within 10 seconds
- ✅ Stats calculate correctly

### Part 5: Security Testing

#### Test 5.1: Unauthorized Access
**Steps:**
1. Log out
2. Try to access `/ai-insights` directly

**Expected Results:**
- ✅ Redirects to `/login`
- ✅ No data leaked

#### Test 5.2: Cross-User Data Isolation
**Steps:**
1. Create two user accounts
2. Log in as User A, add decisions
3. Log out, log in as User B
4. Check Decision Log and AI Insights

**Expected Results:**
- ✅ User B sees NO decisions from User A
- ✅ User B's insights only use User B's data
- ✅ RLS policies enforced

### Part 6: Mobile Testing

#### Test 6.1: Responsive Layout
**Steps:**
1. Open in mobile browser or use DevTools mobile view
2. Navigate to AI Insights

**Expected Results:**
- ✅ Info card metrics: 2x2 grid (not 4 columns)
- ✅ Insight cards: stack vertically
- ✅ Summary cards: 2x2 grid
- ✅ Text readable, not cut off
- ✅ Buttons accessible

## Automated Testing Scenarios

### Unit Tests (if implementing)

```typescript
// Example test for Decision Log
describe('DecisionLogPanel', () => {
  it('renders empty state correctly', () => {
    render(<DecisionLogPanel decisions={[]} />)
    expect(screen.getByText('Brak zapisanych decyzji')).toBeInTheDocument()
  })
  
  it('displays decisions with timestamps', () => {
    const decisions = [
      { id: '1', text: 'Test decision', timestamp: '2024-01-15T14:30:00Z' }
    ]
    render(<DecisionLogPanel decisions={decisions} />)
    expect(screen.getByText('Test decision')).toBeInTheDocument()
    expect(screen.getByText('14:30')).toBeInTheDocument()
  })
})
```

### Integration Tests

```typescript
// Example test for AI Insights API
describe('AI Insights API', () => {
  it('returns correct stats structure', async () => {
    const response = await fetch('/api/day-assistant-v2/insights', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await response.json()
    
    expect(data.stats).toHaveProperty('journal_entries_count')
    expect(data.stats).toHaveProperty('completed_tasks_count')
    expect(data.insights).toBeInstanceOf(Array)
  })
})
```

## Known Issues / Limitations

1. **AI Generation Time**: Can take 5-10 seconds on first load (OpenAI API latency)
2. **No Caching**: Insights regenerated on each page load (could be optimized)
3. **30-Day Window**: Only analyzes last 30 days of data
4. **Decision Log Limit**: Only shows 10 most recent decisions

## Troubleshooting

### Issue: "Brak zapisanych decyzji" even after adding
**Solution:**
- Check if `dayPlan?.assistant_id` exists
- Verify RLS policies allow read access
- Check browser console for errors

### Issue: AI Insights shows 0 for all stats
**Solution:**
- Verify user has data in database
- Check date ranges (last 30 days)
- Ensure user_id matches authenticated user

### Issue: "Failed to fetch insights" error
**Solution:**
- Verify OPENAI_API_KEY is valid
- Check Supabase connection
- Review server logs for detailed error

### Issue: Stats don't match database counts
**Solution:**
- Check date filtering (30 days vs 7 days)
- Verify timezone handling
- Check for completed vs active task filters

## Success Criteria

✅ **Decision Log**:
- Loads existing decisions on mount
- Saves new decisions successfully
- Persists after refresh
- Shows timestamps in Polish format

✅ **AI Insights**:
- Accessible from sidebar
- Shows 5-7 personalized insights with real data
- Each insight has proper type/icon/color
- Details section shows raw data
- Stats display correctly
- Summary accurate

✅ **No Breaking Changes**:
- Build successful
- No TypeScript errors
- No console errors in normal operation
- Responsive on mobile

## Post-Deployment Checklist

- [ ] Verify production environment variables set
- [ ] Test with production database
- [ ] Monitor OpenAI API usage and costs
- [ ] Check logs for errors
- [ ] Verify RLS policies in production
- [ ] Test mobile experience on real devices
- [ ] Gather user feedback on insights quality
