-- =====================================================
-- DEV ORGANIZATION SETUP
-- Creates EmergentDev organization for dev testing
-- =====================================================

-- Create the dev organization if it doesn't exist
INSERT INTO organizations (id, name, slug)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'EmergentDev',
    'emergent-dev'
)
ON CONFLICT (id) DO NOTHING;

-- Update all projects without organization_id to use the dev org
UPDATE gfx_projects
SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;
