-- Run this script after database reset to set up cron jobs
-- Execute via: psql -h localhost -p 54322 -U postgres -d postgres -f src/supabase/scripts/setup-cron-jobs.sql

-- Schedule the weather CSV sync to run every 15 minutes
SELECT cron.schedule(
  'weather-csv-sync',
  '*/15 * * * *',
  $$SELECT sync_weather_csv()$$
);

-- Schedule the school closings sync to run every 5 minutes
SELECT cron.schedule(
  'school-closings-sync',
  '*/5 * * * *',
  $$SELECT sync_school_closings()$$
);

-- Verify jobs were created
SELECT jobname, schedule, command FROM cron.job;
