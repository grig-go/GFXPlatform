-- =====================================================
-- ADD CHANNEL_ID TO PLAYLISTS
-- Each playlist can have a default channel for playback
-- =====================================================

-- Add channel_id column to pulsar_playlists
ALTER TABLE pulsar_playlists
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES pulsar_channels(id) ON DELETE SET NULL;

-- Add index for channel_id lookups
CREATE INDEX IF NOT EXISTS idx_pulsar_playlists_channel ON pulsar_playlists(channel_id);
