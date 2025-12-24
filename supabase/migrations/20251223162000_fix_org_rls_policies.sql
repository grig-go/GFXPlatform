-- =============================================
-- Fix RLS policies that allow cross-organization data access
-- Remove overly permissive policies that conflict with org-based filtering
-- =============================================

-- Drop conflicting policies on agents
DROP POLICY IF EXISTS "Allow all for authenticated users" ON agents;

-- Drop conflicting policies on api_endpoints
DROP POLICY IF EXISTS "allow public all" ON api_endpoints;
DROP POLICY IF EXISTS "Users can view their own or active endpoints" ON api_endpoints;
DROP POLICY IF EXISTS "Users can create their own endpoints" ON api_endpoints;
DROP POLICY IF EXISTS "Users can update their own endpoints" ON api_endpoints;
DROP POLICY IF EXISTS "Users can delete their own endpoints" ON api_endpoints;
DROP POLICY IF EXISTS "Authenticated users can create api_endpoints" ON api_endpoints;

-- Drop conflicting policies on banner_schedules
DROP POLICY IF EXISTS "Users can delete banner schedules" ON banner_schedules;
DROP POLICY IF EXISTS "Users can update banner schedules" ON banner_schedules;
DROP POLICY IF EXISTS "Users can view banner schedules" ON banner_schedules;

-- Drop conflicting policies on channels (keep anon_select for public access to channel data)
-- Note: anon_select_channels is intentionally kept for public channel viewing

-- Drop conflicting policies on content
DROP POLICY IF EXISTS "Authenticated users - full access" ON content;

-- Drop conflicting policies on data_sources
DROP POLICY IF EXISTS "Authenticated users - full access" ON data_sources;
DROP POLICY IF EXISTS "allow public all" ON data_sources;
DROP POLICY IF EXISTS "Anyone can read active data sources" ON data_sources;
-- Keep anon_select_data_sources for public data source viewing

-- Drop conflicting policies on feeds
DROP POLICY IF EXISTS "Allow all for authenticated users" ON feeds;

-- Drop conflicting policies on sponsor_schedules
DROP POLICY IF EXISTS "Users can delete sponsor schedules" ON sponsor_schedules;
DROP POLICY IF EXISTS "Users can update sponsor schedules" ON sponsor_schedules;
DROP POLICY IF EXISTS "Users can view sponsor schedules" ON sponsor_schedules;

-- Drop conflicting policies on templates
DROP POLICY IF EXISTS "Authenticated users - full access" ON templates;
-- Keep anon_select_templates for public template viewing

-- Drop conflicting policies on weather_locations
DROP POLICY IF EXISTS "Allow service role to delete weather_locations" ON weather_locations;
DROP POLICY IF EXISTS "Allow service role to update weather_locations" ON weather_locations;
DROP POLICY IF EXISTS "allow_delete_weather_locations" ON weather_locations;

-- =============================================
-- Create proper org-based policies for tables that need them
-- =============================================

-- banner_schedules policies (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'banners')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'banner_schedules') THEN

    EXECUTE 'CREATE POLICY "org_select_banner_schedules" ON banner_schedules
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM banners b
          WHERE b.id = banner_schedules.banner_id
          AND (b.organization_id = get_user_organization_id() OR is_superuser())
        )
      )';

    EXECUTE 'CREATE POLICY "org_insert_banner_schedules" ON banner_schedules
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM banners b
          WHERE b.id = banner_schedules.banner_id
          AND (b.organization_id = get_user_organization_id() OR is_superuser())
        )
      )';

    EXECUTE 'CREATE POLICY "org_update_banner_schedules" ON banner_schedules
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM banners b
          WHERE b.id = banner_schedules.banner_id
          AND (b.organization_id = get_user_organization_id() OR is_superuser())
        )
      )';

    EXECUTE 'CREATE POLICY "org_delete_banner_schedules" ON banner_schedules
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM banners b
          WHERE b.id = banner_schedules.banner_id
          AND (b.organization_id = get_user_organization_id() OR is_superuser())
        )
      )';
  END IF;
END $$;

-- sponsor_schedules policies (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sponsors')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sponsor_schedules') THEN

    EXECUTE 'CREATE POLICY "org_select_sponsor_schedules" ON sponsor_schedules
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM sponsors s
          WHERE s.id = sponsor_schedules.sponsor_id
          AND (s.organization_id = get_user_organization_id() OR is_superuser())
        )
      )';

    EXECUTE 'CREATE POLICY "org_insert_sponsor_schedules" ON sponsor_schedules
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM sponsors s
          WHERE s.id = sponsor_schedules.sponsor_id
          AND (s.organization_id = get_user_organization_id() OR is_superuser())
        )
      )';

    EXECUTE 'CREATE POLICY "org_update_sponsor_schedules" ON sponsor_schedules
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM sponsors s
          WHERE s.id = sponsor_schedules.sponsor_id
          AND (s.organization_id = get_user_organization_id() OR is_superuser())
        )
      )';

    EXECUTE 'CREATE POLICY "org_delete_sponsor_schedules" ON sponsor_schedules
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM sponsors s
          WHERE s.id = sponsor_schedules.sponsor_id
          AND (s.organization_id = get_user_organization_id() OR is_superuser())
        )
      )';
  END IF;
END $$;

-- content policies (if organization_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content' AND column_name = 'organization_id'
  ) THEN
    EXECUTE 'CREATE POLICY "org_select_content" ON content
      FOR SELECT TO authenticated
      USING (organization_id = get_user_organization_id() OR is_superuser())';

    EXECUTE 'CREATE POLICY "org_insert_content" ON content
      FOR INSERT TO authenticated
      WITH CHECK (organization_id = get_user_organization_id() OR is_superuser())';

    EXECUTE 'CREATE POLICY "org_update_content" ON content
      FOR UPDATE TO authenticated
      USING (organization_id = get_user_organization_id() OR is_superuser())';

    EXECUTE 'CREATE POLICY "org_delete_content" ON content
      FOR DELETE TO authenticated
      USING (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
END $$;

-- feeds policies (if organization_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feeds' AND column_name = 'organization_id'
  ) THEN
    EXECUTE 'CREATE POLICY "org_select_feeds" ON feeds
      FOR SELECT TO authenticated
      USING (organization_id = get_user_organization_id() OR is_superuser())';

    EXECUTE 'CREATE POLICY "org_insert_feeds" ON feeds
      FOR INSERT TO authenticated
      WITH CHECK (organization_id = get_user_organization_id() OR is_superuser())';

    EXECUTE 'CREATE POLICY "org_update_feeds" ON feeds
      FOR UPDATE TO authenticated
      USING (organization_id = get_user_organization_id() OR is_superuser())';

    EXECUTE 'CREATE POLICY "org_delete_feeds" ON feeds
      FOR DELETE TO authenticated
      USING (organization_id = get_user_organization_id() OR is_superuser())';
  END IF;
END $$;
