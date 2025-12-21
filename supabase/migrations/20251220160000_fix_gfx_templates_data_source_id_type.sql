-- Fix data_source_id type from UUID to TEXT in gfx_templates
-- Data sources use string identifiers like "elections-president-2024" not UUIDs

-- Drop the index first if it exists
DROP INDEX IF EXISTS idx_gfx_templates_data_source_id;

-- Change column type from UUID to TEXT
ALTER TABLE gfx_templates
ALTER COLUMN data_source_id TYPE TEXT USING data_source_id::TEXT;

-- Recreate the index
CREATE INDEX IF NOT EXISTS idx_gfx_templates_data_source_id ON gfx_templates(data_source_id);
