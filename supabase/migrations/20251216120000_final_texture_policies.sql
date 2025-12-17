-- Final cleanup of texture policies - ensure ONLY simple policies exist
-- This migration is idempotent and will clean up any duplicate policies

-- ============================================
-- STEP 1: DROP ALL STORAGE POLICIES FOR TEXURES BUCKET
-- ============================================

-- Drop all known policy names (from all previous migrations)
DROP POLICY IF EXISTS "Public read textures" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload textures" ON storage.objects;
DROP POLICY IF EXISTS "Auth update textures" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete textures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload textures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update textures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete textures" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for textures" ON storage.objects;

-- ============================================
-- STEP 2: CREATE SIMPLE STORAGE POLICIES
-- ============================================

-- Public can read all files in Texures bucket
CREATE POLICY "texures_public_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Texures');

-- Authenticated users can upload to Texures bucket
CREATE POLICY "texures_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Texures');

-- Authenticated users can update files in Texures bucket
CREATE POLICY "texures_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Texures');

-- Authenticated users can delete files in Texures bucket
CREATE POLICY "texures_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Texures');

-- ============================================
-- STEP 3: DROP ALL organization_textures POLICIES
-- ============================================

DROP POLICY IF EXISTS "Auth select textures" ON organization_textures;
DROP POLICY IF EXISTS "Auth insert textures" ON organization_textures;
DROP POLICY IF EXISTS "Auth update textures" ON organization_textures;
DROP POLICY IF EXISTS "Auth delete textures" ON organization_textures;
DROP POLICY IF EXISTS "Users can view org textures" ON organization_textures;
DROP POLICY IF EXISTS "Users can insert org textures" ON organization_textures;
DROP POLICY IF EXISTS "Users can update org textures" ON organization_textures;
DROP POLICY IF EXISTS "Users can delete org textures" ON organization_textures;
DROP POLICY IF EXISTS "Authenticated users can insert textures" ON organization_textures;
DROP POLICY IF EXISTS "Authenticated users can view textures" ON organization_textures;

-- ============================================
-- STEP 4: CREATE SIMPLE organization_textures POLICIES
-- ============================================

-- Authenticated users can read all textures
CREATE POLICY "org_textures_auth_select"
ON organization_textures FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert textures
CREATE POLICY "org_textures_auth_insert"
ON organization_textures FOR INSERT
TO authenticated
WITH CHECK (true);

-- Authenticated users can update textures
CREATE POLICY "org_textures_auth_update"
ON organization_textures FOR UPDATE
TO authenticated
USING (true);

-- Authenticated users can delete textures
CREATE POLICY "org_textures_auth_delete"
ON organization_textures FOR DELETE
TO authenticated
USING (true);
