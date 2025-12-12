-- =====================================================
-- ADD THEME PREFERENCE TO USER PREFERENCES
-- Stores light/dark/system theme preference per user
-- =====================================================

-- Add theme column to pulsar_user_preferences table
ALTER TABLE pulsar_user_preferences
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system'));

-- Comment for documentation
COMMENT ON COLUMN pulsar_user_preferences.theme IS 'User UI theme preference: light, dark, or system';
