-- =====================================================
-- PULSAR VS PROJECTS RPC FUNCTIONS
-- Migration: Create RPC functions for pulsarvs_projects table
-- =====================================================

-- -------------------------------------------------
-- Get all projects
-- -------------------------------------------------
CREATE OR REPLACE FUNCTION pulsarvs_get_projects()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'success', true,
    'data', COALESCE(json_agg(row_to_json(p) ORDER BY p.name), '[]'::json)
  ) INTO result
  FROM pulsarvs_projects p;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------
-- Get active project
-- -------------------------------------------------
CREATE OR REPLACE FUNCTION pulsarvs_get_active_project()
RETURNS JSON AS $$
DECLARE
  result JSON;
  project_data JSON;
BEGIN
  SELECT row_to_json(p) INTO project_data
  FROM pulsarvs_projects p
  WHERE p.is_active = true
  LIMIT 1;

  IF project_data IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active project');
  END IF;

  RETURN json_build_object('success', true, 'data', project_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------
-- Create project
-- -------------------------------------------------
CREATE OR REPLACE FUNCTION pulsarvs_create_project(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_default_channel_id UUID DEFAULT NULL,
  p_default_instance_id UUID DEFAULT NULL,
  p_color TEXT DEFAULT 'blue',
  p_icon TEXT DEFAULT '📁',
  p_settings JSONB DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
  new_project pulsarvs_projects;
BEGIN
  INSERT INTO pulsarvs_projects (
    name, description, default_channel_id, default_instance_id,
    color, icon, settings
  )
  VALUES (
    p_name, p_description, p_default_channel_id, p_default_instance_id,
    p_color, p_icon, p_settings
  )
  RETURNING * INTO new_project;

  RETURN json_build_object('success', true, 'data', row_to_json(new_project));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------
-- Update project
-- -------------------------------------------------
CREATE OR REPLACE FUNCTION pulsarvs_update_project(
  p_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_default_channel_id UUID DEFAULT NULL,
  p_default_instance_id UUID DEFAULT NULL,
  p_color TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_settings JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  updated_project pulsarvs_projects;
BEGIN
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
  WHERE id = p_id
  RETURNING * INTO updated_project;

  IF updated_project IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Project not found');
  END IF;

  RETURN json_build_object('success', true, 'data', row_to_json(updated_project));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------
-- Set active project (deactivates others)
-- -------------------------------------------------
CREATE OR REPLACE FUNCTION pulsarvs_set_active_project(
  p_id UUID
)
RETURNS JSON AS $$
DECLARE
  activated_project pulsarvs_projects;
BEGIN
  -- Deactivate all projects
  UPDATE pulsarvs_projects SET is_active = false WHERE is_active = true;

  -- Activate the selected project
  UPDATE pulsarvs_projects
  SET is_active = true, updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO activated_project;

  IF activated_project IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Project not found');
  END IF;

  RETURN json_build_object('success', true, 'data', row_to_json(activated_project));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------
-- Delete project
-- -------------------------------------------------
CREATE OR REPLACE FUNCTION pulsarvs_delete_project(
  p_id UUID
)
RETURNS JSON AS $$
BEGIN
  DELETE FROM pulsarvs_projects WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Project not found');
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------
-- Cleanup: Drop old RPC functions that reference pulsar_projects
-- -------------------------------------------------
DROP FUNCTION IF EXISTS get_projects();
DROP FUNCTION IF EXISTS get_active_project();
DROP FUNCTION IF EXISTS create_project(TEXT, TEXT, UUID, UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS update_project(UUID, TEXT, TEXT, UUID, UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS set_active_project(UUID);
DROP FUNCTION IF EXISTS delete_project(UUID);
