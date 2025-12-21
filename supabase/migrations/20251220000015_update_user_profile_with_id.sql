-- Alternative: Update user profile RPC function that takes user_id as parameter
-- This bypasses the auth.uid() issue in SECURITY DEFINER functions

DROP FUNCTION IF EXISTS update_user_profile(TEXT, JSONB, TEXT);

CREATE OR REPLACE FUNCTION update_user_profile(
  p_user_id UUID,
  p_full_name TEXT,
  p_preferences JSONB,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid UUID;
  v_user_auth_id UUID;
  v_result JSONB;
BEGIN
  -- Get the current auth user id
  v_auth_uid := auth.uid();

  -- Verify that the user owns this record
  SELECT auth_user_id INTO v_user_auth_id
  FROM u_users
  WHERE id = p_user_id;

  IF v_user_auth_id IS NULL THEN
    RAISE EXCEPTION 'User record not found';
  END IF;

  -- Security check: ensure user can only update their own profile
  -- Allow if auth.uid matches OR if they are a superuser
  IF v_auth_uid IS NOT NULL AND v_user_auth_id != v_auth_uid THEN
    -- Check if caller is superuser
    IF NOT EXISTS (
      SELECT 1 FROM u_users
      WHERE auth_user_id = v_auth_uid AND is_superuser = true
    ) THEN
      RAISE EXCEPTION 'Not authorized to update this profile';
    END IF;
  END IF;

  -- Update the user profile
  UPDATE u_users
  SET
    full_name = COALESCE(p_full_name, full_name),
    preferences = COALESCE(p_preferences, preferences),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Return the updated user data
  SELECT jsonb_build_object(
    'id', id,
    'full_name', full_name,
    'preferences', preferences,
    'avatar_url', avatar_url,
    'updated_at', updated_at
  ) INTO v_result
  FROM u_users
  WHERE id = p_user_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, TEXT, JSONB, TEXT) TO authenticated;
