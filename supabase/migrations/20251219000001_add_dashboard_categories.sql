-- Add category column to customer_dashboards for distinguishing home vs data dashboards
ALTER TABLE customer_dashboards
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'data' CHECK (category IN ('home', 'data'));

-- Add is_default column for marking which data dashboard opens from home
ALTER TABLE customer_dashboards
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Add page column for multi-page support (home page has different cards than data page)
ALTER TABLE customer_dashboards
ADD COLUMN IF NOT EXISTS page TEXT DEFAULT 'home' CHECK (page IN ('home', 'data'));

-- Update existing records to be 'data' category dashboards
UPDATE customer_dashboards SET category = 'data', page = 'data' WHERE dashboard_id IN ('election', 'finance', 'weather', 'sports', 'school_closings', 'news');

-- Set election as the default data dashboard
UPDATE customer_dashboards SET is_default = TRUE WHERE dashboard_id = 'election';

-- Update agents and media_library to be home page items
UPDATE customer_dashboards SET category = 'home', page = 'home' WHERE dashboard_id IN ('agents', 'media_library');

-- Insert the new home page categories
INSERT INTO customer_dashboards (dashboard_id, name, visible, order_index, access_level, category, page, is_default)
VALUES
  ('data', 'Data', TRUE, 0, 'admin', 'home', 'home', FALSE),
  ('graphics', 'Graphics', TRUE, 1, 'admin', 'home', 'home', FALSE)
ON CONFLICT (dashboard_id) DO NOTHING;

-- Update order_index for home page items
UPDATE customer_dashboards SET order_index = 2 WHERE dashboard_id = 'agents' AND page = 'home';
UPDATE customer_dashboards SET order_index = 3 WHERE dashboard_id = 'media_library' AND page = 'home';

-- Create index for faster queries by page
CREATE INDEX IF NOT EXISTS idx_customer_dashboards_page ON customer_dashboards(page);
CREATE INDEX IF NOT EXISTS idx_customer_dashboards_category ON customer_dashboards(category);
