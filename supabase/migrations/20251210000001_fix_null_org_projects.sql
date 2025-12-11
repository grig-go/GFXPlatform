-- Migration: Fix projects with NULL organization_id
-- Assign them to the emergent.new organization (since all users are in that org)

-- Update projects with NULL organization_id to use the emergent.new org
UPDATE gfx_projects
SET organization_id = '6f1e0ed4-4994-4de5-9a22-e450457155c5'
WHERE organization_id IS NULL;

-- Log the result
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM gfx_projects WHERE organization_id = '6f1e0ed4-4994-4de5-9a22-e450457155c5';
  RAISE NOTICE 'Total projects now in emergent org: %', updated_count;
END $$;
