-- Create a debug function to check user's org vs project orgs
CREATE OR REPLACE FUNCTION pulsarvs_debug_org_mismatch() RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  user_org_id uuid;
  user_auth_id uuid;
  project_org_ids json;
  project_count int;
BEGIN
  user_auth_id := auth.uid();

  -- Get user's organization_id
  SELECT organization_id INTO user_org_id
  FROM u_users WHERE auth_user_id = user_auth_id;

  -- Get all project organization_ids
  SELECT json_agg(DISTINCT p.organization_id), COUNT(*) INTO project_org_ids, project_count
  FROM pulsarvs_projects p;

  RETURN json_build_object(
    'auth_uid', user_auth_id,
    'user_org_id', user_org_id,
    'project_org_ids', project_org_ids,
    'project_count', project_count
  );
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION pulsarvs_debug_org_mismatch() TO authenticated;
