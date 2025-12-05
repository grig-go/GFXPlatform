-- =====================================================
-- FIX FOREIGN KEY CONSTRAINTS FOR PAGE DELETION
-- =====================================================
-- The page_id foreign keys in pulsar_custom_uis and pulsar_command_log
-- need ON DELETE SET NULL to allow pages to be deleted

-- Fix pulsar_custom_uis.page_id constraint
ALTER TABLE pulsar_custom_uis
  DROP CONSTRAINT IF EXISTS pulsar_custom_uis_page_id_fkey;

ALTER TABLE pulsar_custom_uis
  ADD CONSTRAINT pulsar_custom_uis_page_id_fkey
  FOREIGN KEY (page_id) REFERENCES pulsar_pages(id) ON DELETE SET NULL;

-- Fix pulsar_command_log.page_id constraint
ALTER TABLE pulsar_command_log
  DROP CONSTRAINT IF EXISTS pulsar_command_log_page_id_fkey;

ALTER TABLE pulsar_command_log
  ADD CONSTRAINT pulsar_command_log_page_id_fkey
  FOREIGN KEY (page_id) REFERENCES pulsar_pages(id) ON DELETE SET NULL;
