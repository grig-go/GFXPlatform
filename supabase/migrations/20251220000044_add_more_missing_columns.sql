-- Add more missing columns to Nova GFX/Pulsar tables for migration compatibility

-- gfx_projects: add interactive_enabled
ALTER TABLE gfx_projects ADD COLUMN IF NOT EXISTS interactive_enabled BOOLEAN DEFAULT FALSE;

-- gfx_templates: add enabled
ALTER TABLE gfx_templates ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;

-- gfx_elements: add z_index
ALTER TABLE gfx_elements ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 0;

-- gfx_keyframes: add properties
ALTER TABLE gfx_keyframes ADD COLUMN IF NOT EXISTS properties JSONB;

-- gfx_chat_messages: add changes_applied
ALTER TABLE gfx_chat_messages ADD COLUMN IF NOT EXISTS changes_applied BOOLEAN DEFAULT FALSE;

-- gfx_support_tickets: add attachments
ALTER TABLE gfx_support_tickets ADD COLUMN IF NOT EXISTS attachments JSONB;

-- organization_textures: add file_url
ALTER TABLE organization_textures ADD COLUMN IF NOT EXISTS file_url TEXT;

-- pulsar_playout_log: add channel_name
ALTER TABLE pulsar_playout_log ADD COLUMN IF NOT EXISTS channel_name TEXT;

-- pulsar_user_preferences: add last_project_id
ALTER TABLE pulsar_user_preferences ADD COLUMN IF NOT EXISTS last_project_id UUID REFERENCES gfx_projects(id);

-- Drop all mode check constraints and recreate with all possible values
DO $$
BEGIN
  ALTER TABLE pulsar_playlists DROP CONSTRAINT IF EXISTS pulsar_playlists_mode_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Remove any mode constraint - allow any mode value
ALTER TABLE pulsar_playlists DROP CONSTRAINT IF EXISTS check_pulsar_playlists_mode;
