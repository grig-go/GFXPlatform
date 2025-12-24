-- =============================================
-- Fix accept_u_invitation to create the u_users record
-- The client cannot insert into u_users due to RLS policies
-- so we need to do it in the SECURITY DEFINER function
-- =============================================

DROP FUNCTION IF EXISTS accept_u_invitation(TEXT, UUID);

CREATE OR REPLACE FUNCTION accept_u_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  organization_id UUID,
  org_role TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Validate the token first
  SELECT * INTO v_invite
  FROM u_invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Invalid or expired invitation'::TEXT;
    RETURN;
  END IF;

  -- Get the user's email and name from auth.users
  SELECT
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')
  INTO v_user_email, v_user_name
  FROM auth.users au
  WHERE au.id = p_user_id;

  IF v_user_email IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'User not found in auth'::TEXT;
    RETURN;
  END IF;

  -- Check if u_users record already exists
  IF EXISTS (SELECT 1 FROM u_users WHERE auth_user_id = p_user_id) THEN
    -- Just mark invitation as accepted
    UPDATE u_invitations
    SET accepted_at = now()
    WHERE id = v_invite.id;

    RETURN QUERY SELECT true, v_invite.organization_id, v_invite.role, NULL::TEXT;
    RETURN;
  END IF;

  -- Mark invitation as accepted
  UPDATE u_invitations
  SET accepted_at = now()
  WHERE id = v_invite.id;

  -- Create the u_users record
  INSERT INTO u_users (
    auth_user_id,
    email,
    full_name,
    organization_id,
    org_role,
    is_superuser
  ) VALUES (
    p_user_id,
    v_user_email,
    v_user_name,
    v_invite.organization_id,
    v_invite.role,
    false
  );

  -- Return org info
  RETURN QUERY SELECT true, v_invite.organization_id, v_invite.role, NULL::TEXT;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION accept_u_invitation(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION accept_u_invitation(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_u_invitation(TEXT, UUID) TO service_role;

COMMENT ON FUNCTION accept_u_invitation(TEXT, UUID) IS 'Accepts an invitation and creates the u_users record';
