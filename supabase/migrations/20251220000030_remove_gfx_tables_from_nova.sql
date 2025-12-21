-- Migration: Remove Nova-GFX tables that were accidentally migrated to Nova database
-- These tables belong to the Nova-GFX Supabase project, not Nova

-- Drop GFX tables (they have no data in Nova anyway)
DROP TABLE IF EXISTS gfx_chat_history CASCADE;
DROP TABLE IF EXISTS gfx_playback_commands CASCADE;
DROP TABLE IF EXISTS gfx_playback_state CASCADE;
DROP TABLE IF EXISTS gfx_bindings CASCADE;
DROP TABLE IF EXISTS gfx_keyframes CASCADE;
DROP TABLE IF EXISTS gfx_animations CASCADE;
DROP TABLE IF EXISTS gfx_animation_presets CASCADE;
DROP TABLE IF EXISTS gfx_elements CASCADE;
DROP TABLE IF EXISTS gfx_layers CASCADE;
DROP TABLE IF EXISTS gfx_template_versions CASCADE;
DROP TABLE IF EXISTS gfx_templates CASCADE;
DROP TABLE IF EXISTS gfx_project_design_systems CASCADE;
DROP TABLE IF EXISTS gfx_folders CASCADE;
DROP TABLE IF EXISTS gfx_projects CASCADE;
