-- Debug and fix organization assignment for Pulsar-VS tables

-- First, let's see what organizations exist and assign to the first one if 'emergent' doesn't exist
DO $$
DECLARE
  target_org_id uuid;
  emergent_org_id uuid;
  first_org_id uuid;
  project_count int;
  playlist_count int;
BEGIN
  -- Try to find 'emergent' organization
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent' LIMIT 1;

  -- If not found, get the first organization
  IF emergent_org_id IS NULL THEN
    SELECT id INTO first_org_id FROM u_organizations ORDER BY created_at ASC LIMIT 1;
    target_org_id := first_org_id;
    RAISE NOTICE 'Emergent org not found, using first org: %', target_org_id;
  ELSE
    target_org_id := emergent_org_id;
    RAISE NOTICE 'Using emergent org: %', target_org_id;
  END IF;

  -- Update projects without organization_id
  IF target_org_id IS NOT NULL THEN
    UPDATE pulsarvs_projects
    SET organization_id = target_org_id
    WHERE organization_id IS NULL;

    GET DIAGNOSTICS project_count = ROW_COUNT;
    RAISE NOTICE 'Updated % projects with organization_id', project_count;

    UPDATE pulsarvs_playlists
    SET organization_id = target_org_id
    WHERE organization_id IS NULL;

    GET DIAGNOSTICS playlist_count = ROW_COUNT;
    RAISE NOTICE 'Updated % playlists with organization_id', playlist_count;
  ELSE
    RAISE WARNING 'No organizations found in database!';
  END IF;
END $$;

-- Also update any projects/playlists that might have wrong org_id
-- by assigning all of them to the first organization (for now)
UPDATE pulsarvs_projects
SET organization_id = (SELECT id FROM u_organizations ORDER BY created_at ASC LIMIT 1)
WHERE organization_id IS NULL
   OR organization_id NOT IN (SELECT id FROM u_organizations);

UPDATE pulsarvs_playlists
SET organization_id = (SELECT id FROM u_organizations ORDER BY created_at ASC LIMIT 1)
WHERE organization_id IS NULL
   OR organization_id NOT IN (SELECT id FROM u_organizations);
