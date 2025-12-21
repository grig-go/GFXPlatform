-- Fix gfx_chat_messages schema to match source
-- The source has "content" column, not "message"
-- Make message nullable and add content alias

-- Make message nullable (source data won't have it)
ALTER TABLE gfx_chat_messages ALTER COLUMN message DROP NOT NULL;

-- Add check constraint for error column if it's boolean type issue
-- The error column is boolean in source but may be TEXT in Nova
ALTER TABLE gfx_chat_messages DROP COLUMN IF EXISTS error;
ALTER TABLE gfx_chat_messages ADD COLUMN IF NOT EXISTS error BOOLEAN DEFAULT false;
