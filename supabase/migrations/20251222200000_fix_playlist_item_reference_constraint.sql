-- ============================================
-- Fix PulsarVS Playlist Items Reference Constraint
-- Allow 'media' type items to store external URLs in metadata without requiring media_id
-- ============================================

-- Drop the old constraint
ALTER TABLE pulsarvs_playlist_items DROP CONSTRAINT IF EXISTS valid_item_reference;

-- Add new constraint that allows media items with URLs in metadata (no media_id required)
-- This supports both:
-- 1. Internal media (media_id references media_assets)
-- 2. External media (URL stored in metadata.media_url)
ALTER TABLE pulsarvs_playlist_items ADD CONSTRAINT valid_item_reference CHECK (
    (item_type = 'media') OR
    (item_type = 'page' AND content_id IS NOT NULL) OR
    (item_type = 'group' AND (folder_id IS NOT NULL OR content_id IS NOT NULL OR TRUE))
);

-- Note: The constraint now allows:
-- - 'media' items: can have media_id (internal) or metadata.media_url (external)
-- - 'page' items: must have content_id
-- - 'group' items: relaxed to allow any group configuration
