# Todoist Sync Setup Guide

## Overview
This guide explains how to set up the centralized Todoist → Supabase synchronization system that ensures both TasksAssistant and DayAssistantV2 use the same data source.

## Prerequisites
- Supabase project with database access
- Todoist OAuth configured in the application
- User authentication working

## Step 1: Run SQL Migration

Run the SQL migration in your Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the contents of `supabase/migrations/20251218_todoist_sync.sql`
4. Execute the query

The migration will:
- Create `sync_metadata` table to track sync timestamps
- Add `todoist_id` and `synced_at` columns to `test_day_assistant_tasks`
- Create necessary indexes for performance
- Set up RLS policies for security

## Step 2: Verify Tables

After running the migration, verify the tables exist:

```sql
-- Check sync_metadata table
SELECT * FROM sync_metadata LIMIT 1;

-- Check test_day_assistant_tasks has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'test_day_assistant_tasks' 
AND column_name IN ('todoist_id', 'synced_at');

-- Check unique index exists
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'test_day_assistant_tasks' 
AND indexname = 'idx_tasks_user_assistant_todoist';
```

## Step 3: Test Sync Endpoint

Test the sync endpoint manually (after deployment):

```bash
# Get your auth token from Supabase (logged in user)
curl -X POST https://your-domain.com/api/todoist/sync \
  -H "Authorization: Bearer YOUR_SUPABASE_AUTH_TOKEN"
```

Expected response (first sync):
```json
{
  "success": true,
  "synced_at": "2025-12-18T14:30:00.000Z",
  "task_count": 42,
  "message": "Successfully synced 42 tasks"
}
```

Expected response (cached sync within 10 seconds):
```json
{
  "message": "Sync skipped - too soon",
  "last_synced": "2025-12-18T14:30:00.000Z",
  "seconds_since": 5
}
```

## How It Works

### Architecture

```
┌─────────────────┐
│ TasksAssistant  │──┐
└─────────────────┘  │
                     │   ┌──────────────────┐
                     ├──→│ Global Sync      │
                     │   │ Coordinator      │
┌─────────────────┐  │   └────────┬─────────┘
│ DayAssistantV2  │──┘            │
└─────────────────┘                │
                                   ▼
                          ┌────────────────┐
                          │ /api/todoist/  │
                          │     sync       │
                          └────────┬───────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
            ┌─────────────┐  ┌──────────┐  ┌──────────┐
            │ Todoist API │  │ Supabase │  │  Cache   │
            │   (fetch)   │  │ (upsert) │  │ (10s TTL)│
            └─────────────┘  └──────────┘  └──────────┘
```

### Sync Flow

1. **Component triggers sync** (TasksAssistant or DayAssistantV2)
2. **Global coordinator checks**:
   - Is another sync in progress? → Reuse it
   - Was last sync < 10s ago? → Skip
3. **Sync endpoint executes**:
   - Check database cache (sync_metadata)
   - If < 10s since last sync → Return cached response
   - Fetch all tasks from Todoist API
   - Map tasks to TestDayTask format
   - Upsert tasks to Supabase (update existing, insert new)
   - Delete stale tasks no longer in Todoist
   - Update sync metadata
4. **Components fetch data** from synchronized Supabase tables

### Field Mapping

Todoist tasks are mapped to TestDayTask format:

| Todoist Field | TestDayTask Field | Logic |
|--------------|-------------------|-------|
| `id` | `todoist_id` | Direct mapping |
| `content` | `title` | Direct mapping |
| `description` | `description` | Direct mapping |
| `priority` | `priority` | Direct mapping |
| `labels` | `context_type` | 'admin', 'komunikacja', 'prywatne', or 'code' (default) |
| `labels` + `priority` | `is_must` | `labels.includes('must')` OR `priority === 4` |
| `priority >= 3` | `is_important` | Boolean |
| `priority` | `cognitive_load` | `Math.min(5 - priority + 1, 5)` |
| `due.date` | `due_date` | Direct mapping |
| - | `estimate_min` | Default: 30 |

## Performance & Rate Limits

### Todoist API Rate Limits
- **Limit**: 450 requests per 15 minutes
- **Our usage**: Max 6 requests/minute (90 requests/15min) with 10s cache
- **Safety margin**: 360 unused requests (80% headroom)

### Sync Behavior
- **Cache duration**: 10 seconds
- **Background sync**: Every 10 seconds (coordinated across components)
- **Concurrent protection**: Global coordinator prevents duplicate syncs

## Monitoring

### Check Sync Status

```sql
-- View recent sync operations
SELECT 
  user_id,
  sync_type,
  last_synced_at,
  task_count,
  NOW() - last_synced_at as time_since_sync
FROM sync_metadata
WHERE sync_type = 'todoist'
ORDER BY last_synced_at DESC;

-- View synced tasks
SELECT 
  title,
  todoist_id,
  context_type,
  is_must,
  due_date,
  synced_at
FROM test_day_assistant_tasks
WHERE todoist_id IS NOT NULL
ORDER BY synced_at DESC
LIMIT 20;
```

### Console Logs

Look for these log patterns:

```
[SyncCoordinator] Starting new sync
[Sync] ✅ Synced 42 tasks from Todoist
[SyncCoordinator] Reusing ongoing sync
[SyncCoordinator] Skipping - last sync was 7s ago
```

## Troubleshooting

### Issue: Tasks not appearing in DayAssistantV2

**Check**:
1. Are tasks synced to database?
   ```sql
   SELECT COUNT(*) FROM test_day_assistant_tasks WHERE todoist_id IS NOT NULL;
   ```
2. Is the assistant_id correct?
   ```sql
   SELECT * FROM assistant_config WHERE name = 'asystent dnia v2';
   ```
3. Check browser console for sync errors

### Issue: Sync endpoint returns 401 Unauthorized

**Fix**: Ensure you're passing a valid Supabase auth token, not a Todoist token:
```javascript
const { data: { session } } = await supabase.auth.getSession()
const authToken = session.access_token // Use this
```

### Issue: Duplicate tasks appearing

**Check**: The unique index on (user_id, assistant_id, todoist_id):
```sql
SELECT * FROM pg_indexes 
WHERE tablename = 'test_day_assistant_tasks' 
AND indexname = 'idx_tasks_user_assistant_todoist';
```

If missing, re-run the migration.

### Issue: Excessive Todoist API calls

**Check**: 
1. Is the global coordinator active?
   - Look for `[SyncCoordinator]` logs
2. Are multiple browser tabs open?
   - This is OK - coordinator handles it
3. Check sync_metadata timestamps:
   ```sql
   SELECT last_synced_at, NOW() - last_synced_at as age
   FROM sync_metadata WHERE sync_type = 'todoist';
   ```

## Security Notes

- RLS policies ensure users can only access their own data
- All sync operations require authentication
- Todoist tokens are never exposed to the client
- No SQL injection vulnerabilities (parameterized queries)
- CodeQL security scan: 0 alerts

## Rollback

If you need to rollback:

```sql
-- Remove sync system
DROP TABLE IF EXISTS sync_metadata CASCADE;

-- Remove columns from test_day_assistant_tasks
ALTER TABLE test_day_assistant_tasks 
DROP COLUMN IF EXISTS todoist_id,
DROP COLUMN IF EXISTS synced_at;

-- Remove unique index
DROP INDEX IF EXISTS idx_tasks_user_assistant_todoist;
```

**Note**: This will not delete any manually created tasks.

## Next Steps

After successful setup:

1. ✅ Verify sync works in both components
2. ✅ Monitor console logs for errors
3. ✅ Check Supabase database for synced tasks
4. ✅ Test with multiple browser tabs
5. ✅ Verify rate limits are respected

For issues or questions, check the console logs and database tables first.
