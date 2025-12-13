-- Decision Assistant Tables
-- Based on Six Thinking Hats methodology
-- Migration created: 2023-12-14

-- Decisions table
-- Stores main decision records with status tracking
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'in_progress', 'completed')) DEFAULT 'draft',
  current_hat TEXT CHECK (current_hat IN ('blue', 'white', 'red', 'black', 'yellow', 'green') OR current_hat IS NULL),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decision options table
-- Stores alternatives/options to be evaluated for each decision
CREATE TABLE IF NOT EXISTS decision_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decision events table
-- Stores the analysis trail: AI responses, user inputs, and synthesis
CREATE TABLE IF NOT EXISTS decision_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE NOT NULL,
  hat_color TEXT CHECK (hat_color IN ('blue', 'white', 'red', 'black', 'yellow', 'green')) NOT NULL,
  event_type TEXT CHECK (event_type IN ('analysis', 'user_input', 'synthesis')) NOT NULL,
  content TEXT NOT NULL,
  ai_response TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (if not exists from other migrations)
-- Note: This may already exist from Supabase auth, but we ensure it's there
-- The auth.users table is managed by Supabase, so we don't recreate it
-- If you need custom user fields, create a profiles table instead

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_decisions_user_id ON decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_options_decision_id ON decision_options(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_events_decision_id ON decision_events(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_events_hat_color ON decision_events(hat_color);
CREATE INDEX IF NOT EXISTS idx_decision_events_created_at ON decision_events(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for decisions
-- Users can view their own decisions
CREATE POLICY "Users can view their own decisions"
  ON decisions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own decisions
CREATE POLICY "Users can create their own decisions"
  ON decisions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own decisions
CREATE POLICY "Users can update their own decisions"
  ON decisions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own decisions
CREATE POLICY "Users can delete their own decisions"
  ON decisions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for decision_options
-- Users can view options for their decisions
CREATE POLICY "Users can view options for their decisions"
  ON decision_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = decision_options.decision_id 
      AND decisions.user_id = auth.uid()
    )
  );

-- Users can create options for their decisions
CREATE POLICY "Users can create options for their decisions"
  ON decision_options FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = decision_options.decision_id 
      AND decisions.user_id = auth.uid()
    )
  );

-- Users can update options for their decisions
CREATE POLICY "Users can update options for their decisions"
  ON decision_options FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = decision_options.decision_id 
      AND decisions.user_id = auth.uid()
    )
  );

-- Users can delete options for their decisions
CREATE POLICY "Users can delete options for their decisions"
  ON decision_options FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = decision_options.decision_id 
      AND decisions.user_id = auth.uid()
    )
  );

-- RLS Policies for decision_events
-- Users can view events for their decisions
CREATE POLICY "Users can view events for their decisions"
  ON decision_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = decision_events.decision_id 
      AND decisions.user_id = auth.uid()
    )
  );

-- Users can create events for their decisions
CREATE POLICY "Users can create events for their decisions"
  ON decision_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = decision_events.decision_id 
      AND decisions.user_id = auth.uid()
    )
  );

-- Users can delete events for their decisions
CREATE POLICY "Users can delete events for their decisions"
  ON decision_events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = decision_events.decision_id 
      AND decisions.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp on decisions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_decisions_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
