-- Migration: Final fix for u_organizations RLS
-- The issue is that SECURITY DEFINER functions are owned by the migration role,
-- not a superuser role that bypasses RLS.
--
-- Solution: Allow all authenticated users to SELECT from u_organizations
-- The table only contains non-sensitive org metadata (name, slug, domains)
-- Data isolation is enforced at the data table level (e_elections, etc.)

-- Drop all existing SELECT policies
DROP POLICY IF EXISTS "select_u_organizations" ON u_organizations;
DROP POLICY IF EXISTS "org_select_u_organizations" ON u_organizations;

-- Simple policy: All authenticated users can read all organizations
-- This is safe because:
-- 1. Organization list is not sensitive (like a company directory)
-- 2. Actual data isolation happens on data tables via organization_id
-- 3. Only superusers can INSERT/UPDATE/DELETE orgs (separate policies)
CREATE POLICY "authenticated_select_u_organizations" ON u_organizations
FOR SELECT
TO authenticated
USING (true);

-- Ensure INSERT/UPDATE/DELETE remain restricted to superusers
-- (These should already exist from previous migrations, but let's be safe)
DROP POLICY IF EXISTS "org_insert_u_organizations" ON u_organizations;
DROP POLICY IF EXISTS "org_update_u_organizations" ON u_organizations;
DROP POLICY IF EXISTS "org_delete_u_organizations" ON u_organizations;

CREATE POLICY "superuser_insert_u_organizations" ON u_organizations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM u_users WHERE auth_user_id = auth.uid() AND is_superuser = true)
);

CREATE POLICY "superuser_update_u_organizations" ON u_organizations
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM u_users WHERE auth_user_id = auth.uid() AND is_superuser = true)
);

CREATE POLICY "superuser_delete_u_organizations" ON u_organizations
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM u_users WHERE auth_user_id = auth.uid() AND is_superuser = true)
);
