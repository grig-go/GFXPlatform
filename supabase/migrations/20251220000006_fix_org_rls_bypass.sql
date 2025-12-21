-- Migration: Fix u_organizations RLS by using SECURITY DEFINER functions
-- The issue is that RLS policies on u_organizations that query u_users
-- are themselves subject to RLS evaluation causing circular/empty results

-- Create a SECURITY DEFINER function to check superuser status
-- This bypasses RLS when checking the u_users table
CREATE OR REPLACE FUNCTION public.check_is_superuser()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_superuser FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1),
    false
  );
$$;

-- Create a SECURITY DEFINER function to get user's organization_id
CREATE OR REPLACE FUNCTION public.check_user_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_is_superuser() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_org_id() TO authenticated;

-- Drop existing policies on u_organizations
DROP POLICY IF EXISTS "select_u_organizations" ON u_organizations;
DROP POLICY IF EXISTS "org_select_u_organizations" ON u_organizations;

-- Create new SELECT policy using the SECURITY DEFINER functions
CREATE POLICY "select_u_organizations" ON u_organizations
FOR SELECT
TO authenticated
USING (
  -- Superusers can see all organizations
  public.check_is_superuser() = true
  OR
  -- Regular users can see their own organization
  id = public.check_user_org_id()
);
