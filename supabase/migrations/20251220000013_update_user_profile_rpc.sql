-- RPC function to update user profile
-- This function runs with SECURITY DEFINER to bypass RLS
-- but still validates that the user can only update their own profile

CREATE OR REPLACE FUNCTION update_user_profile(
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
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Get the current user's u_users.id based on auth.uid()
  SELECT id INTO v_user_id
  FROM u_users
  WHERE auth_user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update the user profile
  UPDATE u_users
  SET
    full_name = COALESCE(p_full_name, full_name),
    preferences = COALESCE(p_preferences, preferences),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Return the updated user data
  SELECT jsonb_build_object(
    'id', id,
    'full_name', full_name,
    'preferences', preferences,
    'avatar_url', avatar_url,
    'updated_at', updated_at
  ) INTO v_result
  FROM u_users
  WHERE id = v_user_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_profile(TEXT, JSONB, TEXT) TO authenticated;
