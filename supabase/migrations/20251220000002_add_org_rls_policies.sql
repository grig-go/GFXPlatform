-- Migration: Add RLS policies for organization isolation
-- Superusers can see all data, regular users see only their org's data

-- ============================================================================
-- HELPER FUNCTION: Check if user is superuser
-- ============================================================================

CREATE OR REPLACE FUNCTION is_superuser()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM u_users
    WHERE auth_user_id = auth.uid()
    AND is_superuser = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- HELPER FUNCTION: Get user's organization_id
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM u_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- MACRO: Generate standard org RLS policies for a table
-- We'll apply this pattern to all tables
-- ============================================================================

-- ============================================================================
-- 1. ELECTION TABLES RLS
-- ============================================================================

-- e_elections
ALTER TABLE e_elections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_e_elections ON e_elections;
DROP POLICY IF EXISTS org_insert_e_elections ON e_elections;
DROP POLICY IF EXISTS org_update_e_elections ON e_elections;
DROP POLICY IF EXISTS org_delete_e_elections ON e_elections;

CREATE POLICY org_select_e_elections ON e_elections FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_e_elections ON e_elections FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_e_elections ON e_elections FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_e_elections ON e_elections FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- e_races
ALTER TABLE e_races ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_e_races ON e_races;
DROP POLICY IF EXISTS org_insert_e_races ON e_races;
DROP POLICY IF EXISTS org_update_e_races ON e_races;
DROP POLICY IF EXISTS org_delete_e_races ON e_races;

CREATE POLICY org_select_e_races ON e_races FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_e_races ON e_races FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_e_races ON e_races FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_e_races ON e_races FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- e_candidates
ALTER TABLE e_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_e_candidates ON e_candidates;
DROP POLICY IF EXISTS org_insert_e_candidates ON e_candidates;
DROP POLICY IF EXISTS org_update_e_candidates ON e_candidates;
DROP POLICY IF EXISTS org_delete_e_candidates ON e_candidates;

CREATE POLICY org_select_e_candidates ON e_candidates FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_e_candidates ON e_candidates FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_e_candidates ON e_candidates FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_e_candidates ON e_candidates FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- ============================================================================
-- 2. WEATHER TABLES RLS
-- ============================================================================

-- weather_locations
ALTER TABLE weather_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_weather_locations ON weather_locations;
DROP POLICY IF EXISTS org_insert_weather_locations ON weather_locations;
DROP POLICY IF EXISTS org_update_weather_locations ON weather_locations;
DROP POLICY IF EXISTS org_delete_weather_locations ON weather_locations;

CREATE POLICY org_select_weather_locations ON weather_locations FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_weather_locations ON weather_locations FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_weather_locations ON weather_locations FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_weather_locations ON weather_locations FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- ============================================================================
-- 3. NEWS TABLES RLS
-- ============================================================================

-- news_articles
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_news_articles ON news_articles;
DROP POLICY IF EXISTS org_insert_news_articles ON news_articles;
DROP POLICY IF EXISTS org_update_news_articles ON news_articles;
DROP POLICY IF EXISTS org_delete_news_articles ON news_articles;

CREATE POLICY org_select_news_articles ON news_articles FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_news_articles ON news_articles FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_news_articles ON news_articles FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_news_articles ON news_articles FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- ============================================================================
-- 4. AI/AGENT TABLES RLS
-- ============================================================================

-- agents
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_agents ON agents;
DROP POLICY IF EXISTS org_insert_agents ON agents;
DROP POLICY IF EXISTS org_update_agents ON agents;
DROP POLICY IF EXISTS org_delete_agents ON agents;

CREATE POLICY org_select_agents ON agents FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_agents ON agents FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_agents ON agents FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_agents ON agents FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- ai_providers
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_ai_providers ON ai_providers;
DROP POLICY IF EXISTS org_insert_ai_providers ON ai_providers;
DROP POLICY IF EXISTS org_update_ai_providers ON ai_providers;
DROP POLICY IF EXISTS org_delete_ai_providers ON ai_providers;

CREATE POLICY org_select_ai_providers ON ai_providers FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_ai_providers ON ai_providers FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_ai_providers ON ai_providers FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_ai_providers ON ai_providers FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- ============================================================================
-- 5. DATA INTEGRATION TABLES RLS
-- ============================================================================

-- data_sources
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_data_sources ON data_sources;
DROP POLICY IF EXISTS org_insert_data_sources ON data_sources;
DROP POLICY IF EXISTS org_update_data_sources ON data_sources;
DROP POLICY IF EXISTS org_delete_data_sources ON data_sources;

CREATE POLICY org_select_data_sources ON data_sources FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_data_sources ON data_sources FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_data_sources ON data_sources FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_data_sources ON data_sources FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- feeds
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_feeds ON feeds;
DROP POLICY IF EXISTS org_insert_feeds ON feeds;
DROP POLICY IF EXISTS org_update_feeds ON feeds;
DROP POLICY IF EXISTS org_delete_feeds ON feeds;

CREATE POLICY org_select_feeds ON feeds FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_feeds ON feeds FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_feeds ON feeds FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_feeds ON feeds FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- ============================================================================
-- 6. API TABLES RLS
-- ============================================================================

-- api_endpoints
ALTER TABLE api_endpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_api_endpoints ON api_endpoints;
DROP POLICY IF EXISTS org_insert_api_endpoints ON api_endpoints;
DROP POLICY IF EXISTS org_update_api_endpoints ON api_endpoints;
DROP POLICY IF EXISTS org_delete_api_endpoints ON api_endpoints;

CREATE POLICY org_select_api_endpoints ON api_endpoints FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_api_endpoints ON api_endpoints FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_api_endpoints ON api_endpoints FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_api_endpoints ON api_endpoints FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- ============================================================================
-- 7. PULSAR/MCR TABLES RLS
-- ============================================================================

-- channels
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_channels ON channels;
DROP POLICY IF EXISTS org_insert_channels ON channels;
DROP POLICY IF EXISTS org_update_channels ON channels;
DROP POLICY IF EXISTS org_delete_channels ON channels;

CREATE POLICY org_select_channels ON channels FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_channels ON channels FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_channels ON channels FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_channels ON channels FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- channel_playlists
ALTER TABLE channel_playlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_channel_playlists ON channel_playlists;
DROP POLICY IF EXISTS org_insert_channel_playlists ON channel_playlists;
DROP POLICY IF EXISTS org_update_channel_playlists ON channel_playlists;
DROP POLICY IF EXISTS org_delete_channel_playlists ON channel_playlists;

CREATE POLICY org_select_channel_playlists ON channel_playlists FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_channel_playlists ON channel_playlists FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_channel_playlists ON channel_playlists FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_channel_playlists ON channel_playlists FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- content
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_content ON content;
DROP POLICY IF EXISTS org_insert_content ON content;
DROP POLICY IF EXISTS org_update_content ON content;
DROP POLICY IF EXISTS org_delete_content ON content;

CREATE POLICY org_select_content ON content FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_content ON content FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_content ON content FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_content ON content FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- templates
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_templates ON templates;
DROP POLICY IF EXISTS org_insert_templates ON templates;
DROP POLICY IF EXISTS org_update_templates ON templates;
DROP POLICY IF EXISTS org_delete_templates ON templates;

CREATE POLICY org_select_templates ON templates FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_templates ON templates FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_templates ON templates FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_templates ON templates FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- ============================================================================
-- 8. OTHER TABLES RLS
-- ============================================================================

-- school_closings
ALTER TABLE school_closings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_school_closings ON school_closings;
DROP POLICY IF EXISTS org_insert_school_closings ON school_closings;
DROP POLICY IF EXISTS org_update_school_closings ON school_closings;
DROP POLICY IF EXISTS org_delete_school_closings ON school_closings;

CREATE POLICY org_select_school_closings ON school_closings FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_school_closings ON school_closings FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_school_closings ON school_closings FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_school_closings ON school_closings FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- customer_dashboards
ALTER TABLE customer_dashboards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_customer_dashboards ON customer_dashboards;
DROP POLICY IF EXISTS org_insert_customer_dashboards ON customer_dashboards;
DROP POLICY IF EXISTS org_update_customer_dashboards ON customer_dashboards;
DROP POLICY IF EXISTS org_delete_customer_dashboards ON customer_dashboards;

CREATE POLICY org_select_customer_dashboards ON customer_dashboards FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_customer_dashboards ON customer_dashboards FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_customer_dashboards ON customer_dashboards FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_customer_dashboards ON customer_dashboards FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- sponsor_schedules
ALTER TABLE sponsor_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_sponsor_schedules ON sponsor_schedules;
DROP POLICY IF EXISTS org_insert_sponsor_schedules ON sponsor_schedules;
DROP POLICY IF EXISTS org_update_sponsor_schedules ON sponsor_schedules;
DROP POLICY IF EXISTS org_delete_sponsor_schedules ON sponsor_schedules;

CREATE POLICY org_select_sponsor_schedules ON sponsor_schedules FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_sponsor_schedules ON sponsor_schedules FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_sponsor_schedules ON sponsor_schedules FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_sponsor_schedules ON sponsor_schedules FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- banner_schedules
ALTER TABLE banner_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_banner_schedules ON banner_schedules;
DROP POLICY IF EXISTS org_insert_banner_schedules ON banner_schedules;
DROP POLICY IF EXISTS org_update_banner_schedules ON banner_schedules;
DROP POLICY IF EXISTS org_delete_banner_schedules ON banner_schedules;

CREATE POLICY org_select_banner_schedules ON banner_schedules FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_banner_schedules ON banner_schedules FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_banner_schedules ON banner_schedules FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_banner_schedules ON banner_schedules FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);

-- ============================================================================
-- 9. ORGANIZATION TABLES RLS
-- ============================================================================

-- u_organizations - all authenticated can see their org, superusers see all
ALTER TABLE u_organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_u_organizations ON u_organizations;
DROP POLICY IF EXISTS org_insert_u_organizations ON u_organizations;
DROP POLICY IF EXISTS org_update_u_organizations ON u_organizations;
DROP POLICY IF EXISTS org_delete_u_organizations ON u_organizations;

CREATE POLICY org_select_u_organizations ON u_organizations FOR SELECT USING (
  id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_u_organizations ON u_organizations FOR INSERT WITH CHECK (
  is_superuser()  -- Only superusers can create new orgs
);
CREATE POLICY org_update_u_organizations ON u_organizations FOR UPDATE USING (
  is_superuser()  -- Only superusers can update orgs
);
CREATE POLICY org_delete_u_organizations ON u_organizations FOR DELETE USING (
  is_superuser()  -- Only superusers can delete orgs
);

-- u_invitations - org admins can manage their org's invitations
ALTER TABLE u_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_u_invitations ON u_invitations;
DROP POLICY IF EXISTS org_insert_u_invitations ON u_invitations;
DROP POLICY IF EXISTS org_update_u_invitations ON u_invitations;
DROP POLICY IF EXISTS org_delete_u_invitations ON u_invitations;

CREATE POLICY org_select_u_invitations ON u_invitations FOR SELECT USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_insert_u_invitations ON u_invitations FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id()
);
CREATE POLICY org_update_u_invitations ON u_invitations FOR UPDATE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
CREATE POLICY org_delete_u_invitations ON u_invitations FOR DELETE USING (
  organization_id = get_user_organization_id() OR is_superuser()
);
