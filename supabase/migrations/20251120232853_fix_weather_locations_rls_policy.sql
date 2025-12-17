-- Fix weather_locations RLS policy to allow both anon and authenticated users to read
-- This allows the frontend to fetch weather locations without requiring authentication

DROP POLICY IF EXISTS "Allow authenticated users to read weather_locations" ON weather_locations;

CREATE POLICY "Allow all users to read weather_locations"
  ON weather_locations
  FOR SELECT
  TO anon, authenticated
  USING (true);
