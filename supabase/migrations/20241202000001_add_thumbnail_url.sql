-- Add thumbnail_url column to gfx_projects table
-- This stores the project canvas snapshot as a base64 data URL or storage URL

ALTER TABLE gfx_projects ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN gfx_projects.thumbnail_url IS 'Project thumbnail snapshot captured on save (base64 data URL or storage URL)';
