-- Fix: Ambiguous column reference in list_invitations RPC

DROP FUNCTION IF EXISTS list_invitations(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION list_invitations(
  p_user_id UUID,
  p_pending_only BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  organization_id UUID,
  invited_by UUID,
  role TEXT,
  token TEXT,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
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
BEGIN
  -- Get the current auth user id
  v_auth_uid := auth.uid();

  -- Get the user's details from the provided user_id
  SELECT u.auth_user_id, u.organization_id, u.org_role, u.is_superuser
  INTO v_user_auth_id, v_user_org_id, v_user_org_role, v_is_superuser
  FROM u_users u
  WHERE u.id = p_user_id;

  IF v_user_auth_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Security check: ensure user can only use their own user_id
  IF v_auth_uid IS NOT NULL AND v_user_auth_id != v_auth_uid THEN
    IF NOT EXISTS (
      SELECT 1 FROM u_users u2
      WHERE u2.auth_user_id = v_auth_uid AND u2.is_superuser = true
    ) THEN
      RAISE EXCEPTION 'Not authorized to list invitations as this user';
    END IF;
  END IF;

  -- Authorization check: must be superuser OR admin/owner
  IF NOT v_is_superuser AND v_user_org_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Must be org admin or owner to view invitations';
  END IF;

  -- Return invitations
  IF v_is_superuser THEN
    -- Superusers can see all invitations
    IF p_pending_only THEN
      RETURN QUERY
      SELECT inv.id, inv.email, inv.organization_id, inv.invited_by, inv.role, inv.token, inv.expires_at, inv.accepted_at, inv.created_at
      FROM u_invitations inv
      WHERE inv.accepted_at IS NULL
      ORDER BY inv.created_at DESC;
    ELSE
      RETURN QUERY
      SELECT inv.id, inv.email, inv.organization_id, inv.invited_by, inv.role, inv.token, inv.expires_at, inv.accepted_at, inv.created_at
      FROM u_invitations inv
      ORDER BY inv.created_at DESC;
    END IF;
  ELSE
    -- Non-superusers only see their organization's invitations
    IF p_pending_only THEN
      RETURN QUERY
      SELECT inv.id, inv.email, inv.organization_id, inv.invited_by, inv.role, inv.token, inv.expires_at, inv.accepted_at, inv.created_at
      FROM u_invitations inv
      WHERE inv.organization_id = v_user_org_id AND inv.accepted_at IS NULL
      ORDER BY inv.created_at DESC;
    ELSE
      RETURN QUERY
      SELECT inv.id, inv.email, inv.organization_id, inv.invited_by, inv.role, inv.token, inv.expires_at, inv.accepted_at, inv.created_at
      FROM u_invitations inv
      WHERE inv.organization_id = v_user_org_id
      ORDER BY inv.created_at DESC;
    END IF;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION list_invitations(UUID, BOOLEAN) TO authenticated;
