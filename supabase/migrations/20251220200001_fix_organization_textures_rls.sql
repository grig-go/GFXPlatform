-- =====================================================
-- Migration: Fix organization_textures RLS policies
-- Consolidate all policies into a single simple policy
-- =====================================================

-- Drop ALL existing policies on organization_textures
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'organization_textures'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organization_textures', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE organization_textures ENABLE ROW LEVEL SECURITY;

-- Create a single simple policy for authenticated users
-- Using FOR ALL instead of separate policies to avoid conflicts
CREATE POLICY "organization_textures_authenticated_all"
ON organization_textures
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Verify
DO $$
BEGIN
    RAISE NOTICE '✅ organization_textures RLS policies cleaned up and consolidated';
END $$;
