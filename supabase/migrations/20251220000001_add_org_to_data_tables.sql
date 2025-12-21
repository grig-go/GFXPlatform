-- Migration: Add organization_id to ALL Nova data tables
-- Backfill existing data to Emergent organization

-- ============================================================================
-- HELPER: Get Emergent org ID for backfill
-- ============================================================================
DO $$
DECLARE
  emergent_org_id UUID;
BEGIN
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RAISE EXCEPTION 'Emergent organization not found. Run 20251220000000_add_organization_support.sql first.';
  END IF;

  RAISE NOTICE 'Emergent org ID: %', emergent_org_id;
END $$;

-- ============================================================================
-- 1. ELECTION TABLES (e_*)
-- ============================================================================

-- e_countries (reference data, org-scoped for custom countries)
ALTER TABLE e_countries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_countries SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_elections
ALTER TABLE e_elections ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_elections SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_geographic_divisions
ALTER TABLE e_geographic_divisions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_geographic_divisions SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_races
ALTER TABLE e_races ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_races SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_parties
ALTER TABLE e_parties ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_parties SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_candidates
ALTER TABLE e_candidates ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_candidates SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_race_results
ALTER TABLE e_race_results ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_race_results SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_candidate_results
ALTER TABLE e_candidate_results ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_candidate_results SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_historical_results
ALTER TABLE e_historical_results ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_historical_results SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_election_data_sources
ALTER TABLE e_election_data_sources ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_election_data_sources SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_election_data_ingestion_log
ALTER TABLE e_election_data_ingestion_log ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_election_data_ingestion_log SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_election_data_overrides_log
ALTER TABLE e_election_data_overrides_log ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_election_data_overrides_log SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_media_assets
ALTER TABLE e_media_assets ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_media_assets SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_election_editorial_content
ALTER TABLE e_election_editorial_content ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_election_editorial_content SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_ballot_measures
ALTER TABLE e_ballot_measures ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_ballot_measures SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_ballot_measure_results
ALTER TABLE e_ballot_measure_results ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_ballot_measure_results SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_exit_polls
ALTER TABLE e_exit_polls ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_exit_polls SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_ap_call_history
ALTER TABLE e_ap_call_history ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_ap_call_history SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- e_synthetic_groups
ALTER TABLE e_synthetic_groups ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE e_synthetic_groups SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- ============================================================================
-- 2. WEATHER TABLES (weather_*)
-- ============================================================================

-- weather_locations
ALTER TABLE weather_locations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE weather_locations SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- weather_current
ALTER TABLE weather_current ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE weather_current SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- weather_hourly_forecast
ALTER TABLE weather_hourly_forecast ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE weather_hourly_forecast SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- weather_daily_forecast
ALTER TABLE weather_daily_forecast ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE weather_daily_forecast SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- weather_alerts
ALTER TABLE weather_alerts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE weather_alerts SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- weather_air_quality
ALTER TABLE weather_air_quality ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE weather_air_quality SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- weather_ingest_config
ALTER TABLE weather_ingest_config ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE weather_ingest_config SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- weather_location_channels (if exists)
DO $$ BEGIN
  ALTER TABLE weather_location_channels ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE weather_location_channels SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- 3. SPORTS TABLES (sports_*)
-- ============================================================================

-- sports_leagues (if exists)
DO $$ BEGIN
  ALTER TABLE sports_leagues ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE sports_leagues SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- sports_teams (if exists)
DO $$ BEGIN
  ALTER TABLE sports_teams ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE sports_teams SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- sports_events (if exists)
DO $$ BEGIN
  ALTER TABLE sports_events ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE sports_events SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- 4. NEWS TABLES (news_*)
-- ============================================================================

-- news_articles
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE news_articles SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- news_clusters
ALTER TABLE news_clusters ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE news_clusters SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- ============================================================================
-- 5. AI/AGENT TABLES
-- ============================================================================

-- agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE agents SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- agent_runs
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE agent_runs SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- ai_providers
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE ai_providers SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- ai_prompt_injectors
ALTER TABLE ai_prompt_injectors ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE ai_prompt_injectors SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- ai_insights_elections
ALTER TABLE ai_insights_elections ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE ai_insights_elections SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- ai_insights_finance (if exists)
DO $$ BEGIN
  ALTER TABLE ai_insights_finance ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE ai_insights_finance SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ai_insights_news (if exists)
DO $$ BEGIN
  ALTER TABLE ai_insights_news ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE ai_insights_news SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ai_insights_weather (if exists)
DO $$ BEGIN
  ALTER TABLE ai_insights_weather ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE ai_insights_weather SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ai_insights_school_closing (if exists)
DO $$ BEGIN
  ALTER TABLE ai_insights_school_closing ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE ai_insights_school_closing SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- 6. DATA INTEGRATION TABLES
-- ============================================================================

-- data_sources
ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE data_sources SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- data_providers
ALTER TABLE data_providers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE data_providers SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- data_source_sync_logs (if exists)
DO $$ BEGIN
  ALTER TABLE data_source_sync_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE data_source_sync_logs SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- feeds
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE feeds SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- ============================================================================
-- 7. API TABLES
-- ============================================================================

-- api_endpoints
ALTER TABLE api_endpoints ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE api_endpoints SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- api_endpoint_sources (if exists)
DO $$ BEGIN
  ALTER TABLE api_endpoint_sources ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE api_endpoint_sources SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- api_access_logs (if exists)
DO $$ BEGIN
  ALTER TABLE api_access_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE api_access_logs SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- api_documentation (if exists)
DO $$ BEGIN
  ALTER TABLE api_documentation ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE api_documentation SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- 8. PULSAR/MCR TABLES
-- ============================================================================

-- channels
ALTER TABLE channels ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE channels SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- channel_playlists
ALTER TABLE channel_playlists ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE channel_playlists SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- content
ALTER TABLE content ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE content SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- templates
ALTER TABLE templates ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE templates SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- pulsar_playlists (already has organization_id from GFX schema, skip if exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pulsar_playlists' AND column_name = 'organization_id') THEN
    ALTER TABLE pulsar_playlists ADD COLUMN organization_id UUID REFERENCES u_organizations(id);
    UPDATE pulsar_playlists SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- pulsar_pages (already has organization_id from GFX schema, skip if exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pulsar_pages' AND column_name = 'organization_id') THEN
    ALTER TABLE pulsar_pages ADD COLUMN organization_id UUID REFERENCES u_organizations(id);
    UPDATE pulsar_pages SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- pulsar_channels (already has organization_id from GFX schema, skip if exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pulsar_channels' AND column_name = 'organization_id') THEN
    ALTER TABLE pulsar_channels ADD COLUMN organization_id UUID REFERENCES u_organizations(id);
    UPDATE pulsar_channels SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- pulsar_custom_uis (already has organization_id from GFX schema, skip if exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pulsar_custom_uis' AND column_name = 'organization_id') THEN
    ALTER TABLE pulsar_custom_uis ADD COLUMN organization_id UUID REFERENCES u_organizations(id);
    UPDATE pulsar_custom_uis SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- pulsar_command_log (already has organization_id from GFX schema, skip if exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pulsar_command_log' AND column_name = 'organization_id') THEN
    ALTER TABLE pulsar_command_log ADD COLUMN organization_id UUID REFERENCES u_organizations(id);
    UPDATE pulsar_command_log SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- pulsar_page_library (if exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pulsar_page_library' AND column_name = 'organization_id') THEN
    ALTER TABLE pulsar_page_library ADD COLUMN organization_id UUID REFERENCES u_organizations(id);
    UPDATE pulsar_page_library SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- pulsar_playout_log (if exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pulsar_playout_log' AND column_name = 'organization_id') THEN
    ALTER TABLE pulsar_playout_log ADD COLUMN organization_id UUID REFERENCES u_organizations(id);
    UPDATE pulsar_playout_log SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- 9. OTHER TABLES
-- ============================================================================

-- school_closings
ALTER TABLE school_closings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE school_closings SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- f_stocks (if exists)
DO $$ BEGIN
  ALTER TABLE f_stocks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE f_stocks SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- customer_dashboards
ALTER TABLE customer_dashboards ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE customer_dashboards SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- bop_election_results (if exists)
DO $$ BEGIN
  ALTER TABLE bop_election_results ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE bop_election_results SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- bop_party_results (if exists)
DO $$ BEGIN
  ALTER TABLE bop_party_results ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE bop_party_results SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- bop_insufficient_vote_details (if exists)
DO $$ BEGIN
  ALTER TABLE bop_insufficient_vote_details ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE bop_insufficient_vote_details SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- bop_net_changes (if exists)
DO $$ BEGIN
  ALTER TABLE bop_net_changes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE bop_net_changes SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- sponsor_schedules
ALTER TABLE sponsor_schedules ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE sponsor_schedules SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- banner_schedules
ALTER TABLE banner_schedules ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
UPDATE banner_schedules SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;

-- media_assets (if exists and not already covered in e_media_assets)
DO $$ BEGIN
  ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);
  UPDATE media_assets SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent') WHERE organization_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- 10. CREATE INDEXES FOR ORGANIZATION LOOKUPS
-- ============================================================================

-- Election tables
CREATE INDEX IF NOT EXISTS idx_e_elections_org ON e_elections(organization_id);
CREATE INDEX IF NOT EXISTS idx_e_races_org ON e_races(organization_id);
CREATE INDEX IF NOT EXISTS idx_e_candidates_org ON e_candidates(organization_id);

-- Weather tables
CREATE INDEX IF NOT EXISTS idx_weather_locations_org ON weather_locations(organization_id);

-- News tables
CREATE INDEX IF NOT EXISTS idx_news_articles_org ON news_articles(organization_id);

-- AI/Agent tables
CREATE INDEX IF NOT EXISTS idx_agents_org ON agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_providers_org ON ai_providers(organization_id);

-- Data integration tables
CREATE INDEX IF NOT EXISTS idx_data_sources_org ON data_sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_feeds_org ON feeds(organization_id);

-- API tables
CREATE INDEX IF NOT EXISTS idx_api_endpoints_org ON api_endpoints(organization_id);

-- Pulsar/MCR tables
CREATE INDEX IF NOT EXISTS idx_channels_org ON channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_channel_playlists_org ON channel_playlists(organization_id);
CREATE INDEX IF NOT EXISTS idx_content_org ON content(organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_org ON templates(organization_id);

-- Other tables
CREATE INDEX IF NOT EXISTS idx_school_closings_org ON school_closings(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_dashboards_org ON customer_dashboards(organization_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_schedules_org ON sponsor_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_banner_schedules_org ON banner_schedules(organization_id);
