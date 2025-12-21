-- Add more missing columns to Nova GFX/Pulsar tables for migration compatibility (v2)

-- gfx_projects
ALTER TABLE gfx_projects ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT FALSE;
ALTER TABLE gfx_projects ADD COLUMN IF NOT EXISTS updated_by UUID;

-- gfx_chat_messages
ALTER TABLE gfx_chat_messages ADD COLUMN IF NOT EXISTS content TEXT;

-- gfx_support_tickets
ALTER TABLE gfx_support_tickets ADD COLUMN IF NOT EXISTS browser_info JSONB;

-- organization_textures
ALTER TABLE organization_textures ADD COLUMN IF NOT EXISTS size INTEGER;

-- pulsar_playout_log
ALTER TABLE pulsar_playout_log ADD COLUMN IF NOT EXISTS end_reason TEXT;

-- pulsar_user_preferences
ALTER TABLE pulsar_user_preferences ADD COLUMN IF NOT EXISTS open_playlist_ids UUID[];

-- Drop element_type constraint to allow new types
DO $$
BEGIN
  ALTER TABLE gfx_elements DROP CONSTRAINT IF EXISTS gfx_elements_element_type_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Remove the FK constraint on pulsar_playlists.organization_id to reference u_organizations
DO $$
BEGIN
  ALTER TABLE pulsar_playlists DROP CONSTRAINT IF EXISTS pulsar_playlists_organization_id_fkey;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE pulsar_playlists
  ADD CONSTRAINT pulsar_playlists_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES u_organizations(id);

-- Same for pulsar_pages
DO $$
BEGIN
  ALTER TABLE pulsar_pages DROP CONSTRAINT IF EXISTS pulsar_pages_organization_id_fkey;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE pulsar_pages
  ADD CONSTRAINT pulsar_pages_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES u_organizations(id);

-- pulsar_channels
DO $$
BEGIN
  ALTER TABLE pulsar_channels DROP CONSTRAINT IF EXISTS pulsar_channels_organization_id_fkey;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE pulsar_channels
  ADD CONSTRAINT pulsar_channels_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES u_organizations(id);

-- pulsar_command_log
DO $$
BEGIN
  ALTER TABLE pulsar_command_log DROP CONSTRAINT IF EXISTS pulsar_command_log_organization_id_fkey;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE pulsar_command_log
  ADD CONSTRAINT pulsar_command_log_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES u_organizations(id);

-- pulsar_page_library
DO $$
BEGIN
  ALTER TABLE pulsar_page_library DROP CONSTRAINT IF EXISTS pulsar_page_library_organization_id_fkey;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE pulsar_page_library
  ADD CONSTRAINT pulsar_page_library_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES u_organizations(id);
