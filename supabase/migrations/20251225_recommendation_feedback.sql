-- Recommendation feedback table for passive insights
-- Tracks user feedback on AI-generated recommendations

CREATE TABLE IF NOT EXISTS day_assistant_v2_recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recommendation_type text NOT NULL,
  recommendation_data jsonb DEFAULT '{}'::jsonb,
  feedback text NOT NULL CHECK (feedback IN ('helpful', 'not_helpful', 'neutral')),
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE day_assistant_v2_recommendation_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own feedback"
  ON day_assistant_v2_recommendation_feedback FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own feedback"
  ON day_assistant_v2_recommendation_feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Index for performance
CREATE INDEX idx_v2_feedback_user_type 
  ON day_assistant_v2_recommendation_feedback(user_id, recommendation_type);

CREATE INDEX idx_v2_feedback_created 
  ON day_assistant_v2_recommendation_feedback(created_at DESC);
