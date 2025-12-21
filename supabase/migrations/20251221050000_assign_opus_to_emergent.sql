-- Assign Opus 4.5 provider to Emergent organization
UPDATE ai_providers
SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent')
WHERE id = 'claude-1766280009380'
  AND organization_id IS NULL;
