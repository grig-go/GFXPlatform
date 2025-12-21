-- Fix foreign key constraint on pulsar_command_log.page_id
-- When a page is deleted, set the page_id to NULL instead of blocking the delete
-- This preserves the command log history while allowing page deletion

-- Drop the existing constraint
ALTER TABLE pulsar_command_log
DROP CONSTRAINT IF EXISTS pulsar_command_log_page_id_fkey;

-- Add the constraint back with ON DELETE SET NULL
ALTER TABLE pulsar_command_log
ADD CONSTRAINT pulsar_command_log_page_id_fkey
FOREIGN KEY (page_id) REFERENCES pulsar_pages(id) ON DELETE SET NULL;
