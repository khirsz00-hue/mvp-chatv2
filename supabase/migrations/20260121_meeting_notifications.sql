-- Notification settings per user
CREATE TABLE IF NOT EXISTS user_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  default_reminder_times INTEGER[] DEFAULT ARRAY[30, 15, 5],
  sound_enabled BOOLEAN DEFAULT true,
  browser_notifications BOOLEAN DEFAULT true,
  in_app_banner BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom reminders per meeting
CREATE TABLE IF NOT EXISTS meeting_custom_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES day_assistant_v2_meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_times INTEGER[], -- Custom times for this specific meeting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_reminders_user ON meeting_custom_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_reminders_meeting ON meeting_custom_reminders(meeting_id);

-- RLS policies for user_notification_settings
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification settings"
  ON user_notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
  ON user_notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
  ON user_notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for meeting_custom_reminders
ALTER TABLE meeting_custom_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own custom reminders"
  ON meeting_custom_reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom reminders"
  ON meeting_custom_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom reminders"
  ON meeting_custom_reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom reminders"
  ON meeting_custom_reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Add type column to day_assistant_v2_meetings if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'day_assistant_v2_meetings' 
                 AND column_name = 'type') THEN
    ALTER TABLE day_assistant_v2_meetings 
    ADD COLUMN type TEXT DEFAULT 'in-office' CHECK (type IN ('on-site', 'online', 'in-office'));
  END IF;
END $$;
