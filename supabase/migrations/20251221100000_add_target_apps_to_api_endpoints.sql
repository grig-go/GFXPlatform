-- Add target_apps column to api_endpoints for specifying which apps the endpoint is built for
-- This is an array to support multi-select (an endpoint can target multiple apps)

ALTER TABLE api_endpoints
ADD COLUMN IF NOT EXISTS target_apps TEXT[] DEFAULT '{}';

-- Create index for fast filtering by target app
CREATE INDEX IF NOT EXISTS idx_api_endpoints_target_apps ON api_endpoints USING GIN (target_apps);

-- Add comment explaining the column
COMMENT ON COLUMN api_endpoints.target_apps IS 'Array of target apps this endpoint is built for. Values: nova-gfx, pulsar-vs, fusion, pulsar-mcr';

-- Create a function to query endpoints by target app with full payload info
CREATE OR REPLACE FUNCTION get_endpoints_by_target_app(p_target_app TEXT, p_organization_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  slug VARCHAR(255),
  description TEXT,
  endpoint_url TEXT,
  output_format VARCHAR(50),
  target_apps TEXT[],
  schema_config JSONB,
  sample_data JSONB,
  active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.id,
    ae.name,
    ae.slug,
    ae.description,
    '/api/' || ae.slug AS endpoint_url,
    ae.output_format,
    ae.target_apps,
    ae.schema_config,
    ae.sample_data,
    ae.active,
    ae.created_at,
    ae.updated_at
  FROM api_endpoints ae
  WHERE
    p_target_app = ANY(ae.target_apps)
    AND ae.active = true
    AND (p_organization_id IS NULL OR ae.organization_id = p_organization_id)
  ORDER BY ae.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_endpoints_by_target_app(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_endpoints_by_target_app(TEXT, UUID) TO anon;
