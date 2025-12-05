-- Fix the mode CHECK constraint for pulsar_playlists to include 'loop'
-- This migration ensures the constraint is properly set regardless of previous state

-- Drop all possible constraint names (the original and any auto-generated variants)
ALTER TABLE pulsar_playlists DROP CONSTRAINT IF EXISTS pulsar_playlists_mode_check;
ALTER TABLE pulsar_playlists DROP CONSTRAINT IF EXISTS "pulsar_playlists_mode_check1";

-- Add the correct constraint with 'loop' included
ALTER TABLE pulsar_playlists
ADD CONSTRAINT pulsar_playlists_mode_check
CHECK (mode IN ('manual', 'timed', 'loop'));
