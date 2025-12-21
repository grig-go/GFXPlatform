-- Fix GFX schema to match source Nova-GFX cloud exactly
-- This reverts the template_id TEXT change back to UUID since the source uses UUIDs

-- Revert template_id back to UUID type
-- First drop constraints
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

-- Change back to UUID
ALTER TABLE gfx_templates ALTER COLUMN id TYPE UUID USING id::UUID;
ALTER TABLE gfx_elements ALTER COLUMN template_id TYPE UUID USING template_id::UUID;
ALTER TABLE gfx_animations ALTER COLUMN template_id TYPE UUID USING template_id::UUID;
ALTER TABLE gfx_bindings ALTER COLUMN template_id TYPE UUID USING template_id::UUID;
ALTER TABLE gfx_template_versions ALTER COLUMN template_id TYPE UUID USING template_id::UUID;
ALTER TABLE gfx_chat_history ALTER COLUMN context_template_id TYPE UUID USING context_template_id::UUID;
ALTER TABLE gfx_playback_state ALTER COLUMN template_id TYPE UUID USING template_id::UUID;
ALTER TABLE gfx_playback_commands ALTER COLUMN template_id TYPE UUID USING template_id::UUID;
ALTER TABLE pulsar_pages ALTER COLUMN template_id TYPE UUID USING template_id::UUID;
ALTER TABLE pulsar_custom_uis ALTER COLUMN template_id TYPE UUID USING template_id::UUID;
ALTER TABLE pulsar_playout_log ALTER COLUMN template_id TYPE UUID USING template_id::UUID;
ALTER TABLE pulsar_page_library ALTER COLUMN template_id TYPE UUID USING template_id::UUID;

-- Recreate FKs with proper ON DELETE behavior
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

-- Drop user FK constraints that fail for unmapped users
ALTER TABLE gfx_projects DROP CONSTRAINT IF EXISTS gfx_projects_updated_by_fkey;
ALTER TABLE gfx_projects DROP CONSTRAINT IF EXISTS gfx_projects_created_by_fkey;
ALTER TABLE gfx_templates DROP CONSTRAINT IF EXISTS gfx_templates_created_by_fkey;
ALTER TABLE gfx_template_versions DROP CONSTRAINT IF EXISTS gfx_template_versions_created_by_fkey;
ALTER TABLE organization_textures DROP CONSTRAINT IF EXISTS organization_textures_uploaded_by_fkey;
