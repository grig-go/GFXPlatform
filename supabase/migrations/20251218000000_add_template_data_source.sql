-- Add data source reference to templates
-- This allows templates to be bound to Nova agent data sources
-- The data will be fetched at runtime by Nova GFX, Nova Player, and Pulsar GFX

-- Add data_source_id column to gfx_templates
-- Note: No foreign key constraint since api_endpoints is in a different Supabase project (Nova)
ALTER TABLE gfx_templates
ADD COLUMN IF NOT EXISTS data_source_id UUID;

-- Add data_source_config to store display field and other settings
ALTER TABLE gfx_templates
ADD COLUMN IF NOT EXISTS data_source_config JSONB DEFAULT NULL;

-- Comment explaining the columns
COMMENT ON COLUMN gfx_templates.data_source_id IS 'Reference to api_endpoints (Nova agent) that provides data for this template';
COMMENT ON COLUMN gfx_templates.data_source_config IS 'Configuration for data source: displayField, refreshInterval, etc.';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gfx_templates_data_source_id ON gfx_templates(data_source_id);
