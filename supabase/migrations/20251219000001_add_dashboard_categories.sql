-- Add category column to customer_dashboards for distinguishing home vs data dashboards
ALTER TABLE customer_dashboards
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'data' CHECK (category IN ('home', 'data'));

-- Add is_default column for marking which data dashboard opens from home
ALTER TABLE customer_dashboards
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Add is_subcategory column for home page sub-categories
ALTER TABLE customer_dashboards
ADD COLUMN IF NOT EXISTS is_subcategory BOOLEAN DEFAULT FALSE;

-- Update existing records to be 'data' category dashboards
UPDATE customer_dashboards SET category = 'data' WHERE dashboard_id IN ('election', 'finance', 'weather', 'sports', 'school_closings', 'news') AND category IS NULL;

-- Set election as the default data dashboard
UPDATE customer_dashboards SET is_default = TRUE WHERE dashboard_id = 'election' AND category = 'data';

-- Update agents and media_library to be home page items
UPDATE customer_dashboards SET category = 'home' WHERE dashboard_id IN ('agents', 'media_library');

-- Insert the main home page categories (data, graphics)
INSERT INTO customer_dashboards (dashboard_id, name, visible, order_index, access_level, category, is_default, is_subcategory)
VALUES
  ('data', 'Data', TRUE, 0, 'admin', 'home', FALSE, FALSE),
  ('graphics', 'Graphics', TRUE, 1, 'admin', 'home', FALSE, FALSE)
ON CONFLICT (dashboard_id) DO NOTHING;

-- Update order_index for home page items
UPDATE customer_dashboards SET order_index = 2 WHERE dashboard_id = 'agents' AND category = 'home';
UPDATE customer_dashboards SET order_index = 3 WHERE dashboard_id = 'media_library' AND category = 'home';

-- Insert home page SUB-CATEGORIES (these are shortcuts to data dashboards, hidden by default)
INSERT INTO customer_dashboards (dashboard_id, name, visible, order_index, access_level, category, is_default, is_subcategory)
VALUES
  ('election', 'Elections (sub category)', FALSE, 4, 'admin', 'home', FALSE, TRUE),
  ('finance', 'Finance (sub category)', FALSE, 5, 'admin', 'home', FALSE, TRUE),
  ('weather', 'Weather (sub category)', FALSE, 6, 'admin', 'home', FALSE, TRUE),
  ('sports', 'Sports (sub category)', FALSE, 7, 'admin', 'home', FALSE, TRUE),
  ('school_closings', 'School Closings (sub category)', FALSE, 8, 'admin', 'home', FALSE, TRUE),
  ('news', 'News (sub category)', FALSE, 9, 'admin', 'home', FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- Create index for faster queries by category
CREATE INDEX IF NOT EXISTS idx_customer_dashboards_category ON customer_dashboards(category);
