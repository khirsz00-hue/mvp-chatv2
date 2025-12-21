-- Migration: Fix Todoist Sync Constraint for Upsert Operations
-- Adds proper UNIQUE constraint to day_assistant_v2_tasks for ON CONFLICT resolution
-- 
-- Issue: Error 42P10 - "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- Cause: Partial unique index (with WHERE clause) cannot be used with simple column-based ON CONFLICT
-- Solution: Add a named UNIQUE constraint that works with ON CONFLICT

-- The partial unique index already exists and works for preventing duplicates
-- But ON CONFLICT requires either a full unique constraint or explicit WHERE clause
-- The Supabase JS client doesn't support the WHERE clause syntax in onConflict parameter
-- So we need to add a named constraint that can be referenced

-- Keep the existing partial unique index for constraint enforcement
-- It already exists: idx_v2_tasks_user_assistant_todoist

-- Add a proper named UNIQUE constraint for ON CONFLICT to reference
-- This constraint allows multiple NULL values for todoist_id (standard PostgreSQL behavior)
-- which is what we want: manually created tasks can have NULL todoist_id
ALTER TABLE day_assistant_v2_tasks
  ADD CONSTRAINT day_assistant_v2_tasks_unique 
  UNIQUE (user_id, assistant_id, todoist_id);

-- Note: PostgreSQL's UNIQUE constraint treats NULL as distinct from NULL
-- This means multiple rows with (user_id=X, assistant_id=Y, todoist_id=NULL) are allowed
-- But (user_id=X, assistant_id=Y, todoist_id='123') can only exist once
-- This is perfect for our use case
