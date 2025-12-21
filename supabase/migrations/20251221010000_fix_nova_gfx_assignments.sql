-- Fix Nova-GFX provider assignments
-- Remove old string-format "nova-gfx-text" assignments from default providers
-- Only the properly created "Nova GFX - Gemini Pro 3" provider should be assigned

-- Remove "nova-gfx-text" string from claude-default dashboard_assignments
UPDATE ai_providers
SET dashboard_assignments = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(dashboard_assignments) AS elem
  WHERE elem::text != '"nova-gfx-text"'
),
updated_at = NOW()
WHERE id = 'claude-default'
AND dashboard_assignments @> '["nova-gfx-text"]'::jsonb;

-- Remove "nova-gfx-text" string from gemini-default dashboard_assignments
UPDATE ai_providers
SET dashboard_assignments = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(dashboard_assignments) AS elem
  WHERE elem::text != '"nova-gfx-text"'
),
updated_at = NOW()
WHERE id = 'gemini-default'
AND dashboard_assignments @> '["nova-gfx-text"]'::jsonb;
