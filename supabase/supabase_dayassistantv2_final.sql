-- Consolidated schema for Day Assistant v2
-- Single source of truth for Supabase SQL (tasks, plans, proposals, sync metadata)

-- Assistant configuration (shared across assistants)
CREATE TABLE IF NOT EXISTS assistant_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('day_planner', 'week_planner', 'journal', 'decision')),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Day Assistant v2 tasks (Todoist-aware)
CREATE TABLE IF NOT EXISTS day_assistant_v2_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  assistant_id UUID REFERENCES assistant_config(id) ON DELETE CASCADE NOT NULL,
  todoist_id TEXT,
  todoist_task_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 3,
  is_must BOOLEAN DEFAULT FALSE,
  is_important BOOLEAN DEFAULT FALSE,
  estimate_min INTEGER DEFAULT 30,
  cognitive_load INTEGER DEFAULT 3 CHECK (cognitive_load BETWEEN 1 AND 5),
  tags TEXT[] DEFAULT '{}',
  context_type TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  position INTEGER DEFAULT 0,
  postpone_count INTEGER DEFAULT 0,
  moved_from_date DATE,
  moved_reason TEXT,
  last_moved_at TIMESTAMP,
  auto_moved BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Day plan (energy/focus sliders + blocks)
CREATE TABLE IF NOT EXISTS day_assistant_v2_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  assistant_id UUID REFERENCES assistant_config(id) ON DELETE CASCADE NOT NULL,
  plan_date DATE NOT NULL,
  energy INTEGER DEFAULT 3 CHECK (energy BETWEEN 1 AND 5),
  focus INTEGER DEFAULT 3 CHECK (focus BETWEEN 1 AND 5),
  blocks JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, assistant_id, plan_date)
);

-- Proposals / recommendations
CREATE TABLE IF NOT EXISTS day_assistant_v2_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  assistant_id UUID REFERENCES assistant_config(id) ON DELETE CASCADE NOT NULL,
  plan_date DATE NOT NULL,
  reason TEXT NOT NULL,
  primary_action JSONB NOT NULL,
  alternatives JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  responded_at TIMESTAMP
);

-- Decision log
CREATE TABLE IF NOT EXISTS day_assistant_v2_decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  assistant_id UUID REFERENCES assistant_config(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES day_assistant_v2_tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  from_date DATE,
  to_date DATE,
  reason TEXT,
  context JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Undo history
CREATE TABLE IF NOT EXISTS day_assistant_v2_undo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  assistant_id UUID REFERENCES assistant_config(id) ON DELETE CASCADE NOT NULL,
  decision_log_id UUID REFERENCES day_assistant_v2_decision_log(id) ON DELETE CASCADE NOT NULL,
  previous_state JSONB NOT NULL,
  undo_window_expires TIMESTAMP NOT NULL,
  undone BOOLEAN DEFAULT FALSE,
  undone_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subtasks
CREATE TABLE IF NOT EXISTS day_assistant_v2_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES day_assistant_v2_tasks(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  estimated_duration INTEGER DEFAULT 25,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sync metadata (central throttling for Todoist sync)
CREATE TABLE IF NOT EXISTS sync_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL,
  task_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sync_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assistant_config_user ON assistant_config(user_id);
CREATE INDEX IF NOT EXISTS idx_v2_tasks_user_assistant ON day_assistant_v2_tasks(user_id, assistant_id);
CREATE INDEX IF NOT EXISTS idx_v2_tasks_due ON day_assistant_v2_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_v2_tasks_must ON day_assistant_v2_tasks(is_must) WHERE is_must = TRUE;
CREATE INDEX IF NOT EXISTS idx_v2_tasks_postpone ON day_assistant_v2_tasks(postpone_count) WHERE postpone_count >= 3;
CREATE INDEX IF NOT EXISTS idx_v2_plan_date ON day_assistant_v2_plan(user_id, assistant_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_v2_proposals_status ON day_assistant_v2_proposals(user_id, assistant_id, status);
CREATE INDEX IF NOT EXISTS idx_v2_decision_log_user ON day_assistant_v2_decision_log(user_id, assistant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_v2_undo_expires ON day_assistant_v2_undo_history(user_id, undo_window_expires) WHERE undone = FALSE;
CREATE INDEX IF NOT EXISTS idx_v2_tasks_todoist_id ON day_assistant_v2_tasks(todoist_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_tasks_user_assistant_todoist
  ON day_assistant_v2_tasks(user_id, assistant_id, todoist_id)
  WHERE todoist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sync_metadata_user ON sync_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_type ON sync_metadata(sync_type);

-- RLS
ALTER TABLE assistant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_assistant_v2_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_assistant_v2_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_assistant_v2_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_assistant_v2_decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_assistant_v2_undo_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_assistant_v2_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

-- Assistant config policies
CREATE POLICY "Users can view their own assistants"
  ON assistant_config FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own assistants"
  ON assistant_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own assistants"
  ON assistant_config FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own assistants"
  ON assistant_config FOR DELETE
  USING (auth.uid() = user_id);

-- Task policies
CREATE POLICY "Users can view their own v2 tasks"
  ON day_assistant_v2_tasks FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own v2 tasks"
  ON day_assistant_v2_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own v2 tasks"
  ON day_assistant_v2_tasks FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own v2 tasks"
  ON day_assistant_v2_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Plan policies
CREATE POLICY "Users can view their own day plans"
  ON day_assistant_v2_plan FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own day plans"
  ON day_assistant_v2_plan FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own day plans"
  ON day_assistant_v2_plan FOR UPDATE
  USING (auth.uid() = user_id);

-- Proposal policies
CREATE POLICY "Users can view their own proposals"
  ON day_assistant_v2_proposals FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own proposals"
  ON day_assistant_v2_proposals FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own proposals"
  ON day_assistant_v2_proposals FOR UPDATE
  USING (auth.uid() = user_id);

-- Decision log policies
CREATE POLICY "Users can view their own decision logs"
  ON day_assistant_v2_decision_log FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own decision logs"
  ON day_assistant_v2_decision_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Undo history policies
CREATE POLICY "Users can view their own undo history"
  ON day_assistant_v2_undo_history FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own undo history"
  ON day_assistant_v2_undo_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own undo history"
  ON day_assistant_v2_undo_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Subtask policies
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

-- Sync metadata policies
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

-- Timestamp maintenance
CREATE OR REPLACE FUNCTION update_day_assistant_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assistant_config_updated_at
  BEFORE UPDATE ON assistant_config
  FOR EACH ROW
  EXECUTE FUNCTION update_day_assistant_v2_updated_at();

CREATE TRIGGER update_v2_tasks_updated_at
  BEFORE UPDATE ON day_assistant_v2_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_day_assistant_v2_updated_at();

CREATE TRIGGER update_v2_plan_updated_at
  BEFORE UPDATE ON day_assistant_v2_plan
  FOR EACH ROW
  EXECUTE FUNCTION update_day_assistant_v2_updated_at();

-- Cleanup helper for expired undo windows
CREATE OR REPLACE FUNCTION cleanup_v2_expired_undo_windows()
RETURNS void AS $$
BEGIN
  DELETE FROM day_assistant_v2_undo_history
  WHERE undo_window_expires < NOW() - INTERVAL '1 hour'
  AND undone = FALSE;
END;
$$ LANGUAGE plpgsql;
