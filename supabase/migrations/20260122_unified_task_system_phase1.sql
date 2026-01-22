-- Unified Task Management System - Phase 1: Foundation
-- Migration to extend day_assistant_v2_tasks with unified task system fields
-- This migration is ADDITIVE ONLY - no existing data or columns are removed

-- Add new columns for unified task system (if they don't exist)
ALTER TABLE day_assistant_v2_tasks 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'local' CHECK (source IN ('local', 'todoist', 'asana')),
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error'));

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tasks_external_id ON day_assistant_v2_tasks(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_source ON day_assistant_v2_tasks(source);
CREATE INDEX IF NOT EXISTS idx_tasks_sync_status ON day_assistant_v2_tasks(sync_status) WHERE sync_status != 'synced';

-- Migrate existing Todoist tasks (set source and external_id based on todoist_id)
-- This is idempotent - only updates rows where source is NULL
UPDATE day_assistant_v2_tasks 
SET 
  source = 'todoist',
  external_id = todoist_id,
  sync_status = 'synced',
  last_synced_at = synced_at
WHERE todoist_id IS NOT NULL AND source IS NULL;

-- Mark existing local tasks (tasks without todoist_id)
-- This is idempotent - only updates rows where source is NULL
UPDATE day_assistant_v2_tasks 
SET 
  source = 'local',
  sync_status = 'synced'
WHERE todoist_id IS NULL AND source IS NULL;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Unified Task System Phase 1 migration completed successfully';
END $$;
