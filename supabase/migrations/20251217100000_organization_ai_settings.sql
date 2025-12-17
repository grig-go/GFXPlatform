-- ============================================
-- ORGANIZATION AI SETTINGS
-- Store AI model preferences and API keys per organization
-- Uses existing settings JSONB column
-- ============================================

-- No schema changes needed - we use the existing settings JSONB column
-- This migration just documents the structure and adds a comment

COMMENT ON COLUMN organizations.settings IS 'Organization settings JSON. Includes:
- ai_model: Selected AI model ID (e.g., "gemini-2.5-flash", "claude-sonnet")
- ai_image_model: Selected image generation model ID (e.g., "gemini-2.0-flash")
- gemini_api_key: Encrypted Gemini API key (optional, org-wide)
- claude_api_key: Encrypted Claude API key (optional, org-wide)
';

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Organization AI settings migration complete (uses existing settings JSONB)';
END $$;
