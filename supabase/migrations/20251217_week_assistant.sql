-- Week Assistant tables for weekly analysis and recommendations

CREATE TABLE IF NOT EXISTS week_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  analysis_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

CREATE TABLE IF NOT EXISTS week_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  title TEXT NOT NULL,
  explanation TEXT,
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT CHECK (status IN ('pending', 'applied', 'rejected')) DEFAULT 'pending',
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_week_insights_user_week ON week_insights(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_week_recs_user_week ON week_recommendations(user_id, week_start);

-- Enable Row Level Security
ALTER TABLE week_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_recommendations ENABLE ROW LEVEL SECURITY;

-- Policies: users manage only their own data
CREATE POLICY "Users can view their week insights"
  ON week_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their week insights"
  ON week_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their week insights"
  ON week_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their week recommendations"
  ON week_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their week recommendations"
  ON week_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their week recommendations"
  ON week_recommendations FOR UPDATE
  USING (auth.uid() = user_id);
