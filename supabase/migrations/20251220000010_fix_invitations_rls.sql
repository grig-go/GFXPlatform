-- Migration: Fix u_invitations RLS policies
-- Allow org admins and superusers to manage invitations for their organization

-- Re-enable RLS (in case it was disabled)
ALTER TABLE u_invitations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "org_select_u_invitations" ON u_invitations;
DROP POLICY IF EXISTS "org_insert_u_invitations" ON u_invitations;
DROP POLICY IF EXISTS "org_update_u_invitations" ON u_invitations;
DROP POLICY IF EXISTS "org_delete_u_invitations" ON u_invitations;
DROP POLICY IF EXISTS "select_u_invitations" ON u_invitations;
DROP POLICY IF EXISTS "insert_u_invitations" ON u_invitations;
DROP POLICY IF EXISTS "update_u_invitations" ON u_invitations;
DROP POLICY IF EXISTS "delete_u_invitations" ON u_invitations;

-- SELECT: Org admins/owners can see their org's invitations, superusers can see all
CREATE POLICY "select_u_invitations" ON u_invitations
FOR SELECT
TO authenticated
USING (
  -- Superusers can see all
  (SELECT is_superuser FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1) = true
  OR
  -- Org admins/owners can see their org's invitations
  (
    organization_id = (SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1)
    AND (SELECT org_role FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1) IN ('owner', 'admin')
  )
);

-- INSERT: Org admins/owners can create invitations for their org, superusers can create for any org
CREATE POLICY "insert_u_invitations" ON u_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  -- Superusers can create for any org
  (SELECT is_superuser FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1) = true
  OR
  -- Org admins/owners can only create for their own org
  (
    organization_id = (SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1)
    AND (SELECT org_role FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1) IN ('owner', 'admin')
  )
);

-- UPDATE: Org admins/owners can update their org's invitations, superusers can update any
CREATE POLICY "update_u_invitations" ON u_invitations
FOR UPDATE
TO authenticated
USING (
  (SELECT is_superuser FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1) = true
  OR
  (
    organization_id = (SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1)
    AND (SELECT org_role FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1) IN ('owner', 'admin')
  )
);

-- DELETE: Org admins/owners can delete their org's invitations, superusers can delete any
CREATE POLICY "delete_u_invitations" ON u_invitations
FOR DELETE
TO authenticated
USING (
  (SELECT is_superuser FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1) = true
  OR
  (
    organization_id = (SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1)
    AND (SELECT org_role FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1) IN ('owner', 'admin')
  )
);
