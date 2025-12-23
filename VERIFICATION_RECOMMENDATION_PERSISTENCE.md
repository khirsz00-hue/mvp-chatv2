# Verification Guide: Recommendation Persistence Fix

## What Was Fixed

The bug where recommendations would return after being applied has been fixed. Previously, recommendations were only stored in `localStorage`, so after background sync, they would reappear. Now they are persisted to the database.

## Changes Summary

### 1. Database Migration (`supabase/migrations/20251223_applied_recommendations.sql`)
- Created `day_assistant_v2_applied_recommendations` table
- Added RLS policies for security
- Created optimized composite index for performance
- Added cleanup function for old recommendations (30+ days)

### 2. Apply Recommendation API (`app/api/day-assistant-v2/apply-recommendation/route.ts`)
- Saves applied recommendations to database after successful application
- Uses upsert to handle duplicates
- Enhanced logging with recommendation ID and type
- Graceful degradation if database save fails

### 3. Recommend API (`app/api/day-assistant-v2/recommend/route.ts`)
- Fetches applied recommendations from database
- Filters them out before returning to client
- Improved error handling and logging
- Shows statistics: generated vs applied vs returned

## How to Test

### Prerequisites
1. You need a running Supabase instance
2. You need to apply the migration to your database
3. You need to be logged in to the application

### Step 1: Apply the Migration

**Option A: Via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20251223_applied_recommendations.sql`
4. Run the SQL
5. Verify table was created:
   ```sql
   SELECT * FROM day_assistant_v2_applied_recommendations LIMIT 1;
   ```

**Option B: Via Supabase CLI**
```bash
supabase db push
# or
supabase migration up
```

### Step 2: Test Apply Recommendation

1. **Open the Day Assistant V2 page**
2. **Ensure you have recommendations showing**
   - If no recommendations appear, adjust your energy/focus sliders
   - Or add some tasks with similar contexts

3. **Apply a recommendation**
   - Click the "Zastosuj" (Apply) button on any recommendation
   - Watch browser console logs

4. **Verify in Console**
   You should see:
   ```
   🔍 [Apply Recommendation] Starting: {type}
   ✅ [Apply Recommendation] Persisted to database: {id} ({type})
   ✅ [Apply Recommendation] Success, refreshing data...
   ```

5. **Verify in Database**
   ```sql
   SELECT 
     recommendation_id,
     recommendation_type,
     applied_at,
     created_at
   FROM day_assistant_v2_applied_recommendations
   WHERE user_id = '{your-user-id}'
   ORDER BY applied_at DESC;
   ```
   You should see the applied recommendation record.

### Step 3: Test Background Sync

1. **Keep the page open**
2. **Wait for background sync** (happens every 2 minutes)
3. **Watch console logs**:
   ```
   [SyncCoordinator] Starting new sync
   [DayAssistantV2] Background sync completed with changes
   🔍 [Recommend] Generated X recommendations, Y already applied, returning Z active
   ```

4. **Verify recommendation doesn't return**
   - The applied recommendation should NOT reappear in the UI
   - Console should show it was filtered out

### Step 4: Test Page Refresh

1. **Refresh the page** (F5 or Cmd+R)
2. **Wait for recommendations to load**
3. **Verify applied recommendation still doesn't appear**
   - This proves database persistence works
   - localStorage alone would have lost this after refresh

### Step 5: Test Cross-Device (Optional)

1. **Log out and log in on a different device/browser**
2. **Navigate to Day Assistant V2**
3. **Verify applied recommendation still doesn't appear**
   - This proves the database is the source of truth

## Expected Console Logs

### When Applying Recommendation
```
🔍 [Apply Recommendation] Starting: GROUP_SIMILAR
✅ [Apply Recommendation] Persisted to database: group-deep_work-1703356800000 (GROUP_SIMILAR)
✅ [Apply Recommendation] Success, refreshing data...
✅ [RecommendationPanel] Applied recommendation: group-deep_work-1703356800000
```

### When Fetching Recommendations (After Apply)
```
🔍 [Recommend] Generated 3 recommendations, 1 already applied, returning 2 active
```

### When Error Occurs (Database Save Fails)
```
❌ [Apply Recommendation] Failed to persist recommendation group-deep_work-1703356800000 (GROUP_SIMILAR) to database: {error details}
```

### When Error Occurs (Fetch Applied Recs Fails)
```
⚠️ [Recommend] Failed to fetch applied recommendations: {error} - continuing without filtering, some recommendations may appear as duplicates
```

## Common Issues and Solutions

### Issue: Migration fails with "table already exists"
**Solution**: The migration uses `IF NOT EXISTS`, so this shouldn't happen. If it does, check if the table was already created:
```sql
SELECT * FROM day_assistant_v2_applied_recommendations;
```

### Issue: Recommendation still reappears
**Solutions**:
1. Check console for error logs
2. Verify the recommendation ID is consistent (check logs)
3. Verify the database record was created (query the table)
4. Check if RLS policies are working (try query as that user)

### Issue: "Failed to persist to database"
**Solutions**:
1. Check Supabase connection
2. Verify migration was applied
3. Check RLS policies are correct
4. Verify user has permission to insert

### Issue: No recommendations showing at all
**Solutions**:
1. Check console for errors
2. Add tasks with different contexts
3. Adjust energy/focus sliders
4. Wait for recommendation refresh (2 minutes)

## Rollback Plan (If Needed)

If the fix causes issues, you can rollback:

### 1. Revert Code Changes
```bash
git revert HEAD
git push
```

### 2. Drop Database Table (Optional)
```sql
DROP TABLE IF EXISTS day_assistant_v2_applied_recommendations CASCADE;
```

**Note**: The frontend will continue to work with just `localStorage` if the database table doesn't exist, due to graceful error handling.

## Database Cleanup

To clean up old applied recommendations (30+ days):

```sql
-- Manual cleanup
DELETE FROM day_assistant_v2_applied_recommendations
WHERE applied_at < NOW() - INTERVAL '30 days';

-- Or use the provided function
SELECT cleanup_old_applied_recommendations();
```

You can set up a cron job in Supabase to run this automatically:
1. Go to Database → Cron Jobs
2. Create new cron job
3. Schedule: `0 2 * * *` (daily at 2am)
4. SQL: `SELECT cleanup_old_applied_recommendations();`

## Performance Metrics

Expected performance improvements:
- **Apply Recommendation**: +5-10ms (database insert)
- **Fetch Recommendations**: +5-15ms (database query)
- **Overall**: Minimal impact, well worth the reliability

The composite index ensures fast lookups:
- Query by user_id: O(log n)
- Query by user_id + recommendation_id: O(log n)

## Security Verification

✅ **RLS Policies**: Users can only see/modify their own recommendations
✅ **SQL Injection**: Protected by Supabase client parameterization
✅ **CodeQL Scan**: No vulnerabilities found
✅ **Authentication**: Uses authenticated Supabase client

## Success Criteria

✅ Recommendation doesn't return after being applied
✅ Works across page refreshes
✅ Works across background syncs
✅ Works across devices (same user)
✅ No security vulnerabilities
✅ No performance degradation
✅ Graceful error handling
✅ Database properly indexed
✅ RLS policies working

## Support

If you encounter issues:
1. Check console logs for errors
2. Query the database to verify data
3. Check Supabase logs for API errors
4. Review the documentation in `RECOMMENDATION_PERSISTENCE_FIX.md`
