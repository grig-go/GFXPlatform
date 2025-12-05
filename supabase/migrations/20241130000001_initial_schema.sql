-- Nova GFX Database Schema
-- Initial migration for broadcast graphics platform

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ORGANIZATIONS & USERS
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  max_projects INTEGER DEFAULT 10,
  max_storage_mb INTEGER DEFAULT 5000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PROJECTS
-- ============================================

CREATE TABLE IF NOT EXISTS gfx_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  custom_url_slug TEXT UNIQUE,
  canvas_width INTEGER DEFAULT 1920,
  canvas_height INTEGER DEFAULT 1080,
  frame_rate INTEGER DEFAULT 60,
  background_color TEXT DEFAULT 'transparent',
  api_key TEXT DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  api_enabled BOOLEAN DEFAULT true,
  is_live BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, slug)
);

CREATE TABLE IF NOT EXISTS gfx_project_design_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES gfx_projects(id) ON DELETE CASCADE UNIQUE,
  colors JSONB DEFAULT '{"primary": "#8B5CF6", "secondary": "#EC4899", "accent": "#06B6D4", "background": "#000000", "text": "#FFFFFF"}',
  fonts JSONB DEFAULT '{"heading": {"family": "Inter", "weight": 700}, "body": {"family": "Inter", "weight": 400}}',
  spacing JSONB DEFAULT '{"xs": 4, "sm": 8, "md": 16, "lg": 24, "xl": 32}',
  animation_defaults JSONB DEFAULT '{"inDuration": 500, "outDuration": 300, "easing": "ease-out"}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- LAYERS
-- ============================================

CREATE TABLE IF NOT EXISTS gfx_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES gfx_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layer_type TEXT CHECK (layer_type IN ('fullscreen', 'background', 'lower-third', 'side-panel', 'ticker', 'bug', 'alert', 'overlay', 'custom')) NOT NULL,
  z_index INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  position_anchor TEXT DEFAULT 'top-left',
  position_offset_x INTEGER DEFAULT 0,
  position_offset_y INTEGER DEFAULT 0,
  width INTEGER,
  height INTEGER,
  auto_out BOOLEAN DEFAULT false,
  auto_out_delay INTEGER DEFAULT 5000,
  allow_multiple BOOLEAN DEFAULT false,
  transition_in TEXT DEFAULT 'fade',
  transition_in_duration INTEGER DEFAULT 500,
  transition_out TEXT DEFAULT 'fade',
  transition_out_duration INTEGER DEFAULT 300,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FOLDERS
-- ============================================

CREATE TABLE IF NOT EXISTS gfx_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES gfx_projects(id) ON DELETE CASCADE,
  layer_id UUID REFERENCES gfx_layers(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES gfx_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  expanded BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS gfx_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES gfx_projects(id) ON DELETE CASCADE,
  layer_id UUID REFERENCES gfx_layers(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES gfx_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  html_template TEXT DEFAULT '<div class="gfx-root"></div>',
  css_styles TEXT DEFAULT '',
  width INTEGER,
  height INTEGER,
  in_duration INTEGER DEFAULT 500,
  loop_duration INTEGER,
  loop_iterations INTEGER DEFAULT -1,
  out_duration INTEGER DEFAULT 300,
  libraries TEXT[] DEFAULT '{}',
  custom_script TEXT,
  locked BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- ELEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS gfx_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES gfx_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  element_id TEXT NOT NULL,
  element_type TEXT CHECK (element_type IN ('div', 'text', 'image', 'shape', 'group', 'video', 'lottie', 'd3-chart')) NOT NULL,
  parent_element_id UUID REFERENCES gfx_elements(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  width FLOAT,
  height FLOAT,
  rotation FLOAT DEFAULT 0,
  scale_x FLOAT DEFAULT 1,
  scale_y FLOAT DEFAULT 1,
  anchor_x FLOAT DEFAULT 0.5,
  anchor_y FLOAT DEFAULT 0.5,
  opacity FLOAT DEFAULT 1,
  content JSONB DEFAULT '{"type": "div"}',
  styles JSONB DEFAULT '{}',
  classes TEXT[] DEFAULT '{}',
  visible BOOLEAN DEFAULT true,
  locked BOOLEAN DEFAULT false
);

-- ============================================
-- ANIMATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS gfx_animations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES gfx_templates(id) ON DELETE CASCADE,
  element_id UUID REFERENCES gfx_elements(id) ON DELETE CASCADE,
  phase TEXT CHECK (phase IN ('in', 'loop', 'out')) NOT NULL,
  delay INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 500,
  iterations INTEGER DEFAULT 1,
  direction TEXT DEFAULT 'normal',
  easing TEXT DEFAULT 'ease-out',
  preset_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gfx_keyframes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animation_id UUID REFERENCES gfx_animations(id) ON DELETE CASCADE,
  position FLOAT CHECK (position >= 0 AND position <= 100) NOT NULL,
  easing TEXT DEFAULT 'linear',
  position_x FLOAT,
  position_y FLOAT,
  rotation FLOAT,
  scale_x FLOAT,
  scale_y FLOAT,
  opacity FLOAT,
  clip_path TEXT,
  filter_blur FLOAT,
  filter_brightness FLOAT,
  color TEXT,
  background_color TEXT,
  custom JSONB,
  sort_order INTEGER DEFAULT 0
);

-- ============================================
-- DATA BINDINGS
-- ============================================

CREATE TABLE IF NOT EXISTS gfx_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES gfx_templates(id) ON DELETE CASCADE,
  element_id UUID REFERENCES gfx_elements(id) ON DELETE CASCADE,
  binding_key TEXT NOT NULL,
  target_property TEXT NOT NULL,
  binding_type TEXT CHECK (binding_type IN ('text', 'image', 'number', 'color', 'boolean')) DEFAULT 'text',
  default_value TEXT,
  formatter TEXT,
  formatter_options JSONB,
  required BOOLEAN DEFAULT false
);

-- ============================================
-- CHAT HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS gfx_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES gfx_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  context_template_id UUID REFERENCES gfx_templates(id) ON DELETE SET NULL,
  context_element_ids UUID[],
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB,
  changes_applied JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PLAYBACK STATE (Real-time)
-- ============================================

CREATE TABLE IF NOT EXISTS gfx_playback_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES gfx_projects(id) ON DELETE CASCADE,
  layer_id UUID REFERENCES gfx_layers(id) ON DELETE CASCADE,
  template_id UUID REFERENCES gfx_templates(id) ON DELETE SET NULL,
  state TEXT CHECK (state IN ('empty', 'in', 'hold', 'loop', 'out')) DEFAULT 'empty',
  data_override JSONB,
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, layer_id)
);

CREATE TABLE IF NOT EXISTS gfx_playback_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES gfx_projects(id) ON DELETE CASCADE,
  layer_id UUID REFERENCES gfx_layers(id) ON DELETE CASCADE,
  template_id UUID REFERENCES gfx_templates(id) ON DELETE SET NULL,
  command TEXT CHECK (command IN ('play_in', 'play_out', 'update', 'clear', 'clear_all')) NOT NULL,
  data JSONB,
  transition TEXT,
  transition_duration INTEGER,
  executed BOOLEAN DEFAULT false,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TEMPLATE VERSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS gfx_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES gfx_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  label TEXT,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(template_id, version_number)
);

-- ============================================
-- ANIMATION PRESETS
-- ============================================

CREATE TABLE IF NOT EXISTS gfx_animation_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('entrance', 'exit', 'emphasis', 'motion')) NOT NULL,
  definition JSONB NOT NULL,
  preview_url TEXT,
  is_system BOOLEAN DEFAULT false,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_gfx_projects_org ON gfx_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_gfx_projects_slug ON gfx_projects(slug);
CREATE INDEX IF NOT EXISTS idx_gfx_layers_project ON gfx_layers(project_id);
CREATE INDEX IF NOT EXISTS idx_gfx_templates_project ON gfx_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_gfx_templates_layer ON gfx_templates(layer_id);
CREATE INDEX IF NOT EXISTS idx_gfx_elements_template ON gfx_elements(template_id);
CREATE INDEX IF NOT EXISTS idx_gfx_animations_template ON gfx_animations(template_id);
CREATE INDEX IF NOT EXISTS idx_gfx_animations_element ON gfx_animations(element_id);
CREATE INDEX IF NOT EXISTS idx_gfx_keyframes_animation ON gfx_keyframes(animation_id);
CREATE INDEX IF NOT EXISTS idx_gfx_bindings_template ON gfx_bindings(template_id);
CREATE INDEX IF NOT EXISTS idx_gfx_playback_state_project ON gfx_playback_state(project_id);
CREATE INDEX IF NOT EXISTS idx_gfx_playback_commands_project ON gfx_playback_commands(project_id);
CREATE INDEX IF NOT EXISTS idx_gfx_chat_history_project ON gfx_chat_history(project_id);

-- ============================================
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE gfx_playback_state;
ALTER PUBLICATION supabase_realtime ADD TABLE gfx_playback_commands;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gfx_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE gfx_project_design_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE gfx_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE gfx_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE gfx_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gfx_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE gfx_animations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gfx_keyframes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gfx_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gfx_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE gfx_playback_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE gfx_playback_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE gfx_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gfx_animation_presets ENABLE ROW LEVEL SECURITY;

-- For development: Allow all operations (replace with proper policies in production)
CREATE POLICY "Allow all for development" ON organizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON gfx_projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON gfx_project_design_systems FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON gfx_layers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON gfx_folders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON gfx_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON gfx_elements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON gfx_animations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON gfx_keyframes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON gfx_bindings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON gfx_chat_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON gfx_playback_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON gfx_playback_commands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON gfx_template_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON gfx_animation_presets FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SEED DATA: Default Animation Presets
-- ============================================

INSERT INTO gfx_animation_presets (name, description, category, definition, is_system) VALUES
('Fade In', 'Simple fade in from transparent', 'entrance', '{"duration": 500, "easing": "ease-out", "keyframes": [{"position": 0, "opacity": 0}, {"position": 100, "opacity": 1}]}', true),
('Fade Out', 'Simple fade out to transparent', 'exit', '{"duration": 300, "easing": "ease-in", "keyframes": [{"position": 0, "opacity": 1}, {"position": 100, "opacity": 0}]}', true),
('Slide In Left', 'Slide in from the left', 'entrance', '{"duration": 400, "easing": "ease-out", "keyframes": [{"position": 0, "position_x": -100, "opacity": 0}, {"position": 100, "position_x": 0, "opacity": 1}]}', true),
('Slide In Right', 'Slide in from the right', 'entrance', '{"duration": 400, "easing": "ease-out", "keyframes": [{"position": 0, "position_x": 100, "opacity": 0}, {"position": 100, "position_x": 0, "opacity": 1}]}', true),
('Slide In Up', 'Slide in from below', 'entrance', '{"duration": 400, "easing": "ease-out", "keyframes": [{"position": 0, "position_y": 50, "opacity": 0}, {"position": 100, "position_y": 0, "opacity": 1}]}', true),
('Slide Out Left', 'Slide out to the left', 'exit', '{"duration": 300, "easing": "ease-in", "keyframes": [{"position": 0, "position_x": 0, "opacity": 1}, {"position": 100, "position_x": -100, "opacity": 0}]}', true),
('Scale In', 'Scale up from small', 'entrance', '{"duration": 400, "easing": "ease-out", "keyframes": [{"position": 0, "scale_x": 0.8, "scale_y": 0.8, "opacity": 0}, {"position": 100, "scale_x": 1, "scale_y": 1, "opacity": 1}]}', true),
('Scale Out', 'Scale down and fade', 'exit', '{"duration": 300, "easing": "ease-in", "keyframes": [{"position": 0, "scale_x": 1, "scale_y": 1, "opacity": 1}, {"position": 100, "scale_x": 0.8, "scale_y": 0.8, "opacity": 0}]}', true),
('Reveal Left', 'Reveal with clip path from left', 'entrance', '{"duration": 500, "easing": "ease-out", "keyframes": [{"position": 0, "clip_path": "inset(0 100% 0 0)"}, {"position": 100, "clip_path": "inset(0 0% 0 0)"}]}', true),
('Pulse', 'Subtle pulse effect', 'emphasis', '{"duration": 600, "easing": "ease-in-out", "keyframes": [{"position": 0, "scale_x": 1, "scale_y": 1}, {"position": 50, "scale_x": 1.05, "scale_y": 1.05}, {"position": 100, "scale_x": 1, "scale_y": 1}]}', true);

