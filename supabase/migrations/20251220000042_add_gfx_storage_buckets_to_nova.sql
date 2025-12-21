-- =====================================================
-- Migration: Add GFX storage buckets to Nova database
-- These buckets are used by Nova-GFX and Pulsar apps
-- =====================================================

-- -------------------------------------------------
-- BUCKET: media
-- Used for banner and sponsor media assets
-- -------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- -------------------------------------------------
-- BUCKET: vsimages
-- Used for virtual set images
-- -------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vsimages',
  'vsimages',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- -------------------------------------------------
-- BUCKET: Texures
-- Used for GFX textures (note: keeping original typo)
-- -------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'Texures',
  'Texures',
  true,
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- -------------------------------------------------
-- STORAGE POLICIES: media bucket
-- -------------------------------------------------
CREATE POLICY "media_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

CREATE POLICY "media_insert_auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

CREATE POLICY "media_update_auth"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media');

CREATE POLICY "media_delete_auth"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media');

-- -------------------------------------------------
-- STORAGE POLICIES: vsimages bucket
-- -------------------------------------------------
CREATE POLICY "vsimages_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vsimages');

CREATE POLICY "vsimages_insert_auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vsimages');

CREATE POLICY "vsimages_update_auth"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vsimages');

CREATE POLICY "vsimages_delete_auth"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vsimages');

-- -------------------------------------------------
-- STORAGE POLICIES: Texures bucket
-- -------------------------------------------------
CREATE POLICY "texures_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Texures');

CREATE POLICY "texures_insert_auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Texures');

CREATE POLICY "texures_update_auth"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Texures');

CREATE POLICY "texures_delete_auth"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Texures');

-- -------------------------------------------------
-- ANONYMOUS ACCESS for Nova Player
-- Allow anonymous access to read from all buckets
-- (Nova Player needs to load textures without auth)
-- -------------------------------------------------
CREATE POLICY "media_select_anon"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'media');

CREATE POLICY "vsimages_select_anon"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'vsimages');

CREATE POLICY "texures_select_anon"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'Texures');
