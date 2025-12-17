-- Migration: Convert sponsor_schedules from single channel_id to multi-channel channel_ids
-- Run this in Supabase SQL Editor AFTER the initial table has been created

-- Step 1: Add the new channel_ids column as a JSONB array
ALTER TABLE public.sponsor_schedules
ADD COLUMN IF NOT EXISTS channel_ids JSONB DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing data - convert single channel_id to array
UPDATE public.sponsor_schedules
SET channel_ids = jsonb_build_array(channel_id::text)
WHERE channel_id IS NOT NULL AND (channel_ids IS NULL OR channel_ids = '[]'::jsonb);

-- Step 3: Create index for the new column (for array containment queries)
CREATE INDEX IF NOT EXISTS idx_sponsor_schedules_channel_ids
ON public.sponsor_schedules USING GIN (channel_ids);

-- Step 4: Make channel_id nullable (needed for transition period)
ALTER TABLE public.sponsor_schedules
ALTER COLUMN channel_id DROP NOT NULL;

-- Step 5: Drop the old channel_id column and its index (OPTIONAL - run after confirming migration works)
-- NOTE: Only run this after verifying migration was successful and all code is updated
-- DROP INDEX IF EXISTS idx_sponsor_schedules_channel_id;
-- ALTER TABLE public.sponsor_schedules DROP COLUMN IF EXISTS channel_id;

-- Step 6: Update the trigger function to handle multiple channels
-- When setting a sponsor as default, remove default from other sponsors that share ANY of the same channels
CREATE OR REPLACE FUNCTION public.ensure_single_default_sponsor()
RETURNS TRIGGER AS $$
DECLARE
    channel_id_text TEXT;
BEGIN
    IF NEW.is_default = true THEN
        -- For each channel in the new schedule's channel_ids,
        -- set all other schedules containing that channel to not default
        FOR channel_id_text IN SELECT jsonb_array_elements_text(NEW.channel_ids)
        LOOP
            UPDATE public.sponsor_schedules
            SET is_default = false
            WHERE id != NEW.id
              AND is_default = true
              AND channel_ids @> jsonb_build_array(channel_id_text);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Update comments
COMMENT ON COLUMN public.sponsor_schedules.channel_ids IS 'JSON array of channel UUIDs this schedule applies to';

-- Verification query - run this to verify the migration
-- SELECT id, name, channel_id, channel_ids FROM public.sponsor_schedules;
