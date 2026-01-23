-- Create time_sessions table for timer tracking
-- Part of Day Assistant V2 Complete Overhaul

CREATE TABLE IF NOT EXISTS time_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  task_id UUID NOT NULL,
  task_source TEXT NOT NULL CHECK (task_source IN ('assistant_tasks', 'day_assistant_v2')),
  task_title TEXT NOT NULL,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  session_type TEXT DEFAULT 'manual' CHECK (session_type IN ('manual', 'pomodoro', 'focus')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS policies
ALTER TABLE time_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own time sessions"
  ON time_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time sessions"
  ON time_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time sessions"
  ON time_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time sessions"
  ON time_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_time_sessions_user_id ON time_sessions(user_id);
CREATE INDEX idx_time_sessions_task_id ON time_sessions(task_id);
CREATE INDEX idx_time_sessions_started_at ON time_sessions(started_at DESC);
