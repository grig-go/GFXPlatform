-- =====================================================
-- MIGRATION: Add channel_id to pulsar_pages
-- =====================================================

-- Add channel_id column to pages
ALTER TABLE pulsar_pages
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES pulsar_channels(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pulsar_pages_channel ON pulsar_pages(channel_id);
