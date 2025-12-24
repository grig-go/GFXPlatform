-- Migration: Remove conflicting permissive RLS policies
--
-- This migration removes the old "USING (true)" policies that override the
-- organization-based RLS policies. In PostgreSQL, when multiple PERMISSIVE
-- policies exist, access is granted if ANY policy allows it. This means the
-- "USING (true)" policies effectively bypass the org_* policies.
--
-- After this migration, only the org_* policies will be in effect, properly
-- scoping data access to the user's organization.

-- ============================================================================
-- CHANNELS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated delete from channels" ON "public"."channels";
DROP POLICY IF EXISTS "Allow authenticated insert to channels" ON "public"."channels";
DROP POLICY IF EXISTS "Allow authenticated update to channels" ON "public"."channels";
DROP POLICY IF EXISTS "Allow public read access to channels" ON "public"."channels";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."channels";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."channels";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."channels";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."channels";

-- ============================================================================
-- CHANNEL_PLAYLISTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated can read" ON "public"."channel_playlists";
DROP POLICY IF EXISTS "Authenticated users - full access" ON "public"."channel_playlists";

-- ============================================================================
-- CONTENT TABLE
-- ============================================================================
-- Note: vs_content is a different table (video server content), not the main content table
-- We keep those for now as they may be intentionally open for testing

-- ============================================================================
-- DATA_SOURCES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Public read access to data sources" ON "public"."data_sources";

-- ============================================================================
-- TEMPLATES TABLE
-- ============================================================================
-- No conflicting policies found for templates table

-- ============================================================================
-- API_ENDPOINTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "All authenticated users can delete api_endpoints" ON "public"."api_endpoints";
DROP POLICY IF EXISTS "All authenticated users can insert api_endpoints" ON "public"."api_endpoints";
DROP POLICY IF EXISTS "All authenticated users can update api_endpoints" ON "public"."api_endpoints";
DROP POLICY IF EXISTS "All authenticated users can view api_endpoints" ON "public"."api_endpoints";
DROP POLICY IF EXISTS "Anyone can view api_endpoints" ON "public"."api_endpoints";
DROP POLICY IF EXISTS "Full access for authenticated users" ON "public"."api_endpoints";

-- ============================================================================
-- SPONSOR_SCHEDULES TABLE
-- ============================================================================
-- No conflicting policies found (org_* policies are the only ones)

-- ============================================================================
-- BANNER_SCHEDULES TABLE
-- ============================================================================
-- No conflicting policies found (org_* policies are the only ones)

-- ============================================================================
-- NEWS_ARTICLES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Public read access to news articles" ON "public"."news_articles";

-- ============================================================================
-- WEATHER_LOCATIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Allow all users to read weather_locations" ON "public"."weather_locations";

-- ============================================================================
-- WEATHER_LOCATION_CHANNELS TABLE (junction table)
-- ============================================================================
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON "public"."weather_location_channels";
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON "public"."weather_location_channels";
DROP POLICY IF EXISTS "Allow select for authenticated users" ON "public"."weather_location_channels";
DROP POLICY IF EXISTS "Allow update for authenticated users" ON "public"."weather_location_channels";

-- ============================================================================
-- E_CANDIDATES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Public read access" ON "public"."e_candidates";
DROP POLICY IF EXISTS "Public update access" ON "public"."e_candidates";

-- ============================================================================
-- E_ELECTIONS TABLE
-- No conflicting SELECT policies (org_select handles it)
-- ============================================================================

-- ============================================================================
-- E_RACES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Public read access" ON "public"."e_races";
DROP POLICY IF EXISTS "Public update access" ON "public"."e_races";

-- ============================================================================
-- FEEDS TABLE
-- ============================================================================
-- No conflicting policies found

-- ============================================================================
-- SCHOOL_CLOSINGS TABLE
-- ============================================================================
-- No conflicting policies found

-- ============================================================================
-- AGENTS TABLE
-- ============================================================================
-- No conflicting policies found

-- ============================================================================
-- AI_PROVIDERS TABLE
-- ============================================================================
-- No conflicting policies found

-- ============================================================================
-- CUSTOMER_DASHBOARDS TABLE
-- ============================================================================
-- No conflicting policies found

-- ============================================================================
-- DATA_PROVIDERS TABLE (shared/public data - keep public read)
-- ============================================================================
-- Keep "Public can view providers" - data_providers is intentionally public

-- ============================================================================
-- ELECTION REFERENCE DATA (keep public read for shared reference data)
-- These are reference tables that should remain publicly readable:
-- - e_geographic_divisions, e_countries, e_parties, e_ballot_measures, etc.
-- ============================================================================

-- ============================================================================
-- WEATHER DATA TABLES (keep public/service_role policies)
-- Weather data is synced by service_role and should be readable by all
-- ============================================================================
-- Keep all weather_current, weather_daily_forecast, weather_hourly_forecast,
-- weather_alerts, weather_air_quality policies - they're intentionally open

-- ============================================================================
-- Add anon SELECT for channels (Pulsar GFX needs to read channel data)
-- The org_select policy requires authentication, but Pulsar GFX renderers
-- may run without auth. Allow anon to SELECT but not modify.
-- ============================================================================
DROP POLICY IF EXISTS "anon_select_channels" ON "public"."channels";
CREATE POLICY "anon_select_channels" ON "public"."channels"
  FOR SELECT TO "anon" USING (true);

-- Add anon SELECT for channel_playlists
DROP POLICY IF EXISTS "anon_select_channel_playlists" ON "public"."channel_playlists";
CREATE POLICY "anon_select_channel_playlists" ON "public"."channel_playlists"
  FOR SELECT TO "anon" USING (true);

-- Add anon SELECT for templates (needed for Pulsar GFX rendering)
DROP POLICY IF EXISTS "anon_select_templates" ON "public"."templates";
CREATE POLICY "anon_select_templates" ON "public"."templates"
  FOR SELECT TO "anon" USING (true);

-- Add anon SELECT for data_sources (needed for Pulsar GFX data binding)
DROP POLICY IF EXISTS "anon_select_data_sources" ON "public"."data_sources";
CREATE POLICY "anon_select_data_sources" ON "public"."data_sources"
  FOR SELECT TO "anon" USING (true);

-- ============================================================================
-- Add org-based policies for weather_location_channels (junction table)
-- This was missing org policies
-- ============================================================================
DROP POLICY IF EXISTS "org_select_weather_location_channels" ON "public"."weather_location_channels";
CREATE POLICY "org_select_weather_location_channels" ON "public"."weather_location_channels"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM weather_locations wl
      WHERE wl.id = location_id
      AND (wl.organization_id = public.get_user_organization_id() OR public.is_superuser())
    )
  );

DROP POLICY IF EXISTS "org_insert_weather_location_channels" ON "public"."weather_location_channels";
CREATE POLICY "org_insert_weather_location_channels" ON "public"."weather_location_channels"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM weather_locations wl
      WHERE wl.id = location_id
      AND wl.organization_id = public.get_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "org_update_weather_location_channels" ON "public"."weather_location_channels";
CREATE POLICY "org_update_weather_location_channels" ON "public"."weather_location_channels"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM weather_locations wl
      WHERE wl.id = location_id
      AND (wl.organization_id = public.get_user_organization_id() OR public.is_superuser())
    )
  );

DROP POLICY IF EXISTS "org_delete_weather_location_channels" ON "public"."weather_location_channels";
CREATE POLICY "org_delete_weather_location_channels" ON "public"."weather_location_channels"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM weather_locations wl
      WHERE wl.id = location_id
      AND (wl.organization_id = public.get_user_organization_id() OR public.is_superuser())
    )
  );

-- ============================================================================
-- COMMENT explaining the policy structure
-- ============================================================================
COMMENT ON POLICY "org_select_channels" ON "public"."channels" IS
  'Allows authenticated users to SELECT channels belonging to their organization. Superusers can see all.';

COMMENT ON POLICY "anon_select_channels" ON "public"."channels" IS
  'Allows anonymous users (Pulsar GFX renderers) to read channel data for playout.';
