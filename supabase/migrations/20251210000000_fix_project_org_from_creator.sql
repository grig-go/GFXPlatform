-- Migration: Fix project organization_ids based on creator's organization
-- This updates projects to use the organization of their creator

-- Update projects where:
-- 1. organization_id is NULL or doesn't match creator's organization
-- 2. created_by is set and that user has an organization

UPDATE gfx_projects p
SET organization_id = u.organization_id
FROM users u
WHERE p.created_by = u.id
  AND u.organization_id IS NOT NULL
  AND (p.organization_id IS NULL OR p.organization_id != u.organization_id);

-- Log the result
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % projects to match creator organization', updated_count;
END $$;
