-- Migration: Add updated_at column to sync_metadata table
-- Fixes error: record "new" has no field "updated_at"

-- Add updated_at column if it doesn't exist
ALTER TABLE sync_metadata 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS update_sync_metadata_updated_at ON sync_metadata;

CREATE TRIGGER update_sync_metadata_updated_at
  BEFORE UPDATE ON sync_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Note: The function update_updated_at_column() already exists from 20231217_day_assistant.sql
-- It automatically sets NEW.updated_at = NOW() for any table
