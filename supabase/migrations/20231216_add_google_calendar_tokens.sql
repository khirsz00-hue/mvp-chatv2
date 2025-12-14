-- Add Google Calendar OAuth tokens to user_profiles
-- This enables each user to securely store their own Google Calendar credentials

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expiry BIGINT;

-- Add index for efficient token lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_google_tokens 
ON user_profiles(id) 
WHERE google_access_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.google_access_token IS 'Google OAuth access token for Calendar API';
COMMENT ON COLUMN user_profiles.google_refresh_token IS 'Google OAuth refresh token for Calendar API';
COMMENT ON COLUMN user_profiles.google_token_expiry IS 'Unix timestamp (milliseconds) when the access token expires';
