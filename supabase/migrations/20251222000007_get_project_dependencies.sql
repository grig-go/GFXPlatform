-- =============================================
-- Get GFX Project Dependencies
-- Returns all related table IDs that need to be copied with a project
-- =============================================

-- Get templates for selected projects
CREATE OR REPLACE FUNCTION get_gfx_project_templates(p_project_ids UUID[])
RETURNS TABLE (
  project_id UUID,
  template_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.project_id, t.id as template_id
  FROM gfx_templates t
  WHERE t.project_id = ANY(p_project_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_gfx_project_templates(UUID[]) TO authenticated;
