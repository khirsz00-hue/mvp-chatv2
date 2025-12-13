-- Enhanced Journal Entries Table for ADHD Buddy Journal Assistant
-- This migration extends the existing journal_entries table with ADHD-specific metrics

-- First, add new columns to journal_entries if they don't exist
ALTER TABLE journal_entries 
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS energy INTEGER CHECK (energy >= 0 AND energy <= 10),
  ADD COLUMN IF NOT EXISTS motivation INTEGER CHECK (motivation >= 0 AND motivation <= 10),
  ADD COLUMN IF NOT EXISTS sleep_quality INTEGER CHECK (sleep_quality >= 0 AND sleep_quality <= 10),
  ADD COLUMN IF NOT EXISTS hours_slept DECIMAL(3,1),
  ADD COLUMN IF NOT EXISTS sleep_time TIME,
  ADD COLUMN IF NOT EXISTS wake_time TIME,
  ADD COLUMN IF NOT EXISTS planned_tasks TEXT,
  ADD COLUMN IF NOT EXISTS completed_tasks_snapshot TEXT[],
  ADD COLUMN IF NOT EXISTS notes TEXT[],
  ADD COLUMN IF NOT EXISTS comments TEXT[],
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Update the UNIQUE constraint to include user_id and date
-- First drop if exists, then create
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'journal_entries_user_id_date_key'
  ) THEN
    ALTER TABLE journal_entries DROP CONSTRAINT journal_entries_user_id_date_key;
  END IF;
END $$;

-- Add unique constraint on user_id and date
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_user_id_date_key UNIQUE(user_id, date);

-- Create index for date-based queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, date DESC);

-- Add todoist_token column to user_profiles if it doesn't exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS todoist_token TEXT;

-- Update updated_at trigger to work with journal_entries
CREATE OR REPLACE FUNCTION update_journal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for journal_entries updated_at
DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_journal_updated_at();
