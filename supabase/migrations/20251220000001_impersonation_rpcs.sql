-- =====================================================
-- SUPERUSER IMPERSONATION RPC FUNCTIONS
-- Migration: Add RPC functions for superuser to impersonate organizations
-- =====================================================

-- =====================================================
-- STEP 1: RPC to start impersonation (superuser only)
-- =====================================================

CREATE OR REPLACE FUNCTION impersonate_organization(p_org_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_org_name TEXT;
  v_is_superuser BOOLEAN;
BEGIN
  -- Check if current user is superuser
  SELECT is_superuser INTO v_is_superuser
  FROM u_users
  WHERE auth_user_id = auth.uid();

  IF NOT COALESCE(v_is_superuser, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only superuser can impersonate organizations'
    );
  END IF;

  -- Verify org exists
  SELECT name INTO v_org_name
  FROM organizations
  WHERE id = p_org_id;

  IF v_org_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found'
    );
  END IF;

  -- Set impersonation
  UPDATE u_users
  SET acting_as_organization_id = p_org_id
  WHERE auth_user_id = auth.uid();

  -- Log the impersonation
  INSERT INTO u_audit_log (
    user_id,
    user_email,
    app_key,
    action,
    resource_type,
    resource_id,
    resource_name,
    new_values
  )
  SELECT
    auth.uid(),
    email,
    'system',
    'permission_change',
    'organization',
    p_org_id::text,
    v_org_name,
    jsonb_build_object('action', 'impersonation_start', 'organization_name', v_org_name)
  FROM auth.users
  WHERE id = auth.uid();

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', p_org_id,
    'organization_name', v_org_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: RPC to end impersonation
-- =====================================================

CREATE OR REPLACE FUNCTION end_impersonation()
RETURNS JSONB AS $$
DECLARE
  v_prev_org_id UUID;
  v_prev_org_name TEXT;
  v_is_superuser BOOLEAN;
BEGIN
  -- Check if current user is superuser
  SELECT is_superuser, acting_as_organization_id
  INTO v_is_superuser, v_prev_org_id
  FROM u_users
  WHERE auth_user_id = auth.uid();

  IF NOT COALESCE(v_is_superuser, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only superuser can end impersonation'
    );
  END IF;

  IF v_prev_org_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not currently impersonating any organization'
    );
  END IF;

  -- Get org name for logging
  SELECT name INTO v_prev_org_name
  FROM organizations
  WHERE id = v_prev_org_id;

  -- Clear impersonation
  UPDATE u_users
  SET acting_as_organization_id = NULL
  WHERE auth_user_id = auth.uid();

  -- Log the end of impersonation
  INSERT INTO u_audit_log (
    user_id,
    user_email,
    app_key,
    action,
    resource_type,
    resource_id,
    resource_name,
    old_values
  )
  SELECT
    auth.uid(),
    email,
    'system',
    'permission_change',
    'organization',
    v_prev_org_id::text,
    v_prev_org_name,
    jsonb_build_object('action', 'impersonation_end', 'organization_name', v_prev_org_name)
  FROM auth.users
  WHERE id = auth.uid();

  RETURN jsonb_build_object(
    'success', true,
    'previous_organization_id', v_prev_org_id,
    'previous_organization_name', v_prev_org_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 3: RPC to get current impersonation status
-- =====================================================

CREATE OR REPLACE FUNCTION get_impersonation_status()
RETURNS JSONB AS $$
DECLARE
  v_acting_org_id UUID;
  v_acting_org_name TEXT;
  v_is_superuser BOOLEAN;
BEGIN
  SELECT is_superuser, acting_as_organization_id
  INTO v_is_superuser, v_acting_org_id
  FROM u_users
  WHERE auth_user_id = auth.uid();

  IF NOT COALESCE(v_is_superuser, false) THEN
    RETURN jsonb_build_object(
      'is_superuser', false,
      'is_impersonating', false
    );
  END IF;

  IF v_acting_org_id IS NOT NULL THEN
    SELECT name INTO v_acting_org_name
    FROM organizations
    WHERE id = v_acting_org_id;
  END IF;

  RETURN jsonb_build_object(
    'is_superuser', true,
    'is_impersonating', v_acting_org_id IS NOT NULL,
    'impersonated_organization_id', v_acting_org_id,
    'impersonated_organization_name', v_acting_org_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 4: RPC to get all organizations (superuser only)
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_organizations()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  settings JSONB,
  max_projects INTEGER,
  max_storage_mb INTEGER,
  user_count BIGINT,
  project_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if current user is superuser
  IF NOT is_superuser() THEN
    RAISE EXCEPTION 'Only superuser can access all organizations';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.slug,
    o.settings,
    o.max_projects,
    o.max_storage_mb,
    COALESCE(u.user_count, 0) AS user_count,
    COALESCE(p.project_count, 0) AS project_count,
    o.created_at,
    o.updated_at
  FROM organizations o
  LEFT JOIN (
    SELECT organization_id, COUNT(*) AS user_count
    FROM users
    WHERE organization_id IS NOT NULL
    GROUP BY organization_id
  ) u ON o.id = u.organization_id
  LEFT JOIN (
    SELECT organization_id, COUNT(*) AS project_count
    FROM gfx_projects
    WHERE organization_id IS NOT NULL
    GROUP BY organization_id
  ) p ON o.id = p.organization_id
  ORDER BY o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 5: RPC to get all users (superuser only)
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  organization_id UUID,
  organization_name TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  status TEXT
) AS $$
BEGIN
  -- Check if current user is superuser
  IF NOT is_superuser() THEN
    RAISE EXCEPTION 'Only superuser can access all users';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.name,
    u.organization_id,
    o.name AS organization_name,
    u.role,
    u.created_at,
    uu.last_login,
    COALESCE(uu.status, 'active') AS status
  FROM users u
  LEFT JOIN organizations o ON u.organization_id = o.id
  LEFT JOIN u_users uu ON u.id = uu.auth_user_id
  ORDER BY u.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 6: RPC to create organization (superuser only)
-- =====================================================

CREATE OR REPLACE FUNCTION create_organization(
  p_name TEXT,
  p_slug TEXT,
  p_max_projects INTEGER DEFAULT 10,
  p_max_storage_mb INTEGER DEFAULT 5000,
  p_settings JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Check if current user is superuser
  IF NOT is_superuser() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only superuser can create organizations'
    );
  END IF;

  -- Check slug uniqueness
  IF EXISTS (SELECT 1 FROM organizations WHERE slug = p_slug) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization slug already exists'
    );
  END IF;

  -- Create the organization
  INSERT INTO organizations (name, slug, max_projects, max_storage_mb, settings)
  VALUES (p_name, p_slug, p_max_projects, p_max_storage_mb, p_settings)
  RETURNING id INTO v_org_id;

  -- Log the creation
  INSERT INTO u_audit_log (
    user_id,
    user_email,
    app_key,
    action,
    resource_type,
    resource_id,
    resource_name,
    new_values
  )
  SELECT
    auth.uid(),
    email,
    'system',
    'create',
    'organization',
    v_org_id::text,
    p_name,
    jsonb_build_object(
      'name', p_name,
      'slug', p_slug,
      'max_projects', p_max_projects,
      'max_storage_mb', p_max_storage_mb
    )
  FROM auth.users
  WHERE id = auth.uid();

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 7: RPC to update organization (superuser only)
-- =====================================================

CREATE OR REPLACE FUNCTION update_organization(
  p_org_id UUID,
  p_name TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL,
  p_max_projects INTEGER DEFAULT NULL,
  p_max_storage_mb INTEGER DEFAULT NULL,
  p_settings JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  -- Check if current user is superuser
  IF NOT is_superuser() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only superuser can update organizations'
    );
  END IF;

  -- Get old values for audit
  SELECT jsonb_build_object(
    'name', name,
    'slug', slug,
    'max_projects', max_projects,
    'max_storage_mb', max_storage_mb,
    'settings', settings
  ) INTO v_old_values
  FROM organizations
  WHERE id = p_org_id;

  IF v_old_values IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found'
    );
  END IF;

  -- Check slug uniqueness if being changed
  IF p_slug IS NOT NULL AND EXISTS (
    SELECT 1 FROM organizations WHERE slug = p_slug AND id != p_org_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization slug already exists'
    );
  END IF;

  -- Update the organization
  UPDATE organizations
  SET
    name = COALESCE(p_name, name),
    slug = COALESCE(p_slug, slug),
    max_projects = COALESCE(p_max_projects, max_projects),
    max_storage_mb = COALESCE(p_max_storage_mb, max_storage_mb),
    settings = COALESCE(p_settings, settings),
    updated_at = NOW()
  WHERE id = p_org_id;

  -- Get new values for audit
  SELECT jsonb_build_object(
    'name', name,
    'slug', slug,
    'max_projects', max_projects,
    'max_storage_mb', max_storage_mb,
    'settings', settings
  ) INTO v_new_values
  FROM organizations
  WHERE id = p_org_id;

  -- Log the update
  INSERT INTO u_audit_log (
    user_id,
    user_email,
    app_key,
    action,
    resource_type,
    resource_id,
    resource_name,
    old_values,
    new_values
  )
  SELECT
    auth.uid(),
    email,
    'system',
    'update',
    'organization',
    p_org_id::text,
    v_new_values->>'name',
    v_old_values,
    v_new_values
  FROM auth.users
  WHERE id = auth.uid();

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', p_org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 8: RPC to delete organization (superuser only)
-- Includes safety checks
-- =====================================================

CREATE OR REPLACE FUNCTION delete_organization(
  p_org_id UUID,
  p_confirm_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_org_name TEXT;
  v_user_count INTEGER;
  v_project_count INTEGER;
BEGIN
  -- Check if current user is superuser
  IF NOT is_superuser() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only superuser can delete organizations'
    );
  END IF;

  -- Get org details
  SELECT name INTO v_org_name
  FROM organizations
  WHERE id = p_org_id;

  IF v_org_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found'
    );
  END IF;

  -- Verify confirmation name matches
  IF p_confirm_name != v_org_name THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Confirmation name does not match organization name'
    );
  END IF;

  -- Get counts for logging
  SELECT COUNT(*) INTO v_user_count
  FROM users
  WHERE organization_id = p_org_id;

  SELECT COUNT(*) INTO v_project_count
  FROM gfx_projects
  WHERE organization_id = p_org_id;

  -- Orphan users (set organization_id to NULL)
  UPDATE users
  SET organization_id = NULL, role = 'viewer'
  WHERE organization_id = p_org_id;

  -- Log before deletion
  INSERT INTO u_audit_log (
    user_id,
    user_email,
    app_key,
    action,
    resource_type,
    resource_id,
    resource_name,
    old_values
  )
  SELECT
    auth.uid(),
    email,
    'system',
    'delete',
    'organization',
    p_org_id::text,
    v_org_name,
    jsonb_build_object(
      'name', v_org_name,
      'users_orphaned', v_user_count,
      'projects_deleted', v_project_count
    )
  FROM auth.users
  WHERE id = auth.uid();

  -- Delete the organization (cascades to projects and other related data)
  DELETE FROM organizations WHERE id = p_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_organization', v_org_name,
    'users_orphaned', v_user_count,
    'projects_deleted', v_project_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 9: RPC to assign user to organization (superuser only)
-- =====================================================

CREATE OR REPLACE FUNCTION assign_user_to_organization(
  p_user_id UUID,
  p_org_id UUID,
  p_role TEXT DEFAULT 'member'
)
RETURNS JSONB AS $$
DECLARE
  v_user_email TEXT;
  v_org_name TEXT;
  v_old_org_id UUID;
  v_old_org_name TEXT;
BEGIN
  -- Check if current user is superuser
  IF NOT is_superuser() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only superuser can assign users to organizations'
    );
  END IF;

  -- Validate role
  IF p_role NOT IN ('owner', 'admin', 'member', 'viewer') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid role. Must be owner, admin, member, or viewer'
    );
  END IF;

  -- Get user info
  SELECT email, organization_id INTO v_user_email, v_old_org_id
  FROM users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Get old org name if exists
  IF v_old_org_id IS NOT NULL THEN
    SELECT name INTO v_old_org_name
    FROM organizations
    WHERE id = v_old_org_id;
  END IF;

  -- Get new org name
  SELECT name INTO v_org_name
  FROM organizations
  WHERE id = p_org_id;

  IF v_org_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found'
    );
  END IF;

  -- Update user's organization
  UPDATE users
  SET organization_id = p_org_id, role = p_role
  WHERE id = p_user_id;

  -- Log the assignment
  INSERT INTO u_audit_log (
    user_id,
    user_email,
    app_key,
    action,
    resource_type,
    resource_id,
    resource_name,
    old_values,
    new_values
  )
  SELECT
    auth.uid(),
    email,
    'system',
    'update',
    'user',
    p_user_id::text,
    v_user_email,
    jsonb_build_object(
      'organization_id', v_old_org_id,
      'organization_name', v_old_org_name
    ),
    jsonb_build_object(
      'organization_id', p_org_id,
      'organization_name', v_org_name,
      'role', p_role
    )
  FROM auth.users
  WHERE id = auth.uid();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'organization_id', p_org_id,
    'role', p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 10: RPC to get organization deletion preview
-- Shows what will be affected before actual deletion
-- =====================================================

CREATE OR REPLACE FUNCTION preview_organization_deletion(p_org_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_org_name TEXT;
  v_user_count INTEGER;
  v_project_count INTEGER;
  v_playlist_count INTEGER;
  v_channel_count INTEGER;
  v_template_count INTEGER;
BEGIN
  -- Check if current user is superuser
  IF NOT is_superuser() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only superuser can preview organization deletion'
    );
  END IF;

  -- Get org name
  SELECT name INTO v_org_name
  FROM organizations
  WHERE id = p_org_id;

  IF v_org_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found'
    );
  END IF;

  -- Count affected resources
  SELECT COUNT(*) INTO v_user_count
  FROM users
  WHERE organization_id = p_org_id;

  SELECT COUNT(*) INTO v_project_count
  FROM gfx_projects
  WHERE organization_id = p_org_id;

  SELECT COUNT(*) INTO v_playlist_count
  FROM pulsar_playlists
  WHERE organization_id = p_org_id;

  SELECT COUNT(*) INTO v_channel_count
  FROM pulsar_channels
  WHERE organization_id = p_org_id;

  SELECT COUNT(*) INTO v_template_count
  FROM gfx_templates t
  JOIN gfx_projects p ON t.project_id = p.id
  WHERE p.organization_id = p_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_name', v_org_name,
    'affected_resources', jsonb_build_object(
      'users_to_orphan', v_user_count,
      'projects_to_delete', v_project_count,
      'playlists_to_delete', v_playlist_count,
      'channels_to_delete', v_channel_count,
      'templates_to_delete', v_template_count
    ),
    'warning', 'This action cannot be undone. Users will be orphaned (not deleted). All projects and related data will be permanently deleted.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 11: Grant execute permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION impersonate_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION end_impersonation() TO authenticated;
GRANT EXECUTE ON FUNCTION get_impersonation_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_organizations() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization(TEXT, TEXT, INTEGER, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_organization(UUID, TEXT, TEXT, INTEGER, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_organization(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_to_organization(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION preview_organization_deletion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_superuser() TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_admin() TO authenticated;

-- Also grant to anon for helper functions that might be needed
GRANT EXECUTE ON FUNCTION get_effective_org_id() TO anon;
GRANT EXECUTE ON FUNCTION is_superuser() TO anon;
