-- RPC function to create invitations
-- This bypasses RLS while still enforcing authorization checks
-- Similar to update_user_profile approach

CREATE OR REPLACE FUNCTION create_invitation(
  p_email TEXT,
  p_organization_id UUID,
  p_role TEXT DEFAULT 'member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid UUID;
  v_user_id UUID;
  v_user_org_id UUID;
  v_user_org_role TEXT;
  v_is_superuser BOOLEAN;
  v_invitation_id UUID;
  v_result JSONB;
BEGIN
  -- Get the current auth user id
  v_auth_uid := auth.uid();

  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the current user's details
  SELECT id, organization_id, org_role, is_superuser
  INTO v_user_id, v_user_org_id, v_user_org_role, v_is_superuser
  FROM u_users
  WHERE auth_user_id = v_auth_uid;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Authorization check: must be superuser OR (same org AND admin/owner)
  IF NOT v_is_superuser THEN
    IF v_user_org_id != p_organization_id THEN
      RAISE EXCEPTION 'Cannot invite to a different organization';
    END IF;

    IF v_user_org_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'Must be org admin or owner to send invitations';
    END IF;
  END IF;

  -- Validate email format
  IF p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Validate role
  IF p_role NOT IN ('owner', 'admin', 'member', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role. Must be owner, admin, member, or viewer';
  END IF;

  -- Check if invitation already exists
  IF EXISTS (
    SELECT 1 FROM u_invitations
    WHERE email = lower(trim(p_email))
    AND organization_id = p_organization_id
    AND accepted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'An invitation already exists for this email in this organization';
  END IF;

  -- Check if user already exists in the organization
  IF EXISTS (
    SELECT 1 FROM u_users
    WHERE email = lower(trim(p_email))
    AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'A user with this email already exists in this organization';
  END IF;

  -- Create the invitation
  INSERT INTO u_invitations (email, organization_id, invited_by, role)
  VALUES (lower(trim(p_email)), p_organization_id, v_user_id, p_role)
  RETURNING id INTO v_invitation_id;

  -- Return the created invitation
  SELECT jsonb_build_object(
    'id', i.id,
    'email', i.email,
    'organization_id', i.organization_id,
    'role', i.role,
    'token', i.token,
    'expires_at', i.expires_at,
    'created_at', i.created_at,
    'invited_by', i.invited_by
  ) INTO v_result
  FROM u_invitations i
  WHERE i.id = v_invitation_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_invitation(TEXT, UUID, TEXT) TO authenticated;
