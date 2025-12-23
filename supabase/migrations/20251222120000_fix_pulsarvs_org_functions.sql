-- Fix remaining Pulsar-VS functions to filter by organization

-- Update pulsarvs_get_active_project to filter by organization
CREATE OR REPLACE FUNCTION pulsarvs_get_active_project() RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  project_data JSON;
  user_org_id uuid;
BEGIN
  -- Get user's organization_id
  SELECT organization_id INTO user_org_id
  FROM u_users WHERE auth_user_id = auth.uid();

  SELECT row_to_json(p) INTO project_data
  FROM pulsarvs_projects p
  WHERE p.is_active = true
    AND p.organization_id = user_org_id
  LIMIT 1;

  IF project_data IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active project');
  END IF;

  RETURN json_build_object('success', true, 'data', project_data);
END;
$$;

-- Update pulsarvs_set_active_project to filter by organization
CREATE OR REPLACE FUNCTION pulsarvs_set_active_project(p_id uuid) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  activated_project pulsarvs_projects;
  user_org_id uuid;
BEGIN
  -- Get user's organization_id
  SELECT organization_id INTO user_org_id
  FROM u_users WHERE auth_user_id = auth.uid();

  -- Deactivate all projects for this organization
  UPDATE pulsarvs_projects
  SET is_active = false
  WHERE is_active = true AND organization_id = user_org_id;

  -- Activate the selected project (only if it belongs to user's org)
  UPDATE pulsarvs_projects
  SET is_active = true, updated_at = NOW()
  WHERE id = p_id AND organization_id = user_org_id
  RETURNING * INTO activated_project;

  IF activated_project IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Project not found');
  END IF;

  RETURN json_build_object('success', true, 'data', row_to_json(activated_project));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update pulsarvs_update_project to filter by organization
CREATE OR REPLACE FUNCTION pulsarvs_update_project(
  p_id uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_default_channel_id uuid DEFAULT NULL,
  p_default_instance_id uuid DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_icon text DEFAULT NULL,
  p_settings jsonb DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  updated_project pulsarvs_projects;
  user_org_id uuid;
BEGIN
  -- Get user's organization_id
  SELECT organization_id INTO user_org_id
  FROM u_users WHERE auth_user_id = auth.uid();

  UPDATE pulsarvs_projects
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    default_channel_id = COALESCE(p_default_channel_id, default_channel_id),
    default_instance_id = COALESCE(p_default_instance_id, default_instance_id),
    color = COALESCE(p_color, color),
    icon = COALESCE(p_icon, icon),
    settings = COALESCE(p_settings, settings),
    updated_at = NOW()
  WHERE id = p_id AND organization_id = user_org_id
  RETURNING * INTO updated_project;

  IF updated_project IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Project not found');
  END IF;

  RETURN json_build_object('success', true, 'data', row_to_json(updated_project));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update pulsarvs_delete_project to filter by organization
CREATE OR REPLACE FUNCTION pulsarvs_delete_project(p_id uuid) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  user_org_id uuid;
  deleted_count int;
BEGIN
  -- Get user's organization_id
  SELECT organization_id INTO user_org_id
  FROM u_users WHERE auth_user_id = auth.uid();

  DELETE FROM pulsarvs_projects
  WHERE id = p_id AND organization_id = user_org_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Project not found');
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update pulsarvs_playlist_get to filter by organization
CREATE OR REPLACE FUNCTION pulsarvs_playlist_get(p_playlist_id uuid) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  user_org_id uuid;
BEGIN
  -- Get user's organization_id
  SELECT organization_id INTO user_org_id
  FROM u_users WHERE auth_user_id = auth.uid();

  SELECT json_build_object(
    'success', true,
    'data', json_build_object(
      'id', pl.id,
      'name', pl.name,
      'description', pl.description,
      'project_id', pl.project_id,
      'is_active', pl.is_active,
      'loop_enabled', pl.loop_enabled,
      'created_at', pl.created_at,
      'updated_at', pl.updated_at,
      'items', COALESCE((
        SELECT json_agg(json_build_object(
          'id', pi.id,
          'playlist_id', pi.playlist_id,
          'item_type', pi.item_type,
          'name', pi.name,
          'content_id', pi.content_id,
          'media_id', pi.media_id,
          'channel_id', pi.channel_id,
          'sort_order', pi.sort_order,
          'duration', pi.duration,
          'scheduled_time', pi.scheduled_time,
          'metadata', pi.metadata,
          'created_at', pi.created_at
        ) ORDER BY pi.sort_order)
        FROM pulsarvs_playlist_items pi
        WHERE pi.playlist_id = pl.id
      ), '[]'::json)
    )
  ) INTO result
  FROM pulsarvs_playlists pl
  WHERE pl.id = p_playlist_id AND pl.organization_id = user_org_id;

  IF result IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Playlist not found');
  END IF;

  RETURN result;
END;
$$;

-- Update pulsarvs_playlist_update to filter by organization
CREATE OR REPLACE FUNCTION pulsarvs_playlist_update(
  p_id uuid,
  p_name varchar DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_loop_enabled boolean DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  updated_playlist pulsarvs_playlists;
  user_org_id uuid;
BEGIN
  -- Get user's organization_id
  SELECT organization_id INTO user_org_id
  FROM u_users WHERE auth_user_id = auth.uid();

  UPDATE pulsarvs_playlists
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    loop_enabled = COALESCE(p_loop_enabled, loop_enabled),
    updated_at = NOW()
  WHERE id = p_id AND organization_id = user_org_id
  RETURNING * INTO updated_playlist;

  IF updated_playlist IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Playlist not found');
  END IF;

  RETURN json_build_object('success', true, 'data', row_to_json(updated_playlist));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update pulsarvs_playlist_delete to filter by organization
CREATE OR REPLACE FUNCTION pulsarvs_playlist_delete(p_id uuid) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  user_org_id uuid;
  deleted_count int;
BEGIN
  -- Get user's organization_id
  SELECT organization_id INTO user_org_id
  FROM u_users WHERE auth_user_id = auth.uid();

  DELETE FROM pulsarvs_playlists
  WHERE id = p_id AND organization_id = user_org_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Playlist not found');
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Ensure the existing projects/playlists have org_id assigned (re-run in case first migration failed)
UPDATE pulsarvs_projects
SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent')
WHERE organization_id IS NULL;

UPDATE pulsarvs_playlists
SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent')
WHERE organization_id IS NULL;
