-- Fix Nova-GFX providers: Remove separate claude provider, add dashboard assignments to existing providers

-- Delete the separate nova-gfx-claude provider (not needed)
DELETE FROM ai_providers WHERE id = 'nova-gfx-claude';

-- Delete the separate nova-gfx-text provider (will use default providers instead)
DELETE FROM ai_providers WHERE id = 'nova-gfx-text';

-- Add nova-gfx-text dashboard assignment to existing gemini-default provider
UPDATE ai_providers
SET dashboard_assignments = COALESCE(dashboard_assignments, '[]'::jsonb) || '["nova-gfx-text"]'::jsonb,
    updated_at = NOW()
WHERE id = 'gemini-default'
AND NOT (dashboard_assignments @> '["nova-gfx-text"]'::jsonb);

-- Add nova-gfx-text dashboard assignment to existing claude-default provider
UPDATE ai_providers
SET dashboard_assignments = COALESCE(dashboard_assignments, '[]'::jsonb) || '["nova-gfx-text"]'::jsonb,
    updated_at = NOW()
WHERE id = 'claude-default'
AND NOT (dashboard_assignments @> '["nova-gfx-text"]'::jsonb);

-- Keep the nova-gfx-image provider for image generation
-- (already created in previous migration)
