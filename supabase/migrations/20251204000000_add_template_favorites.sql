-- Migration: Add favorite and default template columns
-- Run this script in the Supabase SQL Editor

-- Add is_favorite column to templates table
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Add is_default column to templates table
-- Only one template should be marked as default at a time
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Create an index for faster favorite queries
CREATE INDEX IF NOT EXISTS idx_templates_is_favorite ON templates(is_favorite) WHERE is_favorite = TRUE;

-- Create a unique partial index to ensure only one default template exists per user
-- This allows at most one row where is_default = TRUE for each user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_default_per_user
ON templates(user_id)
WHERE is_default = TRUE;

-- Function to ensure only one template is marked as default per user
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a template as default, unset all others for this user
  IF NEW.is_default = TRUE THEN
    UPDATE templates
    SET is_default = FALSE
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain single default template
DROP TRIGGER IF EXISTS trigger_ensure_single_default_template ON templates;
CREATE TRIGGER trigger_ensure_single_default_template
BEFORE INSERT OR UPDATE OF is_default ON templates
FOR EACH ROW
WHEN (NEW.is_default = TRUE)
EXECUTE FUNCTION ensure_single_default_template();

DROP TRIGGER IF EXISTS update_order_after_delete ON templates;
DROP TRIGGER IF EXISTS templates_order_update_after_delete ON templates;

ALTER PUBLICATION supabase_realtime ADD TABLE template_settings;

ALTER TABLE templates
ADD COLUMN carousel_name TEXT;

CREATE INDEX idx_templates_carousel_name ON templates(carousel_name);