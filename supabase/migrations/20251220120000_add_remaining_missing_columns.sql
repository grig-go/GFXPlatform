-- Add remaining missing columns found during migration testing
-- These columns exist in Nova-GFX cloud but are not in Nova

-- =====================================================
-- gfx_projects
-- =====================================================
-- updated_by column references u_users but may have unmapped users
-- Make it nullable and without FK for now
ALTER TABLE gfx_projects ADD COLUMN IF NOT EXISTS updated_by UUID;
-- Don't add FK for now since users may not map

-- =====================================================
-- gfx_chat_messages: add context_template_id
-- =====================================================
ALTER TABLE gfx_chat_messages ADD COLUMN IF NOT EXISTS context_template_id TEXT;

-- =====================================================
-- gfx_support_tickets: add project_name
-- =====================================================
ALTER TABLE gfx_support_tickets ADD COLUMN IF NOT EXISTS project_name TEXT;

-- =====================================================
-- organization_textures: add uploaded_by
-- =====================================================
ALTER TABLE organization_textures ADD COLUMN IF NOT EXISTS uploaded_by UUID;
-- Don't add FK for now

-- =====================================================
-- pulsar_playout_log: add layer_name
-- =====================================================
ALTER TABLE pulsar_playout_log ADD COLUMN IF NOT EXISTS layer_name TEXT;

-- =====================================================
-- pulsar_user_preferences: add show_content_editor and other columns
-- =====================================================
ALTER TABLE pulsar_user_preferences ADD COLUMN IF NOT EXISTS show_content_editor BOOLEAN DEFAULT true;
ALTER TABLE pulsar_user_preferences ADD COLUMN IF NOT EXISTS show_playout_controls BOOLEAN DEFAULT true;
ALTER TABLE pulsar_user_preferences ADD COLUMN IF NOT EXISTS show_preview BOOLEAN DEFAULT true;
ALTER TABLE pulsar_user_preferences ADD COLUMN IF NOT EXISTS open_playlist_ids UUID[] DEFAULT '{}';
ALTER TABLE pulsar_user_preferences ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system';
