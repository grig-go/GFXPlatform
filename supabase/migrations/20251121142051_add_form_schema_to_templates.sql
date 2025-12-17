-- Add form_schema column to templates table
-- This column stores JSON schema for form components like weatherCities

ALTER TABLE templates ADD COLUMN IF NOT EXISTS form_schema JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN templates.form_schema IS 'JSON schema defining form components and their configuration for custom rendering';
