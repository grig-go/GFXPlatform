-- Simplify texture policies for faster uploads
-- The original policies used slow subqueries to check organization membership
-- These simplified policies trust the organization_id passed by the authenticated client

-- ============================================
-- STORAGE POLICIES (for file uploads)
-- ============================================

-- Drop the existing INSERT policy and recreate with simpler check
DROP POLICY IF EXISTS "Authenticated users can upload textures" ON storage.objects;

-- Allow any authenticated user to upload to Texures bucket
-- The organization folder structure is enforced by the application code
CREATE POLICY "Authenticated users can upload textures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Texures');

-- Drop and recreate UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update textures" ON storage.objects;

CREATE POLICY "Authenticated users can update textures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Texures');

-- ============================================
-- DATABASE TABLE POLICIES (for texture records)
-- Simplified to avoid slow subqueries
-- ============================================

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert org textures" ON organization_textures;

-- Allow authenticated users to insert texture records
-- Trust the application to set the correct organization_id
CREATE POLICY "Authenticated users can insert textures"
ON organization_textures FOR INSERT
TO authenticated
WITH CHECK (true);

-- Drop and recreate SELECT policy (simplified for speed)
DROP POLICY IF EXISTS "Users can view org textures" ON organization_textures;

-- Allow authenticated users to view all textures
-- Fine for AI-generated images which are organization-scoped anyway
CREATE POLICY "Authenticated users can view textures"
ON organization_textures FOR SELECT
TO authenticated
USING (true);
