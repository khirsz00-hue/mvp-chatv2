-- User Behavior Profiles for Intelligent Queue System
-- Stores learned patterns from user behavior for ML-inspired recommendations

CREATE TABLE IF NOT EXISTS user_behavior_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  peak_productivity_start INTEGER DEFAULT 9,
  peak_productivity_end INTEGER DEFAULT 12,
  preferred_task_duration INTEGER DEFAULT 30,
  context_switch_sensitivity DECIMAL DEFAULT 0.5 CHECK (context_switch_sensitivity BETWEEN 0 AND 1),
  postpone_patterns JSONB DEFAULT '{}',
  energy_patterns JSONB DEFAULT '[]',
  completion_streaks JSONB DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_behavior_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own behavior profile"
  ON user_behavior_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own behavior profile"
  ON user_behavior_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own behavior profile"
  ON user_behavior_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_behavior_profiles_user_id 
  ON user_behavior_profiles(user_id);

-- Function to auto-update timestamp
CREATE OR REPLACE FUNCTION update_user_behavior_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_behavior_profile_timestamp
BEFORE UPDATE ON user_behavior_profiles
FOR EACH ROW EXECUTE FUNCTION update_user_behavior_profile_timestamp();
