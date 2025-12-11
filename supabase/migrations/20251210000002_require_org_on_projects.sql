-- Migration: Require organization_id on gfx_projects
-- This ensures no project can be created without an organization

-- Add NOT NULL constraint to organization_id
ALTER TABLE gfx_projects
  ALTER COLUMN organization_id SET NOT NULL;

-- Add a comment explaining the constraint
COMMENT ON COLUMN gfx_projects.organization_id IS 'Required: Every project must belong to an organization';
