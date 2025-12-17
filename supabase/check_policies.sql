-- Check all policies for storage and textures
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename IN ('objects', 'organization_textures')
ORDER BY tablename, policyname;
