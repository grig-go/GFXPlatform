-- =====================================================
-- Migration: Add Pulsar GFX tables to Nova database
-- These tables are for the Pulsar broadcast control system
-- They use u_organizations and u_users (Nova's user system)
-- =====================================================

-- -------------------------------------------------
-- PLAYLISTS
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES u_organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES gfx_projects(id),
  channel_id UUID,  -- Will reference pulsar_channels once created

  name TEXT NOT NULL,
  description TEXT,

  -- Playback mode
  mode TEXT DEFAULT 'manual' CHECK (mode IN ('manual', 'timed')),
  loop_mode TEXT DEFAULT 'none' CHECK (loop_mode IN ('none', 'loop', 'bounce')),

  -- Timed mode settings
  default_duration INTEGER DEFAULT 5000,
  end_behavior TEXT DEFAULT 'stop' CHECK (end_behavior IN ('stop', 'hold', 'loop')),

  -- State
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'playing', 'paused')),
  current_page_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- -------------------------------------------------
-- PAGE GROUPS
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_page_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES pulsar_playlists(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER NOT NULL,
  is_collapsed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------
-- PAGES (Template instances with payload)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES u_organizations(id) ON DELETE CASCADE,
  playlist_id UUID REFERENCES pulsar_playlists(id) ON DELETE CASCADE,
  template_id UUID REFERENCES gfx_templates(id),
  page_group_id UUID REFERENCES pulsar_page_groups(id) ON DELETE SET NULL,
  channel_id UUID,

  name TEXT NOT NULL,

  -- Content payload
  payload JSONB NOT NULL DEFAULT '{}',
  data_bindings JSONB DEFAULT '[]',

  -- Timing
  duration INTEGER,
  is_on_air BOOLEAN DEFAULT FALSE,

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
  organization_id UUID NOT NULL REFERENCES u_organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  channel_code TEXT NOT NULL,
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

-- Add foreign key from playlists to channels now that channels exist
ALTER TABLE pulsar_playlists
  ADD CONSTRAINT pulsar_playlists_channel_id_fkey
  FOREIGN KEY (channel_id) REFERENCES pulsar_channels(id) ON DELETE SET NULL;

-- Add foreign key from pages to channels
ALTER TABLE pulsar_pages
  ADD CONSTRAINT pulsar_pages_channel_id_fkey
  FOREIGN KEY (channel_id) REFERENCES pulsar_channels(id) ON DELETE SET NULL;

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

  -- Pending command
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
  organization_id UUID NOT NULL REFERENCES u_organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  scope_type TEXT DEFAULT 'template' CHECK (scope_type IN (
    'template', 'page', 'standalone'
  )),
  template_id UUID REFERENCES gfx_templates(id),
  page_id UUID REFERENCES pulsar_pages(id),

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

  control_type TEXT NOT NULL CHECK (control_type IN (
    'button', 'number', 'text', 'dropdown', 'toggle', 'timer', 'label', 'spacer'
  )),

  label TEXT,

  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  width INTEGER DEFAULT 1,
  height INTEGER DEFAULT 1,

  color TEXT,
  size TEXT DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),

  action JSONB NOT NULL,
  options JSONB,

  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------
-- COMMAND LOG (Audit trail)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_command_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES u_organizations(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES pulsar_channels(id),

  command_type TEXT NOT NULL,
  layer_index INTEGER,
  page_id UUID REFERENCES pulsar_pages(id),
  payload JSONB,

  executed_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,

  triggered_by UUID REFERENCES auth.users(id),
  trigger_source TEXT CHECK (trigger_source IN (
    'manual', 'playlist_auto', 'custom_ui', 'api', 'scheduled'
  ))
);

-- -------------------------------------------------
-- PLAYOUT LOG
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_playout_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES u_organizations(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES pulsar_channels(id) ON DELETE SET NULL,
  project_id UUID REFERENCES gfx_projects(id) ON DELETE SET NULL,
  template_id UUID REFERENCES gfx_templates(id) ON DELETE SET NULL,
  page_id UUID REFERENCES pulsar_pages(id) ON DELETE SET NULL,

  action TEXT NOT NULL CHECK (action IN ('play_in', 'play_out', 'update', 'clear')),
  layer_index INTEGER,
  payload JSONB,
  duration_ms INTEGER,

  operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_source TEXT DEFAULT 'manual' CHECK (trigger_source IN ('manual', 'playlist', 'api', 'scheduled')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------
-- PAGE LIBRARY
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_page_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES u_organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES gfx_projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES gfx_templates(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  payload JSONB NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,

  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- -------------------------------------------------
-- PLAYLIST PAGE LINKS
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_playlist_page_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES pulsar_playlists(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES pulsar_pages(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, page_id)
);

-- -------------------------------------------------
-- USER PREFERENCES
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pulsar_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),

  default_channel_id UUID REFERENCES pulsar_channels(id) ON DELETE SET NULL,
  default_project_id UUID REFERENCES gfx_projects(id) ON DELETE SET NULL,

  ui_layout JSONB DEFAULT '{}',
  keyboard_shortcuts JSONB DEFAULT '{}',
  notification_preferences JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------
-- INDEXES
-- -------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pulsar_playlists_org ON pulsar_playlists(organization_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_playlists_channel ON pulsar_playlists(channel_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_pages_playlist ON pulsar_pages(playlist_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_pages_template ON pulsar_pages(template_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_pages_group ON pulsar_pages(page_group_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_pages_channel ON pulsar_pages(channel_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_page_groups_playlist ON pulsar_page_groups(playlist_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_channels_org ON pulsar_channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_channel_state_channel ON pulsar_channel_state(channel_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_custom_uis_org ON pulsar_custom_uis(organization_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_custom_ui_controls_ui ON pulsar_custom_ui_controls(custom_ui_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_command_log_channel ON pulsar_command_log(channel_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulsar_playout_log_channel ON pulsar_playout_log(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulsar_page_library_project ON pulsar_page_library(project_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_page_library_template ON pulsar_page_library(template_id);

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
ALTER TABLE pulsar_playout_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsar_page_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsar_playlist_page_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsar_user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "pulsar_playlists_auth_all" ON pulsar_playlists FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pulsar_pages_auth_all" ON pulsar_pages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pulsar_page_groups_auth_all" ON pulsar_page_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pulsar_channels_auth_all" ON pulsar_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pulsar_channel_state_auth_all" ON pulsar_channel_state FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pulsar_custom_uis_auth_all" ON pulsar_custom_uis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pulsar_custom_ui_controls_auth_all" ON pulsar_custom_ui_controls FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pulsar_command_log_auth_select" ON pulsar_command_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "pulsar_command_log_auth_insert" ON pulsar_command_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pulsar_playout_log_auth_select" ON pulsar_playout_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "pulsar_playout_log_auth_insert" ON pulsar_playout_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pulsar_page_library_auth_all" ON pulsar_page_library FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pulsar_playlist_page_links_auth_all" ON pulsar_playlist_page_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pulsar_user_preferences_auth_all" ON pulsar_user_preferences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anonymous policies for Nova Player
CREATE POLICY "pulsar_channels_anon_select" ON pulsar_channels FOR SELECT TO anon USING (true);
CREATE POLICY "pulsar_channel_state_anon_all" ON pulsar_channel_state FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "pulsar_playlists_anon_select" ON pulsar_playlists FOR SELECT TO anon USING (true);
CREATE POLICY "pulsar_pages_anon_select" ON pulsar_pages FOR SELECT TO anon USING (true);
CREATE POLICY "pulsar_playout_log_anon_insert" ON pulsar_playout_log FOR INSERT TO anon WITH CHECK (true);

-- -------------------------------------------------
-- TRIGGER: Create channel state on channel insert
-- -------------------------------------------------
CREATE OR REPLACE FUNCTION create_pulsar_channel_state()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pulsar_channel_state (channel_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_pulsar_channel_created ON pulsar_channels;
CREATE TRIGGER on_pulsar_channel_created
  AFTER INSERT ON pulsar_channels
  FOR EACH ROW
  EXECUTE FUNCTION create_pulsar_channel_state();
