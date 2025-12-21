-- Migration: Add Organization Support to Nova
-- Creates u_organizations table, u_invitations table, and adds org fields to u_users

-- ============================================================================
-- 1. CREATE U_ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS u_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  allowed_domains TEXT[] DEFAULT '{}',  -- Domains that can self-signup (e.g., ['emergent.new'])
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_u_organizations_slug ON u_organizations(slug);

-- Insert default Emergent organization
INSERT INTO u_organizations (name, slug, allowed_domains)
VALUES ('Emergent', 'emergent', ARRAY['emergent.new'])
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. ADD ORGANIZATION FIELDS TO U_USERS
-- ============================================================================

-- Add organization_id column (nullable initially for backfill)
ALTER TABLE u_users
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES u_organizations(id);

-- Add org_role column for organization-level role
ALTER TABLE u_users
ADD COLUMN IF NOT EXISTS org_role TEXT CHECK (org_role IN ('owner', 'admin', 'member', 'viewer'))
DEFAULT 'member';

-- Backfill existing users to Emergent organization
UPDATE u_users
SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent')
WHERE organization_id IS NULL;

-- Set existing superuser as owner
UPDATE u_users
SET org_role = 'owner'
WHERE is_superuser = true AND org_role = 'member';

-- Make organization_id NOT NULL after backfill
ALTER TABLE u_users ALTER COLUMN organization_id SET NOT NULL;

-- Add index for organization lookups
CREATE INDEX IF NOT EXISTS idx_u_users_organization_id ON u_users(organization_id);

-- ============================================================================
-- 3. CREATE U_INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS u_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES u_organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES u_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  token TEXT UNIQUE NOT NULL DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Only one pending invite per email per org
  CONSTRAINT unique_pending_u_invite UNIQUE (email, organization_id)
);

-- Index for fast token lookups (only pending invites)
CREATE INDEX IF NOT EXISTS idx_u_invitations_token ON u_invitations(token) WHERE accepted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_u_invitations_org ON u_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_u_invitations_email ON u_invitations(email);

-- ============================================================================
-- 4. RPC FUNCTIONS FOR INVITATION FLOW
-- ============================================================================

-- Validate invitation token and return org info
CREATE OR REPLACE FUNCTION validate_u_invitation_token(p_token TEXT)
RETURNS TABLE (
  invitation_id UUID,
  email TEXT,
  role TEXT,
  organization_id UUID,
  organization_name TEXT,
  organization_slug TEXT,
  expires_at TIMESTAMPTZ,
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Find the invitation
  SELECT i.*, o.name as org_name, o.slug as org_slug
  INTO v_invite
  FROM u_invitations i
  JOIN u_organizations o ON i.organization_id = o.id
  WHERE i.token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ,
      false, 'Invalid invitation token'::TEXT;
    RETURN;
  END IF;

  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN QUERY SELECT
      v_invite.id, v_invite.email, v_invite.role, v_invite.organization_id,
      v_invite.org_name, v_invite.org_slug, v_invite.expires_at,
      false, 'Invitation has already been accepted'::TEXT;
    RETURN;
  END IF;

  IF v_invite.expires_at < now() THEN
    RETURN QUERY SELECT
      v_invite.id, v_invite.email, v_invite.role, v_invite.organization_id,
      v_invite.org_name, v_invite.org_slug, v_invite.expires_at,
      false, 'Invitation has expired'::TEXT;
    RETURN;
  END IF;

  -- Valid invitation
  RETURN QUERY SELECT
    v_invite.id, v_invite.email, v_invite.role, v_invite.organization_id,
    v_invite.org_name, v_invite.org_slug, v_invite.expires_at,
    true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accept invitation and return org info for user creation
CREATE OR REPLACE FUNCTION accept_u_invitation(p_token TEXT, p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  organization_id UUID,
  org_role TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Validate the token first
  SELECT * INTO v_invite
  FROM u_invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Invalid or expired invitation'::TEXT;
    RETURN;
  END IF;

  -- Mark invitation as accepted
  UPDATE u_invitations
  SET accepted_at = now()
  WHERE id = v_invite.id;

  -- Return org info for user creation
  RETURN QUERY SELECT true, v_invite.organization_id, v_invite.role, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get or create organization based on email domain (for self-signup)
CREATE OR REPLACE FUNCTION get_org_for_email_domain(p_email TEXT)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  organization_slug TEXT,
  allowed BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_domain TEXT;
  v_org RECORD;
BEGIN
  -- Extract domain from email
  v_domain := lower(split_part(p_email, '@', 2));

  -- Find org with this allowed domain
  SELECT * INTO v_org
  FROM u_organizations
  WHERE v_domain = ANY(allowed_domains)
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_org.id, v_org.name, v_org.slug, true, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, false,
      'Email domain not allowed for self-signup. Please request an invitation.'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON u_organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON u_invitations TO authenticated;
GRANT ALL ON u_organizations TO service_role;
GRANT ALL ON u_invitations TO service_role;

-- Allow anon to validate invitations (for signup flow)
GRANT SELECT ON u_organizations TO anon;
GRANT SELECT ON u_invitations TO anon;

-- ============================================================================
-- 6. AUDIT TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS audit_u_organizations ON u_organizations;
CREATE TRIGGER audit_u_organizations
  AFTER INSERT OR UPDATE OR DELETE ON u_organizations
  FOR EACH ROW EXECUTE FUNCTION u_audit_trigger('system');

DROP TRIGGER IF EXISTS audit_u_invitations ON u_invitations;
CREATE TRIGGER audit_u_invitations
  AFTER INSERT OR UPDATE OR DELETE ON u_invitations
  FOR EACH ROW EXECUTE FUNCTION u_audit_trigger('system');
