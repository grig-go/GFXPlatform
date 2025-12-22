-- =============================================
-- Fix Organization Seed Data Functions V2
-- Corrects column names to match actual schema
-- =============================================

-- Drop existing function with old return type
DROP FUNCTION IF EXISTS get_seedable_items(TEXT);

-- =============================================
-- 1. Get Seedable Data Categories (FIXED V2)
-- =============================================

CREATE OR REPLACE FUNCTION get_seedable_data_summary()
RETURNS TABLE (
  category TEXT,
  table_name TEXT,
  item_count BIGINT
) AS $$
DECLARE
  emergent_org_id UUID;
BEGIN
  -- Get Emergent org ID
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RETURN;
  END IF;

  -- AI Providers (id is TEXT, no organization_id - global table)
  RETURN QUERY
  SELECT 'ai_providers'::TEXT, 'ai_providers'::TEXT,
    (SELECT COUNT(*) FROM ai_providers);

  -- Data Providers (id is TEXT)
  RETURN QUERY
  SELECT 'data_providers'::TEXT, 'data_providers'::TEXT,
    (SELECT COUNT(*) FROM data_providers WHERE organization_id = emergent_org_id);

  -- Feeds
  RETURN QUERY
  SELECT 'feeds'::TEXT, 'feeds'::TEXT,
    (SELECT COUNT(*) FROM feeds WHERE organization_id = emergent_org_id);

  -- Agents
  RETURN QUERY
  SELECT 'agents'::TEXT, 'agents'::TEXT,
    (SELECT COUNT(*) FROM agents WHERE organization_id = emergent_org_id);

  -- Data Sources
  RETURN QUERY
  SELECT 'data_sources'::TEXT, 'data_sources'::TEXT,
    (SELECT COUNT(*) FROM data_sources WHERE organization_id = emergent_org_id);

  -- Pulsar Channels
  BEGIN
    RETURN QUERY
    SELECT 'pulsar_channels'::TEXT, 'pulsar_channels'::TEXT,
      (SELECT COUNT(*) FROM pulsar_channels WHERE organization_id = emergent_org_id);
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    NULL;
  END;

  -- GFX Projects (Nova GFX)
  BEGIN
    RETURN QUERY
    SELECT 'gfx_projects'::TEXT, 'gfx_projects'::TEXT,
      (SELECT COUNT(*) FROM gfx_projects WHERE organization_id = emergent_org_id);
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    NULL;
  END;

  -- Templates (Pulsar/Nova templates table)
  BEGIN
    RETURN QUERY
    SELECT 'templates'::TEXT, 'templates'::TEXT,
      (SELECT COUNT(*) FROM templates WHERE organization_id = emergent_org_id);
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    NULL;
  END;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. Get Seedable Items for a Category (FIXED V2)
-- Uses correct column names from actual schema
-- =============================================

CREATE OR REPLACE FUNCTION get_seedable_items(p_category TEXT)
RETURNS TABLE (
  id TEXT,  -- Changed to TEXT to handle both UUID and TEXT ids
  name TEXT,
  description TEXT
) AS $$
DECLARE
  emergent_org_id UUID;
BEGIN
  -- Get Emergent org ID
  SELECT u_organizations.id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RETURN;
  END IF;

  CASE p_category
    WHEN 'ai_providers' THEN
      -- ai_providers: id is TEXT, use provider_name for description
      RETURN QUERY
      SELECT ap.id::TEXT, ap.name::TEXT, ap.provider_name::TEXT
      FROM ai_providers ap;

    WHEN 'data_providers' THEN
      -- data_providers: id is TEXT
      RETURN QUERY
      SELECT dp.id::TEXT, dp.name::TEXT, COALESCE(dp.description, dp.category)::TEXT
      FROM data_providers dp
      WHERE dp.organization_id = emergent_org_id;

    WHEN 'feeds' THEN
      -- feeds: no description column, use category
      RETURN QUERY
      SELECT f.id::TEXT, f.name::TEXT, f.category::TEXT
      FROM feeds f
      WHERE f.organization_id = emergent_org_id;

    WHEN 'agents' THEN
      -- agents: has description column
      RETURN QUERY
      SELECT a.id::TEXT, a.name::TEXT, a.description::TEXT
      FROM agents a
      WHERE a.organization_id = emergent_org_id;

    WHEN 'data_sources' THEN
      -- data_sources: no description column, use type
      RETURN QUERY
      SELECT ds.id::TEXT, ds.name::TEXT, ds.type::TEXT
      FROM data_sources ds
      WHERE ds.organization_id = emergent_org_id;

    WHEN 'pulsar_channels' THEN
      RETURN QUERY
      SELECT pc.id::TEXT, pc.name::TEXT, pc.description::TEXT
      FROM pulsar_channels pc
      WHERE pc.organization_id = emergent_org_id;

    WHEN 'gfx_projects' THEN
      RETURN QUERY
      SELECT gp.id::TEXT, gp.name::TEXT, gp.description::TEXT
      FROM gfx_projects gp
      WHERE gp.organization_id = emergent_org_id;

    WHEN 'templates' THEN
      -- templates: no description column, use type
      RETURN QUERY
      SELECT t.id::TEXT, t.name::TEXT, t.type::TEXT
      FROM templates t
      WHERE t.organization_id = emergent_org_id;

    ELSE
      RETURN;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. Seed Organization Data (FIXED V2)
-- =============================================

CREATE OR REPLACE FUNCTION seed_organization_data(
  p_new_org_id UUID,
  p_seed_config JSONB
)
RETURNS JSONB AS $$
DECLARE
  emergent_org_id UUID;
  result JSONB := '{}';
  item_ids TEXT[];
  uuid_ids UUID[];
  copied_count INTEGER;
BEGIN
  -- Get Emergent org ID
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RAISE EXCEPTION 'Emergent organization not found';
  END IF;

  -- Validate new org exists
  IF NOT EXISTS (SELECT 1 FROM u_organizations WHERE id = p_new_org_id) THEN
    RAISE EXCEPTION 'Target organization not found';
  END IF;

  -- =====================
  -- Copy AI Providers (WITHOUT API keys) - id is TEXT
  -- =====================
  IF p_seed_config ? 'ai_providers' AND jsonb_array_length(p_seed_config->'ai_providers') > 0 THEN
    item_ids := ARRAY(SELECT jsonb_array_elements_text(p_seed_config->'ai_providers'));

    WITH inserted AS (
      INSERT INTO ai_providers (id, name, provider_name, type, description, api_key, enabled, created_at, updated_at)
      SELECT
        gen_random_uuid()::TEXT,  -- Generate new ID
        name,
        provider_name,
        type,
        description,
        '',  -- Empty API key - user needs to configure
        false,  -- Disabled by default
        now(),
        now()
      FROM ai_providers
      WHERE id = ANY(item_ids)
      ON CONFLICT DO NOTHING
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('ai_providers', copied_count);
  END IF;

  -- =====================
  -- Copy Data Providers - id is TEXT
  -- =====================
  IF p_seed_config ? 'data_providers' AND jsonb_array_length(p_seed_config->'data_providers') > 0 THEN
    item_ids := ARRAY(SELECT jsonb_array_elements_text(p_seed_config->'data_providers'));

    WITH inserted AS (
      INSERT INTO data_providers (id, organization_id, name, description, type, category, is_active, config, created_at, updated_at)
      SELECT
        gen_random_uuid()::TEXT,
        p_new_org_id,
        name,
        description,
        type,
        category,
        false,
        config - 'api_key' - 'secret' - 'credentials' - 'password',
        now(),
        now()
      FROM data_providers
      WHERE id = ANY(item_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('data_providers', copied_count);
  END IF;

  -- =====================
  -- Copy Feeds - id is UUID
  -- =====================
  IF p_seed_config ? 'feeds' AND jsonb_array_length(p_seed_config->'feeds') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'feeds'))::UUID);

    WITH inserted AS (
      INSERT INTO feeds (organization_id, name, type, category, active, configuration, created_at, updated_at)
      SELECT p_new_org_id, name, type, category, false, configuration, now(), now()
      FROM feeds
      WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('feeds', copied_count);
  END IF;

  -- =====================
  -- Copy Agents - id is UUID
  -- =====================
  IF p_seed_config ? 'agents' AND jsonb_array_length(p_seed_config->'agents') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'agents'))::UUID);

    WITH inserted AS (
      INSERT INTO agents (organization_id, name, description, agent_type, status, configuration, created_at, updated_at)
      SELECT p_new_org_id, name, description, agent_type, 'PAUSED', configuration, now(), now()
      FROM agents
      WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('agents', copied_count);
  END IF;

  -- =====================
  -- Copy Data Sources - id is UUID
  -- =====================
  IF p_seed_config ? 'data_sources' AND jsonb_array_length(p_seed_config->'data_sources') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'data_sources'))::UUID);

    WITH inserted AS (
      INSERT INTO data_sources (organization_id, name, type, active, file_config, sync_config, category, metadata, created_at, updated_at)
      SELECT p_new_org_id, name, type, false, file_config, sync_config, category, metadata, now(), now()
      FROM data_sources
      WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('data_sources', copied_count);
  END IF;

  -- =====================
  -- Copy Pulsar Channels
  -- =====================
  IF p_seed_config ? 'pulsar_channels' AND jsonb_array_length(p_seed_config->'pulsar_channels') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'pulsar_channels'))::UUID);

    BEGIN
      WITH inserted AS (
        INSERT INTO pulsar_channels (organization_id, name, description, config, is_active, created_at, updated_at)
        SELECT p_new_org_id, name, description, config, false, now(), now()
        FROM pulsar_channels
        WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
        RETURNING 1
      )
      SELECT COUNT(*) INTO copied_count FROM inserted;
      result := result || jsonb_build_object('pulsar_channels', copied_count);
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END IF;

  -- =====================
  -- Copy GFX Projects
  -- =====================
  IF p_seed_config ? 'gfx_projects' AND jsonb_array_length(p_seed_config->'gfx_projects') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'gfx_projects'))::UUID);

    BEGIN
      WITH inserted AS (
        INSERT INTO gfx_projects (organization_id, name, description, width, height, fps, duration, background_color, created_at, updated_at)
        SELECT p_new_org_id, name, description, width, height, fps, duration, background_color, now(), now()
        FROM gfx_projects
        WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
        RETURNING 1
      )
      SELECT COUNT(*) INTO copied_count FROM inserted;
      result := result || jsonb_build_object('gfx_projects', copied_count);
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END IF;

  -- =====================
  -- Copy Templates
  -- =====================
  IF p_seed_config ? 'templates' AND jsonb_array_length(p_seed_config->'templates') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'templates'))::UUID);

    BEGIN
      WITH inserted AS (
        INSERT INTO templates (organization_id, name, type, active, "order", created_at, updated_at)
        SELECT p_new_org_id, name, type, true, "order", now(), now()
        FROM templates
        WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
        RETURNING 1
      )
      SELECT COUNT(*) INTO copied_count FROM inserted;
      result := result || jsonb_build_object('templates', copied_count);
    EXCEPTION WHEN undefined_table OR undefined_column THEN
      NULL;
    END;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_seedable_data_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_seedable_items(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION seed_organization_data(UUID, JSONB) TO authenticated;
