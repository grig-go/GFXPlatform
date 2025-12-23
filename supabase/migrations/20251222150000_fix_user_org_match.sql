-- Check if grig@emergent.new user has the right organization_id
-- and fix if needed

DO $$
DECLARE
  emergent_org_id uuid := 'c2563f52-a4e4-4592-8040-0508e6436d8c';
  grig_user_org uuid;
  grig_auth_id uuid;
BEGIN
  -- Find grig's auth_user_id and current organization_id
  SELECT u.auth_user_id, u.organization_id INTO grig_auth_id, grig_user_org
  FROM u_users u
  JOIN auth.users a ON u.auth_user_id = a.id
  WHERE a.email = 'grig@emergent.new';

  IF grig_auth_id IS NOT NULL THEN
    RAISE NOTICE 'Found grig user with auth_id: %, current org_id: %', grig_auth_id, grig_user_org;

    IF grig_user_org IS NULL OR grig_user_org != emergent_org_id THEN
      RAISE NOTICE 'Updating grig user org_id from % to %', grig_user_org, emergent_org_id;

      UPDATE u_users
      SET organization_id = emergent_org_id
      WHERE auth_user_id = grig_auth_id;

      RAISE NOTICE 'Updated!';
    ELSE
      RAISE NOTICE 'User org_id already matches emergent org';
    END IF;
  ELSE
    RAISE WARNING 'Could not find grig@emergent.new user';
  END IF;
END $$;
