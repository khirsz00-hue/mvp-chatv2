-- Migration: Day Assistant Chat and Timeline Tables
-- Created: 2023-12-18
-- Purpose: Add chat messages and timeline events for Day Assistant

-- Chat messages table (for today's conversation)
CREATE TABLE IF NOT EXISTS day_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  intent TEXT,  -- WHAT_NOW, I_AM_STUCK, FLOW_MODE, etc.
  recommendations JSONB,  -- AI recommendations with actions
  created_at TIMESTAMP DEFAULT NOW()
);

-- Timeline events table (meetings, task blocks, ghost proposals)
CREATE TABLE IF NOT EXISTS day_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,  -- which day this event is for
  type TEXT CHECK (type IN ('meeting', 'event', 'task-block', 'ghost-proposal')) NOT NULL,
  title TEXT NOT NULL,
  start_time TEXT NOT NULL,  -- HH:mm format
  end_time TEXT NOT NULL,    -- HH:mm format
  duration_minutes INTEGER NOT NULL,
  task_ids TEXT[],  -- array of task IDs in this block
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_day_chat_user_date ON day_chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_day_timeline_user_date ON day_timeline_events(user_id, date);
CREATE INDEX IF NOT EXISTS idx_day_timeline_type ON day_timeline_events(type);

-- Row Level Security (RLS)
ALTER TABLE day_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_timeline_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for day_chat_messages
CREATE POLICY "Users can view their own chat messages"
  ON day_chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat messages"
  ON day_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for day_timeline_events
CREATE POLICY "Users can view their own timeline events"
  ON day_timeline_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own timeline events"
  ON day_timeline_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timeline events"
  ON day_timeline_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timeline events"
  ON day_timeline_events FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updating updated_at on day_timeline_events
CREATE TRIGGER update_day_timeline_events_updated_at
  BEFORE UPDATE ON day_timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE day_chat_messages IS 'Chat messages for Day Assistant - command-first interface';
COMMENT ON TABLE day_timeline_events IS 'Timeline events including meetings, task blocks, and AI proposals';
