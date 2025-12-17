-- Sponsor Schedules Table Migration
-- Run this in Supabase SQL Editor to create the sponsor_schedules table

-- Create the sponsor_schedules table
CREATE TABLE IF NOT EXISTS public.sponsor_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    media_id UUID NOT NULL,  -- References media_assets in Novadevgrig database
    name VARCHAR(255) NOT NULL,

    -- Schedule configuration (similar to items/buckets/playlists)
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    time_ranges JSONB DEFAULT '[]'::jsonb,  -- Array of {start: "HH:MM", end: "HH:MM"}
    days_of_week JSONB DEFAULT '{
        "monday": false,
        "tuesday": false,
        "wednesday": false,
        "thursday": false,
        "friday": false,
        "saturday": false,
        "sunday": false
    }'::jsonb,

    -- Status
    active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,  -- Is this the default sponsor for the channel?
    priority INTEGER DEFAULT 0,         -- Higher priority takes precedence

    -- Metadata
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

    PRIMARY KEY (id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sponsor_schedules_channel_id ON public.sponsor_schedules(channel_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_schedules_media_id ON public.sponsor_schedules(media_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_schedules_active ON public.sponsor_schedules(active);
CREATE INDEX IF NOT EXISTS idx_sponsor_schedules_is_default ON public.sponsor_schedules(is_default);
CREATE INDEX IF NOT EXISTS idx_sponsor_schedules_dates ON public.sponsor_schedules(start_date, end_date);

-- Enable RLS
ALTER TABLE public.sponsor_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies (similar to other tables in the project)
-- Allow authenticated users to view all sponsor schedules
CREATE POLICY "Users can view sponsor schedules"
    ON public.sponsor_schedules
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert sponsor schedules
CREATE POLICY "Users can insert sponsor schedules"
    ON public.sponsor_schedules
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own sponsor schedules
CREATE POLICY "Users can update sponsor schedules"
    ON public.sponsor_schedules
    FOR UPDATE
    TO authenticated
    USING (true);

-- Allow authenticated users to delete their own sponsor schedules
CREATE POLICY "Users can delete sponsor schedules"
    ON public.sponsor_schedules
    FOR DELETE
    TO authenticated
    USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_sponsor_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sponsor_schedules_updated_at
    BEFORE UPDATE ON public.sponsor_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_sponsor_schedules_updated_at();

-- Ensure only one default sponsor per channel
CREATE OR REPLACE FUNCTION public.ensure_single_default_sponsor()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Set all other schedules for this channel to not default
        UPDATE public.sponsor_schedules
        SET is_default = false
        WHERE channel_id = NEW.channel_id
          AND id != NEW.id
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_sponsor
    BEFORE INSERT OR UPDATE OF is_default ON public.sponsor_schedules
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION public.ensure_single_default_sponsor();

-- Grant permissions
GRANT ALL ON public.sponsor_schedules TO authenticated;
GRANT ALL ON public.sponsor_schedules TO service_role;

COMMENT ON TABLE public.sponsor_schedules IS 'Sponsor scheduling for channels - allows scheduling media (from Novadevgrig) to display at specific times';
COMMENT ON COLUMN public.sponsor_schedules.media_id IS 'References media_assets table in Novadevgrig database';
COMMENT ON COLUMN public.sponsor_schedules.time_ranges IS 'JSON array of time ranges: [{start: "09:00", end: "17:00"}]';
COMMENT ON COLUMN public.sponsor_schedules.days_of_week IS 'JSON object with boolean for each day';
COMMENT ON COLUMN public.sponsor_schedules.is_default IS 'Default sponsor shown when no scheduled sponsor is active';
COMMENT ON COLUMN public.sponsor_schedules.priority IS 'Higher priority sponsors take precedence in conflicts';
