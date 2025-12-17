-- Ensure storage policies exist for Texures bucket
-- This migration recreates them if they were accidentally dropped

-- First, make sure the bucket exists (this is usually done via dashboard but just in case)
INSERT INTO storage.buckets (id, name, public)
VALUES ('Texures', 'Texures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "texures_public_select" ON storage.objects;
DROP POLICY IF EXISTS "texures_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "texures_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "texures_auth_delete" ON storage.objects;

-- Create simple storage policies
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

-- Also ensure organization_textures policies exist
DROP POLICY IF EXISTS "org_textures_auth_select" ON organization_textures;
DROP POLICY IF EXISTS "org_textures_auth_insert" ON organization_textures;
DROP POLICY IF EXISTS "org_textures_auth_update" ON organization_textures;
DROP POLICY IF EXISTS "org_textures_auth_delete" ON organization_textures;

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
