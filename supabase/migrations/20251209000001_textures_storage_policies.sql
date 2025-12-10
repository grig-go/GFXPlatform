-- Storage policies for the "Texures" bucket
-- Note: The bucket name is "Texures" (without the second 't')

-- Allow authenticated users to upload files to their organization's folder
CREATE POLICY "Authenticated users can upload textures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Texures');

-- Allow public read access to all textures (for displaying in UI)
CREATE POLICY "Public read access for textures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'Texures');

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update textures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Texures');

-- Allow authenticated users to delete files from their organization's folder
CREATE POLICY "Authenticated users can delete textures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Texures');
