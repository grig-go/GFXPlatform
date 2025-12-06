-- =====================================================
-- PULSAR GFX PLAYOUT LOG
-- Migration: Create playout log table for tracking what played on channels
-- =====================================================

-- -------------------------------------------------
-- PLAYOUT LOG (Broadcast compliance / media log)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_playout_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,

  -- Channel info (denormalized for historical accuracy)
  channel_id UUID REFERENCES pulsar_channels(id) ON DELETE SET NULL,
  channel_code TEXT NOT NULL,
  channel_name TEXT NOT NULL,

  -- Layer info
  layer_index INTEGER NOT NULL,
  layer_name TEXT,

  -- Page info (denormalized for historical accuracy)
  page_id UUID REFERENCES pulsar_pages(id) ON DELETE SET NULL,
  page_name TEXT NOT NULL,

  -- Template info (denormalized for historical accuracy)
  template_id UUID REFERENCES gfx_templates(id) ON DELETE SET NULL,
  template_name TEXT,

  -- Project info
  project_id UUID REFERENCES gfx_projects(id) ON DELETE SET NULL,
  project_name TEXT,

  -- Payload snapshot at time of play
  payload_snapshot JSONB DEFAULT '{}',

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,  -- Computed on end, NULL if still playing

  -- End reason
  end_reason TEXT CHECK (end_reason IN (
    'manual',           -- User clicked stop/take off
    'replaced',         -- Another page took over the layer
    'cleared',          -- Layer was cleared
    'channel_offline'   -- Channel went offline
  )),

  -- Operator info
  operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operator_name TEXT,

  -- Trigger source
  trigger_source TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_source IN (
    'manual',     -- User clicked play
    'playlist',   -- Playlist automation
    'api',        -- External API call
    'scheduled'   -- Scheduled event
  )),

  -- Additional metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------
-- INDEXES for common queries
-- -------------------------------------------------
-- Query by channel and time range (most common)
CREATE INDEX IF NOT EXISTS idx_playout_log_channel_time
  ON pulsar_playout_log(channel_id, started_at DESC);

-- Query by organization and time range
CREATE INDEX IF NOT EXISTS idx_playout_log_org_time
  ON pulsar_playout_log(organization_id, started_at DESC);

-- Query by page
CREATE INDEX IF NOT EXISTS idx_playout_log_page
  ON pulsar_playout_log(page_id, started_at DESC);

-- Query by template
CREATE INDEX IF NOT EXISTS idx_playout_log_template
  ON pulsar_playout_log(template_id, started_at DESC);

-- Query by operator
CREATE INDEX IF NOT EXISTS idx_playout_log_operator
  ON pulsar_playout_log(operator_id, started_at DESC);

-- Find items still on-air (no end time)
CREATE INDEX IF NOT EXISTS idx_playout_log_active
  ON pulsar_playout_log(channel_id, layer_index)
  WHERE ended_at IS NULL;

-- -------------------------------------------------
-- ROW LEVEL SECURITY
-- -------------------------------------------------
ALTER TABLE pulsar_playout_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read playout log"
  ON pulsar_playout_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert playout log"
  ON pulsar_playout_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update playout log"
  ON pulsar_playout_log FOR UPDATE
  TO authenticated
  USING (true);

-- Allow anon role for Nova Player to update logs (e.g., when channel goes offline)
CREATE POLICY "Allow anon to update playout log"
  ON pulsar_playout_log FOR UPDATE
  TO anon
  USING (true);

-- -------------------------------------------------
-- HELPER FUNCTION: End active playout entries for a layer
-- Called when a new page takes over or layer is cleared
-- -------------------------------------------------
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
$$ LANGUAGE plpgsql;

-- -------------------------------------------------
-- HELPER FUNCTION: End all active playout entries for a channel
-- Called when channel goes offline
-- -------------------------------------------------
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
$$ LANGUAGE plpgsql;
