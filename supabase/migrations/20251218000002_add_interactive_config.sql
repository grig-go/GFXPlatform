-- Add interactive_config JSONB column to projects for storing app-level configuration
-- (state definitions, functions, screens, navigation, etc.)
ALTER TABLE gfx_projects
ADD COLUMN IF NOT EXISTS interactive_config JSONB DEFAULT NULL;

-- Add interactions JSONB column to elements for storing event handlers and input configuration
ALTER TABLE gfx_elements
ADD COLUMN IF NOT EXISTS interactions JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN gfx_projects.interactive_config IS 'JSONB configuration for interactive app (state, functions, screens, navigation)';
COMMENT ON COLUMN gfx_elements.interactions IS 'JSONB configuration for element interactions (event handlers, input config)';
