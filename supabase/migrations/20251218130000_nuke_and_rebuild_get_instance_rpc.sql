-- Migration: Nuke and rebuild get_instance_by_channel
-- This migration will find and drop ALL versions of this function

DO $$
DECLARE
    r record;
BEGIN
    -- Find all functions named get_instance_by_channel in any schema
    FOR r IN
        SELECT n.nspname as schema, p.proname as name,
               pg_get_function_identity_arguments(p.oid) as args,
               p.oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_instance_by_channel'
    LOOP
        RAISE NOTICE 'Found function: %.%(%) - dropping', r.schema, r.name, r.args;
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s)', r.schema, r.name, r.args);
    END LOOP;
END $$;

-- Now create the correct function
CREATE OR REPLACE FUNCTION public.get_instance_by_channel(p_channel_name text)
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

-- Grant execute permission to roles
GRANT EXECUTE ON FUNCTION public.get_instance_by_channel(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_instance_by_channel(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_instance_by_channel(text) TO service_role;

-- Log the function that was created
DO $$
BEGIN
    RAISE NOTICE 'Created new public.get_instance_by_channel function with object_path support';
END $$;
