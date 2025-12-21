-- Migration: Fix u_organizations SELECT policy - use simpler approach
-- The helper functions might be causing issues with circular evaluation

-- Drop ALL existing SELECT policies on u_organizations
DROP POLICY IF EXISTS org_select_u_organizations ON u_organizations;
DROP POLICY IF EXISTS "org_select_u_organizations" ON u_organizations;

-- Grant SELECT to authenticated users
GRANT SELECT ON u_organizations TO authenticated;

-- Create a simpler policy that doesn't rely on helper functions
-- Superusers need to see all orgs, regular users just their own
CREATE POLICY "select_u_organizations" ON u_organizations
FOR SELECT
TO authenticated
USING (
  -- Allow if user is superuser
  EXISTS (
    SELECT 1 FROM u_users
    WHERE u_users.auth_user_id = auth.uid()
    AND u_users.is_superuser = true
  )
  OR
  -- Allow if this org is the user's org
  id = (
    SELECT u_users.organization_id FROM u_users
    WHERE u_users.auth_user_id = auth.uid()
    LIMIT 1
  )
);
