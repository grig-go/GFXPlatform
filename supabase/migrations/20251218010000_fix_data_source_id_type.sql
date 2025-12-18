-- Fix data_source_id type from UUID to TEXT
-- Data sources use string identifiers like "weather-daily" not UUIDs

-- Drop the index first
DROP INDEX IF EXISTS idx_gfx_templates_data_source_id;

-- Change column type from UUID to TEXT
ALTER TABLE gfx_templates
ALTER COLUMN data_source_id TYPE TEXT;

-- Recreate the index
CREATE INDEX IF NOT EXISTS idx_gfx_templates_data_source_id ON gfx_templates(data_source_id);
