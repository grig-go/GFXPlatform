-- Add ticker and other missing element types to gfx_elements constraint
-- ============================================

-- Drop existing constraint
ALTER TABLE gfx_elements
DROP CONSTRAINT IF EXISTS gfx_elements_element_type_check;

-- Recreate with all element types including ticker, icon, svg, line, table, countdown, topic-badge
ALTER TABLE gfx_elements
ADD CONSTRAINT gfx_elements_element_type_check
CHECK (element_type IN (
  'div',
  'text',
  'image',
  'shape',
  'group',
  'video',
  'lottie',
  'd3-chart',
  'map',
  'chart',
  'ticker',
  'icon',
  'svg',
  'line',
  'table',
  'countdown',
  'topic-badge'
));
