-- Add missing columns to customer_dashboards table
-- This migration adds category, is_default, and is_subcategory columns

-- Add category column
ALTER TABLE customer_dashboards
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'data';

-- Add is_default column
ALTER TABLE customer_dashboards
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Add is_subcategory column
ALTER TABLE customer_dashboards
ADD COLUMN IF NOT EXISTS is_subcategory BOOLEAN DEFAULT FALSE;

-- Update existing records to be 'data' category
UPDATE customer_dashboards
SET category = 'data'
WHERE category IS NULL;

-- Set election as default
UPDATE customer_dashboards
SET is_default = TRUE
WHERE dashboard_id = 'election';

-- Create index
CREATE INDEX IF NOT EXISTS idx_customer_dashboards_category ON customer_dashboards(category);

-- Insert home page main categories
INSERT INTO customer_dashboards (dashboard_id, name, visible, order_index, access_level, category, is_default, is_subcategory)
VALUES
  ('data', 'Data', TRUE, 0, 'admin', 'home', FALSE, FALSE),
  ('graphics', 'Graphics', TRUE, 1, 'admin', 'home', FALSE, FALSE),
  ('agents', 'Agent', TRUE, 2, 'admin', 'home', FALSE, FALSE),
  ('media_library', 'Media Library', TRUE, 3, 'admin', 'home', FALSE, FALSE)
ON CONFLICT DO NOTHING;

-- Insert home page sub-categories (hidden by default)
INSERT INTO customer_dashboards (dashboard_id, name, visible, order_index, access_level, category, is_default, is_subcategory)
VALUES
  ('election', 'Elections (sub category)', FALSE, 4, 'admin', 'home', FALSE, TRUE),
  ('finance', 'Finance (sub category)', FALSE, 5, 'admin', 'home', FALSE, TRUE),
  ('weather', 'Weather (sub category)', FALSE, 6, 'admin', 'home', FALSE, TRUE),
  ('sports', 'Sports (sub category)', FALSE, 7, 'admin', 'home', FALSE, TRUE),
  ('school_closings', 'School Closings (sub category)', FALSE, 8, 'admin', 'home', FALSE, TRUE),
  ('news', 'News (sub category)', FALSE, 9, 'admin', 'home', FALSE, TRUE)
ON CONFLICT DO NOTHING;
