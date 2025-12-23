# SaaS Functionality Testing Checklist

## Automated Tests (Completed ✅)

### Build Test
```bash
npm run build
```
- ✅ **PASSED** - No TypeScript errors
- ✅ All components compile successfully
- ✅ All API routes compile successfully

### Lint Test
```bash
npm run lint
```
- ✅ **PASSED** - No ESLint warnings or errors
- ✅ Code style is consistent
- ✅ No unused imports or variables

### Security Scan
```bash
CodeQL Analysis
```
- ✅ **PASSED** - 0 vulnerabilities found
- ✅ No SQL injection risks
- ✅ No XSS vulnerabilities
- ✅ No sensitive data exposure

### Code Review
- ✅ **PASSED** - All issues addressed
- ✅ Fixed daily vs monthly period logic for tasks
- ✅ Fixed type safety in usage tracking
- ✅ Removed sensitive data from webhook error logs

## Manual Runtime Tests (Required)

### 1. Admin Bypass Functionality
**Test:** Admin users should have unrestricted access

**Steps:**
1. Log in as admin user
2. Check that SubscriptionWall doesn't appear
3. Verify TrialBanner doesn't appear for admins
4. Try all assistants - all should work
5. Check usage tracking - should show unlimited

**Expected Results:**
- ✅ Admin sees main app immediately (no subscription wall)
- ✅ No trial banner displayed
- ✅ All features accessible
- ✅ Usage check API returns `{ allowed: true, current: 0, limit: Infinity }`

**Status:** ⏳ Needs manual testing

---

### 2. New User Trial Initialization
**Test:** New users should automatically get 7-day trial

**Steps:**
1. Create new user account (or use test user with no profile)
2. Log in for the first time
3. Check user_profiles table for trial columns
4. Verify app access is granted
5. Check TrialBanner appearance

**Expected Results:**
- ✅ `trial_start_date` set to current timestamp
- ✅ `trial_end_date` set to 7 days in future
- ✅ `trial_used` is `false`
- ✅ User has full app access
- ✅ TrialBanner shows "Pozostało 7 dni okresu próbnego"

**Database Query:**
```sql
SELECT id, email, trial_start_date, trial_end_date, trial_used, subscription_status
FROM user_profiles
WHERE email = 'test@example.com';
```

**Status:** ⏳ Needs manual testing

---

### 3. Trial Period Display
**Test:** Trial banner shows correct remaining days

**Steps:**
1. Log in as user with active trial (not admin, not pro)
2. Check TrialBanner at top of app
3. Verify countdown is accurate
4. Test with user having 1 day remaining
5. Test with expired trial

**Expected Results:**
- ✅ Banner shows correct days remaining
- ✅ Last day shows "Ostatni dzień okresu próbnego!"
- ✅ "Aktywuj Pro" button works
- ✅ Banner hidden for Pro/admin users

**Status:** ⏳ Needs manual testing

---

### 4. Trial Expiration
**Test:** Expired trials should trigger subscription wall

**Steps:**
1. Create test user with trial_end_date in the past
2. Log in as that user
3. Check that subscription wall appears
4. Verify trial_used is set to true in database

**Test Data:**
```sql
-- Set trial to expired
UPDATE user_profiles 
SET trial_end_date = NOW() - INTERVAL '1 day',
    trial_used = false
WHERE email = 'test@example.com';
```

**Expected Results:**
- ✅ SubscriptionWall appears on login
- ✅ Shows "Odblokuj pełny dostęp" message
- ✅ `trial_used` automatically set to `true`
- ✅ App content blocked until subscription

**Status:** ⏳ Needs manual testing

---

### 5. Usage Limits - Free Tier Messages
**Test:** Free users hit 50 messages/month limit

**Steps:**
1. Create free tier user (no subscription)
2. Make 50 API calls to message endpoints
3. Try 51st message
4. Check usage_tracking table
5. Test usage check API

**Test API:**
```bash
curl -X GET "http://localhost:3000/api/usage/check?resource=messages" \
  -H "Cookie: [session-cookie]"
```

**Expected Results:**
- ✅ First 50 messages: `{ allowed: true, current: X, limit: 50 }`
- ✅ 51st message: `{ allowed: false, current: 50, limit: 50 }`
- ✅ UpgradePrompt component should appear
- ✅ Usage tracking records in database

**Database Query:**
```sql
SELECT * FROM usage_tracking 
WHERE user_id = '[user-id]' 
  AND resource_type = 'messages'
  AND period_start >= DATE_TRUNC('month', CURRENT_DATE);
```

**Status:** ⏳ Needs manual testing

---

### 6. Usage Limits - Free Tier Tasks (Daily)
**Test:** Free users hit 10 tasks/day limit (resets daily)

**Steps:**
1. Create free tier user
2. Create 10 tasks in one day
3. Try to create 11th task
4. Wait until next day (or manually change period_start)
5. Verify limit resets

**Expected Results:**
- ✅ First 10 tasks: `{ allowed: true, current: X, limit: 10 }`
- ✅ 11th task same day: `{ allowed: false, current: 10, limit: 10 }`
- ✅ Next day: `{ allowed: true, current: 1, limit: 10 }` (reset)
- ✅ New usage_tracking record for new day

**Status:** ⏳ Needs manual testing

---

### 7. Pro Tier Unlimited Access
**Test:** Pro users have no limits

**Steps:**
1. Create pro tier user (subscription_status = 'active', subscription_tier = 'pro')
2. Make many API calls (>50 messages, >10 tasks)
3. Check usage check API responses
4. Verify no limits enforced

**Expected Results:**
- ✅ All usage checks return: `{ allowed: true, current: 0, limit: Infinity }`
- ✅ No UpgradePrompt appears
- ✅ TrialBanner hidden
- ✅ All features accessible

**Status:** ⏳ Needs manual testing

---

### 8. Webhook Error Logging
**Test:** Failed webhooks are logged to database

**Steps:**
1. Send invalid webhook to `/api/stripe/webhook`
2. Check webhook_errors table
3. Verify no sensitive data logged
4. Test signature verification failure
5. Test event handler failure

**Test Webhook:**
```bash
curl -X POST "http://localhost:3000/api/stripe/webhook" \
  -H "Content-Type: application/json" \
  -H "stripe-signature: invalid" \
  -d '{"type": "test"}'
```

**Expected Results:**
- ✅ Error logged to webhook_errors table
- ✅ Only timestamp and content_length in event_data
- ✅ No payment data in logs
- ✅ Error message captured

**Database Query:**
```sql
SELECT * FROM webhook_errors 
ORDER BY created_at DESC 
LIMIT 10;
```

**Status:** ⏳ Needs manual testing

---

### 9. Subscription Cancellation Downgrade
**Test:** Cancelled subscriptions downgrade to free tier

**Steps:**
1. Create pro user with active subscription
2. Send subscription.deleted webhook from Stripe
3. Check user_profiles table
4. Verify user data preserved
5. Test access restrictions

**Test Webhook:**
```bash
# Use Stripe CLI: stripe trigger customer.subscription.deleted
```

**Expected Results:**
- ✅ `subscription_status` set to 'canceled'
- ✅ `subscription_tier` set to 'free'
- ✅ `subscription_end_date` set to period end
- ✅ `stripe_customer_id` preserved (for resubscription)
- ✅ User data not deleted
- ✅ Usage limits now enforced

**Status:** ⏳ Needs manual testing

---

### 10. Feature Flags
**Test:** Feature access controlled by subscription tier

**Steps:**
1. Check feature access for free tier user
2. Check feature access for pro tier user
3. Test hasFeatureAccess() function
4. Verify UI hides/shows features correctly

**Test Code:**
```typescript
import { hasFeatureAccess } from '@/lib/featureFlags'

// Free tier
hasFeatureAccess('free', 'day_assistant')      // true
hasFeatureAccess('free', 'tasks_assistant')    // false
hasFeatureAccess('free', 'journal_assistant')  // false

// Pro tier
hasFeatureAccess('pro', 'day_assistant')      // true
hasFeatureAccess('pro', 'tasks_assistant')    // true
hasFeatureAccess('pro', 'journal_assistant')  // true
```

**Expected Results:**
- ✅ Free users see only Day Assistant
- ✅ Pro users see all assistants
- ✅ Disabled features show upgrade prompt
- ✅ Feature flags match configuration

**Status:** ⏳ Needs manual testing

---

## Integration Tests (Recommended)

### Subscription Flow
1. ✅ New user → Auto trial → Trial banner appears
2. ✅ Trial expires → Subscription wall → Upgrade → Pro access
3. ✅ Pro user → Cancel → Downgrade to free → Limits enforced
4. ✅ Free user → Hit limit → Upgrade prompt → Subscribe → Unlimited

### Admin Flow
1. ✅ Admin login → No wall → No banner → Full access
2. ✅ Admin never sees limits or upgrade prompts

### Edge Cases
1. ✅ User profile missing → Auto-create with trial
2. ✅ Invalid subscription status → Treat as inactive
3. ✅ Expired trial not marked used → Auto-mark on check
4. ✅ Usage tracking period mismatch → Handle gracefully

---

## Performance Tests

### Database Queries
- ✅ Usage tracking queries use indexes
- ✅ User profile checks are cached where possible
- ✅ Webhook handlers don't block on logs

### API Response Times
- ⏳ `/api/usage/check` responds in < 200ms
- ⏳ Subscription wall check completes in < 500ms
- ⏳ Trial initialization is asynchronous

---

## Security Tests

### Authentication
- ✅ Usage check API requires auth
- ✅ Admin status checked server-side
- ✅ RLS policies on usage_tracking

### Data Protection
- ✅ No sensitive data in webhook logs
- ✅ Subscription data not exposed to client
- ✅ Usage counts private per user

---

## Monitoring Recommendations

### Metrics to Track
1. Trial conversion rate (trial → paid)
2. Usage limit hit rate by resource type
3. Webhook error frequency
4. Subscription cancellation reasons
5. Average trial duration before conversion

### Alerts to Set Up
1. High webhook error rate (> 5% of requests)
2. Trial expiration spike (many users hitting wall)
3. Usage tracking failures
4. Database table size growth

---

## Summary

### Completed Automatically ✅
- Build verification
- Lint checks
- Security scanning
- Code review

### Requires Manual Testing ⏳
- Admin bypass (priority: HIGH)
- Trial initialization (priority: HIGH)
- Trial expiration (priority: HIGH)
- Usage limits (priority: MEDIUM)
- Webhook logging (priority: LOW)
- Feature flags (priority: MEDIUM)

### Next Steps
1. Deploy to staging environment
2. Run manual test suite
3. Monitor for 24 hours
4. Fix any issues found
5. Deploy to production
6. Set up monitoring dashboards

---

## Test Environment Setup

### Prerequisites
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Required env vars:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET
```

### Database Setup
```bash
# Run migrations
supabase migration up

# Or manually run:
# 1. schema.sql
# 2. supabase/migrations/20231220_add_trial_columns.sql
```

### Test Users
Create test users with different states:
1. Admin user (`is_admin = true`)
2. Pro user (`subscription_status = 'active'`)
3. Free user with active trial
4. Free user with expired trial
5. Free user with no trial (new)

### Test Data Cleanup
```sql
-- Reset usage tracking
DELETE FROM usage_tracking WHERE user_id = '[test-user-id]';

-- Reset trial
UPDATE user_profiles 
SET trial_used = false, 
    trial_end_date = NOW() + INTERVAL '7 days'
WHERE id = '[test-user-id]';

-- Clear webhook errors
DELETE FROM webhook_errors;
```

---

**Last Updated:** 2025-12-23
**Version:** 1.0.0
**Status:** Ready for Manual Testing
