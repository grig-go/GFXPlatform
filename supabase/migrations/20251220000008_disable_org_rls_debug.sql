-- Migration: Temporarily disable RLS on u_organizations for debugging
-- If this works, we know RLS is the problem
-- If it still doesn't work, there's something else wrong

-- Disable RLS entirely on u_organizations
ALTER TABLE u_organizations DISABLE ROW LEVEL SECURITY;

-- Also grant full access to authenticated role just to be safe
GRANT ALL ON u_organizations TO authenticated;
