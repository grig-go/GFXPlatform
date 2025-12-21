-- Add Mapbox as a data provider for map elements in Nova-GFX
-- Uses existing get_provider_details RPC to fetch API key

-- First, add 'maps' category to the allowed categories
ALTER TABLE data_providers DROP CONSTRAINT IF EXISTS data_providers_category_check;
ALTER TABLE data_providers ADD CONSTRAINT data_providers_category_check
  CHECK (category = ANY (ARRAY['finance'::text, 'weather'::text, 'sports'::text, 'news'::text, 'media'::text, 'school_closings'::text, 'maps'::text]));

-- Now insert the Mapbox provider
INSERT INTO data_providers (
  id,
  type,
  category,
  name,
  description,
  is_active,
  api_key,
  base_url,
  config,
  created_at,
  updated_at
) VALUES (
  'maps_provider:mapbox',
  'mapbox',
  'maps',
  'Mapbox',
  'Map visualization service for Nova-GFX map elements',
  true,
  'pk.eyJ1IjoiZW1lcmdlbnRzb2x1dGlvbnMiLCJhIjoiY21mbGJuanZ1MDNhdDJqcTU1cHVjcWJycCJ9.Tk2txI10-WExxSoPnHlu_g',
  'https://api.mapbox.com',
  '{
    "defaultStyle": "mapbox://styles/mapbox/dark-v11",
    "defaultZoom": 10,
    "attribution": true
  }'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  base_url = EXCLUDED.base_url,
  config = EXCLUDED.config,
  updated_at = NOW();
