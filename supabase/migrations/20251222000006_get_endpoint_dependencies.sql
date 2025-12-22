-- =============================================
-- Get Data Source Dependencies for API Endpoints
-- Returns the data_source IDs that an API endpoint depends on
-- =============================================

CREATE OR REPLACE FUNCTION get_api_endpoint_dependencies(p_endpoint_ids UUID[])
RETURNS TABLE (
  endpoint_id UUID,
  data_source_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT aes.endpoint_id, aes.data_source_id
  FROM api_endpoint_sources aes
  WHERE aes.endpoint_id = ANY(p_endpoint_ids)
    AND aes.data_source_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_api_endpoint_dependencies(UUID[]) TO authenticated;
