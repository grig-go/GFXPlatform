-- Add organization_id to Pulsar-VS tables and assign existing data to Emergent org

-- Add organization_id to pulsarvs_projects
ALTER TABLE pulsarvs_projects
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);

-- Add organization_id to pulsarvs_playlists
ALTER TABLE pulsarvs_playlists
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);

-- Assign all existing projects to Emergent organization
UPDATE pulsarvs_projects
SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent')
WHERE organization_id IS NULL;

-- Assign all existing playlists to Emergent organization
UPDATE pulsarvs_playlists
SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent')
WHERE organization_id IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pulsarvs_projects_org ON pulsarvs_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_pulsarvs_playlists_org ON pulsarvs_playlists(organization_id);

-- Update RLS policies for pulsarvs_projects
DROP POLICY IF EXISTS "pulsarvs_projects_select" ON pulsarvs_projects;
DROP POLICY IF EXISTS "pulsarvs_projects_insert" ON pulsarvs_projects;
DROP POLICY IF EXISTS "pulsarvs_projects_update" ON pulsarvs_projects;
DROP POLICY IF EXISTS "pulsarvs_projects_delete" ON pulsarvs_projects;

CREATE POLICY "pulsarvs_projects_select" ON pulsarvs_projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "pulsarvs_projects_insert" ON pulsarvs_projects
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "pulsarvs_projects_update" ON pulsarvs_projects
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "pulsarvs_projects_delete" ON pulsarvs_projects
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid()
    )
  );

-- Update RLS policies for pulsarvs_playlists
DROP POLICY IF EXISTS "pulsarvs_playlists_select" ON pulsarvs_playlists;
DROP POLICY IF EXISTS "pulsarvs_playlists_insert" ON pulsarvs_playlists;
DROP POLICY IF EXISTS "pulsarvs_playlists_update" ON pulsarvs_playlists;
DROP POLICY IF EXISTS "pulsarvs_playlists_delete" ON pulsarvs_playlists;

CREATE POLICY "pulsarvs_playlists_select" ON pulsarvs_playlists
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "pulsarvs_playlists_insert" ON pulsarvs_playlists
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "pulsarvs_playlists_update" ON pulsarvs_playlists
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "pulsarvs_playlists_delete" ON pulsarvs_playlists
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid()
    )
  );

-- Enable RLS on tables if not already enabled
ALTER TABLE pulsarvs_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsarvs_playlists ENABLE ROW LEVEL SECURITY;

-- Update pulsarvs_create_project to include organization_id from current user
CREATE OR REPLACE FUNCTION pulsarvs_create_project(
  p_name text,
  p_description text DEFAULT NULL,
  p_default_channel_id uuid DEFAULT NULL,
  p_default_instance_id uuid DEFAULT NULL,
  p_color text DEFAULT 'blue',
  p_icon text DEFAULT '📁',
  p_settings jsonb DEFAULT '{}'
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  new_project pulsarvs_projects;
  user_org_id uuid;
BEGIN
  -- Get user's organization_id
  SELECT organization_id INTO user_org_id
  FROM u_users WHERE auth_user_id = auth.uid();

  INSERT INTO pulsarvs_projects (
    name, description, default_channel_id, default_instance_id,
    color, icon, settings, organization_id
  )
  VALUES (
    p_name, p_description, p_default_channel_id, p_default_instance_id,
    p_color, p_icon, p_settings, user_org_id
  )
  RETURNING * INTO new_project;

  RETURN json_build_object('success', true, 'data', row_to_json(new_project));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update pulsarvs_get_projects to filter by organization
CREATE OR REPLACE FUNCTION pulsarvs_get_projects() RETURNS json
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
    'data', COALESCE(json_agg(row_to_json(p) ORDER BY p.name), '[]'::json)
  ) INTO result
  FROM pulsarvs_projects p
  WHERE p.organization_id = user_org_id;

  RETURN result;
END;
$$;

-- Update pulsarvs_playlist_create to include organization_id from current user
CREATE OR REPLACE FUNCTION pulsarvs_playlist_create(
  p_name character varying,
  p_description text DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_loop_enabled boolean DEFAULT false
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  new_playlist pulsarvs_playlists;
  user_org_id uuid;
BEGIN
  -- Get user's organization_id
  SELECT organization_id INTO user_org_id
  FROM u_users WHERE auth_user_id = auth.uid();

  INSERT INTO pulsarvs_playlists (name, description, project_id, loop_enabled, organization_id)
  VALUES (p_name, p_description, p_project_id, p_loop_enabled, user_org_id)
  RETURNING * INTO new_playlist;

  RETURN json_build_object('success', true, 'data', row_to_json(new_playlist));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update pulsarvs_playlist_list to filter by organization
CREATE OR REPLACE FUNCTION pulsarvs_playlist_list(p_project_id uuid DEFAULT NULL) RETURNS json
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
    'data', COALESCE(json_agg(row_to_json(p)), '[]'::json)
  ) INTO result
  FROM (
    SELECT
      pl.id,
      pl.name,
      pl.description,
      pl.project_id,
      pl.is_active,
      pl.loop_enabled,
      pl.created_at,
      pl.updated_at,
      (SELECT COUNT(*) FROM pulsarvs_playlist_items WHERE playlist_id = pl.id) as item_count
    FROM pulsarvs_playlists pl
    WHERE pl.organization_id = user_org_id
      AND (p_project_id IS NULL OR pl.project_id = p_project_id)
    ORDER BY pl.name ASC
  ) p;

  RETURN result;
END;
$$;
