-- Fix Mapbox API key (correct typo in original migration)
UPDATE data_providers
SET api_key = 'pk.eyJ1IjoiZW1lcmdlbnRzb2x1dGlvbnMiLCJhIjoiY21mbGJuanZ1MDNhdDJqcTU1cHVjcWJycCJ9.Tk2txI10-WExxSoPnHlu_g',
    updated_at = NOW()
WHERE id = 'maps_provider:mapbox';
