-- =============================================
-- Organization Seed Data System
-- Allows copying selected data from Emergent org
-- to new organizations via admin wizard
-- =============================================

-- =============================================
-- 1. Get Seedable Data Categories
-- Returns available data categories that can be seeded
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

  -- Dashboard configs
  RETURN QUERY
  SELECT 'dashboards'::TEXT, 'customer_dashboards'::TEXT,
    (SELECT COUNT(*) FROM customer_dashboards WHERE organization_id = emergent_org_id);

  -- AI Providers (without API keys)
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

  -- Channels (Pulsar-MCR)
  RETURN QUERY
  SELECT 'channels'::TEXT, 'channels'::TEXT,
    (SELECT COUNT(*) FROM channels WHERE organization_id = emergent_org_id);

  -- Templates
  RETURN QUERY
  SELECT 'templates'::TEXT, 'templates'::TEXT,
    (SELECT COUNT(*) FROM templates WHERE organization_id = emergent_org_id);

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
-- 2. Get Seedable Items for a Category
-- Returns items that can be selected for seeding
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
    WHEN 'dashboards' THEN
      RETURN QUERY
      SELECT cd.id, cd.name::TEXT, cd.description::TEXT
      FROM customer_dashboards cd
      WHERE cd.organization_id = emergent_org_id;

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

    WHEN 'channels' THEN
      RETURN QUERY
      SELECT c.id, c.name::TEXT, c.description::TEXT
      FROM channels c
      WHERE c.organization_id = emergent_org_id;

    WHEN 'templates' THEN
      RETURN QUERY
      SELECT t.id, t.name::TEXT, t.description::TEXT
      FROM templates t
      WHERE t.organization_id = emergent_org_id;

    ELSE
      RETURN;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. Seed Organization Data
-- Copies selected data from Emergent to new org
-- =============================================

CREATE OR REPLACE FUNCTION seed_organization_data(
  p_new_org_id UUID,
  p_seed_config JSONB  -- { "dashboards": ["id1", "id2"], "ai_providers": ["id3"], ... }
)
RETURNS JSONB AS $$
DECLARE
  emergent_org_id UUID;
  result JSONB := '{}';
  dashboard_ids UUID[];
  provider_ids UUID[];
  data_provider_ids UUID[];
  feed_ids UUID[];
  agent_ids UUID[];
  data_source_ids UUID[];
  channel_ids UUID[];
  template_ids UUID[];
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
  -- Copy Dashboards
  -- =====================
  IF p_seed_config ? 'dashboards' AND jsonb_array_length(p_seed_config->'dashboards') > 0 THEN
    dashboard_ids := ARRAY(
      SELECT (jsonb_array_elements_text(p_seed_config->'dashboards'))::UUID
    );

    WITH inserted AS (
      INSERT INTO customer_dashboards (organization_id, name, description, config, is_active, created_at, updated_at)
      SELECT p_new_org_id, name, description, config, is_active, now(), now()
      FROM customer_dashboards
      WHERE id = ANY(dashboard_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;

    result := result || jsonb_build_object('dashboards', copied_count);
  END IF;

  -- =====================
  -- Copy AI Providers (WITHOUT API keys - user adds their own)
  -- =====================
  IF p_seed_config ? 'ai_providers' AND jsonb_array_length(p_seed_config->'ai_providers') > 0 THEN
    provider_ids := ARRAY(
      SELECT (jsonb_array_elements_text(p_seed_config->'ai_providers'))::UUID
    );

    WITH inserted AS (
      INSERT INTO ai_providers (organization_id, name, provider_type, is_active, config, created_at, updated_at)
      SELECT p_new_org_id, name, provider_type, false,
        -- Remove sensitive fields from config, keep model settings
        config - 'api_key' - 'secret' - 'credentials',
        now(), now()
      FROM ai_providers
      WHERE id = ANY(provider_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;

    result := result || jsonb_build_object('ai_providers', copied_count);
  END IF;

  -- =====================
  -- Copy Data Providers
  -- =====================
  IF p_seed_config ? 'data_providers' AND jsonb_array_length(p_seed_config->'data_providers') > 0 THEN
    data_provider_ids := ARRAY(
      SELECT (jsonb_array_elements_text(p_seed_config->'data_providers'))::UUID
    );

    WITH inserted AS (
      INSERT INTO data_providers (organization_id, name, description, provider_type, config, is_active, created_at, updated_at)
      SELECT p_new_org_id, name, description, provider_type,
        -- Remove credentials
        config - 'api_key' - 'secret' - 'credentials' - 'password',
        false, now(), now()
      FROM data_providers
      WHERE id = ANY(data_provider_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;

    result := result || jsonb_build_object('data_providers', copied_count);
  END IF;

  -- =====================
  -- Copy Feeds
  -- =====================
  IF p_seed_config ? 'feeds' AND jsonb_array_length(p_seed_config->'feeds') > 0 THEN
    feed_ids := ARRAY(
      SELECT (jsonb_array_elements_text(p_seed_config->'feeds'))::UUID
    );

    WITH inserted AS (
      INSERT INTO feeds (organization_id, name, description, feed_type, config, is_active, created_at, updated_at)
      SELECT p_new_org_id, name, description, feed_type, config, false, now(), now()
      FROM feeds
      WHERE id = ANY(feed_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;

    result := result || jsonb_build_object('feeds', copied_count);
  END IF;

  -- =====================
  -- Copy Agents
  -- =====================
  IF p_seed_config ? 'agents' AND jsonb_array_length(p_seed_config->'agents') > 0 THEN
    agent_ids := ARRAY(
      SELECT (jsonb_array_elements_text(p_seed_config->'agents'))::UUID
    );

    WITH inserted AS (
      INSERT INTO agents (organization_id, name, description, agent_type, config, is_active, created_at, updated_at)
      SELECT p_new_org_id, name, description, agent_type, config, false, now(), now()
      FROM agents
      WHERE id = ANY(agent_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;

    result := result || jsonb_build_object('agents', copied_count);
  END IF;

  -- =====================
  -- Copy Data Sources
  -- =====================
  IF p_seed_config ? 'data_sources' AND jsonb_array_length(p_seed_config->'data_sources') > 0 THEN
    data_source_ids := ARRAY(
      SELECT (jsonb_array_elements_text(p_seed_config->'data_sources'))::UUID
    );

    WITH inserted AS (
      INSERT INTO data_sources (organization_id, name, description, source_type, config, is_active, created_at, updated_at)
      SELECT p_new_org_id, name, description, source_type,
        config - 'api_key' - 'secret' - 'credentials' - 'password',
        false, now(), now()
      FROM data_sources
      WHERE id = ANY(data_source_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;

    result := result || jsonb_build_object('data_sources', copied_count);
  END IF;

  -- =====================
  -- Copy Channels (Pulsar-MCR)
  -- =====================
  IF p_seed_config ? 'channels' AND jsonb_array_length(p_seed_config->'channels') > 0 THEN
    channel_ids := ARRAY(
      SELECT (jsonb_array_elements_text(p_seed_config->'channels'))::UUID
    );

    WITH inserted AS (
      INSERT INTO channels (organization_id, name, description, config, is_active, created_at, updated_at)
      SELECT p_new_org_id, name, description, config, false, now(), now()
      FROM channels
      WHERE id = ANY(channel_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;

    result := result || jsonb_build_object('channels', copied_count);
  END IF;

  -- =====================
  -- Copy Templates
  -- =====================
  IF p_seed_config ? 'templates' AND jsonb_array_length(p_seed_config->'templates') > 0 THEN
    template_ids := ARRAY(
      SELECT (jsonb_array_elements_text(p_seed_config->'templates'))::UUID
    );

    WITH inserted AS (
      INSERT INTO templates (organization_id, name, description, template_type, content, config, is_active, created_at, updated_at)
      SELECT p_new_org_id, name, description, template_type, content, config, true, now(), now()
      FROM templates
      WHERE id = ANY(template_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;

    result := result || jsonb_build_object('templates', copied_count);
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. Create Organization with Seed Data
-- Complete wizard flow - creates org and copies data
-- =============================================

CREATE OR REPLACE FUNCTION create_organization_with_seed(
  p_name TEXT,
  p_slug TEXT,
  p_allowed_domains TEXT[],
  p_admin_email TEXT,
  p_seed_config JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  new_org_id UUID;
  invitation_token TEXT;
  seed_result JSONB;
BEGIN
  -- Check caller is superuser
  IF NOT EXISTS (SELECT 1 FROM u_users WHERE auth_user_id = auth.uid() AND is_superuser = true) THEN
    RAISE EXCEPTION 'Only superusers can create organizations';
  END IF;

  -- Validate slug uniqueness
  IF EXISTS (SELECT 1 FROM u_organizations WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'Organization slug already exists';
  END IF;

  -- Create organization
  INSERT INTO u_organizations (name, slug, allowed_domains)
  VALUES (p_name, p_slug, p_allowed_domains)
  RETURNING id INTO new_org_id;

  -- Seed data if config provided
  IF p_seed_config IS NOT NULL AND p_seed_config != '{}'::JSONB THEN
    seed_result := seed_organization_data(new_org_id, p_seed_config);
  ELSE
    seed_result := '{}'::JSONB;
  END IF;

  -- Create invitation for admin if email provided
  IF p_admin_email IS NOT NULL AND p_admin_email != '' THEN
    INSERT INTO u_invitations (email, organization_id, invited_by, role)
    VALUES (
      p_admin_email,
      new_org_id,
      (SELECT id FROM u_users WHERE auth_user_id = auth.uid()),
      'owner'
    )
    RETURNING token INTO invitation_token;
  END IF;

  RETURN jsonb_build_object(
    'organization_id', new_org_id,
    'slug', p_slug,
    'seed_result', seed_result,
    'invitation_token', invitation_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. Grant execute permissions
-- =============================================

GRANT EXECUTE ON FUNCTION get_seedable_data_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_seedable_items(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION seed_organization_data(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_with_seed(TEXT, TEXT, TEXT[], TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION get_seedable_data_summary() IS 'Returns summary of available seed data categories from Emergent org';
COMMENT ON FUNCTION get_seedable_items(TEXT) IS 'Returns items in a category that can be selected for seeding';
COMMENT ON FUNCTION seed_organization_data(UUID, JSONB) IS 'Copies selected seed data from Emergent to target org';
COMMENT ON FUNCTION create_organization_with_seed(TEXT, TEXT, TEXT[], TEXT, JSONB) IS 'Creates org with seed data and admin invitation - superuser only';
