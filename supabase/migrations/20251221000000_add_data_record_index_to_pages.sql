-- Add data_record_index column to pulsar_pages
-- This stores the selected data record index for pages that use data binding
-- When a page is created/saved, it remembers which data record was being used

ALTER TABLE pulsar_pages
ADD COLUMN IF NOT EXISTS data_record_index INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN pulsar_pages.data_record_index IS 'Index of the selected data record for templates with data binding';
