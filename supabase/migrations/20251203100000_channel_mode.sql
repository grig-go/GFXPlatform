-- =====================================================
-- MIGRATION: Replace channel_type with channel_mode
-- =====================================================

-- Add the new channel_mode column
ALTER TABLE pulsar_channels
ADD COLUMN IF NOT EXISTS channel_mode TEXT DEFAULT 'fill' CHECK (channel_mode IN (
  'fill',      -- Video fill output only
  'fill_key',  -- Fill and alpha key outputs
  'obs'        -- Browser source for OBS/vMix
));

-- Migrate existing data (map old types to new modes)
UPDATE pulsar_channels
SET channel_mode = CASE
  WHEN channel_type = 'graphics' THEN 'fill'
  WHEN channel_type = 'ticker' THEN 'fill'
  WHEN channel_type = 'fullscreen' THEN 'fill'
  WHEN channel_type = 'preview' THEN 'obs'
  ELSE 'fill'
END
WHERE channel_mode IS NULL OR channel_mode = 'fill';

-- Drop the old channel_type column
ALTER TABLE pulsar_channels
DROP COLUMN IF EXISTS channel_type;
