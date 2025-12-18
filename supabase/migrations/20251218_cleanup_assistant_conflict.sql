-- Migration: Cleanup Day Assistant v1/v2 Conflicts
-- Purpose: Ensure all test_day_assistant_tasks have correct assistant_id for v2
-- Created: 2025-12-18
-- Safe to run multiple times (idempotent)

-- IMPORTANT: This migration is idempotent - safe to run multiple times

-- Step 1: Ensure 'asystent dnia v2' assistant exists for all users
-- This will NOT create duplicates due to UNIQUE constraint on (user_id, name)
INSERT INTO assistant_config (user_id, name, type, settings, is_active)
SELECT 
  u.id,
  'asystent dnia v2',
  'day_planner',
  '{
    "undo_window_seconds": 15,
    "max_postpones": 5,
    "morning_must_block": true,
    "light_task_limit_minutes": 120,
    "auto_decompose_threshold": 45
  }'::jsonb,
  true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM assistant_config 
  WHERE user_id = u.id 
  AND name = 'asystent dnia v2'
)
ON CONFLICT (user_id, name) DO NOTHING;

-- Step 2: Fix assistant_id for all tasks in test_day_assistant_tasks
-- Update tasks that have NULL or incorrect assistant_id
UPDATE test_day_assistant_tasks t
SET assistant_id = (
  SELECT id FROM assistant_config 
  WHERE user_id = t.user_id 
  AND name = 'asystent dnia v2' 
  LIMIT 1
)
WHERE assistant_id IS NULL 
   OR assistant_id NOT IN (
     SELECT id FROM assistant_config 
     WHERE name = 'asystent dnia v2'
   );

-- Step 3: Add foreign key constraint if it doesn't exist
-- This ensures all future tasks will have valid assistant_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_test_day_tasks_assistant_id'
  ) THEN
    ALTER TABLE test_day_assistant_tasks
      ADD CONSTRAINT fk_test_day_tasks_assistant_id 
      FOREIGN KEY (assistant_id) 
      REFERENCES assistant_config(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Step 4: Optional - Mark old v1 assistants as inactive (if they exist)
-- This does NOT delete data, just marks them as inactive
UPDATE assistant_config
SET is_active = false
WHERE name LIKE 'asystent dnia' 
  AND name != 'asystent dnia v2'
  AND is_active = true;

-- Verification queries (commented out, run manually if needed):
-- 
-- -- Check all assistants:
-- SELECT user_id, name, type, is_active, created_at 
-- FROM assistant_config 
-- ORDER BY user_id, name;
-- 
-- -- Check tasks without valid assistant_id:
-- SELECT COUNT(*) as orphaned_tasks
-- FROM test_day_assistant_tasks t
-- WHERE NOT EXISTS (
--   SELECT 1 FROM assistant_config 
--   WHERE id = t.assistant_id 
--   AND name = 'asystent dnia v2'
-- );
-- 
-- -- Check tasks by assistant:
-- SELECT ac.name, ac.is_active, COUNT(t.id) as task_count
-- FROM assistant_config ac
-- LEFT JOIN test_day_assistant_tasks t ON t.assistant_id = ac.id
-- GROUP BY ac.id, ac.name, ac.is_active
-- ORDER BY ac.name;

-- Rollback instructions (if needed):
-- 
-- If you need to rollback this migration:
-- 1. Remove the foreign key constraint:
--    ALTER TABLE test_day_assistant_tasks DROP CONSTRAINT IF EXISTS fk_test_day_tasks_assistant_id;
-- 
-- 2. To restore old v1 assistants (if they were marked inactive):
--    UPDATE assistant_config SET is_active = true WHERE name LIKE 'asystent dnia' AND name != 'asystent dnia v2';
-- 
-- Note: We do NOT rollback the assistant_id fixes as they are critical for v2 functionality.
