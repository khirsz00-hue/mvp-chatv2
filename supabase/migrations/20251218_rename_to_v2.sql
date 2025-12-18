-- Migration: Rename test_day_* tables to day_assistant_v2_*
-- This removes the "test_" prefix and adopts clean naming for production

-- Rename tables
ALTER TABLE test_day_assistant_tasks RENAME TO day_assistant_v2_tasks;
ALTER TABLE test_day_plan RENAME TO day_assistant_v2_plan;
ALTER TABLE test_day_proposals RENAME TO day_assistant_v2_proposals;
ALTER TABLE test_day_decision_log RENAME TO day_assistant_v2_decision_log;
ALTER TABLE test_day_subtasks RENAME TO day_assistant_v2_subtasks;
ALTER TABLE test_day_undo_history RENAME TO day_assistant_v2_undo_history;

-- Rename indexes
-- Indexes from 20251217_test_day_assistant.sql
ALTER INDEX IF EXISTS idx_test_day_tasks_user_assistant RENAME TO idx_v2_tasks_user_assistant;
ALTER INDEX IF EXISTS idx_test_day_tasks_due RENAME TO idx_v2_tasks_due;
ALTER INDEX IF EXISTS idx_test_day_tasks_must RENAME TO idx_v2_tasks_must;
ALTER INDEX IF EXISTS idx_test_day_tasks_postpone RENAME TO idx_v2_tasks_postpone;
ALTER INDEX IF EXISTS idx_test_day_plan_date RENAME TO idx_v2_plan_date;
ALTER INDEX IF EXISTS idx_test_day_proposals_status RENAME TO idx_v2_proposals_status;
ALTER INDEX IF EXISTS idx_test_day_decision_log_user RENAME TO idx_v2_decision_log_user;
ALTER INDEX IF EXISTS idx_test_day_undo_expires RENAME TO idx_v2_undo_expires;

-- Indexes from 20251218_todoist_sync.sql
ALTER INDEX IF EXISTS idx_tasks_todoist_id RENAME TO idx_v2_tasks_todoist_id;
ALTER INDEX IF EXISTS idx_tasks_user_assistant_todoist RENAME TO idx_v2_tasks_user_assistant_todoist;

-- Rename triggers
ALTER TRIGGER IF EXISTS update_test_day_tasks_updated_at ON day_assistant_v2_tasks RENAME TO update_v2_tasks_updated_at;
ALTER TRIGGER IF EXISTS update_test_day_plan_updated_at ON day_assistant_v2_plan RENAME TO update_v2_plan_updated_at;

-- Update foreign key references in RLS policies and constraints
-- Note: Foreign key constraint names are automatically updated by PostgreSQL when tables are renamed
-- RLS policies need to be recreated with updated table references

-- Drop old RLS policies for test_day_subtasks (they reference old table names)
DROP POLICY IF EXISTS "Users can view subtasks of their tasks" ON day_assistant_v2_subtasks;
DROP POLICY IF EXISTS "Users can create subtasks for their tasks" ON day_assistant_v2_subtasks;
DROP POLICY IF EXISTS "Users can update subtasks of their tasks" ON day_assistant_v2_subtasks;
DROP POLICY IF EXISTS "Users can delete subtasks of their tasks" ON day_assistant_v2_subtasks;

-- Recreate RLS policies for subtasks with updated table references
CREATE POLICY "Users can view subtasks of their tasks"
  ON day_assistant_v2_subtasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM day_assistant_v2_tasks
    WHERE id = day_assistant_v2_subtasks.task_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create subtasks for their tasks"
  ON day_assistant_v2_subtasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM day_assistant_v2_tasks
    WHERE id = day_assistant_v2_subtasks.task_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update subtasks of their tasks"
  ON day_assistant_v2_subtasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM day_assistant_v2_tasks
    WHERE id = day_assistant_v2_subtasks.task_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete subtasks of their tasks"
  ON day_assistant_v2_subtasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM day_assistant_v2_tasks
    WHERE id = day_assistant_v2_subtasks.task_id
    AND user_id = auth.uid()
  ));

-- Verification: List all renamed tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'day_assistant_v2_%'
ORDER BY tablename;

-- Verification: Count records in each table (should match old counts)
DO $$
DECLARE
  task_count INTEGER;
  plan_count INTEGER;
  proposal_count INTEGER;
  decision_count INTEGER;
  subtask_count INTEGER;
  undo_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO task_count FROM day_assistant_v2_tasks;
  SELECT COUNT(*) INTO plan_count FROM day_assistant_v2_plan;
  SELECT COUNT(*) INTO proposal_count FROM day_assistant_v2_proposals;
  SELECT COUNT(*) INTO decision_count FROM day_assistant_v2_decision_log;
  SELECT COUNT(*) INTO subtask_count FROM day_assistant_v2_subtasks;
  SELECT COUNT(*) INTO undo_count FROM day_assistant_v2_undo_history;
  
  RAISE NOTICE 'Table record counts after migration:';
  RAISE NOTICE '  day_assistant_v2_tasks: %', task_count;
  RAISE NOTICE '  day_assistant_v2_plan: %', plan_count;
  RAISE NOTICE '  day_assistant_v2_proposals: %', proposal_count;
  RAISE NOTICE '  day_assistant_v2_decision_log: %', decision_count;
  RAISE NOTICE '  day_assistant_v2_subtasks: %', subtask_count;
  RAISE NOTICE '  day_assistant_v2_undo_history: %', undo_count;
END $$;
