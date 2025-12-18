-- Migration: Email Domain-Based Organization Matching
-- This ensures users with the same email domain (e.g., @emergent.new) are placed in the same organization

-- ============================================
-- 1. Add allowed_domains column to organizations
-- ============================================

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS allowed_domains TEXT[] DEFAULT '{}';

-- Create index for efficient domain lookups
CREATE INDEX IF NOT EXISTS idx_organizations_allowed_domains
ON organizations USING GIN (allowed_domains);

-- ============================================
-- 2. Create function to find or create organization by email domain
-- ============================================

CREATE OR REPLACE FUNCTION get_or_create_org_for_email(
  user_email TEXT,
  user_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  org_id UUID,
  org_name TEXT,
  org_slug TEXT,
  is_new BOOLEAN
) AS $$
DECLARE
  email_domain TEXT;
  found_org_id UUID;
  found_org_name TEXT;
  found_org_slug TEXT;
  new_org_slug TEXT;
  new_org_name TEXT;
  slug_suffix INTEGER := 0;
  temp_slug TEXT;
BEGIN
  -- Extract domain from email (everything after @)
  email_domain := LOWER(SUBSTRING(user_email FROM POSITION('@' IN user_email) + 1));

  -- Look for existing organization with this domain in allowed_domains
  SELECT o.id, o.name, o.slug INTO found_org_id, found_org_name, found_org_slug
  FROM organizations o
  WHERE o.allowed_domains @> ARRAY[email_domain]
  LIMIT 1;

  IF found_org_id IS NOT NULL THEN
    -- Found existing organization for this domain
    RETURN QUERY SELECT found_org_id, found_org_name, found_org_slug, FALSE;
    RETURN;
  END IF;

  -- No existing org found, create a new one
  -- Generate org name based on domain
  new_org_name := INITCAP(REPLACE(SPLIT_PART(email_domain, '.', 1), '-', ' ')) || ' Organization';

  -- Generate unique slug from domain
  new_org_slug := LOWER(REPLACE(REPLACE(email_domain, '.', '-'), '@', ''));

  -- Check if slug exists and make it unique if needed
  LOOP
    IF slug_suffix = 0 THEN
      temp_slug := new_org_slug;
    ELSE
      temp_slug := new_org_slug || '-' || slug_suffix;
    END IF;

    -- Check if this slug already exists
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE slug = temp_slug) THEN
      new_org_slug := temp_slug;
      EXIT;
    END IF;

    slug_suffix := slug_suffix + 1;

    -- Safety limit
    IF slug_suffix > 100 THEN
      new_org_slug := new_org_slug || '-' || gen_random_uuid()::TEXT;
      EXIT;
    END IF;
  END LOOP;

  -- Create the new organization with this domain in allowed_domains
  INSERT INTO organizations (name, slug, allowed_domains, settings)
  VALUES (new_org_name, new_org_slug, ARRAY[email_domain], '{}')
  RETURNING id, name, slug INTO found_org_id, found_org_name, found_org_slug;

  RETURN QUERY SELECT found_org_id, found_org_name, found_org_slug, TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Update existing emergent.new organizations
-- ============================================

-- First, find the first emergent.new organization (or create one if none exists)
DO $$
DECLARE
  emergent_org_id UUID;
  emergent_org_slug TEXT;
BEGIN
  -- Find if there's already an org with emergent.new in allowed_domains
  SELECT id INTO emergent_org_id
  FROM organizations
  WHERE allowed_domains @> ARRAY['emergent.new']
  LIMIT 1;

  -- If not found, look for an org that looks like it was created by an emergent.new user
  IF emergent_org_id IS NULL THEN
    -- Find an org where there's an emergent.new user as owner
    SELECT o.id INTO emergent_org_id
    FROM organizations o
    JOIN users u ON u.organization_id = o.id
    WHERE u.email LIKE '%@emergent.new'
      AND u.role = 'owner'
    ORDER BY o.created_at ASC
    LIMIT 1;

    -- If found, update its allowed_domains to include emergent.new
    IF emergent_org_id IS NOT NULL THEN
      UPDATE organizations
      SET allowed_domains = ARRAY['emergent.new'],
          name = 'Emergent Organization'
      WHERE id = emergent_org_id;

      RAISE NOTICE 'Updated organization % to be the emergent.new organization', emergent_org_id;
    END IF;
  END IF;

  -- If we found/created an emergent org, move all emergent.new users to it
  IF emergent_org_id IS NOT NULL THEN
    -- Update all emergent.new users to be in this organization
    -- but keep the first user as owner, others become members
    UPDATE users
    SET organization_id = emergent_org_id,
        role = CASE
          WHEN id = (
            SELECT id FROM users
            WHERE email LIKE '%@emergent.new'
            ORDER BY created_at ASC
            LIMIT 1
          ) THEN 'owner'
          ELSE 'member'
        END
    WHERE email LIKE '%@emergent.new'
      AND (organization_id IS NULL OR organization_id != emergent_org_id);

    RAISE NOTICE 'Moved all emergent.new users to organization %', emergent_org_id;
  END IF;
END $$;

-- ============================================
-- 4. Grant execute permission on the function
-- ============================================

GRANT EXECUTE ON FUNCTION get_or_create_org_for_email(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_org_for_email(TEXT, TEXT) TO anon;
