-- Add always_on column to gfx_layers table
-- This column controls whether a layer's templates are always visible in preview/player mode

ALTER TABLE gfx_layers
ADD COLUMN IF NOT EXISTS always_on BOOLEAN DEFAULT false;

-- Also add locked column if missing
ALTER TABLE gfx_layers
ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;

-- Set always_on to true for existing background layers
UPDATE gfx_layers
SET always_on = true
WHERE layer_type = 'background';

-- Add comment for documentation
COMMENT ON COLUMN gfx_layers.always_on IS 'When true, templates in this layer are always visible in preview and player modes without needing to be triggered';
