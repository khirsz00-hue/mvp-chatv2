# Quick Test Checklist: Recommendation Persistence Fix

## Before Testing
- [ ] Apply database migration: `supabase/migrations/20251223_applied_recommendations.sql`
- [ ] Verify table exists: `SELECT * FROM day_assistant_v2_applied_recommendations LIMIT 1;`
- [ ] Deploy updated code to your environment

## Test 1: Basic Persistence ✅
1. [ ] Open Day Assistant V2
2. [ ] Find a recommendation (if none, adjust sliders or add tasks)
3. [ ] Click "Zastosuj" button on a recommendation
4. [ ] Check console for: `✅ [Apply Recommendation] Persisted to database`
5. [ ] Query database to verify record was created:
   ```sql
   SELECT * FROM day_assistant_v2_applied_recommendations 
   WHERE user_id = 'your-user-id' 
   ORDER BY applied_at DESC LIMIT 1;
   ```

## Test 2: Background Sync ✅
1. [ ] Keep page open after applying recommendation
2. [ ] Wait 2 minutes for background sync
3. [ ] Check console for: `🔍 [Recommend] Generated X recommendations, Y already applied`
4. [ ] Verify recommendation does NOT reappear
5. [ ] SUCCESS: Recommendation stayed hidden!

## Test 3: Page Refresh ✅
1. [ ] Refresh the page (F5)
2. [ ] Wait for page to load
3. [ ] Check recommendations panel
4. [ ] Verify applied recommendation does NOT reappear
5. [ ] SUCCESS: Persistence works across sessions!

## Test 4: Multiple Recommendations ✅
1. [ ] Apply 2-3 different recommendations
2. [ ] Verify each shows: `✅ [Apply Recommendation] Persisted to database`
3. [ ] Refresh page
4. [ ] Verify all applied recommendations stay hidden
5. [ ] Query database:
   ```sql
   SELECT recommendation_id, recommendation_type, applied_at 
   FROM day_assistant_v2_applied_recommendations 
   WHERE user_id = 'your-user-id';
   ```
6. [ ] SUCCESS: All applied recommendations persisted!

## Test 5: Error Handling (Optional) ⚠️
1. [ ] Temporarily break database connection
2. [ ] Apply a recommendation
3. [ ] Check console for: `❌ [Apply Recommendation] Failed to persist`
4. [ ] Verify recommendation still applies locally (tasks reordered/etc)
5. [ ] Restore database connection
6. [ ] SUCCESS: Graceful degradation works!

## Final Verification Checklist
- [ ] Recommendations don't return after being applied
- [ ] Background sync doesn't cause recommendations to reappear
- [ ] Page refresh doesn't cause recommendations to reappear
- [ ] Database has records in `day_assistant_v2_applied_recommendations`
- [ ] Console logs show successful persistence
- [ ] No errors in console or Supabase logs
- [ ] Application still works if database persistence fails

## Expected Console Output

### ✅ Success Case
```
🔍 [Apply Recommendation] Starting: GROUP_SIMILAR
✅ [Apply Recommendation] Persisted to database: group-deep_work-123456789 (GROUP_SIMILAR)
✅ [Apply Recommendation] Success, refreshing data...
🔍 [Recommend] Generated 5 recommendations, 1 already applied, returning 4 active
```

### ⚠️ Error Case (Graceful Degradation)
```
🔍 [Apply Recommendation] Starting: GROUP_SIMILAR
❌ [Apply Recommendation] Failed to persist recommendation group-deep_work-123456789 (GROUP_SIMILAR) to database: {error}
✅ [Apply Recommendation] Success, refreshing data...
```

## If Tests Fail

### Recommendation Reappears After Refresh
1. Check if migration was applied successfully
2. Verify RLS policies are working
3. Check Supabase logs for errors
4. Query database to see if record exists

### "Failed to persist to database" Error
1. Verify migration was applied
2. Check Supabase connection
3. Verify table exists: `\dt day_assistant_v2_applied_recommendations`
4. Check RLS policies: `\dp day_assistant_v2_applied_recommendations`

### No Recommendations Showing
1. Not a bug - you might not have any recommendations!
2. Try adjusting energy/focus sliders
3. Try adding tasks with similar contexts (3+ with same context_type)
4. Wait up to 2 minutes for recommendations to generate

## Quick Database Queries

### View All Applied Recommendations
```sql
SELECT 
  user_id,
  recommendation_id,
  recommendation_type,
  applied_at
FROM day_assistant_v2_applied_recommendations
ORDER BY applied_at DESC;
```

### View Applied Recommendations for Specific User
```sql
SELECT 
  recommendation_id,
  recommendation_type,
  applied_at
FROM day_assistant_v2_applied_recommendations
WHERE user_id = 'your-user-id'
ORDER BY applied_at DESC;
```

### Count Applied Recommendations by Type
```sql
SELECT 
  recommendation_type,
  COUNT(*) as count
FROM day_assistant_v2_applied_recommendations
GROUP BY recommendation_type
ORDER BY count DESC;
```

### Clean Up Old Recommendations (30+ days)
```sql
SELECT cleanup_old_applied_recommendations();
```

## Success! 🎉

If all tests pass:
- ✅ Recommendations are properly persisted
- ✅ Background sync works correctly
- ✅ Page refresh works correctly
- ✅ Database persistence is working
- ✅ Error handling is graceful

You're all set! The bug is fixed.

## Questions?

See full documentation:
- `RECOMMENDATION_PERSISTENCE_FIX.md` - Technical details
- `VERIFICATION_RECOMMENDATION_PERSISTENCE.md` - Complete testing guide
