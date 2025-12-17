-- DEFINITIVE cleanup - drop ALL policies and recreate only simple ones
-- This ensures no duplicate or conflicting policies exist

-- ============================================
-- STEP 1: DROP ALL STORAGE.OBJECTS POLICIES (aggressive cleanup)
-- ============================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname ILIKE '%textur%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
        RAISE NOTICE 'Dropped storage policy: %', pol.policyname;
    END LOOP;
END $$;

-- Also drop by specific known names (in case ILIKE missed any)
DROP POLICY IF EXISTS "texures_public_select" ON storage.objects;
DROP POLICY IF EXISTS "texures_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "texures_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "texures_auth_delete" ON storage.objects;

-- ============================================
-- STEP 2: CREATE SIMPLE STORAGE POLICIES
-- ============================================

CREATE POLICY "texures_public_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Texures');

CREATE POLICY "texures_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Texures');

CREATE POLICY "texures_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Texures');

CREATE POLICY "texures_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Texures');

-- ============================================
-- STEP 3: DROP ALL ORGANIZATION_TEXTURES POLICIES
-- ============================================
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
        RAISE NOTICE 'Dropped org_textures policy: %', pol.policyname;
    END LOOP;
END $$;

-- ============================================
-- STEP 4: CREATE SIMPLE ORGANIZATION_TEXTURES POLICIES
-- ============================================

CREATE POLICY "org_textures_auth_select"
ON organization_textures FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "org_textures_auth_insert"
ON organization_textures FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "org_textures_auth_update"
ON organization_textures FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "org_textures_auth_delete"
ON organization_textures FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- VERIFICATION: List final policies
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '=== FINAL STORAGE POLICIES FOR TEXURES ===';
END $$;
