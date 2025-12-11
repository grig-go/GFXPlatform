-- Migration: Add updated_by column to gfx_projects
-- This tracks who last modified the project

-- Add updated_by column
ALTER TABLE gfx_projects
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add comment explaining the column
COMMENT ON COLUMN gfx_projects.updated_by IS 'User who last updated the project';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gfx_projects_updated_by ON gfx_projects(updated_by);
