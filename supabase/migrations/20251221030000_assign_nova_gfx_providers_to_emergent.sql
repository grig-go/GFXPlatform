-- Assign Nova-GFX AI providers to Emergent organization
-- This ensures users in Emergent org can see and use these providers

-- Update Nova-GFX providers to be assigned to the Emergent organization
UPDATE ai_providers
SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent')
WHERE id IN ('nova-gfx-text', 'nova-gfx-claude', 'nova-gfx-image')
  AND organization_id IS NULL;

-- Also update dashboard_assignments to use proper object format
UPDATE ai_providers
SET dashboard_assignments = '[{"dashboard": "nova-gfx", "textProvider": true}]'::jsonb
WHERE id = 'nova-gfx-text';

UPDATE ai_providers
SET dashboard_assignments = '[{"dashboard": "nova-gfx", "textProvider": true}]'::jsonb
WHERE id = 'nova-gfx-claude';

UPDATE ai_providers
SET dashboard_assignments = '[{"dashboard": "nova-gfx", "imageProvider": true}]'::jsonb
WHERE id = 'nova-gfx-image';

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
    AND id IN ('nova-gfx-text', 'nova-gfx-claude', 'nova-gfx-image');

  RAISE NOTICE 'Nova-GFX providers assigned to Emergent org: % providers', updated_count;
END $$;
