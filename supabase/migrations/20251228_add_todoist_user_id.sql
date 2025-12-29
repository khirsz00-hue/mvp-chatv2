-- Add todoist_user_id column to user_profiles
-- This column stores the Todoist user ID for webhook event matching

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS todoist_user_id TEXT;

-- Create index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_todoist_user_id 
ON user_profiles(todoist_user_id);

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.todoist_user_id IS 'Todoist user ID for webhook event matching';
