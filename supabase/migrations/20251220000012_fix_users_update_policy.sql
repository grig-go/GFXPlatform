-- Fix: Ensure users can update their own profile
-- Drop and recreate the update policy to ensure it works correctly

-- Drop existing update policies
DROP POLICY IF EXISTS "users_update_own" ON u_users;
DROP POLICY IF EXISTS "Users can update own profile" ON u_users;
DROP POLICY IF EXISTS "users_update_own_profile" ON u_users;

-- Create a comprehensive update policy
-- Users can update their own record
CREATE POLICY "users_can_update_own" ON u_users
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Also allow superusers to update any user
CREATE POLICY "superusers_can_update_all" ON u_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM u_users
      WHERE auth_user_id = auth.uid()
      AND is_superuser = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM u_users
      WHERE auth_user_id = auth.uid()
      AND is_superuser = true
    )
  );
