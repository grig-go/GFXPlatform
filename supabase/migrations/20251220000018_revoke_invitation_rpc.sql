-- RPC function to revoke/delete invitations
-- This bypasses RLS while still enforcing authorization checks

CREATE OR REPLACE FUNCTION revoke_invitation(
  p_user_id UUID,
  p_invitation_id UUID
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
  v_invitation_org_id UUID;
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
  IF v_auth_uid IS NOT NULL AND v_user_auth_id != v_auth_uid THEN
    IF NOT EXISTS (
      SELECT 1 FROM u_users
      WHERE auth_user_id = v_auth_uid AND is_superuser = true
    ) THEN
      RAISE EXCEPTION 'Not authorized to revoke invitation as this user';
    END IF;
  END IF;

  -- Get the invitation's organization
  SELECT organization_id INTO v_invitation_org_id
  FROM u_invitations
  WHERE id = p_invitation_id;

  IF v_invitation_org_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  -- Authorization check: must be superuser OR (same org AND admin/owner)
  IF NOT v_is_superuser THEN
    IF v_user_org_id != v_invitation_org_id THEN
      RAISE EXCEPTION 'Cannot revoke invitation from a different organization';
    END IF;

    IF v_user_org_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'Must be org admin or owner to revoke invitations';
    END IF;
  END IF;

  -- Delete the invitation
  DELETE FROM u_invitations WHERE id = p_invitation_id;

  RETURN jsonb_build_object('success', true, 'invitation_id', p_invitation_id);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION revoke_invitation(UUID, UUID) TO authenticated;
