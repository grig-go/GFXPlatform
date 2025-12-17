-- Banner Schedules Table Migration
-- Run this in Supabase SQL Editor to create the banner_schedules table

-- Create the banner_schedules table
CREATE TABLE IF NOT EXISTS public.banner_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    channel_ids UUID[] NOT NULL DEFAULT '{}',  -- Array of channel IDs this schedule applies to
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

    -- Trigger configuration - when within each hour to show the banner
    triggers JSONB DEFAULT '[]'::jsonb,  -- Array of {start: "MM:SS", end: "MM:SS"}

    -- Status
    active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,         -- Higher priority takes precedence

    -- Metadata
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

    PRIMARY KEY (id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_banner_schedules_channel_ids ON public.banner_schedules USING GIN(channel_ids);
CREATE INDEX IF NOT EXISTS idx_banner_schedules_media_id ON public.banner_schedules(media_id);
CREATE INDEX IF NOT EXISTS idx_banner_schedules_active ON public.banner_schedules(active);
CREATE INDEX IF NOT EXISTS idx_banner_schedules_dates ON public.banner_schedules(start_date, end_date);

-- Enable RLS
ALTER TABLE public.banner_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies (similar to other tables in the project)
-- Allow authenticated users to view all banner schedules
CREATE POLICY "Users can view banner schedules"
    ON public.banner_schedules
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert banner schedules
CREATE POLICY "Users can insert banner schedules"
    ON public.banner_schedules
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own banner schedules
CREATE POLICY "Users can update banner schedules"
    ON public.banner_schedules
    FOR UPDATE
    TO authenticated
    USING (true);

-- Allow authenticated users to delete their own banner schedules
CREATE POLICY "Users can delete banner schedules"
    ON public.banner_schedules
    FOR DELETE
    TO authenticated
    USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_banner_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_banner_schedules_updated_at
    BEFORE UPDATE ON public.banner_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_banner_schedules_updated_at();

-- Grant permissions
GRANT ALL ON public.banner_schedules TO authenticated;
GRANT ALL ON public.banner_schedules TO service_role;

COMMENT ON TABLE public.banner_schedules IS 'Banner scheduling for channels - allows scheduling media (from Novadevgrig) to display at specific times';
COMMENT ON COLUMN public.banner_schedules.channel_ids IS 'Array of channel UUIDs this schedule applies to';
COMMENT ON COLUMN public.banner_schedules.media_id IS 'References media_assets table in Novadevgrig database';
COMMENT ON COLUMN public.banner_schedules.time_ranges IS 'JSON array of time ranges: [{start: "09:00", end: "17:00"}]';
COMMENT ON COLUMN public.banner_schedules.days_of_week IS 'JSON object with boolean for each day';
COMMENT ON COLUMN public.banner_schedules.triggers IS 'JSON array of hourly triggers: [{start: "00:00", end: "05:00"}] - when within each hour to display banner';
COMMENT ON COLUMN public.banner_schedules.priority IS 'Higher priority banners take precedence in conflicts';
