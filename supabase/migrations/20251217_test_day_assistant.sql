-- Test Day Assistant - Enhanced Day Planner with ADHD-friendly features
-- Implements dual sliders (energy, focus), soft warnings, undo, decision logging, and live replanning

-- Assistant Configuration Table
CREATE TABLE IF NOT EXISTS assistant_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('day_planner', 'week_planner', 'journal', 'decision')),
  settings JSONB DEFAULT '{}',  -- undo_window, max_postpones, morning_must_block, etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Test Day Assistant Tasks (enhanced with ADHD-friendly metadata)
CREATE TABLE IF NOT EXISTS test_day_assistant_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  assistant_id UUID REFERENCES assistant_config(id) ON DELETE CASCADE NOT NULL,
  todoist_task_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 3,  -- Todoist priority
  is_must BOOLEAN DEFAULT FALSE,  -- MUST task (max 1-3 per day)
  is_important BOOLEAN DEFAULT FALSE,
  estimate_min INTEGER DEFAULT 30,
  cognitive_load INTEGER DEFAULT 3 CHECK (cognitive_load BETWEEN 1 AND 5),  -- 1=light, 5=heavy
  tags TEXT[] DEFAULT '{}',
  context_type TEXT,  -- 'code', 'admin', 'komunikacja', 'prywatne'
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  position INTEGER DEFAULT 0,
  -- ADHD-friendly postpone tracking
  postpone_count INTEGER DEFAULT 0,
  moved_from_date DATE,
  moved_reason TEXT,
  last_moved_at TIMESTAMP,
  auto_moved BOOLEAN DEFAULT FALSE,
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Day Plan (timeline blocks for specific date)
CREATE TABLE IF NOT EXISTS test_day_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  assistant_id UUID REFERENCES assistant_config(id) ON DELETE CASCADE NOT NULL,
  plan_date DATE NOT NULL,
  energy INTEGER DEFAULT 3 CHECK (energy BETWEEN 1 AND 5),
  focus INTEGER DEFAULT 3 CHECK (focus BETWEEN 1 AND 5),
  blocks JSONB DEFAULT '[]',  -- Array of {type, task_id, start, end, locked}
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, assistant_id, plan_date)
);

-- Proposals (recommendations with alternatives)
CREATE TABLE IF NOT EXISTS test_day_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  assistant_id UUID REFERENCES assistant_config(id) ON DELETE CASCADE NOT NULL,
  plan_date DATE NOT NULL,
  reason TEXT NOT NULL,  -- AI-generated explanation
  primary_action JSONB NOT NULL,  -- {type: 'move_task', task_id, from_date, to_date}
  alternatives JSONB DEFAULT '[]',  -- Array of alternative actions
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  responded_at TIMESTAMP
);

-- Decision Log (tracks all user decisions for learning and audit)
CREATE TABLE IF NOT EXISTS test_day_decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  assistant_id UUID REFERENCES assistant_config(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES test_day_assistant_tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,  -- 'postpone', 'unmark_must', 'accept_proposal', 'reject_proposal', 'undo'
  from_date DATE,
  to_date DATE,
  reason TEXT,
  context JSONB DEFAULT '{}',  -- energy, focus, time_of_day, etc.
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Undo History (short-term undo window 5-15s)
CREATE TABLE IF NOT EXISTS test_day_undo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  assistant_id UUID REFERENCES assistant_config(id) ON DELETE CASCADE NOT NULL,
  decision_log_id UUID REFERENCES test_day_decision_log(id) ON DELETE CASCADE NOT NULL,
  previous_state JSONB NOT NULL,  -- Full state snapshot before action
  undo_window_expires TIMESTAMP NOT NULL,
  undone BOOLEAN DEFAULT FALSE,
  undone_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subtasks for tasks (with decomposition tracking)
CREATE TABLE IF NOT EXISTS test_day_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES test_day_assistant_tasks(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  estimated_duration INTEGER DEFAULT 25,  -- in minutes
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assistant_config_user ON assistant_config(user_id);
CREATE INDEX IF NOT EXISTS idx_test_day_tasks_user_assistant ON test_day_assistant_tasks(user_id, assistant_id);
CREATE INDEX IF NOT EXISTS idx_test_day_tasks_due ON test_day_assistant_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_test_day_tasks_must ON test_day_assistant_tasks(is_must) WHERE is_must = TRUE;
CREATE INDEX IF NOT EXISTS idx_test_day_tasks_postpone ON test_day_assistant_tasks(postpone_count) WHERE postpone_count >= 3;
CREATE INDEX IF NOT EXISTS idx_test_day_plan_date ON test_day_plan(user_id, assistant_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_test_day_proposals_status ON test_day_proposals(user_id, assistant_id, status);
CREATE INDEX IF NOT EXISTS idx_test_day_decision_log_user ON test_day_decision_log(user_id, assistant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_test_day_undo_expires ON test_day_undo_history(user_id, undo_window_expires) WHERE undone = FALSE;

-- Row Level Security (RLS)
ALTER TABLE assistant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_day_assistant_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_day_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_day_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_day_decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_day_undo_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_day_subtasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assistant_config
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

-- RLS Policies for test_day_assistant_tasks
CREATE POLICY "Users can view their own test day tasks"
  ON test_day_assistant_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own test day tasks"
  ON test_day_assistant_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test day tasks"
  ON test_day_assistant_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test day tasks"
  ON test_day_assistant_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for test_day_plan
CREATE POLICY "Users can view their own day plans"
  ON test_day_plan FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own day plans"
  ON test_day_plan FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own day plans"
  ON test_day_plan FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for test_day_proposals
CREATE POLICY "Users can view their own proposals"
  ON test_day_proposals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own proposals"
  ON test_day_proposals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own proposals"
  ON test_day_proposals FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for test_day_decision_log
CREATE POLICY "Users can view their own decision logs"
  ON test_day_decision_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own decision logs"
  ON test_day_decision_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for test_day_undo_history
CREATE POLICY "Users can view their own undo history"
  ON test_day_undo_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own undo history"
  ON test_day_undo_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own undo history"
  ON test_day_undo_history FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for test_day_subtasks
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_test_day_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_assistant_config_updated_at
  BEFORE UPDATE ON assistant_config
  FOR EACH ROW
  EXECUTE FUNCTION update_test_day_updated_at();

CREATE TRIGGER update_test_day_tasks_updated_at
  BEFORE UPDATE ON test_day_assistant_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_test_day_updated_at();

CREATE TRIGGER update_test_day_plan_updated_at
  BEFORE UPDATE ON test_day_plan
  FOR EACH ROW
  EXECUTE FUNCTION update_test_day_updated_at();

-- Function to auto-expire old undo windows (cleanup job)
CREATE OR REPLACE FUNCTION cleanup_expired_undo_windows()
RETURNS void AS $$
BEGIN
  DELETE FROM test_day_undo_history
  WHERE undo_window_expires < NOW() - INTERVAL '1 hour'
  AND undone = FALSE;
END;
$$ LANGUAGE plpgsql;
