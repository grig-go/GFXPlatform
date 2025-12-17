-- Migration: Add mse_host column to channels table for Vizrt MSE connection
-- Run this SQL in your Supabase SQL editor or via psql

-- Add mse_host column to channels table
ALTER TABLE channels
ADD COLUMN IF NOT EXISTS mse_host VARCHAR(255);

-- Add mse_port column (optional, defaults to 8595 for WebSocket)
ALTER TABLE channels
ADD COLUMN IF NOT EXISTS mse_port INTEGER DEFAULT 8595;

-- Add comment explaining the columns
COMMENT ON COLUMN channels.mse_host IS 'MSE (Media Sequencer) hostname or IP for Vizrt channels';
COMMENT ON COLUMN channels.mse_port IS 'MSE WebSocket port (default 8595)';

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'channels'
AND column_name IN ('mse_host', 'mse_port');
