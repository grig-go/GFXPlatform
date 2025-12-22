-- =============================================
-- Fix Organization Seed Data Functions
-- Corrects table references to match actual schema
-- =============================================

-- =============================================
-- 1. Get Seedable Data Categories (FIXED)
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

  -- AI Providers
  RETURN QUERY
  SELECT 'ai_providers'::TEXT, 'ai_providers'::TEXT,
    (SELECT COUNT(*) FROM ai_providers WHERE organization_id = emergent_org_id);

  -- Data Providers
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

  -- Pulsar Channels (corrected from 'channels')
  BEGIN
    RETURN QUERY
    SELECT 'pulsar_channels'::TEXT, 'pulsar_channels'::TEXT,
      (SELECT COUNT(*) FROM pulsar_channels WHERE organization_id = emergent_org_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- GFX Projects (Nova GFX)
  BEGIN
    RETURN QUERY
    SELECT 'gfx_projects'::TEXT, 'gfx_projects'::TEXT,
      (SELECT COUNT(*) FROM gfx_projects WHERE organization_id = emergent_org_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- GFX Templates (Nova GFX)
  BEGIN
    RETURN QUERY
    SELECT 'gfx_templates'::TEXT, 'gfx_templates'::TEXT,
      (SELECT COUNT(*) FROM gfx_templates gt
       JOIN gfx_projects gp ON gt.project_id = gp.id
       WHERE gp.organization_id = emergent_org_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Templates (Pulsar/Nova templates table)
  BEGIN
    RETURN QUERY
    SELECT 'templates'::TEXT, 'templates'::TEXT,
      (SELECT COUNT(*) FROM templates WHERE organization_id = emergent_org_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Pulsar Playlists
  BEGIN
    RETURN QUERY
    SELECT 'pulsar_playlists'::TEXT, 'pulsar_playlists'::TEXT,
      (SELECT COUNT(*) FROM pulsar_playlists WHERE organization_id = emergent_org_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Pulsar Custom UIs
  BEGIN
    RETURN QUERY
    SELECT 'pulsar_custom_uis'::TEXT, 'pulsar_custom_uis'::TEXT,
      (SELECT COUNT(*) FROM pulsar_custom_uis WHERE organization_id = emergent_org_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. Get Seedable Items for a Category (FIXED)
-- =============================================

CREATE OR REPLACE FUNCTION get_seedable_items(p_category TEXT)
RETURNS TABLE (
  id UUID,
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
      RETURN QUERY
      SELECT ap.id, ap.name::TEXT, ap.provider_type::TEXT
      FROM ai_providers ap
      WHERE ap.organization_id = emergent_org_id;

    WHEN 'data_providers' THEN
      RETURN QUERY
      SELECT dp.id, dp.name::TEXT, dp.description::TEXT
      FROM data_providers dp
      WHERE dp.organization_id = emergent_org_id;

    WHEN 'feeds' THEN
      RETURN QUERY
      SELECT f.id, f.name::TEXT, f.description::TEXT
      FROM feeds f
      WHERE f.organization_id = emergent_org_id;

    WHEN 'agents' THEN
      RETURN QUERY
      SELECT a.id, a.name::TEXT, a.description::TEXT
      FROM agents a
      WHERE a.organization_id = emergent_org_id;

    WHEN 'data_sources' THEN
      RETURN QUERY
      SELECT ds.id, ds.name::TEXT, ds.description::TEXT
      FROM data_sources ds
      WHERE ds.organization_id = emergent_org_id;

    WHEN 'pulsar_channels' THEN
      RETURN QUERY
      SELECT pc.id, pc.name::TEXT, pc.description::TEXT
      FROM pulsar_channels pc
      WHERE pc.organization_id = emergent_org_id;

    WHEN 'gfx_projects' THEN
      RETURN QUERY
      SELECT gp.id, gp.name::TEXT, gp.description::TEXT
      FROM gfx_projects gp
      WHERE gp.organization_id = emergent_org_id;

    WHEN 'gfx_templates' THEN
      RETURN QUERY
      SELECT gt.id, gt.name::TEXT, gt.description::TEXT
      FROM gfx_templates gt
      JOIN gfx_projects gp ON gt.project_id = gp.id
      WHERE gp.organization_id = emergent_org_id;

    WHEN 'templates' THEN
      RETURN QUERY
      SELECT t.id, t.name::TEXT, t.description::TEXT
      FROM templates t
      WHERE t.organization_id = emergent_org_id;

    WHEN 'pulsar_playlists' THEN
      RETURN QUERY
      SELECT pp.id, pp.name::TEXT, pp.description::TEXT
      FROM pulsar_playlists pp
      WHERE pp.organization_id = emergent_org_id;

    WHEN 'pulsar_custom_uis' THEN
      RETURN QUERY
      SELECT pcu.id, pcu.name::TEXT, pcu.description::TEXT
      FROM pulsar_custom_uis pcu
      WHERE pcu.organization_id = emergent_org_id;

    ELSE
      RETURN;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. Seed Organization Data (FIXED)
-- =============================================

CREATE OR REPLACE FUNCTION seed_organization_data(
  p_new_org_id UUID,
  p_seed_config JSONB
)
RETURNS JSONB AS $$
DECLARE
  emergent_org_id UUID;
  result JSONB := '{}';
  item_ids UUID[];
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
  -- Copy AI Providers (WITHOUT API keys)
  -- =====================
  IF p_seed_config ? 'ai_providers' AND jsonb_array_length(p_seed_config->'ai_providers') > 0 THEN
    item_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'ai_providers'))::UUID);

    WITH inserted AS (
      INSERT INTO ai_providers (organization_id, name, provider_type, is_active, config, created_at, updated_at)
      SELECT p_new_org_id, name, provider_type, false,
        config - 'api_key' - 'secret' - 'credentials',
        now(), now()
      FROM ai_providers
      WHERE id = ANY(item_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('ai_providers', copied_count);
  END IF;

  -- =====================
  -- Copy Data Providers
  -- =====================
  IF p_seed_config ? 'data_providers' AND jsonb_array_length(p_seed_config->'data_providers') > 0 THEN
    item_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'data_providers'))::UUID);

    WITH inserted AS (
      INSERT INTO data_providers (organization_id, name, description, type, category, is_active, config, created_at, updated_at)
      SELECT p_new_org_id, name, description, type, category, false,
        config - 'api_key' - 'secret' - 'credentials' - 'password',
        now(), now()
      FROM data_providers
      WHERE id = ANY(item_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('data_providers', copied_count);
  END IF;

  -- =====================
  -- Copy Feeds
  -- =====================
  IF p_seed_config ? 'feeds' AND jsonb_array_length(p_seed_config->'feeds') > 0 THEN
    item_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'feeds'))::UUID);

    WITH inserted AS (
      INSERT INTO feeds (organization_id, name, description, feed_type, config, is_active, created_at, updated_at)
      SELECT p_new_org_id, name, description, feed_type, config, false, now(), now()
      FROM feeds
      WHERE id = ANY(item_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('feeds', copied_count);
  END IF;

  -- =====================
  -- Copy Agents
  -- =====================
  IF p_seed_config ? 'agents' AND jsonb_array_length(p_seed_config->'agents') > 0 THEN
    item_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'agents'))::UUID);

    WITH inserted AS (
      INSERT INTO agents (organization_id, name, description, agent_type, config, is_active, created_at, updated_at)
      SELECT p_new_org_id, name, description, agent_type, config, false, now(), now()
      FROM agents
      WHERE id = ANY(item_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('agents', copied_count);
  END IF;

  -- =====================
  -- Copy Data Sources
  -- =====================
  IF p_seed_config ? 'data_sources' AND jsonb_array_length(p_seed_config->'data_sources') > 0 THEN
    item_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'data_sources'))::UUID);

    WITH inserted AS (
      INSERT INTO data_sources (organization_id, name, description, source_type, config, is_active, created_at, updated_at)
      SELECT p_new_org_id, name, description, source_type,
        config - 'api_key' - 'secret' - 'credentials' - 'password',
        false, now(), now()
      FROM data_sources
      WHERE id = ANY(item_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('data_sources', copied_count);
  END IF;

  -- =====================
  -- Copy Pulsar Channels
  -- =====================
  IF p_seed_config ? 'pulsar_channels' AND jsonb_array_length(p_seed_config->'pulsar_channels') > 0 THEN
    item_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'pulsar_channels'))::UUID);

    WITH inserted AS (
      INSERT INTO pulsar_channels (organization_id, name, description, config, is_active, created_at, updated_at)
      SELECT p_new_org_id, name, description, config, false, now(), now()
      FROM pulsar_channels
      WHERE id = ANY(item_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('pulsar_channels', copied_count);
  END IF;

  -- =====================
  -- Copy GFX Projects (with templates, elements, etc.)
  -- This is more complex - for now just copy the project metadata
  -- =====================
  IF p_seed_config ? 'gfx_projects' AND jsonb_array_length(p_seed_config->'gfx_projects') > 0 THEN
    item_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'gfx_projects'))::UUID);

    WITH inserted AS (
      INSERT INTO gfx_projects (organization_id, name, description, width, height, fps, duration, background_color, created_at, updated_at)
      SELECT p_new_org_id, name, description, width, height, fps, duration, background_color, now(), now()
      FROM gfx_projects
      WHERE id = ANY(item_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('gfx_projects', copied_count);
  END IF;

  -- =====================
  -- Copy Templates (Pulsar/Nova templates)
  -- =====================
  IF p_seed_config ? 'templates' AND jsonb_array_length(p_seed_config->'templates') > 0 THEN
    item_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'templates'))::UUID);

    WITH inserted AS (
      INSERT INTO templates (organization_id, name, description, template_data, is_active, created_at, updated_at)
      SELECT p_new_org_id, name, description, template_data, true, now(), now()
      FROM templates
      WHERE id = ANY(item_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('templates', copied_count);
  END IF;

  -- =====================
  -- Copy Pulsar Playlists
  -- =====================
  IF p_seed_config ? 'pulsar_playlists' AND jsonb_array_length(p_seed_config->'pulsar_playlists') > 0 THEN
    item_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'pulsar_playlists'))::UUID);

    WITH inserted AS (
      INSERT INTO pulsar_playlists (organization_id, name, description, config, is_active, created_at, updated_at)
      SELECT p_new_org_id, name, description, config, false, now(), now()
      FROM pulsar_playlists
      WHERE id = ANY(item_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('pulsar_playlists', copied_count);
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_seedable_data_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_seedable_items(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION seed_organization_data(UUID, JSONB) TO authenticated;
