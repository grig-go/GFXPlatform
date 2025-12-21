-- Assign ALL Nova-GFX AI providers to Emergent organization
-- This includes providers created via the UI with different IDs

-- Update ALL providers that have nova-gfx in their dashboard_assignments
UPDATE ai_providers
SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent')
WHERE organization_id IS NULL
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(dashboard_assignments) AS assignment
    WHERE (
      -- Object format: {"dashboard": "nova-gfx", ...}
      (assignment->>'dashboard' = 'nova-gfx')
      -- Or string format: "nova-gfx-text" or "nova-gfx-image"
      OR (assignment::text LIKE '%"nova-gfx%')
    )
  );

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
  emergent_org_id UUID;
BEGIN
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  SELECT COUNT(*) INTO updated_count
  FROM ai_providers
  WHERE organization_id = emergent_org_id
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(dashboard_assignments) AS assignment
      WHERE (assignment->>'dashboard' = 'nova-gfx' OR assignment::text LIKE '%"nova-gfx%')
    );

  RAISE NOTICE 'Nova-GFX providers now assigned to Emergent org: % providers', updated_count;
END $$;
