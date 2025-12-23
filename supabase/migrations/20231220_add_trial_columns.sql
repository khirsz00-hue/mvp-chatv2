-- Add trial period columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trial_start_date timestamptz;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trial_end_date timestamptz;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trial_used boolean DEFAULT false;
