-- Add RLS policies for weather data tables to allow anon and authenticated users to read

-- Policy for weather_current table
CREATE POLICY "Allow all users to read weather_current"
ON public.weather_current
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy for weather_daily_forecast table
CREATE POLICY "Allow all users to read weather_daily_forecast"
ON public.weather_daily_forecast
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy for weather_hourly_forecast table (in case needed)
CREATE POLICY "Allow all users to read weather_hourly_forecast"
ON public.weather_hourly_forecast
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy for weather_alerts table (in case needed)
CREATE POLICY "Allow all users to read weather_alerts"
ON public.weather_alerts
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy for weather_air_quality table (in case needed)
CREATE POLICY "Allow all users to read weather_air_quality"
ON public.weather_air_quality
FOR SELECT
TO anon, authenticated
USING (true);
