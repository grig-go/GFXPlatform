-- Assign all agents to Emergent organization
UPDATE agents
SET organization_id = (SELECT id FROM u_organizations WHERE slug = 'emergent')
WHERE organization_id IS NULL;
