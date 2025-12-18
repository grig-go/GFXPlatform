-- Migration: Fix get_instance_by_channel RPC to include object_path
-- The previous migration didn't properly update the function, this one does a clean replace

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_instance_by_channel(text);

-- Recreate the function with object_path included
CREATE FUNCTION public.get_instance_by_channel(p_channel_name text)
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
GRANT EXECUTE ON FUNCTION public.get_instance_by_channel(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_instance_by_channel(text) TO authenticated;
