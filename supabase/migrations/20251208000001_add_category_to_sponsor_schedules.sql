-- Add category column to sponsor_schedules for filtering
-- This allows the sponsor-schedule edge function to filter by category
-- Each category can have its own default sponsor per channel

-- Add category column (fixed values: 'school_closings', 'elections', or NULL for general)
ALTER TABLE public.sponsor_schedules
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_sponsor_schedules_category ON public.sponsor_schedules(category);

-- Add comment
COMMENT ON COLUMN public.sponsor_schedules.category IS 'Category for filtering sponsors. Fixed values: school_closings, elections, or NULL for general sponsors';

-- Drop the old trigger that enforces single default per channel (if exists)
DROP TRIGGER IF EXISTS ensure_single_default_sponsor ON public.sponsor_schedules;
DROP FUNCTION IF EXISTS public.ensure_single_default_sponsor();

-- Create new function to ensure only one default sponsor per channel PER CATEGORY
-- This allows each category to have its own default sponsor
CREATE OR REPLACE FUNCTION public.ensure_single_default_sponsor_per_category()
RETURNS TRIGGER AS $$
DECLARE
    new_category_normalized TEXT;
    existing_category_normalized TEXT;
BEGIN
    IF NEW.is_default = true THEN
        -- Normalize empty string to NULL for comparison
        new_category_normalized := NULLIF(TRIM(COALESCE(NEW.category, '')), '');

        -- Set all other schedules for channels in this schedule's channel_ids array
        -- with the SAME category to not default
        -- Using jsonb_array_elements_text to check channel overlap
        UPDATE public.sponsor_schedules
        SET is_default = false
        WHERE id != NEW.id
          AND is_default = true
          AND (
            -- Same category (treat NULL and empty string as equivalent)
            NULLIF(TRIM(COALESCE(category, '')), '') IS NOT DISTINCT FROM new_category_normalized
          )
          AND EXISTS (
            -- Check if there's any overlap in channel_ids
            SELECT 1
            FROM jsonb_array_elements_text(channel_ids) AS existing_channel
            WHERE existing_channel::text IN (
              SELECT jsonb_array_elements_text(NEW.channel_ids)::text
            )
          );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for the new function
CREATE TRIGGER ensure_single_default_sponsor_per_category
    BEFORE INSERT OR UPDATE OF is_default, category ON public.sponsor_schedules
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION public.ensure_single_default_sponsor_per_category();
