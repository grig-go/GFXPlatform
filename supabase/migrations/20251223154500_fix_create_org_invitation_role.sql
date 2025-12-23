-- =============================================
-- Fix create_organization_with_seed to use 'admin' role for invitations
-- The u_invitations table check constraint only allows: admin, member, viewer
-- =============================================

-- Drop existing function and recreate with corrected role
DROP FUNCTION IF EXISTS create_organization_with_seed(TEXT, TEXT, TEXT[], TEXT, JSONB, JSONB);

CREATE OR REPLACE FUNCTION create_organization_with_seed(
  p_name TEXT,
  p_slug TEXT,
  p_allowed_domains TEXT[],
  p_admin_email TEXT,
  p_seed_config JSONB DEFAULT '{}',
  p_dashboard_config JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  new_org_id UUID;
  invitation_token TEXT;
  seed_result JSONB;
  dashboard_result JSONB;
BEGIN
  -- Check caller is superuser
  IF NOT EXISTS (SELECT 1 FROM u_users WHERE auth_user_id = auth.uid() AND is_superuser = true) THEN
    RAISE EXCEPTION 'Only superusers can create organizations';
  END IF;

  -- Validate slug uniqueness
  IF EXISTS (SELECT 1 FROM u_organizations WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'Organization slug already exists';
  END IF;

  -- Create organization
  INSERT INTO u_organizations (name, slug, allowed_domains)
  VALUES (p_name, p_slug, p_allowed_domains)
  RETURNING id INTO new_org_id;

  -- Seed data if config provided
  IF p_seed_config IS NOT NULL AND p_seed_config != '{}'::JSONB THEN
    seed_result := seed_organization_data(new_org_id, p_seed_config);
  ELSE
    seed_result := '{}'::JSONB;
  END IF;

  -- Seed dashboard data if config provided
  IF p_dashboard_config IS NOT NULL AND p_dashboard_config != '{}'::JSONB THEN
    dashboard_result := seed_dashboard_data(new_org_id, p_dashboard_config);
  ELSE
    dashboard_result := '{}'::JSONB;
  END IF;

  -- Create invitation for admin if email provided
  -- Note: Using 'admin' role as u_invitations check constraint doesn't allow 'owner'
  IF p_admin_email IS NOT NULL AND p_admin_email != '' THEN
    INSERT INTO u_invitations (email, organization_id, invited_by, role)
    VALUES (
      p_admin_email,
      new_org_id,
      (SELECT id FROM u_users WHERE auth_user_id = auth.uid()),
      'admin'  -- Changed from 'owner' to 'admin' to comply with check constraint
    )
    RETURNING token INTO invitation_token;
  END IF;

  RETURN jsonb_build_object(
    'organization_id', new_org_id,
    'slug', p_slug,
    'seed_result', seed_result,
    'dashboard_result', dashboard_result,
    'invitation_token', invitation_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_organization_with_seed(TEXT, TEXT, TEXT[], TEXT, JSONB, JSONB) TO authenticated;

COMMENT ON FUNCTION create_organization_with_seed(TEXT, TEXT, TEXT[], TEXT, JSONB, JSONB) IS 'Creates org with seed data, dashboard data, and admin invitation - superuser only';
