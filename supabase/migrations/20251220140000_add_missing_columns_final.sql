-- Add missing columns discovered during migration
-- Also includes columns from gfx_chat_messages.error and gfx_support_tickets.type

-- gfx_chat_messages: add error column
ALTER TABLE gfx_chat_messages ADD COLUMN IF NOT EXISTS error TEXT;

-- gfx_support_tickets: add type and other missing columns
ALTER TABLE gfx_support_tickets ADD COLUMN IF NOT EXISTS type TEXT;

-- pulsar_user_preferences: drop the user_id FK that points to u_users
-- The source references 'users' table, not u_users
ALTER TABLE pulsar_user_preferences DROP CONSTRAINT IF EXISTS pulsar_user_preferences_user_id_fkey;
