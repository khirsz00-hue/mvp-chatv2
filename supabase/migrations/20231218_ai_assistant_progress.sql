-- AI Assistant Progress Tracking
-- Tracks which steps are completed and where the user left off in the AI breakdown flow

CREATE TABLE IF NOT EXISTS ai_assistant_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  task_id TEXT NOT NULL,  -- parent task ID (from Todoist or day_assistant_tasks)
  mode TEXT CHECK (mode IN ('light', 'stuck', 'crisis')) NOT NULL,
  total_steps INTEGER NOT NULL,
  current_step_index INTEGER DEFAULT 0,
  subtask_ids TEXT[] DEFAULT '{}',  -- array of created subtask IDs
  completed_step_indices INTEGER[] DEFAULT '{}',  -- array of completed step indices
  qa_context TEXT,  -- questions and answers context (for stuck mode)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_assistant_progress_user_task ON ai_assistant_progress(user_id, task_id);

-- Row Level Security
ALTER TABLE ai_assistant_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assistant progress"
  ON ai_assistant_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assistant progress"
  ON ai_assistant_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assistant progress"
  ON ai_assistant_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assistant progress"
  ON ai_assistant_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_ai_assistant_progress_updated_at
  BEFORE UPDATE ON ai_assistant_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
