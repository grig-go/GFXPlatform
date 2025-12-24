-- =============================================
-- Fix RLS policies for dashboard-related tables
-- Weather, Sports, Stocks, Elections, Templates, GFX
-- =============================================

-- =============================================
-- TEMPLATES
-- =============================================
-- Drop overly permissive policies
DROP POLICY IF EXISTS "anon_select_templates" ON templates;
DROP POLICY IF EXISTS "Authenticated users - full access" ON templates;

-- Keep or create org-based policies (check if they exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'org_select_templates') THEN
    EXECUTE 'CREATE POLICY "org_select_templates" ON templates FOR SELECT TO authenticated USING (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'org_insert_templates') THEN
    EXECUTE 'CREATE POLICY "org_insert_templates" ON templates FOR INSERT TO authenticated WITH CHECK (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'org_update_templates') THEN
    EXECUTE 'CREATE POLICY "org_update_templates" ON templates FOR UPDATE TO authenticated USING (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'org_delete_templates') THEN
    EXECUTE 'CREATE POLICY "org_delete_templates" ON templates FOR DELETE TO authenticated USING (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
END $$;

-- =============================================
-- GFX TABLES
-- =============================================
-- Drop overly permissive policies on gfx_projects
DROP POLICY IF EXISTS "gfx_projects_anon_select" ON gfx_projects;
DROP POLICY IF EXISTS "gfx_projects_auth_all" ON gfx_projects;

-- Create org-based policies for gfx_projects
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gfx_projects' AND policyname = 'org_select_gfx_projects') THEN
    EXECUTE 'CREATE POLICY "org_select_gfx_projects" ON gfx_projects FOR SELECT TO authenticated USING (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gfx_projects' AND policyname = 'org_insert_gfx_projects') THEN
    EXECUTE 'CREATE POLICY "org_insert_gfx_projects" ON gfx_projects FOR INSERT TO authenticated WITH CHECK (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gfx_projects' AND policyname = 'org_update_gfx_projects') THEN
    EXECUTE 'CREATE POLICY "org_update_gfx_projects" ON gfx_projects FOR UPDATE TO authenticated USING (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gfx_projects' AND policyname = 'org_delete_gfx_projects') THEN
    EXECUTE 'CREATE POLICY "org_delete_gfx_projects" ON gfx_projects FOR DELETE TO authenticated USING (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
END $$;

-- Drop overly permissive policies on gfx_templates
DROP POLICY IF EXISTS "gfx_templates_anon_select" ON gfx_templates;
DROP POLICY IF EXISTS "gfx_templates_auth_all" ON gfx_templates;

-- Create org-based policies for gfx_templates (linked via project)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gfx_templates' AND policyname = 'org_select_gfx_templates') THEN
    EXECUTE 'CREATE POLICY "org_select_gfx_templates" ON gfx_templates FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM gfx_projects p WHERE p.id = gfx_templates.project_id AND (p.organization_id = get_user_organization_id() OR is_superuser()))
    )';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gfx_templates' AND policyname = 'org_insert_gfx_templates') THEN
    EXECUTE 'CREATE POLICY "org_insert_gfx_templates" ON gfx_templates FOR INSERT TO authenticated WITH CHECK (
      EXISTS (SELECT 1 FROM gfx_projects p WHERE p.id = gfx_templates.project_id AND (p.organization_id = get_user_organization_id() OR is_superuser()))
    )';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gfx_templates' AND policyname = 'org_update_gfx_templates') THEN
    EXECUTE 'CREATE POLICY "org_update_gfx_templates" ON gfx_templates FOR UPDATE TO authenticated USING (
      EXISTS (SELECT 1 FROM gfx_projects p WHERE p.id = gfx_templates.project_id AND (p.organization_id = get_user_organization_id() OR is_superuser()))
    )';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gfx_templates' AND policyname = 'org_delete_gfx_templates') THEN
    EXECUTE 'CREATE POLICY "org_delete_gfx_templates" ON gfx_templates FOR DELETE TO authenticated USING (
      EXISTS (SELECT 1 FROM gfx_projects p WHERE p.id = gfx_templates.project_id AND (p.organization_id = get_user_organization_id() OR is_superuser()))
    )';
  END IF;
END $$;

-- =============================================
-- STOCKS (f_stocks)
-- =============================================
DROP POLICY IF EXISTS "allow public all" ON f_stocks;
DROP POLICY IF EXISTS "allow_select_f_stocks" ON f_stocks;
DROP POLICY IF EXISTS "allow_update_f_stocks" ON f_stocks;

-- Create org-based policies for f_stocks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'f_stocks' AND policyname = 'org_select_f_stocks') THEN
    EXECUTE 'CREATE POLICY "org_select_f_stocks" ON f_stocks FOR SELECT TO authenticated USING (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'f_stocks' AND policyname = 'org_insert_f_stocks') THEN
    EXECUTE 'CREATE POLICY "org_insert_f_stocks" ON f_stocks FOR INSERT TO authenticated WITH CHECK (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'f_stocks' AND policyname = 'org_update_f_stocks') THEN
    EXECUTE 'CREATE POLICY "org_update_f_stocks" ON f_stocks FOR UPDATE TO authenticated USING (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
END $$;

-- =============================================
-- ELECTIONS (e_elections)
-- =============================================
DROP POLICY IF EXISTS "Public read access" ON e_elections;

-- Create org-based policies for e_elections
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'e_elections' AND policyname = 'org_select_e_elections') THEN
    EXECUTE 'CREATE POLICY "org_select_e_elections" ON e_elections FOR SELECT TO authenticated USING (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'e_elections' AND policyname = 'org_insert_e_elections') THEN
    EXECUTE 'CREATE POLICY "org_insert_e_elections" ON e_elections FOR INSERT TO authenticated WITH CHECK (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'e_elections' AND policyname = 'org_update_e_elections') THEN
    EXECUTE 'CREATE POLICY "org_update_e_elections" ON e_elections FOR UPDATE TO authenticated USING (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'e_elections' AND policyname = 'org_delete_e_elections') THEN
    EXECUTE 'CREATE POLICY "org_delete_e_elections" ON e_elections FOR DELETE TO authenticated USING (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
END $$;

-- =============================================
-- WEATHER DATA TABLES
-- These tables link to weather_locations via location_id
-- weather_locations already has org-based RLS
-- =============================================

-- Drop overly permissive policies on weather data tables
DROP POLICY IF EXISTS "Allow all users to read weather_current" ON weather_current;
DROP POLICY IF EXISTS "Allow authenticated users to read weather_current" ON weather_current;

DROP POLICY IF EXISTS "Allow all users to read weather_air_quality" ON weather_air_quality;
DROP POLICY IF EXISTS "Allow authenticated users to read weather_air_quality" ON weather_air_quality;

DROP POLICY IF EXISTS "Allow all users to read weather_alerts" ON weather_alerts;
DROP POLICY IF EXISTS "Allow authenticated users to read weather_alerts" ON weather_alerts;

DROP POLICY IF EXISTS "Allow all users to read weather_daily_forecast" ON weather_daily_forecast;
DROP POLICY IF EXISTS "Allow authenticated users to read weather_daily_forecast" ON weather_daily_forecast;

DROP POLICY IF EXISTS "Allow all users to read weather_hourly_forecast" ON weather_hourly_forecast;
DROP POLICY IF EXISTS "Allow authenticated users to read weather_hourly_forecast" ON weather_hourly_forecast;

-- Create org-based policies for weather data (link through weather_locations)
CREATE POLICY "org_select_weather_current" ON weather_current FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM weather_locations wl
  WHERE wl.id = weather_current.location_id
  AND (wl.organization_id = get_user_organization_id() OR is_superuser())
));

CREATE POLICY "org_select_weather_air_quality" ON weather_air_quality FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM weather_locations wl
  WHERE wl.id = weather_air_quality.location_id
  AND (wl.organization_id = get_user_organization_id() OR is_superuser())
));

CREATE POLICY "org_select_weather_alerts" ON weather_alerts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM weather_locations wl
  WHERE wl.id = weather_alerts.location_id
  AND (wl.organization_id = get_user_organization_id() OR is_superuser())
));

CREATE POLICY "org_select_weather_daily_forecast" ON weather_daily_forecast FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM weather_locations wl
  WHERE wl.id = weather_daily_forecast.location_id
  AND (wl.organization_id = get_user_organization_id() OR is_superuser())
));

CREATE POLICY "org_select_weather_hourly_forecast" ON weather_hourly_forecast FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM weather_locations wl
  WHERE wl.id = weather_hourly_forecast.location_id
  AND (wl.organization_id = get_user_organization_id() OR is_superuser())
));

-- =============================================
-- SPORTS TABLES
-- Enable RLS and create org-based policies
-- =============================================

-- Enable RLS on sports tables
ALTER TABLE sports_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_events ENABLE ROW LEVEL SECURITY;

-- Create org-based policies for sports_leagues
CREATE POLICY "org_select_sports_leagues" ON sports_leagues FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id() OR is_superuser());

CREATE POLICY "org_insert_sports_leagues" ON sports_leagues FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id() OR is_superuser());

CREATE POLICY "org_update_sports_leagues" ON sports_leagues FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id() OR is_superuser());

CREATE POLICY "org_delete_sports_leagues" ON sports_leagues FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id() OR is_superuser());

-- Create org-based policies for sports_teams
CREATE POLICY "org_select_sports_teams" ON sports_teams FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id() OR is_superuser());

CREATE POLICY "org_insert_sports_teams" ON sports_teams FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id() OR is_superuser());

CREATE POLICY "org_update_sports_teams" ON sports_teams FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id() OR is_superuser());

CREATE POLICY "org_delete_sports_teams" ON sports_teams FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id() OR is_superuser());

-- Create org-based policies for sports_events
CREATE POLICY "org_select_sports_events" ON sports_events FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id() OR is_superuser());

CREATE POLICY "org_insert_sports_events" ON sports_events FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id() OR is_superuser());

CREATE POLICY "org_update_sports_events" ON sports_events FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id() OR is_superuser());

CREATE POLICY "org_delete_sports_events" ON sports_events FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id() OR is_superuser());
