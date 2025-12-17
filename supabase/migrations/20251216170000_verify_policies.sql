-- Verify policies - this migration just checks and reports
DO $$
DECLARE
    pol RECORD;
    policy_count INTEGER := 0;
    storage_count INTEGER := 0;
    org_tex_count INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'POLICY VERIFICATION REPORT';
    RAISE NOTICE '========================================';

    -- Check storage.objects policies
    RAISE NOTICE '';
    RAISE NOTICE '--- STORAGE.OBJECTS POLICIES ---';
    FOR pol IN
        SELECT policyname, cmd
        FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: % | Command: %', pol.policyname, pol.cmd;
        storage_count := storage_count + 1;
    END LOOP;
    RAISE NOTICE 'Total storage.objects policies: %', storage_count;

    -- Check organization_textures policies
    RAISE NOTICE '';
    RAISE NOTICE '--- ORGANIZATION_TEXTURES POLICIES ---';
    FOR pol IN
        SELECT policyname, cmd
        FROM pg_policies
        WHERE tablename = 'organization_textures'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: % | Command: %', pol.policyname, pol.cmd;
        org_tex_count := org_tex_count + 1;
    END LOOP;
    RAISE NOTICE 'Total organization_textures policies: %', org_tex_count;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';

    -- Verify expected policies exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'storage_texures_select' AND tablename = 'objects') THEN
        RAISE WARNING 'MISSING: storage_texures_select';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'storage_texures_insert' AND tablename = 'objects') THEN
        RAISE WARNING 'MISSING: storage_texures_insert';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'storage_texures_update' AND tablename = 'objects') THEN
        RAISE WARNING 'MISSING: storage_texures_update';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'storage_texures_delete' AND tablename = 'objects') THEN
        RAISE WARNING 'MISSING: storage_texures_delete';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_textures_select' AND tablename = 'organization_textures') THEN
        RAISE WARNING 'MISSING: org_textures_select';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_textures_insert' AND tablename = 'organization_textures') THEN
        RAISE WARNING 'MISSING: org_textures_insert';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_textures_update' AND tablename = 'organization_textures') THEN
        RAISE WARNING 'MISSING: org_textures_update';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_textures_delete' AND tablename = 'organization_textures') THEN
        RAISE WARNING 'MISSING: org_textures_delete';
    END IF;

    RAISE NOTICE '✅ Verification complete';
END $$;
