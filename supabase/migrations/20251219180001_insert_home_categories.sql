-- Fix unique constraint to include category column
-- This allows same dashboard_id to exist in different categories (home vs data)

-- Drop the existing unique constraint
DROP INDEX IF EXISTS idx_customer_dashboard_unique;

-- Create new unique constraint that includes category
CREATE UNIQUE INDEX idx_customer_dashboard_unique
ON customer_dashboards (
  COALESCE(customer_id::text, 'global'),
  COALESCE(deployment_id::text, 'default'),
  dashboard_id,
  COALESCE(category, 'data')
);

-- Now insert home page categories (main)
INSERT INTO customer_dashboards (dashboard_id, name, visible, order_index, access_level, category, is_default, is_subcategory)
VALUES ('agents', 'Agent', TRUE, 2, 'admin', 'home', FALSE, FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO customer_dashboards (dashboard_id, name, visible, order_index, access_level, category, is_default, is_subcategory)
VALUES ('media_library', 'Media Library', TRUE, 3, 'admin', 'home', FALSE, FALSE)
ON CONFLICT DO NOTHING;

-- Insert home page sub-categories (shortcuts, hidden by default)
INSERT INTO customer_dashboards (dashboard_id, name, visible, order_index, access_level, category, is_default, is_subcategory)
VALUES ('election', 'Elections (sub category)', FALSE, 4, 'admin', 'home', FALSE, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO customer_dashboards (dashboard_id, name, visible, order_index, access_level, category, is_default, is_subcategory)
VALUES ('finance', 'Finance (sub category)', FALSE, 5, 'admin', 'home', FALSE, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO customer_dashboards (dashboard_id, name, visible, order_index, access_level, category, is_default, is_subcategory)
VALUES ('weather', 'Weather (sub category)', FALSE, 6, 'admin', 'home', FALSE, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO customer_dashboards (dashboard_id, name, visible, order_index, access_level, category, is_default, is_subcategory)
VALUES ('sports', 'Sports (sub category)', FALSE, 7, 'admin', 'home', FALSE, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO customer_dashboards (dashboard_id, name, visible, order_index, access_level, category, is_default, is_subcategory)
VALUES ('school_closings', 'School Closings (sub category)', FALSE, 8, 'admin', 'home', FALSE, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO customer_dashboards (dashboard_id, name, visible, order_index, access_level, category, is_default, is_subcategory)
VALUES ('news', 'News (sub category)', FALSE, 9, 'admin', 'home', FALSE, TRUE)
ON CONFLICT DO NOTHING;
