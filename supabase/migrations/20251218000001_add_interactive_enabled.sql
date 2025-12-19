-- Add interactive mode support to gfx_projects and gfx_elements tables
-- This enables interactive features like buttons, forms, and scripts

-- Add interactive_enabled flag to projects
ALTER TABLE gfx_projects
ADD COLUMN IF NOT EXISTS interactive_enabled BOOLEAN DEFAULT FALSE;

-- Add interactive_config JSONB column to projects for storing app-level configuration
-- (state definitions, functions, screens, navigation, etc.)
ALTER TABLE gfx_projects
ADD COLUMN IF NOT EXISTS interactive_config JSONB DEFAULT NULL;

-- Add interactions JSONB column to elements for storing event handlers and input configuration
ALTER TABLE gfx_elements
ADD COLUMN IF NOT EXISTS interactions JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN gfx_projects.interactive_enabled IS 'When true, enables interactive features like buttons, forms, and scripts';
COMMENT ON COLUMN gfx_projects.interactive_config IS 'JSONB configuration for interactive app (state, functions, screens, navigation)';
COMMENT ON COLUMN gfx_elements.interactions IS 'JSONB configuration for element interactions (event handlers, input config)';
