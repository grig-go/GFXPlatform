-- Add thumbnail_url column to gfx_projects table
ALTER TABLE gfx_projects ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;








