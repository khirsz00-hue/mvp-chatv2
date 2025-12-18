# Day Assistant v2 Database Migration Instructions

This document provides step-by-step instructions for migrating from `test_day_*` tables to `day_assistant_v2_*` tables.

## Overview

The migration renames all Day Assistant v2 database tables to remove the `test_` prefix and adopt production-ready naming:
- `test_day_assistant_tasks` → `day_assistant_v2_tasks`
- `test_day_plan` → `day_assistant_v2_plan`
- `test_day_proposals` → `day_assistant_v2_proposals`
- `test_day_decision_log` → `day_assistant_v2_decision_log`
- `test_day_subtasks` → `day_assistant_v2_subtasks`
- `test_day_undo_history` → `day_assistant_v2_undo_history`

## Prerequisites

- PostgreSQL access to your Supabase database
- Database backup (recommended)
- Application downtime window (5-10 minutes)

## Step-by-Step Migration

### Step 1: Backup Database

```bash
# Create a backup before migration
pg_dump -h your-db-host -U postgres -d postgres > backup_before_v2_migration_$(date +%Y%m%d).sql
```

### Step 2: Run Migration Script

Connect to your database and execute the migration:

```bash
# Using psql
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20251218_rename_to_v2.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Paste the contents of `supabase/migrations/20251218_rename_to_v2.sql`
3. Execute

### Step 3: Verify Migration

Run these verification queries to ensure the migration was successful:

```sql
-- 1. Check all new tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'day_assistant_v2_%'
ORDER BY tablename;

-- Expected output (6 tables):
-- day_assistant_v2_decision_log
-- day_assistant_v2_plan
-- day_assistant_v2_proposals
-- day_assistant_v2_subtasks
-- day_assistant_v2_tasks
-- day_assistant_v2_undo_history

-- 2. Check old tables are gone
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'test_day_%'
ORDER BY tablename;

-- Expected output: 0 rows (or empty result)

-- 3. Verify indexes were renamed
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_v2_%'
ORDER BY indexname;

-- Expected output: Multiple indexes starting with idx_v2_

-- 4. Check record counts
SELECT 
  'tasks' as table_name, COUNT(*) as count FROM day_assistant_v2_tasks
UNION ALL
SELECT 'plan', COUNT(*) FROM day_assistant_v2_plan
UNION ALL
SELECT 'proposals', COUNT(*) FROM day_assistant_v2_proposals
UNION ALL
SELECT 'decision_log', COUNT(*) FROM day_assistant_v2_decision_log
UNION ALL
SELECT 'subtasks', COUNT(*) FROM day_assistant_v2_subtasks
UNION ALL
SELECT 'undo_history', COUNT(*) FROM day_assistant_v2_undo_history;

-- 5. Verify foreign key constraints still work
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name LIKE 'day_assistant_v2_%';

-- 6. Test RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE 'day_assistant_v2_%'
ORDER BY tablename, policyname;
```

### Step 4: Deploy Code Changes

Deploy the updated application code that references the new table names:
- Updated files in `lib/services/dayAssistantV2Service.ts`
- Updated files in `app/api/todoist/sync/route.ts`
- Updated files in `app/api/day-assistant-v2/proposal/route.ts`

```bash
# Deploy via your CI/CD or manually
git pull
npm run build
npm run start
```

### Step 5: Test Application

1. Log in to the application
2. Navigate to Day Assistant v2 page
3. Verify tasks are visible
4. Test creating a new task
5. Test postponing a task
6. Test Todoist sync if applicable
7. Check browser console for any errors

## Verification Checklist

- [ ] All 6 tables renamed successfully
- [ ] Indexes renamed correctly
- [ ] Foreign keys intact
- [ ] RLS policies working
- [ ] Record counts match pre-migration
- [ ] Application loads without errors
- [ ] Tasks display correctly
- [ ] Task creation works
- [ ] Task updates work
- [ ] Todoist sync works (if enabled)
- [ ] No 23505 unique constraint errors

## Rollback Instructions

If you need to rollback the migration:

```sql
-- Rollback: Rename tables back to original names
ALTER TABLE day_assistant_v2_tasks RENAME TO test_day_assistant_tasks;
ALTER TABLE day_assistant_v2_plan RENAME TO test_day_plan;
ALTER TABLE day_assistant_v2_proposals RENAME TO test_day_proposals;
ALTER TABLE day_assistant_v2_decision_log RENAME TO test_day_decision_log;
ALTER TABLE day_assistant_v2_subtasks RENAME TO test_day_subtasks;
ALTER TABLE day_assistant_v2_undo_history RENAME TO test_day_undo_history;

-- Rollback: Rename indexes back
ALTER INDEX IF EXISTS idx_v2_tasks_user_assistant RENAME TO idx_test_day_tasks_user_assistant;
ALTER INDEX IF EXISTS idx_v2_tasks_due RENAME TO idx_test_day_tasks_due;
ALTER INDEX IF EXISTS idx_v2_tasks_must RENAME TO idx_test_day_tasks_must;
ALTER INDEX IF EXISTS idx_v2_tasks_postpone RENAME TO idx_test_day_tasks_postpone;
ALTER INDEX IF EXISTS idx_v2_plan_date RENAME TO idx_test_day_plan_date;
ALTER INDEX IF EXISTS idx_v2_proposals_status RENAME TO idx_test_day_proposals_status;
ALTER INDEX IF EXISTS idx_v2_decision_log_user RENAME TO idx_test_day_decision_log_user;
ALTER INDEX IF EXISTS idx_v2_undo_expires RENAME TO idx_test_day_undo_expires;
ALTER INDEX IF EXISTS idx_v2_tasks_todoist_id RENAME TO idx_tasks_todoist_id;
ALTER INDEX IF EXISTS idx_v2_tasks_user_assistant_todoist RENAME TO idx_tasks_user_assistant_todoist;

-- Rollback: Rename triggers back
ALTER TRIGGER IF EXISTS update_v2_tasks_updated_at ON test_day_assistant_tasks RENAME TO update_test_day_tasks_updated_at;
ALTER TRIGGER IF EXISTS update_v2_plan_updated_at ON test_day_plan RENAME TO update_test_day_plan_updated_at;

-- Rollback: Recreate RLS policies with old table references
DROP POLICY IF EXISTS "Users can view subtasks of their tasks" ON test_day_subtasks;
DROP POLICY IF EXISTS "Users can create subtasks for their tasks" ON test_day_subtasks;
DROP POLICY IF EXISTS "Users can update subtasks of their tasks" ON test_day_subtasks;
DROP POLICY IF EXISTS "Users can delete subtasks of their tasks" ON test_day_subtasks;

CREATE POLICY "Users can view subtasks of their tasks"
  ON test_day_subtasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM test_day_assistant_tasks
    WHERE id = test_day_subtasks.task_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create subtasks for their tasks"
  ON test_day_subtasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM test_day_assistant_tasks
    WHERE id = test_day_subtasks.task_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update subtasks of their tasks"
  ON test_day_subtasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM test_day_assistant_tasks
    WHERE id = test_day_subtasks.task_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete subtasks of their tasks"
  ON test_day_subtasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM test_day_assistant_tasks
    WHERE id = test_day_subtasks.task_id
    AND user_id = auth.uid()
  ));

-- Verify rollback
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'test_day_%'
ORDER BY tablename;
```

After running rollback SQL, you'll need to revert the code changes as well.

## Common Issues

### Issue: "relation does not exist" errors
**Solution**: Ensure the migration script completed successfully and all tables were renamed.

### Issue: Foreign key constraint violations
**Solution**: PostgreSQL automatically updates foreign key constraints when tables are renamed. Verify with the foreign key query in Step 3.

### Issue: RLS policy errors
**Solution**: The migration recreates RLS policies for subtasks table. Verify policies exist with the RLS query in Step 3.

### Issue: 23505 unique constraint violation on sync
**Solution**: This was fixed by using proper `upsert` instead of select→update/insert loop. Ensure you're running the latest code.

## Support

If you encounter issues during migration:
1. Check the verification queries output
2. Review database logs for errors
3. Consult with your database administrator
4. Use the rollback instructions if needed

## Post-Migration

After successful migration:
- Update any external scripts or tools that reference the old table names
- Update documentation
- Monitor application logs for any issues
- Consider removing backup files after stability is confirmed (30 days+)
