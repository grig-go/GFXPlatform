-- Add is_on_air column to pulsar_pages for tracking on-air state
ALTER TABLE pulsar_pages
ADD COLUMN IF NOT EXISTS is_on_air BOOLEAN DEFAULT FALSE;

-- Create index for efficient queries on on-air pages
CREATE INDEX IF NOT EXISTS idx_pulsar_pages_is_on_air ON pulsar_pages(is_on_air) WHERE is_on_air = TRUE;
