-- Add 'loop' to the mode CHECK constraint for pulsar_playlists
-- This allows playlists to be in 'manual', 'timed', or 'loop' mode

-- Drop the existing constraint and add the new one with 'loop' included
ALTER TABLE pulsar_playlists
DROP CONSTRAINT IF EXISTS pulsar_playlists_mode_check;

ALTER TABLE pulsar_playlists
ADD CONSTRAINT pulsar_playlists_mode_check
CHECK (mode IN ('manual', 'timed', 'loop'));
