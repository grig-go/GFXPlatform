-- Add missing columns to gfx_chat_messages
ALTER TABLE gfx_chat_messages ADD COLUMN IF NOT EXISTS role TEXT CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text]));
ALTER TABLE gfx_chat_messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE gfx_chat_messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE gfx_chat_messages ADD COLUMN IF NOT EXISTS changes_applied JSONB;
ALTER TABLE gfx_chat_messages ADD COLUMN IF NOT EXISTS context_element_ids UUID[] DEFAULT '{}'::uuid[];

-- Add missing columns to pulsar_playout_log
ALTER TABLE pulsar_playout_log ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE pulsar_playout_log ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE pulsar_playout_log ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE pulsar_playout_log ADD COLUMN IF NOT EXISTS triggered_by UUID;
