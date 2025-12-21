-- Add organization support to ai_providers table
-- This allows each organization to have their own AI provider configurations

-- Add organization_id column to ai_providers (skip if exists)
ALTER TABLE ai_providers
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for faster lookups by organization
CREATE INDEX IF NOT EXISTS idx_ai_providers_organization_id ON ai_providers(organization_id);

-- Update RLS policies to include organization filtering

-- Drop existing policies
DROP POLICY IF EXISTS "ai_providers_select_policy" ON ai_providers;
DROP POLICY IF EXISTS "ai_providers_insert_policy" ON ai_providers;
DROP POLICY IF EXISTS "ai_providers_update_policy" ON ai_providers;
DROP POLICY IF EXISTS "ai_providers_delete_policy" ON ai_providers;
DROP POLICY IF EXISTS "Allow authenticated users to view ai_providers" ON ai_providers;
DROP POLICY IF EXISTS "Allow authenticated users to manage ai_providers" ON ai_providers;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON ai_providers;
DROP POLICY IF EXISTS "Allow service role full access" ON ai_providers;

-- Create new organization-aware RLS policies

-- Select: Users can see providers for their organization OR global providers (organization_id IS NULL)
CREATE POLICY "ai_providers_select_policy" ON ai_providers
FOR SELECT TO authenticated
USING (
  organization_id IS NULL
  OR organization_id IN (
    SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid()
  )
);

-- Insert: Org admins/owners can create providers for their organization
CREATE POLICY "ai_providers_insert_policy" ON ai_providers
FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM u_users
    WHERE auth_user_id = auth.uid()
    AND org_role IN ('owner', 'admin')
  )
);

-- Update: Org admins/owners can update providers for their organization
CREATE POLICY "ai_providers_update_policy" ON ai_providers
FOR UPDATE TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM u_users
    WHERE auth_user_id = auth.uid()
    AND org_role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM u_users
    WHERE auth_user_id = auth.uid()
    AND org_role IN ('owner', 'admin')
  )
);

-- Delete: Org admins/owners can delete providers for their organization
CREATE POLICY "ai_providers_delete_policy" ON ai_providers
FOR DELETE TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM u_users
    WHERE auth_user_id = auth.uid()
    AND org_role IN ('owner', 'admin')
  )
);

-- Comment explaining the organization support
COMMENT ON COLUMN ai_providers.organization_id IS 'Organization that owns this provider. NULL means global/shared provider.';
