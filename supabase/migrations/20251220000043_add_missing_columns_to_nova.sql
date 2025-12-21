-- Add missing columns to Nova GFX/Pulsar tables for migration compatibility
-- These columns exist in the source Nova-GFX database but were missing from the initial Nova migration

-- gfx_projects: add interactive_config
ALTER TABLE gfx_projects ADD COLUMN IF NOT EXISTS interactive_config JSONB;

-- gfx_templates: add data_source_config
ALTER TABLE gfx_templates ADD COLUMN IF NOT EXISTS data_source_config JSONB;

-- gfx_layers: add locked
ALTER TABLE gfx_layers ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE;

-- gfx_elements: add interactions
ALTER TABLE gfx_elements ADD COLUMN IF NOT EXISTS interactions JSONB;

-- gfx_keyframes: add name
ALTER TABLE gfx_keyframes ADD COLUMN IF NOT EXISTS name TEXT;

-- gfx_chat_messages: add attachments
ALTER TABLE gfx_chat_messages ADD COLUMN IF NOT EXISTS attachments JSONB;

-- gfx_support_tickets: add admin_notes
ALTER TABLE gfx_support_tickets ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- organization_textures: add file_name
ALTER TABLE organization_textures ADD COLUMN IF NOT EXISTS file_name TEXT;

-- pulsar_page_groups: add parent_group_id (for nested groups)
ALTER TABLE pulsar_page_groups ADD COLUMN IF NOT EXISTS parent_group_id UUID REFERENCES pulsar_page_groups(id);

-- pulsar_channels: add channel_mode
ALTER TABLE pulsar_channels ADD COLUMN IF NOT EXISTS channel_mode TEXT;

-- pulsar_playout_log: add channel_code
ALTER TABLE pulsar_playout_log ADD COLUMN IF NOT EXISTS channel_code TEXT;

-- pulsar_page_library: add duration
ALTER TABLE pulsar_page_library ADD COLUMN IF NOT EXISTS duration INTEGER;

-- pulsar_user_preferences: add active_playlist_id
ALTER TABLE pulsar_user_preferences ADD COLUMN IF NOT EXISTS active_playlist_id UUID REFERENCES pulsar_playlists(id);

-- Fix pulsar_playlists mode constraint - need to drop and recreate
-- First drop the constraint if it exists
DO $$
BEGIN
  ALTER TABLE pulsar_playlists DROP CONSTRAINT IF EXISTS pulsar_playlists_mode_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Add updated constraint that includes additional modes
ALTER TABLE pulsar_playlists
  ADD CONSTRAINT pulsar_playlists_mode_check
  CHECK (mode IN ('manual', 'timed', 'sequential', 'random'));
