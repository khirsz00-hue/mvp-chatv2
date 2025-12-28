# Todoist Sync Error Fix - Verification Guide

## Problem Fixed
**Error:** `record "new" has no field "updated_at"`

**Root Cause:** The `sync_metadata` table was missing an `updated_at` column, which caused errors when database triggers tried to auto-update this field during sync operations.

## Solution Implemented

### 1. Database Migration
Created migration `20251228_add_updated_at_to_sync_metadata.sql` that:
- Adds `updated_at TIMESTAMPTZ DEFAULT NOW()` column to `sync_metadata` table
- Creates trigger to automatically update `updated_at` on row updates

### 2. Schema Update
Updated `supabase/supabase_dayassistantv2_final.sql` to include:
- `updated_at` column in `sync_metadata` table definition
- Trigger for auto-updating `updated_at` field

### 3. Code Verification
Verified that `app/api/todoist/sync/route.ts` already follows best practices:
- Uses `.upsert()` with proper `onConflict` strategy
- Does NOT manually set `updated_at` (trigger handles it)
- Has proper error handling

## Deployment Steps

1. **Deploy Database Migration**
   ```sql
   -- This will run automatically when deployed to Supabase
   -- Or run manually:
   -- psql -f supabase/migrations/20251228_add_updated_at_to_sync_metadata.sql
   ```

2. **Verify Migration Success**
   ```sql
   -- Check if column exists
   SELECT column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_name = 'sync_metadata' AND column_name = 'updated_at';
   
   -- Check if trigger exists
   SELECT trigger_name, event_manipulation, event_object_table
   FROM information_schema.triggers
   WHERE event_object_table = 'sync_metadata';
   ```

## Verification Checklist

### ✅ After Deployment

1. **Check Vercel Logs**
   - Look for sync operations
   - Verify no more `42703` error codes
   - Verify no more "record 'new' has no field 'updated_at'" errors

2. **Test Sync Operation**
   - Go to Day Assistant interface
   - Click the sync button (or wait for auto-sync)
   - Check browser console for success messages
   - Verify tasks are synced correctly

3. **Verify Database**
   ```sql
   -- Check sync metadata records
   SELECT * FROM sync_metadata 
   WHERE sync_type = 'todoist' 
   ORDER BY updated_at DESC;
   
   -- Verify updated_at is being set
   SELECT 
     user_id,
     sync_type,
     last_synced_at,
     updated_at,
     updated_at > created_at as "Auto-Updated"
   FROM sync_metadata
   WHERE sync_type = 'todoist';
   ```

4. **Test Error Handling**
   - Disconnect internet (or block Todoist API)
   - Trigger sync
   - Verify error is logged properly in `sync_metadata`
   - Reconnect and verify recovery

## Expected Behavior

### Before Fix
```
[Sync] Error updating sync metadata: {
  code: '42703',
  details: null,
  hint: null,
  message: 'record "new" has no field "updated_at"'
}
```

### After Fix
```
[Sync] ✅ Synced X tasks from Todoist
{
  success: true,
  synced_at: "2025-12-28T23:00:00.000Z",
  task_count: X,
  message: "Successfully synced X tasks"
}
```

## Rollback Plan

If issues occur after deployment:

1. **Disable Trigger (temporary)**
   ```sql
   ALTER TABLE sync_metadata DISABLE TRIGGER update_sync_metadata_updated_at;
   ```

2. **Remove Column (if needed)**
   ```sql
   ALTER TABLE sync_metadata DROP COLUMN IF EXISTS updated_at;
   ```

3. **Note:** This should NOT be necessary as the change is backward compatible

## Technical Details

### Migration Details
- **File:** `supabase/migrations/20251228_add_updated_at_to_sync_metadata.sql`
- **Adds:** `updated_at` column with default value
- **Creates:** Trigger using existing `update_updated_at_column()` function
- **Safe:** Uses `IF NOT EXISTS` and `IF EXISTS` clauses

### Trigger Function
```sql
-- Already exists from 20231217_day_assistant.sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Table Schema
```sql
CREATE TABLE sync_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL,
  task_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),  -- ADDED
  UNIQUE(user_id, sync_type)
);
```

## Support

If issues persist after deployment:
1. Check Vercel logs for detailed error messages
2. Verify migration ran successfully in Supabase
3. Check if `updated_at` column exists in production database
4. Verify trigger exists and is enabled

## Related Files
- `app/api/todoist/sync/route.ts` - Sync API endpoint (no changes needed)
- `supabase/migrations/20251228_add_updated_at_to_sync_metadata.sql` - Migration
- `supabase/supabase_dayassistantv2_final.sql` - Main schema file
