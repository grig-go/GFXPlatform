-- Nova GFX Schema Fixes
-- Migration to add missing columns and fix constraints

-- ============================================
-- FIX: gfx_projects - Add missing columns
-- ============================================

ALTER TABLE gfx_projects 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

ALTER TABLE gfx_projects 
ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;

-- ============================================
-- FIX: gfx_layers - Add locked column
-- ============================================

ALTER TABLE gfx_layers 
ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;

-- ============================================
-- FIX: gfx_templates - Add enabled column
-- ============================================

ALTER TABLE gfx_templates 
ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;

-- ============================================
-- FIX: gfx_elements - Add z_index and map type
-- ============================================

ALTER TABLE gfx_elements 
ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 0;

-- Drop and recreate the element_type constraint to include 'map'
ALTER TABLE gfx_elements 
DROP CONSTRAINT IF EXISTS gfx_elements_element_type_check;

ALTER TABLE gfx_elements 
ADD CONSTRAINT gfx_elements_element_type_check 
CHECK (element_type IN ('div', 'text', 'image', 'shape', 'group', 'video', 'lottie', 'd3-chart', 'map', 'chart'));

-- ============================================
-- FIX: gfx_keyframes - Add properties JSONB column
-- The frontend uses a single 'properties' column instead of individual columns
-- ============================================

ALTER TABLE gfx_keyframes 
ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '{}';

-- Migrate existing individual column data to properties JSONB
UPDATE gfx_keyframes 
SET properties = jsonb_build_object(
  'position_x', COALESCE(position_x, null),
  'position_y', COALESCE(position_y, null),
  'rotation', COALESCE(rotation, null),
  'scale_x', COALESCE(scale_x, null),
  'scale_y', COALESCE(scale_y, null),
  'opacity', COALESCE(opacity, null),
  'clip_path', COALESCE(clip_path, null),
  'filter_blur', COALESCE(filter_blur, null),
  'filter_brightness', COALESCE(filter_brightness, null),
  'color', COALESCE(color, null),
  'background_color', COALESCE(background_color, null)
) - 'null'::text  -- Remove null values from the JSONB
WHERE properties = '{}'::jsonb OR properties IS NULL;

-- ============================================
-- FIX: gfx_layers - Add video layer type
-- ============================================

ALTER TABLE gfx_layers 
DROP CONSTRAINT IF EXISTS gfx_layers_layer_type_check;

ALTER TABLE gfx_layers 
ADD CONSTRAINT gfx_layers_layer_type_check 
CHECK (layer_type IN ('fullscreen', 'background', 'lower-third', 'side-panel', 'ticker', 'bug', 'alert', 'overlay', 'video', 'map', 'custom'));

-- ============================================
-- CREATE: gfx_chat_messages table (if gfx_chat_history doesn't match frontend expectations)
-- ============================================

CREATE TABLE IF NOT EXISTS gfx_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES gfx_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  context_template_id UUID REFERENCES gfx_templates(id) ON DELETE SET NULL,
  context_element_ids UUID[],
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB,
  changes_applied JSONB,
  error BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gfx_chat_messages_project ON gfx_chat_messages(project_id);

-- Enable RLS
ALTER TABLE gfx_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for development" ON gfx_chat_messages FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- CREATE: Default organization and user for development
-- ============================================

INSERT INTO organizations (id, name, slug, settings)
VALUES ('00000000-0000-0000-0000-000000000001', 'Nova Development', 'nova-dev', '{}')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DONE
-- ============================================

