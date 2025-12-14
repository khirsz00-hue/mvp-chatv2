-- ============================================================================
-- ADHD Journal Assistant - Database Schema
-- ============================================================================
-- Created: 2025-12-14
-- Description: Comprehensive database schema for journal entries, archives,
--              user profiles, and related functionality
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USER PROFILES EXTENSION
-- ============================================================================
-- Extend user_profiles table to include Todoist integration
-- Assumes user_profiles table exists (e.g., from Supabase Auth)
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'todoist_token'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN todoist_token TEXT;
        
        COMMENT ON COLUMN user_profiles.todoist_token IS 
            'Encrypted Todoist API token for task integration';
    END IF;
END $$;

-- ============================================================================
-- JOURNAL ENTRIES TABLE
-- ============================================================================
-- Main table for storing daily journal entries with health metrics and tasks
-- ============================================================================

CREATE TABLE IF NOT EXISTS journal_entries (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Health and wellness metrics (0-10 scale)
    energy INTEGER CHECK (energy >= 0 AND energy <= 10),
    motivation INTEGER CHECK (motivation >= 0 AND motivation <= 10),
    sleep_quality INTEGER CHECK (sleep_quality >= 0 AND sleep_quality <= 10),
    
    -- Sleep tracking details
    hours_slept DECIMAL(4, 2) CHECK (hours_slept >= 0 AND hours_slept <= 24),
    sleep_time TIME,
    wake_time TIME,
    
    -- Task management
    planned_tasks TEXT,
    completed_tasks_snapshot TEXT[],
    
    -- Notes and reflections
    notes TEXT[],
    comments TEXT[],
    
    -- AI-generated insights
    ai_summary TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Add table comment
COMMENT ON TABLE journal_entries IS 
    'Daily journal entries for ADHD management including health metrics, sleep data, and task tracking';

-- Add column comments
COMMENT ON COLUMN journal_entries.id IS 'Unique identifier for journal entry';
COMMENT ON COLUMN journal_entries.user_id IS 'Reference to user who owns this entry';
COMMENT ON COLUMN journal_entries.date IS 'Date of the journal entry';
COMMENT ON COLUMN journal_entries.energy IS 'Energy level (0-10 scale)';
COMMENT ON COLUMN journal_entries.motivation IS 'Motivation level (0-10 scale)';
COMMENT ON COLUMN journal_entries.sleep_quality IS 'Sleep quality rating (0-10 scale)';
COMMENT ON COLUMN journal_entries.hours_slept IS 'Total hours of sleep';
COMMENT ON COLUMN journal_entries.sleep_time IS 'Time user went to sleep';
COMMENT ON COLUMN journal_entries.wake_time IS 'Time user woke up';
COMMENT ON COLUMN journal_entries.planned_tasks IS 'Tasks planned for the day';
COMMENT ON COLUMN journal_entries.completed_tasks_snapshot IS 'Snapshot of completed tasks';
COMMENT ON COLUMN journal_entries.notes IS 'Array of user notes throughout the day';
COMMENT ON COLUMN journal_entries.comments IS 'Array of user comments and reflections';
COMMENT ON COLUMN journal_entries.ai_summary IS 'AI-generated summary and insights';
COMMENT ON COLUMN journal_entries.created_at IS 'Timestamp when entry was created';
COMMENT ON COLUMN journal_entries.updated_at IS 'Timestamp when entry was last updated';

-- ============================================================================
-- JOURNAL ARCHIVES TABLE
-- ============================================================================
-- Archive table for historical journal entries (for data retention/backup)
-- ============================================================================

CREATE TABLE IF NOT EXISTS journal_archives (
    -- Primary identification
    archive_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_entry_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Health and wellness metrics (0-10 scale)
    energy INTEGER CHECK (energy >= 0 AND energy <= 10),
    motivation INTEGER CHECK (motivation >= 0 AND motivation <= 10),
    sleep_quality INTEGER CHECK (sleep_quality >= 0 AND sleep_quality <= 10),
    
    -- Sleep tracking details
    hours_slept DECIMAL(4, 2) CHECK (hours_slept >= 0 AND hours_slept <= 24),
    sleep_time TIME,
    wake_time TIME,
    
    -- Task management
    planned_tasks TEXT,
    completed_tasks_snapshot TEXT[],
    
    -- Notes and reflections
    notes TEXT[],
    comments TEXT[],
    
    -- AI-generated insights
    ai_summary TEXT,
    
    -- Archive metadata
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archive_reason TEXT,
    original_created_at TIMESTAMP WITH TIME ZONE,
    original_updated_at TIMESTAMP WITH TIME ZONE
);

-- Add table comment
COMMENT ON TABLE journal_archives IS 
    'Archived journal entries for historical data retention and backup purposes';

-- Add column comments
COMMENT ON COLUMN journal_archives.archive_id IS 'Unique identifier for archived entry';
COMMENT ON COLUMN journal_archives.original_entry_id IS 'ID of the original journal entry';
COMMENT ON COLUMN journal_archives.archived_at IS 'Timestamp when entry was archived';
COMMENT ON COLUMN journal_archives.archive_reason IS 'Reason for archiving (delete, update, retention policy)';

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Optimize query performance for common access patterns
-- ============================================================================

-- Journal entries indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id 
    ON journal_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_date 
    ON journal_entries(date DESC);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date 
    ON journal_entries(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at 
    ON journal_entries(created_at DESC);

-- Journal archives indexes
CREATE INDEX IF NOT EXISTS idx_journal_archives_user_id 
    ON journal_archives(user_id);

CREATE INDEX IF NOT EXISTS idx_journal_archives_date 
    ON journal_archives(date DESC);

CREATE INDEX IF NOT EXISTS idx_journal_archives_original_entry_id 
    ON journal_archives(original_entry_id);

CREATE INDEX IF NOT EXISTS idx_journal_archives_archived_at 
    ON journal_archives(archived_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Automatic timestamp management and archiving
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for journal_entries updated_at
DROP TRIGGER IF EXISTS set_updated_at ON journal_entries;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION update_updated_at_column() IS 
    'Automatically updates the updated_at timestamp on record modification';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Ensure users can only access their own data
-- ============================================================================

-- Enable RLS on journal_entries
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own journal entries
DROP POLICY IF EXISTS "Users can view own journal entries" ON journal_entries;
CREATE POLICY "Users can view own journal entries"
    ON journal_entries
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own journal entries
DROP POLICY IF EXISTS "Users can insert own journal entries" ON journal_entries;
CREATE POLICY "Users can insert own journal entries"
    ON journal_entries
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own journal entries
DROP POLICY IF EXISTS "Users can update own journal entries" ON journal_entries;
CREATE POLICY "Users can update own journal entries"
    ON journal_entries
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own journal entries
DROP POLICY IF EXISTS "Users can delete own journal entries" ON journal_entries;
CREATE POLICY "Users can delete own journal entries"
    ON journal_entries
    FOR DELETE
    USING (auth.uid() = user_id);

-- Enable RLS on journal_archives
ALTER TABLE journal_archives ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own archived entries
DROP POLICY IF EXISTS "Users can view own archived entries" ON journal_archives;
CREATE POLICY "Users can view own archived entries"
    ON journal_archives
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own archived entries
DROP POLICY IF EXISTS "Users can insert own archived entries" ON journal_archives;
CREATE POLICY "Users can insert own archived entries"
    ON journal_archives
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users cannot update archived entries (immutable)
-- Policy: Users cannot delete archived entries (retention)

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================
-- Utility functions for common operations
-- ============================================================================

-- Function to archive a journal entry
CREATE OR REPLACE FUNCTION archive_journal_entry(
    entry_id UUID,
    reason TEXT DEFAULT 'manual_archive'
)
RETURNS UUID AS $$
DECLARE
    archive_id UUID;
BEGIN
    INSERT INTO journal_archives (
        original_entry_id,
        user_id,
        date,
        energy,
        motivation,
        sleep_quality,
        hours_slept,
        sleep_time,
        wake_time,
        planned_tasks,
        completed_tasks_snapshot,
        notes,
        comments,
        ai_summary,
        archive_reason,
        original_created_at,
        original_updated_at
    )
    SELECT 
        id,
        user_id,
        date,
        energy,
        motivation,
        sleep_quality,
        hours_slept,
        sleep_time,
        wake_time,
        planned_tasks,
        completed_tasks_snapshot,
        notes,
        comments,
        ai_summary,
        reason,
        created_at,
        updated_at
    FROM journal_entries
    WHERE id = entry_id
    RETURNING archive_id INTO archive_id;
    
    RETURN archive_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION archive_journal_entry(UUID, TEXT) IS 
    'Archives a journal entry to the journal_archives table';

-- Function to get user journal statistics
CREATE OR REPLACE FUNCTION get_user_journal_stats(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_entries BIGINT,
    avg_energy NUMERIC,
    avg_motivation NUMERIC,
    avg_sleep_quality NUMERIC,
    avg_hours_slept NUMERIC,
    date_range_start DATE,
    date_range_end DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_entries,
        ROUND(AVG(energy), 2) AS avg_energy,
        ROUND(AVG(motivation), 2) AS avg_motivation,
        ROUND(AVG(sleep_quality), 2) AS avg_sleep_quality,
        ROUND(AVG(hours_slept), 2) AS avg_hours_slept,
        MIN(date) AS date_range_start,
        MAX(date) AS date_range_end
    FROM journal_entries
    WHERE user_id = p_user_id
        AND date >= CURRENT_DATE - p_days
        AND date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_journal_stats(UUID, INTEGER) IS 
    'Returns statistical summary of user journal entries for specified period';

-- ============================================================================
-- GRANTS
-- ============================================================================
-- Set appropriate permissions for authenticated users
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON journal_entries TO authenticated;
GRANT SELECT, INSERT ON journal_archives TO authenticated;

-- Grant function execution
GRANT EXECUTE ON FUNCTION archive_journal_entry(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_journal_stats(UUID, INTEGER) TO authenticated;

-- ============================================================================
-- SAMPLE DATA (OPTIONAL - COMMENT OUT IN PRODUCTION)
-- ============================================================================
-- Uncomment to insert sample data for testing
-- ============================================================================

/*
-- Insert sample journal entry (replace user_id with actual UUID)
INSERT INTO journal_entries (
    user_id,
    date,
    energy,
    motivation,
    sleep_quality,
    hours_slept,
    sleep_time,
    wake_time,
    planned_tasks,
    completed_tasks_snapshot,
    notes,
    comments,
    ai_summary
) VALUES (
    'YOUR_USER_UUID_HERE',
    CURRENT_DATE,
    7,
    8,
    6,
    7.5,
    '23:00:00',
    '06:30:00',
    'Complete project proposal, Review pull requests, Exercise',
    ARRAY['Review pull requests', 'Exercise'],
    ARRAY['Felt productive in the morning', 'Afternoon energy dip'],
    ARRAY['Need to improve sleep schedule'],
    'Good productivity day with moderate energy. Sleep quality could be improved.'
);
*/

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
