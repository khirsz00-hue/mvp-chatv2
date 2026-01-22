-- Sync Queue Table for Unified Task Management
-- This table stores pending synchronization jobs for external services (Todoist, Asana)

CREATE TABLE IF NOT EXISTS task_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES day_assistant_v2_tasks(id) ON DELETE SET NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'complete')),
  source TEXT NOT NULL CHECK (source IN ('todoist', 'asana')),
  payload JSONB NOT NULL,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON task_sync_queue(status, created_at) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON task_sync_queue(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_queue_task ON task_sync_queue(task_id) WHERE task_id IS NOT NULL;

-- Row Level Security
ALTER TABLE task_sync_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own sync jobs
CREATE POLICY IF NOT EXISTS "Users can view own sync jobs" 
  ON task_sync_queue FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own sync jobs
CREATE POLICY IF NOT EXISTS "Users can insert own sync jobs" 
  ON task_sync_queue FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY IF NOT EXISTS "Service role full access" 
  ON task_sync_queue FOR ALL 
  USING (auth.role() = 'service_role');

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Sync queue table created successfully for Phase 2B';
END $$;
