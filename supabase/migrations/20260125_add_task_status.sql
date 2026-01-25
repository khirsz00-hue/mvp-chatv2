-- Migration: Add status field to day_assistant_v2_tasks table
-- This allows tasks to be organized by status (todo, in_progress, done)

ALTER TABLE day_assistant_v2_tasks
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done'));

-- Create index for efficient status-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON day_assistant_v2_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON day_assistant_v2_tasks(user_id, status);
