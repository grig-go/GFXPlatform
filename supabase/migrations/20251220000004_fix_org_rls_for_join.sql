-- Migration: Fix RLS policy for u_organizations to allow JOINs from u_users
-- The previous policy caused a circular dependency when doing:
--   SELECT * FROM u_users JOIN u_organizations ON ...
-- Because the RLS policy called get_user_organization_id() which queries u_users

-- Drop the existing policy
DROP POLICY IF EXISTS org_select_u_organizations ON u_organizations;

-- Create a new policy that checks if the organization is the user's org
-- This uses a direct subquery instead of the helper function to avoid circular dependency
CREATE POLICY org_select_u_organizations ON u_organizations FOR SELECT USING (
  -- User can see their own organization
  id IN (
    SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid()
  )
  OR
  -- Superusers can see all organizations
  EXISTS (
    SELECT 1 FROM u_users
    WHERE auth_user_id = auth.uid()
    AND is_superuser = true
  )
);

-- Note: INSERT, UPDATE, DELETE policies remain unchanged (superuser only)
