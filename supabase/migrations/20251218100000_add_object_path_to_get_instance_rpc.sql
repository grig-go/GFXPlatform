-- Migration: Add object_path to get_instance_by_channel RPC response
-- This ensures the object_path field from pulsar_connections is returned alongside set_manager_json

-- Drop the existing function first to ensure a clean replace
DROP FUNCTION IF EXISTS get_instance_by_channel(text);

CREATE OR REPLACE FUNCTION get_instance_by_channel(p_channel_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  connection_record record;
BEGIN
  -- Find the connection record by matching channel_name (which may include suffix like "_VirtualSet")
  SELECT * INTO connection_record
  FROM pulsar_connections
  WHERE channel_name ILIKE p_channel_name || '%'
     OR channel_name = p_channel_name
  ORDER BY updated_at DESC
  LIMIT 1;

  IF connection_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No instance found for channel: ' || p_channel_name
    );
  END IF;

  -- Build the response including object_path
  result := json_build_object(
    'success', true,
    'data', json_build_object(
      'id', connection_record.id,
      'friendly_name', connection_record.friendly_name,
      'channel_name', connection_record.channel_name,
      'rcp_name', connection_record.rcp_name,
      'set_manager_json', connection_record.set_manager_json,
      'project_type', connection_record.project_type,
      'object_path', connection_record.object_path,
      'created_at', connection_record.created_at,
      'updated_at', connection_record.updated_at
    )
  );

  RETURN result;
END;
$$;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION get_instance_by_channel(text) TO anon;
GRANT EXECUTE ON FUNCTION get_instance_by_channel(text) TO authenticated;
