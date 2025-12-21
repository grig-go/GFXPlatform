-- Migration: Re-enable RLS on u_organizations with simple working policies
-- Organization list is not sensitive - all authenticated users can read
-- Only superusers can create/update/delete organizations

-- Re-enable RLS
ALTER TABLE u_organizations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "authenticated_select_u_organizations" ON u_organizations;
DROP POLICY IF EXISTS "select_u_organizations" ON u_organizations;
DROP POLICY IF EXISTS "org_select_u_organizations" ON u_organizations;
DROP POLICY IF EXISTS "superuser_insert_u_organizations" ON u_organizations;
DROP POLICY IF EXISTS "superuser_update_u_organizations" ON u_organizations;
DROP POLICY IF EXISTS "superuser_delete_u_organizations" ON u_organizations;

-- SELECT: All authenticated users can read all organizations
-- This is safe because org metadata (name, slug, domains) is not sensitive
CREATE POLICY "allow_authenticated_select" ON u_organizations
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only superusers can create organizations
CREATE POLICY "superuser_only_insert" ON u_organizations
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT is_superuser FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1) = true
);

-- UPDATE: Only superusers can update organizations
CREATE POLICY "superuser_only_update" ON u_organizations
FOR UPDATE
TO authenticated
USING (
  (SELECT is_superuser FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1) = true
);

-- DELETE: Only superusers can delete organizations
CREATE POLICY "superuser_only_delete" ON u_organizations
FOR DELETE
TO authenticated
USING (
  (SELECT is_superuser FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1) = true
);
