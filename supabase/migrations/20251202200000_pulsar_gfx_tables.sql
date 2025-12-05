-- =====================================================
-- PULSAR GFX DATABASE SCHEMA
-- Migration: Create Pulsar GFX tables
-- =====================================================

-- -------------------------------------------------
-- PLAYLISTS
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  project_id UUID REFERENCES gfx_projects(id),

  name TEXT NOT NULL,
  description TEXT,

  -- Playback mode
  mode TEXT DEFAULT 'manual' CHECK (mode IN ('manual', 'timed')),

  -- Timed mode settings
  default_duration INTEGER DEFAULT 5000,  -- Default page duration (ms)
  end_behavior TEXT DEFAULT 'stop' CHECK (end_behavior IN ('stop', 'hold', 'loop')),

  -- State
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'playing', 'paused')),
  current_page_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- -------------------------------------------------
-- PAGE GROUPS (Optional organization within playlist)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_page_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES pulsar_playlists(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  color TEXT,  -- Hex color for visual identification
  sort_order INTEGER NOT NULL,
  is_collapsed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------
-- PAGES (Template instances with payload)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  playlist_id UUID REFERENCES pulsar_playlists(id) ON DELETE CASCADE,
  template_id UUID REFERENCES gfx_templates(id),
  page_group_id UUID REFERENCES pulsar_page_groups(id) ON DELETE SET NULL,  -- Optional

  name TEXT NOT NULL,

  -- Content payload: simple key-value
  -- Structure: { "element_id": "content_value", ... }
  -- Example: { "text_name": "John Smith", "img_photo": "https://..." }
  payload JSONB NOT NULL DEFAULT '{}',

  -- Data bindings (optional)
  data_bindings JSONB DEFAULT '[]',

  -- Timing (for timed mode)
  duration INTEGER,  -- Override default duration (ms)

  -- Organization
  sort_order INTEGER NOT NULL,
  tags TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------
-- CHANNELS (Output destinations)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,

  name TEXT NOT NULL,
  channel_code TEXT NOT NULL,  -- "CH1", "CH2", "TICKER"
  channel_type TEXT DEFAULT 'graphics' CHECK (channel_type IN (
    'graphics', 'ticker', 'fullscreen', 'preview'
  )),

  -- Nova Player connection
  player_url TEXT,
  player_status TEXT DEFAULT 'disconnected' CHECK (player_status IN (
    'disconnected', 'connecting', 'connected', 'error'
  )),
  last_heartbeat TIMESTAMPTZ,

  -- Currently loaded project
  loaded_project_id UUID REFERENCES gfx_projects(id),
  last_initialized TIMESTAMPTZ,

  -- Layer configuration
  layer_count INTEGER DEFAULT 4,
  layer_config JSONB DEFAULT '[
    {"index": 0, "name": "Layer 1", "allowedTypes": []},
    {"index": 1, "name": "Layer 2", "allowedTypes": []},
    {"index": 2, "name": "Layer 3", "allowedTypes": []},
    {"index": 3, "name": "Layer 4", "allowedTypes": []}
  ]',

  -- Access control
  assigned_operators UUID[],
  is_locked BOOLEAN DEFAULT FALSE,
  locked_by UUID REFERENCES auth.users(id),

  -- Initialize settings
  auto_initialize_on_connect BOOLEAN DEFAULT TRUE,
  auto_initialize_on_publish BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, channel_code)
);

-- -------------------------------------------------
-- CHANNEL STATE (Real-time layer state)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_channel_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES pulsar_channels(id) ON DELETE CASCADE UNIQUE,

  -- Layer states
  layers JSONB DEFAULT '[
    {"index": 0, "state": "empty", "pageId": null, "onAirSince": null},
    {"index": 1, "state": "empty", "pageId": null, "onAirSince": null},
    {"index": 2, "state": "empty", "pageId": null, "onAirSince": null},
    {"index": 3, "state": "empty", "pageId": null, "onAirSince": null}
  ]',

  -- Pending command (Pulsar writes, Nova Player reads)
  pending_command JSONB,
  command_sequence INTEGER DEFAULT 0,

  -- Last executed
  last_command JSONB,
  last_command_at TIMESTAMPTZ,
  last_acknowledged_at TIMESTAMPTZ,

  -- Control lock
  controlled_by UUID REFERENCES auth.users(id),
  control_locked_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------
-- CUSTOM UIs
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_custom_uis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,

  name TEXT NOT NULL,
  description TEXT,

  -- Scope (what this UI controls)
  scope_type TEXT DEFAULT 'template' CHECK (scope_type IN (
    'template',   -- Controls all pages of a template type
    'page',       -- Controls a specific page
    'standalone'  -- Generic, targets any template/layer
  )),
  template_id UUID REFERENCES gfx_templates(id),  -- For template scope
  page_id UUID REFERENCES pulsar_pages(id),        -- For page scope

  -- Layout
  layout JSONB DEFAULT '{"width": 400, "height": 300, "columns": 2}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- -------------------------------------------------
-- CUSTOM UI CONTROLS
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_custom_ui_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_ui_id UUID REFERENCES pulsar_custom_uis(id) ON DELETE CASCADE,

  -- Control type
  control_type TEXT NOT NULL CHECK (control_type IN (
    'button', 'number', 'text', 'dropdown', 'toggle', 'timer', 'label', 'spacer'
  )),

  label TEXT,

  -- Position & size
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  width INTEGER DEFAULT 1,
  height INTEGER DEFAULT 1,

  -- Styling
  color TEXT,
  size TEXT DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),

  -- Action configuration
  action JSONB NOT NULL,

  -- For dropdown/select controls
  options JSONB,  -- [{"label": "Q1", "value": "1"}, ...]

  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------
-- COMMAND LOG (Audit trail)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_command_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  channel_id UUID REFERENCES pulsar_channels(id),

  -- Command details
  command_type TEXT NOT NULL,
  layer_index INTEGER,
  page_id UUID REFERENCES pulsar_pages(id),
  payload JSONB,

  -- Execution
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,

  -- Who/what triggered
  triggered_by UUID REFERENCES auth.users(id),
  trigger_source TEXT CHECK (trigger_source IN (
    'manual', 'playlist_auto', 'custom_ui', 'api', 'scheduled'
  ))
);

-- -------------------------------------------------
-- INDEXES
-- -------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pulsar_pages_playlist ON pulsar_pages(playlist_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_pages_template ON pulsar_pages(template_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_pages_group ON pulsar_pages(page_group_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_page_groups_playlist ON pulsar_page_groups(playlist_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_channel_state_channel ON pulsar_channel_state(channel_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_custom_ui_controls_ui ON pulsar_custom_ui_controls(custom_ui_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_command_log_channel ON pulsar_command_log(channel_id, executed_at DESC);

-- -------------------------------------------------
-- REALTIME
-- -------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE pulsar_playlists;
ALTER PUBLICATION supabase_realtime ADD TABLE pulsar_pages;
ALTER PUBLICATION supabase_realtime ADD TABLE pulsar_channel_state;
ALTER PUBLICATION supabase_realtime ADD TABLE pulsar_channels;

-- -------------------------------------------------
-- ROW LEVEL SECURITY
-- -------------------------------------------------
ALTER TABLE pulsar_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsar_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsar_page_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsar_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsar_channel_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsar_custom_uis ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsar_custom_ui_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsar_command_log ENABLE ROW LEVEL SECURITY;

-- Basic policies allowing authenticated users to access data
-- In production, these should be scoped to organization_id

CREATE POLICY "Allow authenticated users to read playlists"
  ON pulsar_playlists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert playlists"
  ON pulsar_playlists FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update playlists"
  ON pulsar_playlists FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete playlists"
  ON pulsar_playlists FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read pages"
  ON pulsar_pages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert pages"
  ON pulsar_pages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update pages"
  ON pulsar_pages FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete pages"
  ON pulsar_pages FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage page groups"
  ON pulsar_page_groups FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read channels"
  ON pulsar_channels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage channels"
  ON pulsar_channels FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage channel state"
  ON pulsar_channel_state FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage custom UIs"
  ON pulsar_custom_uis FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage custom UI controls"
  ON pulsar_custom_ui_controls FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read command log"
  ON pulsar_command_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert command log"
  ON pulsar_command_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- -------------------------------------------------
-- HELPER FUNCTION: Create channel state on channel insert
-- -------------------------------------------------
CREATE OR REPLACE FUNCTION create_channel_state()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pulsar_channel_state (channel_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_channel_created
  AFTER INSERT ON pulsar_channels
  FOR EACH ROW
  EXECUTE FUNCTION create_channel_state();
