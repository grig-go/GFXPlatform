-- =============================================
-- Update Seed Function to Use Complete GFX Copy
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
  project_uuid UUID;
  new_project_id UUID;
BEGIN
  -- Get Emergent org ID
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RAISE EXCEPTION 'Emergent organization not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM u_organizations WHERE id = p_new_org_id) THEN
    RAISE EXCEPTION 'Target organization not found';
  END IF;

  -- Copy AI Providers (id is TEXT)
  IF p_seed_config ? 'ai_providers' AND jsonb_array_length(p_seed_config->'ai_providers') > 0 THEN
    item_ids := ARRAY(SELECT jsonb_array_elements_text(p_seed_config->'ai_providers'));
    WITH inserted AS (
      INSERT INTO ai_providers (id, name, provider_name, type, description, api_key, enabled, created_at, updated_at)
      SELECT gen_random_uuid()::TEXT, name, provider_name, type, description, '', false, now(), now()
      FROM ai_providers WHERE id = ANY(item_ids)
      ON CONFLICT DO NOTHING
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('ai_providers', copied_count);
  END IF;

  -- Copy Data Providers (id is TEXT)
  IF p_seed_config ? 'data_providers' AND jsonb_array_length(p_seed_config->'data_providers') > 0 THEN
    item_ids := ARRAY(SELECT jsonb_array_elements_text(p_seed_config->'data_providers'));
    WITH inserted AS (
      INSERT INTO data_providers (id, organization_id, name, description, type, category, is_active, config, created_at, updated_at)
      SELECT gen_random_uuid()::TEXT, p_new_org_id, name, description, type, category, false,
        config - 'api_key' - 'secret' - 'credentials' - 'password', now(), now()
      FROM data_providers WHERE id = ANY(item_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('data_providers', copied_count);
  END IF;

  -- Copy Feeds (id is UUID)
  IF p_seed_config ? 'feeds' AND jsonb_array_length(p_seed_config->'feeds') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'feeds'))::UUID);
    WITH inserted AS (
      INSERT INTO feeds (organization_id, name, type, category, active, configuration, created_at, updated_at)
      SELECT p_new_org_id, name, type, category, false, configuration, now(), now()
      FROM feeds WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('feeds', copied_count);
  END IF;

  -- Copy Agents (id is UUID)
  IF p_seed_config ? 'agents' AND jsonb_array_length(p_seed_config->'agents') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'agents'))::UUID);
    WITH inserted AS (
      INSERT INTO agents (organization_id, name, description, agent_type, status, configuration, created_at, updated_at)
      SELECT p_new_org_id, name, description, agent_type, 'PAUSED', configuration, now(), now()
      FROM agents WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('agents', copied_count);
  END IF;

  -- Copy API Endpoints (id is UUID)
  IF p_seed_config ? 'api_endpoints' AND jsonb_array_length(p_seed_config->'api_endpoints') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'api_endpoints'))::UUID);
    WITH inserted AS (
      INSERT INTO api_endpoints (
        organization_id, name, slug, description, output_format,
        query_template, transformation_config, cache_duration_seconds,
        active, category, target_apps, created_at, updated_at
      )
      SELECT
        p_new_org_id,
        name,
        slug || '-' || substring(gen_random_uuid()::TEXT, 1, 8),
        description,
        output_format,
        query_template,
        transformation_config,
        cache_duration_seconds,
        false,
        category,
        target_apps,
        now(),
        now()
      FROM api_endpoints
      WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('api_endpoints', copied_count);
  END IF;

  -- Copy Data Sources (id is UUID)
  IF p_seed_config ? 'data_sources' AND jsonb_array_length(p_seed_config->'data_sources') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'data_sources'))::UUID);
    WITH inserted AS (
      INSERT INTO data_sources (organization_id, name, type, active, file_config, sync_config, category, metadata, created_at, updated_at)
      SELECT p_new_org_id, name, type, false, file_config, sync_config, category, metadata, now(), now()
      FROM data_sources WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('data_sources', copied_count);
  END IF;

  -- Copy Pulsar Channels
  IF p_seed_config ? 'pulsar_channels' AND jsonb_array_length(p_seed_config->'pulsar_channels') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'pulsar_channels'))::UUID);
    BEGIN
      WITH inserted AS (
        INSERT INTO pulsar_channels (organization_id, name, description, config, is_active, created_at, updated_at)
        SELECT p_new_org_id, name, description, config, false, now(), now()
        FROM pulsar_channels WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
        RETURNING 1
      )
      SELECT COUNT(*) INTO copied_count FROM inserted;
      result := result || jsonb_build_object('pulsar_channels', copied_count);
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END IF;

  -- Copy GFX Projects using complete copy function
  IF p_seed_config ? 'gfx_projects' AND jsonb_array_length(p_seed_config->'gfx_projects') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'gfx_projects'))::UUID);
    copied_count := 0;
    BEGIN
      FOREACH project_uuid IN ARRAY uuid_ids LOOP
        -- Use the complete copy function that copies all child tables
        SELECT copy_gfx_project_complete(project_uuid, p_new_org_id, NULL) INTO new_project_id;
        IF new_project_id IS NOT NULL THEN
          copied_count := copied_count + 1;
        END IF;
      END LOOP;
      result := result || jsonb_build_object('gfx_projects', copied_count);
    EXCEPTION WHEN undefined_table OR undefined_function THEN
      -- Fallback to simple copy if function doesn't exist
      WITH inserted AS (
        INSERT INTO gfx_projects (organization_id, name, description, canvas_width, canvas_height, frame_rate, background_color, created_at, updated_at)
        SELECT p_new_org_id, name, description, canvas_width, canvas_height, frame_rate, background_color, now(), now()
        FROM gfx_projects WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
        RETURNING 1
      )
      SELECT COUNT(*) INTO copied_count FROM inserted;
      result := result || jsonb_build_object('gfx_projects', copied_count);
    END;
  END IF;

  -- Copy Templates
  IF p_seed_config ? 'templates' AND jsonb_array_length(p_seed_config->'templates') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'templates'))::UUID);
    BEGIN
      WITH inserted AS (
        INSERT INTO templates (organization_id, name, type, active, "order", created_at, updated_at)
        SELECT p_new_org_id, name, type, true, "order", now(), now()
        FROM templates WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
        RETURNING 1
      )
      SELECT COUNT(*) INTO copied_count FROM inserted;
      result := result || jsonb_build_object('templates', copied_count);
    EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
    END;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION seed_organization_data(UUID, JSONB) TO authenticated;
