-- Migration: Fix project organization_ids
-- Update all projects to be assigned to the emergent.new organization

-- Find the emergent organization and update all projects to use it
DO $$
DECLARE
  emergent_org_id UUID;
BEGIN
  -- Find the organization with emergent.new in allowed_domains
  SELECT id INTO emergent_org_id
  FROM organizations
  WHERE allowed_domains @> ARRAY['emergent.new']
  LIMIT 1;

  IF emergent_org_id IS NULL THEN
    RAISE NOTICE 'No emergent.new organization found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found emergent org: %', emergent_org_id;

  -- Update all projects that don't have an organization or have a different one
  -- to use the emergent organization
  UPDATE gfx_projects
  SET organization_id = emergent_org_id
  WHERE organization_id IS NULL
     OR organization_id NOT IN (SELECT id FROM organizations WHERE allowed_domains @> ARRAY['emergent.new']);

  RAISE NOTICE 'Updated projects to use organization: %', emergent_org_id;
END $$;
