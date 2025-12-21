-- Add thumbnails storage bucket and policies to Nova database
-- This bucket stores project thumbnail images

-- Create the thumbnails bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true, -- Public so thumbnails can be displayed without auth
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- Storage policies for thumbnails bucket

-- Allow public read access (for project lists)
CREATE POLICY "thumbnails_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Allow authenticated users to upload thumbnails
CREATE POLICY "thumbnails_insert_auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'thumbnails');

-- Allow authenticated users to update thumbnails
CREATE POLICY "thumbnails_update_auth"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'thumbnails');

-- Allow authenticated users to delete thumbnails
CREATE POLICY "thumbnails_delete_auth"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'thumbnails');

-- Allow anonymous read access (for Nova Player)
CREATE POLICY "thumbnails_select_anon"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'thumbnails');
