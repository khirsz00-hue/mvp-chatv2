-- Cache dla spotkań z Google Calendar
CREATE TABLE day_assistant_v2_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES assistant_config(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  google_event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL,
  location TEXT,
  meeting_link TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, google_event_id, date)
);

CREATE INDEX idx_meetings_user_date ON day_assistant_v2_meetings(user_id, date);
CREATE INDEX idx_meetings_updated_at ON day_assistant_v2_meetings(updated_at);

-- RLS policies
ALTER TABLE day_assistant_v2_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meetings"
  ON day_assistant_v2_meetings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meetings"
  ON day_assistant_v2_meetings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meetings"
  ON day_assistant_v2_meetings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meetings"
  ON day_assistant_v2_meetings FOR DELETE
  USING (auth.uid() = user_id);
