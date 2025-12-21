-- Sync Nova GFX/Pulsar tables with actual Nova-GFX cloud schema
-- These columns exist in Nova-GFX cloud but were missing from our migration files

-- =====================================================
-- gfx_projects: add settings column
-- =====================================================
ALTER TABLE gfx_projects ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- =====================================================
-- gfx_chat_messages: add context_element_ids
-- =====================================================
ALTER TABLE gfx_chat_messages ADD COLUMN IF NOT EXISTS context_element_ids TEXT[];

-- =====================================================
-- gfx_support_tickets: add organization_id
-- =====================================================
ALTER TABLE gfx_support_tickets ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);

-- =====================================================
-- organization_textures: add thumbnail_url
-- =====================================================
ALTER TABLE organization_textures ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- =====================================================
-- pulsar_playout_log: add ended_at
-- =====================================================
ALTER TABLE pulsar_playout_log ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

-- =====================================================
-- pulsar_user_preferences: add selected_channel_id
-- =====================================================
ALTER TABLE pulsar_user_preferences ADD COLUMN IF NOT EXISTS selected_channel_id UUID REFERENCES pulsar_channels(id);

-- =====================================================
-- gfx_templates: allow TEXT for id (instead of UUID only)
-- The source data has templates with text IDs like "weather-daily"
-- =====================================================

-- Drop ALL dependent foreign key constraints that reference gfx_templates(id)
ALTER TABLE gfx_elements DROP CONSTRAINT IF EXISTS gfx_elements_template_id_fkey;
ALTER TABLE gfx_animations DROP CONSTRAINT IF EXISTS gfx_animations_template_id_fkey;
ALTER TABLE gfx_bindings DROP CONSTRAINT IF EXISTS gfx_bindings_template_id_fkey;
ALTER TABLE gfx_template_versions DROP CONSTRAINT IF EXISTS gfx_template_versions_template_id_fkey;
ALTER TABLE gfx_chat_history DROP CONSTRAINT IF EXISTS gfx_chat_history_context_template_id_fkey;
ALTER TABLE gfx_playback_state DROP CONSTRAINT IF EXISTS gfx_playback_state_template_id_fkey;
ALTER TABLE gfx_playback_commands DROP CONSTRAINT IF EXISTS gfx_playback_commands_template_id_fkey;
ALTER TABLE pulsar_pages DROP CONSTRAINT IF EXISTS pulsar_pages_template_id_fkey;
ALTER TABLE pulsar_custom_uis DROP CONSTRAINT IF EXISTS pulsar_custom_uis_template_id_fkey;
ALTER TABLE pulsar_playout_log DROP CONSTRAINT IF EXISTS pulsar_playout_log_template_id_fkey;
ALTER TABLE pulsar_page_library DROP CONSTRAINT IF EXISTS pulsar_page_library_template_id_fkey;

-- Change gfx_templates.id from UUID to TEXT
ALTER TABLE gfx_templates ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Change ALL referencing columns to TEXT
ALTER TABLE gfx_elements ALTER COLUMN template_id TYPE TEXT USING template_id::TEXT;
ALTER TABLE gfx_animations ALTER COLUMN template_id TYPE TEXT USING template_id::TEXT;
ALTER TABLE gfx_bindings ALTER COLUMN template_id TYPE TEXT USING template_id::TEXT;
ALTER TABLE gfx_template_versions ALTER COLUMN template_id TYPE TEXT USING template_id::TEXT;
ALTER TABLE gfx_chat_history ALTER COLUMN context_template_id TYPE TEXT USING context_template_id::TEXT;
ALTER TABLE gfx_playback_state ALTER COLUMN template_id TYPE TEXT USING template_id::TEXT;
ALTER TABLE gfx_playback_commands ALTER COLUMN template_id TYPE TEXT USING template_id::TEXT;
ALTER TABLE pulsar_pages ALTER COLUMN template_id TYPE TEXT USING template_id::TEXT;
ALTER TABLE pulsar_custom_uis ALTER COLUMN template_id TYPE TEXT USING template_id::TEXT;
ALTER TABLE pulsar_playout_log ALTER COLUMN template_id TYPE TEXT USING template_id::TEXT;
ALTER TABLE pulsar_page_library ALTER COLUMN template_id TYPE TEXT USING template_id::TEXT;

-- Recreate foreign key constraints with TEXT type
ALTER TABLE gfx_elements ADD CONSTRAINT gfx_elements_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES gfx_templates(id) ON DELETE CASCADE;
ALTER TABLE gfx_animations ADD CONSTRAINT gfx_animations_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES gfx_templates(id) ON DELETE CASCADE;
ALTER TABLE gfx_bindings ADD CONSTRAINT gfx_bindings_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES gfx_templates(id) ON DELETE CASCADE;
ALTER TABLE gfx_template_versions ADD CONSTRAINT gfx_template_versions_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES gfx_templates(id) ON DELETE CASCADE;
ALTER TABLE gfx_chat_history ADD CONSTRAINT gfx_chat_history_context_template_id_fkey
  FOREIGN KEY (context_template_id) REFERENCES gfx_templates(id) ON DELETE SET NULL;
ALTER TABLE gfx_playback_state ADD CONSTRAINT gfx_playback_state_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES gfx_templates(id) ON DELETE SET NULL;
ALTER TABLE gfx_playback_commands ADD CONSTRAINT gfx_playback_commands_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES gfx_templates(id) ON DELETE SET NULL;
ALTER TABLE pulsar_pages ADD CONSTRAINT pulsar_pages_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES gfx_templates(id) ON DELETE SET NULL;
ALTER TABLE pulsar_custom_uis ADD CONSTRAINT pulsar_custom_uis_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES gfx_templates(id) ON DELETE SET NULL;
ALTER TABLE pulsar_playout_log ADD CONSTRAINT pulsar_playout_log_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES gfx_templates(id) ON DELETE SET NULL;
ALTER TABLE pulsar_page_library ADD CONSTRAINT pulsar_page_library_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES gfx_templates(id) ON DELETE CASCADE;
