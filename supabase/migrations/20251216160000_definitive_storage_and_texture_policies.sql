-- ============================================
-- DEFINITIVE STORAGE AND TEXTURE POLICIES
-- This is the FINAL migration for all texture/storage RLS
-- DO NOT create any more migrations touching these policies
-- ============================================

-- ============================================
-- PART 1: ENSURE BUCKET EXISTS AND IS PUBLIC
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'Texures',
  'Texures',
  true,
  52428800,  -- 50MB max file size
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- ============================================
-- PART 2: DROP ALL STORAGE.OBJECTS POLICIES FOR TEXURES
-- ============================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop ANY policy on storage.objects that references Texures
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
    LOOP
        -- Only drop if it's related to textures (to not affect other buckets)
        IF pol.policyname ILIKE '%texur%'
           OR pol.policyname ILIKE '%texture%'
           OR pol.policyname ILIKE '%upload%texture%'
           OR pol.policyname ILIKE '%public%read%'
           OR pol.policyname ILIKE '%auth%upload%'
           OR pol.policyname ILIKE '%auth%update%'
           OR pol.policyname ILIKE '%auth%delete%'
        THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
            RAISE NOTICE 'Dropped storage policy: %', pol.policyname;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- PART 3: CREATE DEFINITIVE STORAGE POLICIES
-- These are simple, fast policies with no subqueries
-- ============================================

-- Anyone can read files from Texures bucket (public bucket)
CREATE POLICY "storage_texures_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Texures');

-- Authenticated users can upload to Texures bucket
CREATE POLICY "storage_texures_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Texures');

-- Authenticated users can update files in Texures bucket
CREATE POLICY "storage_texures_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Texures');

-- Authenticated users can delete files from Texures bucket
CREATE POLICY "storage_texures_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Texures');

-- ============================================
-- PART 4: DROP ALL ORGANIZATION_TEXTURES POLICIES
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
-- PART 5: CREATE DEFINITIVE ORGANIZATION_TEXTURES POLICIES
-- Simple authenticated-only checks, no complex subqueries
-- ============================================

CREATE POLICY "org_textures_select"
ON organization_textures FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "org_textures_insert"
ON organization_textures FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "org_textures_update"
ON organization_textures FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "org_textures_delete"
ON organization_textures FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Definitive storage and texture policies applied';
    RAISE NOTICE 'Storage policies: storage_texures_select, storage_texures_insert, storage_texures_update, storage_texures_delete';
    RAISE NOTICE 'Table policies: org_textures_select, org_textures_insert, org_textures_update, org_textures_delete';
END $$;
