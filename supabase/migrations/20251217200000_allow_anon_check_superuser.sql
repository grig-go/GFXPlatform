-- Allow anonymous users to check if system is initialized (has superuser)
-- This is needed for the System Locked screen to work before any user logs in

-- Grant minimal SELECT on u_users to anon role
GRANT SELECT ON u_users TO anon;

-- Enable RLS on u_users if not already enabled
ALTER TABLE u_users ENABLE ROW LEVEL SECURITY;

-- Policy: anon can only check if a superuser exists (very limited access)
CREATE POLICY "anon_check_superuser_exists" ON u_users
  FOR SELECT
  TO anon
  USING (is_superuser = true);

-- Policy: authenticated users can see all users (for user management)
CREATE POLICY "authenticated_read_users" ON u_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: authenticated users can update their own profile
CREATE POLICY "users_update_own" ON u_users
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Policy: service role can do everything (for admin scripts)
CREATE POLICY "service_role_all" ON u_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
