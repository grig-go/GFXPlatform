-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests (needed to call edge functions)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to sync school closings data
-- This calls the school_closing edge function's /fetch endpoint
CREATE OR REPLACE FUNCTION sync_school_closings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT;
  anon_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get configuration from environment or app settings
  -- For local: http://localhost:54321, for cloud: your project URL
  supabase_url := COALESCE(
    current_setting('app.supabase_url', true),
    'http://kong:8000'  -- Internal docker network URL for local Supabase
  );

  anon_key := COALESCE(
    current_setting('app.supabase_anon_key', true),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'  -- Local dev anon key
  );

  -- Make HTTP POST request to the edge function to trigger sync
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/school_closing/fetch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || anon_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  RAISE NOTICE 'School closings sync triggered, request_id: %', request_id;
END;
$$;

-- Note: cron.schedule() is called in a later migration (20251208000002_fix_cron_permissions.sql)
-- to ensure proper permissions

-- Add comment for documentation
COMMENT ON FUNCTION sync_school_closings() IS 'Syncs school closings data from XML feed via the school_closing edge function. Called by pg_cron every 5 minutes.';

-- Grant execute permission to authenticated users (optional, for manual triggers)
GRANT EXECUTE ON FUNCTION sync_school_closings() TO authenticated;
