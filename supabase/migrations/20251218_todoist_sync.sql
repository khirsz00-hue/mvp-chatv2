-- Migration: Todoist Sync System
-- Adds sync_metadata table and updates test_day_assistant_tasks for Todoist integration

-- Table for tracking sync metadata
CREATE TABLE IF NOT EXISTS sync_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL,
  task_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sync_type)
);

CREATE INDEX IF NOT EXISTS idx_sync_metadata_user ON sync_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_type ON sync_metadata(sync_type);

-- Add columns to test_day_assistant_tasks for Todoist sync
ALTER TABLE test_day_assistant_tasks 
ADD COLUMN IF NOT EXISTS todoist_id TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tasks_todoist_id ON test_day_assistant_tasks(todoist_id);

-- RLS Policies for sync_metadata
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync metadata"
  ON sync_metadata FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync metadata"
  ON sync_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync metadata"
  ON sync_metadata FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync metadata"
  ON sync_metadata FOR DELETE
  USING (auth.uid() = user_id);
