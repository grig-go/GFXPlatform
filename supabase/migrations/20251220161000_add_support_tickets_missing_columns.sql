-- Add missing columns to gfx_support_tickets
-- The SupportRequestDialog expects these columns from the original schema

-- User info columns
ALTER TABLE gfx_support_tickets ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE gfx_support_tickets ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE gfx_support_tickets ADD COLUMN IF NOT EXISTS user_agent TEXT;
