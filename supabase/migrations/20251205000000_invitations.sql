-- Invitations table for user invite system
-- Allows emergent.new users to invite external users

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate pending invitations to same email for same org
  CONSTRAINT unique_pending_invite UNIQUE (email, organization_id)
    DEFERRABLE INITIALLY DEFERRED
);

-- Index for fast token lookups
CREATE INDEX idx_invitations_token ON invitations(token) WHERE accepted_at IS NULL;

-- Index for listing invitations by org
CREATE INDEX idx_invitations_org ON invitations(organization_id, created_at DESC);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invitations for their organization
CREATE POLICY "Users can view org invitations"
  ON invitations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Only emergent.new users can create invitations
CREATE POLICY "Emergent users can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    -- Must be an emergent.new user
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@emergent.new'
    )
    -- And must be inviting to their own org
    AND organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Only emergent.new users can update invitations (resend, revoke)
CREATE POLICY "Emergent users can update invitations"
  ON invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@emergent.new'
    )
    AND organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Only emergent.new users can delete invitations
CREATE POLICY "Emergent users can delete invitations"
  ON invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@emergent.new'
    )
    AND organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Function to validate invitation token (can be called without auth for signup)
CREATE OR REPLACE FUNCTION validate_invitation_token(invite_token TEXT)
RETURNS TABLE (
  invitation_id UUID,
  email TEXT,
  organization_id UUID,
  organization_name TEXT,
  role TEXT,
  is_valid BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id as invitation_id,
    i.email,
    i.organization_id,
    o.name as organization_name,
    i.role,
    CASE
      WHEN i.id IS NULL THEN FALSE
      WHEN i.accepted_at IS NOT NULL THEN FALSE
      WHEN i.expires_at < now() THEN FALSE
      ELSE TRUE
    END as is_valid,
    CASE
      WHEN i.id IS NULL THEN 'Invalid invitation token'
      WHEN i.accepted_at IS NOT NULL THEN 'Invitation already accepted'
      WHEN i.expires_at < now() THEN 'Invitation has expired'
      ELSE NULL
    END as error_message
  FROM invitations i
  LEFT JOIN organizations o ON o.id = i.organization_id
  WHERE i.token = invite_token;
END;
$$;

-- Function to accept invitation (called after user signs up)
CREATE OR REPLACE FUNCTION accept_invitation(invite_token TEXT, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Get and validate the invitation
  SELECT * INTO invite_record
  FROM invitations
  WHERE token = invite_token
    AND accepted_at IS NULL
    AND expires_at > now();

  IF invite_record.id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update user's organization and role
  UPDATE users
  SET organization_id = invite_record.organization_id,
      role = invite_record.role
  WHERE id = user_id;

  -- Mark invitation as accepted
  UPDATE invitations
  SET accepted_at = now()
  WHERE id = invite_record.id;

  RETURN TRUE;
END;
$$;

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION validate_invitation_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT, UUID) TO authenticated;
