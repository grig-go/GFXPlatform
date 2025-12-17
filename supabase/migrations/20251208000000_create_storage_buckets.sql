-- Create storage buckets for media assets
-- These buckets are used by the Pulsar frontend for banner/sponsor images and virtual set images

-- Create 'media' bucket for banner and sponsor media assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- Create 'vsimages' bucket for virtual set images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vsimages',
  'vsimages',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for 'media' bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads to media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates to media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media')
WITH CHECK (bucket_id = 'media');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes from media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media');

-- Allow public read access to media files
CREATE POLICY "Allow public read access to media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- RLS policies for 'vsimages' bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads to vsimages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vsimages');

-- Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates to vsimages"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vsimages')
WITH CHECK (bucket_id = 'vsimages');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes from vsimages"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vsimages');

-- Allow public read access to vsimages files
CREATE POLICY "Allow public read access to vsimages"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vsimages');
