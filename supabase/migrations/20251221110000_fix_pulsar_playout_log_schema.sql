-- =====================================================
-- FIX PULSAR PLAYOUT LOG SCHEMA
-- Add missing columns and functions that weren't applied correctly
-- =====================================================

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- started_at column (required for indexes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  -- created_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- page_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'page_name'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN page_name TEXT;
  END IF;

  -- page_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'page_id'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN page_id UUID REFERENCES pulsar_pages(id) ON DELETE SET NULL;
  END IF;

  -- template_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN template_id UUID REFERENCES gfx_templates(id) ON DELETE SET NULL;
  END IF;

  -- template_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'template_name'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN template_name TEXT;
  END IF;

  -- project_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN project_id UUID REFERENCES gfx_projects(id) ON DELETE SET NULL;
  END IF;

  -- project_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'project_name'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN project_name TEXT;
  END IF;

  -- layer_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'layer_name'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN layer_name TEXT;
  END IF;

  -- payload_snapshot column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'payload_snapshot'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN payload_snapshot JSONB DEFAULT '{}';
  END IF;

  -- ended_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN ended_at TIMESTAMPTZ;
  END IF;

  -- duration_ms column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'duration_ms'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN duration_ms INTEGER;
  END IF;

  -- end_reason column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'end_reason'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN end_reason TEXT CHECK (end_reason IN (
      'manual',
      'replaced',
      'cleared',
      'channel_offline'
    ));
  END IF;

  -- operator_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'operator_id'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN operator_id UUID;
  END IF;

  -- operator_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'operator_name'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN operator_name TEXT;
  END IF;

  -- trigger_source column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'trigger_source'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN trigger_source TEXT DEFAULT 'manual' CHECK (trigger_source IN (
      'manual',
      'playlist',
      'api',
      'scheduled'
    ));
  END IF;

  -- metadata column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pulsar_playout_log' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_playout_log_channel_time
  ON pulsar_playout_log(channel_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_playout_log_org_time
  ON pulsar_playout_log(organization_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_playout_log_page
  ON pulsar_playout_log(page_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_playout_log_template
  ON pulsar_playout_log(template_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_playout_log_operator
  ON pulsar_playout_log(operator_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_playout_log_active
  ON pulsar_playout_log(channel_id, layer_index)
  WHERE ended_at IS NULL;

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
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
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
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
    end_reason = p_end_reason
  WHERE
    channel_id = p_channel_id
    AND ended_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION end_active_playout(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION end_active_playout(UUID, INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION end_all_channel_playout(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION end_all_channel_playout(UUID, TEXT) TO anon;
