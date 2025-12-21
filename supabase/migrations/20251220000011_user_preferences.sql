-- Migration: Add user preferences column to u_users table
-- Stores Nova app preferences per user as JSONB

-- Add preferences column
ALTER TABLE u_users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Add avatar_url column if not exists
ALTER TABLE u_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- The preferences JSONB structure:
-- {
--   "theme": "system" | "light" | "dark",
--   "timezone": "America/New_York",
--   "date_format": "MM/DD/YYYY",
--   "language": "en",
--   "email_notifications": true,
--   "push_notifications": true
-- }

-- Set default preferences for existing users who don't have any
UPDATE u_users
SET preferences = jsonb_build_object(
  'theme', 'system',
  'timezone', 'America/New_York',
  'date_format', 'MM/DD/YYYY',
  'language', 'en',
  'email_notifications', true,
  'push_notifications', true
)
WHERE preferences IS NULL OR preferences = '{}';
