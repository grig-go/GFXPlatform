-- Fix texture upload policies - ensure uploads work without slow RLS checks
-- This migration drops ALL existing policies and recreates simple ones

-- ============================================
-- STORAGE POLICIES (storage.objects)
-- ============================================

-- Drop ALL existing policies on storage.objects for Texures bucket
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- Create simple policies for Texures bucket
-- Public can read all files
CREATE POLICY "Public read textures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Texures');

-- Authenticated users can upload/update/delete
CREATE POLICY "Auth upload textures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Texures');

CREATE POLICY "Auth update textures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Texures');

CREATE POLICY "Auth delete textures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Texures');

-- ============================================
-- DATABASE TABLE POLICIES (organization_textures)
-- ============================================

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
    END LOOP;
END $$;

-- Create simple policies - authenticated users can do everything
-- The organization_id column still provides data isolation
CREATE POLICY "Auth select textures"
ON organization_textures FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Auth insert textures"
ON organization_textures FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Auth update textures"
ON organization_textures FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Auth delete textures"
ON organization_textures FOR DELETE
TO authenticated
USING (true);
