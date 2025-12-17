-- Restore storage policies for the "thumbnails" bucket
-- These were inadvertently dropped by the 20251216160000 migration

-- First, drop any existing thumbnail policies to avoid conflicts
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname ILIKE '%thumbnail%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
        RAISE NOTICE 'Dropped existing thumbnail policy: %', pol.policyname;
    END LOOP;
END $$;

-- Allow public read access to all thumbnails (for displaying in project list)
CREATE POLICY "thumbnails_public_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Allow authenticated users to upload thumbnails
CREATE POLICY "thumbnails_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'thumbnails');

-- Allow authenticated users to update thumbnails (upsert)
CREATE POLICY "thumbnails_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'thumbnails');

-- Allow authenticated users to delete thumbnails
CREATE POLICY "thumbnails_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'thumbnails');

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Thumbnails storage policies restored';
    RAISE NOTICE 'Policies: thumbnails_public_select, thumbnails_auth_insert, thumbnails_auth_update, thumbnails_auth_delete';
END $$;
