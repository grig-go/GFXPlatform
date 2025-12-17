-- Migration: Add multi-channel support for weather locations
-- Creates a junction table to allow multiple channels per weather location

-- Create the junction table
CREATE TABLE IF NOT EXISTS "public"."weather_location_channels" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "location_id" text NOT NULL,
    "channel_id" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    PRIMARY KEY ("id"),
    UNIQUE ("location_id", "channel_id")
);

-- Add foreign key constraints
ALTER TABLE "public"."weather_location_channels"
    ADD CONSTRAINT "weather_location_channels_location_id_fkey"
    FOREIGN KEY ("location_id")
    REFERENCES "public"."weather_locations"("id")
    ON DELETE CASCADE;

ALTER TABLE "public"."weather_location_channels"
    ADD CONSTRAINT "weather_location_channels_channel_id_fkey"
    FOREIGN KEY ("channel_id")
    REFERENCES "public"."channels"("id")
    ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE "public"."weather_location_channels" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (authenticated users only)
CREATE POLICY "Allow select for authenticated users"
    ON "public"."weather_location_channels"
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert for authenticated users"
    ON "public"."weather_location_channels"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
    ON "public"."weather_location_channels"
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated users"
    ON "public"."weather_location_channels"
    FOR DELETE
    TO authenticated
    USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_weather_location_channels_location_id"
    ON "public"."weather_location_channels" ("location_id");

CREATE INDEX IF NOT EXISTS "idx_weather_location_channels_channel_id"
    ON "public"."weather_location_channels" ("channel_id");

-- Migrate existing channel_id data to the new junction table
INSERT INTO "public"."weather_location_channels" ("location_id", "channel_id")
SELECT "id", "channel_id"
FROM "public"."weather_locations"
WHERE "channel_id" IS NOT NULL
ON CONFLICT ("location_id", "channel_id") DO NOTHING;

-- Note: We keep the channel_id column on weather_locations for backward compatibility
-- It can be removed in a future migration after all code is updated
