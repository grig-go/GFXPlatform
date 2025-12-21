-- Fix: Update create_invitation RPC to accept user_id as parameter
-- This bypasses the auth.uid() issue in SECURITY DEFINER functions

DROP FUNCTION IF EXISTS create_invitation(TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION create_invitation(
  p_user_id UUID,
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
  v_user_auth_id UUID;
  v_user_org_id UUID;
  v_user_org_role TEXT;
  v_is_superuser BOOLEAN;
  v_invitation_id UUID;
  v_result JSONB;
BEGIN
  -- Get the current auth user id
  v_auth_uid := auth.uid();

  -- Get the user's details from the provided user_id
  SELECT auth_user_id, organization_id, org_role, is_superuser
  INTO v_user_auth_id, v_user_org_id, v_user_org_role, v_is_superuser
  FROM u_users
  WHERE id = p_user_id;

  IF v_user_auth_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Security check: ensure user can only use their own user_id
  -- Allow if auth.uid matches OR if they are a superuser
  IF v_auth_uid IS NOT NULL AND v_user_auth_id != v_auth_uid THEN
    -- Check if caller is superuser
    IF NOT EXISTS (
      SELECT 1 FROM u_users
      WHERE auth_user_id = v_auth_uid AND is_superuser = true
    ) THEN
      RAISE EXCEPTION 'Not authorized to create invitation as this user';
    END IF;
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
  VALUES (lower(trim(p_email)), p_organization_id, p_user_id, p_role)
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
GRANT EXECUTE ON FUNCTION create_invitation(UUID, TEXT, UUID, TEXT) TO authenticated;
