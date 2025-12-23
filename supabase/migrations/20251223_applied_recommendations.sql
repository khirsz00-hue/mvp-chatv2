-- Migration: Add table for tracking applied recommendations
-- This ensures recommendations don't return after being applied

-- Create table for applied recommendations
CREATE TABLE IF NOT EXISTS day_assistant_v2_applied_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assistant_id UUID REFERENCES assistant_config(id) ON DELETE CASCADE NOT NULL,
  recommendation_id TEXT NOT NULL,
  recommendation_type TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, recommendation_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_v2_applied_recs_user 
  ON day_assistant_v2_applied_recommendations(user_id);
  
CREATE INDEX IF NOT EXISTS idx_v2_applied_recs_user_rec 
  ON day_assistant_v2_applied_recommendations(user_id, recommendation_id);

-- Enable RLS
ALTER TABLE day_assistant_v2_applied_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and manage their own applied recommendations
CREATE POLICY "Users can view their own applied recommendations"
  ON day_assistant_v2_applied_recommendations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own applied recommendations"
  ON day_assistant_v2_applied_recommendations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own applied recommendations"
  ON day_assistant_v2_applied_recommendations FOR DELETE
  USING (user_id = auth.uid());

-- Add auto-cleanup for old applied recommendations (older than 30 days)
-- This prevents the table from growing indefinitely
CREATE OR REPLACE FUNCTION cleanup_old_applied_recommendations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM day_assistant_v2_applied_recommendations
  WHERE applied_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Note: In production, you might want to set up a cron job to run this function periodically
-- For now, it can be called manually or triggered by application code
