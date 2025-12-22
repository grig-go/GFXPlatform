-- =====================================================
-- COMPREHENSIVE FIX FOR PULSAR PLAYOUT LOG SCHEMA
-- Reconciles the two different table definitions
-- =====================================================

-- Add missing columns from the original schema
ALTER TABLE pulsar_playout_log
  ADD COLUMN IF NOT EXISTS channel_code TEXT,
  ADD COLUMN IF NOT EXISTS channel_name TEXT,
  ADD COLUMN IF NOT EXISTS layer_name TEXT,
  ADD COLUMN IF NOT EXISTS page_name TEXT,
  ADD COLUMN IF NOT EXISTS template_name TEXT,
  ADD COLUMN IF NOT EXISTS project_name TEXT,
  ADD COLUMN IF NOT EXISTS operator_name TEXT,
  ADD COLUMN IF NOT EXISTS payload_snapshot JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_reason TEXT;

-- Drop the NOT NULL constraint on action column if it exists
-- The action column is from the minimal schema and not used by the code
DO $$
BEGIN
  -- Check if action column exists and drop NOT NULL if present
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'action'
  ) THEN
    ALTER TABLE pulsar_playout_log ALTER COLUMN action DROP NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors (column might not have NOT NULL constraint)
END $$;

-- Ensure NOT NULL columns have reasonable defaults for existing rows
UPDATE pulsar_playout_log
SET
  channel_code = COALESCE(channel_code, 'UNKNOWN'),
  channel_name = COALESCE(channel_name, 'Unknown Channel'),
  page_name = COALESCE(page_name, 'Unknown Page'),
  started_at = COALESCE(started_at, created_at, NOW())
WHERE channel_code IS NULL OR channel_name IS NULL OR page_name IS NULL OR started_at IS NULL;

-- Create or replace the end_active_playout function
CREATE OR REPLACE FUNCTION end_active_playout(
  p_channel_id UUID,
  p_layer_index INTEGER,
  p_end_reason TEXT DEFAULT 'replaced'
)
RETURNS void AS $$
BEGIN
  UPDATE pulsar_playout_log
  SET
    ended_at = NOW(),
    duration_ms = EXTRACT(EPOCH FROM (NOW() - COALESCE(started_at, created_at, NOW()))) * 1000,
    end_reason = p_end_reason
  WHERE
    channel_id = p_channel_id
    AND layer_index = p_layer_index
    AND ended_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the end_all_channel_playout function
CREATE OR REPLACE FUNCTION end_all_channel_playout(
  p_channel_id UUID,
  p_end_reason TEXT DEFAULT 'channel_offline'
)
RETURNS void AS $$
BEGIN
  UPDATE pulsar_playout_log
  SET
    ended_at = NOW(),
    duration_ms = EXTRACT(EPOCH FROM (NOW() - COALESCE(started_at, created_at, NOW()))) * 1000,
    end_reason = p_end_reason
  WHERE
    channel_id = p_channel_id
    AND ended_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION end_active_playout(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION end_active_playout(UUID, INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION end_all_channel_playout(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION end_all_channel_playout(UUID, TEXT) TO anon;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_playout_log_channel_time
  ON pulsar_playout_log(channel_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_playout_log_active
  ON pulsar_playout_log(channel_id, layer_index)
  WHERE ended_at IS NULL;
