-- Add Six Thinking Hats support to decisions table
-- This migration extends the existing decisions schema to support the Six Thinking Hats methodology

-- Add current_hat column to track which hat we're analyzing
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS current_hat TEXT 
CHECK (current_hat IN ('blue', 'white', 'red', 'black', 'yellow', 'green') OR current_hat IS NULL);

-- Add hat_answers column to store all hat responses in JSON format
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS hat_answers JSONB DEFAULT '[]'::jsonb;

-- Update decision_events table to support hat-specific events
-- We'll use the existing payload field to store hat_color when needed
-- The event_type can be extended with 'hat_analysis' and 'synthesis'
ALTER TABLE decision_events
DROP CONSTRAINT IF EXISTS decision_events_event_type_check;

ALTER TABLE decision_events
ADD CONSTRAINT decision_events_event_type_check
CHECK (event_type IN ('created', 'option_added', 'ai_analysis', 'status_changed', 'decision_made', 'note_added', 'hat_analysis', 'synthesis'));

-- Add index for current_hat for faster queries
CREATE INDEX IF NOT EXISTS idx_decisions_current_hat ON decisions(current_hat);

-- Comment on new columns
COMMENT ON COLUMN decisions.current_hat IS 'Current thinking hat being analyzed (blue, white, red, black, yellow, green) or NULL if completed';
COMMENT ON COLUMN decisions.hat_answers IS 'Array of JSON objects storing user answers and AI analysis for each hat';
