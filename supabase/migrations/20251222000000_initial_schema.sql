-- ============================================
-- NOVAGGFX PLATFORM - INITIAL SCHEMA
-- ============================================
-- Generated from Supabase Cloud: bgkjcngrslxyqjitksim
-- Date: 2025-12-22
--
-- This is the complete schema for the NovaGFX platform including:
-- - Nova dashboard tables (users, organizations, elections, weather, etc.)
-- - Nova-GFX tables (projects, templates, elements, layers, keyframes)
-- - Pulsar tables (channels, pages, playlists, playout log)
-- - All RLS policies and functions
-- ============================================




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

DO $$ BEGIN
  CREATE TYPE "public"."ai_injector_feature" AS ENUM (
    'outliers',
    'summary',
    'correlation',
    'sentiment',
    'fullscreen',
    'camera_angle',
    'point_of_view',
    'scene_considerations',
    'airport_instructions'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


ALTER TYPE "public"."ai_injector_feature" OWNER TO "postgres";


DO $$ BEGIN
  CREATE TYPE "public"."map_style_type" AS ENUM (
    'light',
    'dark',
    'satellite'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


ALTER TYPE "public"."map_style_type" OWNER TO "postgres";


DO $$ BEGIN
  CREATE TYPE "public"."projection_type" AS ENUM (
    'mercator',
    'globe',
    'equirectangular'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


ALTER TYPE "public"."projection_type" OWNER TO "postgres";


DO $$ BEGIN
  CREATE TYPE "public"."pulsarvs_playlist_item_type" AS ENUM (
    'page',
    'group',
    'media'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


ALTER TYPE "public"."pulsarvs_playlist_item_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_normalize_custom_name"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    new.custom_name := nullif(btrim(new.custom_name), '');
    if new.custom_name is not null and length(new.custom_name) > 80 then
      new.custom_name := left(new.custom_name, 80);
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."_normalize_custom_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_u_invitation"("p_token" "text", "p_user_id" "uuid") RETURNS TABLE("success" boolean, "organization_id" "uuid", "org_role" "text", "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Validate the token first
  SELECT * INTO v_invite
  FROM u_invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Invalid or expired invitation'::TEXT;
    RETURN;
  END IF;

  -- Mark invitation as accepted
  UPDATE u_invitations
  SET accepted_at = now()
  WHERE id = v_invite.id;

  -- Return org info for user creation
  RETURN QUERY SELECT true, v_invite.organization_id, v_invite.role, NULL::TEXT;
END;
$$;


ALTER FUNCTION "public"."accept_u_invitation"("p_token" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_sync_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only calculate if it's a file type with sync enabled
  IF NEW.type = 'file' 
     AND (NEW.sync_config->>'enabled')::boolean = true 
     AND NEW.active = true THEN
    
    -- If sync was just enabled or interval changed
    IF (OLD.sync_config->>'enabled')::boolean IS DISTINCT FROM true
       OR (OLD.sync_config->>'interval')::int IS DISTINCT FROM (NEW.sync_config->>'interval')::int
       OR NEW.next_sync_at IS NULL THEN
      
      -- Set next sync time based on interval
      NEW.next_sync_at = NOW() + ((NEW.sync_config->>'interval')::int || ' minutes')::interval;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_next_sync_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_trigger_syncs"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    integration record;
    supabase_url text;
    anon_key text;
    function_name text;
    response record;
    interval_seconds integer;
    time_since_last_sync interval;
    is_due boolean;
BEGIN
    -- Get configuration
    SELECT value INTO supabase_url FROM sync_config WHERE key = 'supabase_url';
    SELECT value INTO anon_key FROM sync_config WHERE key = 'anon_key';
    
    IF anon_key IS NULL OR supabase_url IS NULL THEN
        RAISE WARNING 'Missing configuration. Please set supabase_url and anon_key in sync_config table.';
        RETURN;
    END IF;
    
    -- Process each active integration with sync enabled
    FOR integration IN 
        SELECT 
            id, 
            name, 
            type,
            sync_config,
            last_sync_at,
            next_sync_at,
            sync_status,
            -- Calculate interval in seconds for comparison
            CASE 
                WHEN (sync_config->>'intervalUnit') = 'seconds' THEN
                    (sync_config->>'interval')::integer
                WHEN (sync_config->>'intervalUnit') = 'minutes' THEN
                    (sync_config->>'interval')::integer * 60
                WHEN (sync_config->>'intervalUnit') = 'hours' THEN
                    (sync_config->>'interval')::integer * 3600
                WHEN (sync_config->>'intervalUnit') = 'days' THEN
                    (sync_config->>'interval')::integer * 86400
                ELSE 3600  -- Default to 1 hour
            END as interval_seconds
        FROM data_sources
        WHERE active = true
        AND (sync_config->>'enabled')::boolean = true
        AND sync_status != 'running'  -- Skip already running syncs
    LOOP
        -- Check if sync is due
        IF integration.next_sync_at IS NOT NULL THEN
            -- Use next_sync_at if available
            is_due := NOW() >= integration.next_sync_at;
        ELSIF integration.last_sync_at IS NULL THEN
            -- Never synced before
            is_due := true;
            RAISE NOTICE '[%] % never synced before - triggering initial sync', 
                        NOW()::time, integration.name;
        ELSE
            -- Calculate based on last_sync_at and interval
            time_since_last_sync := NOW() - integration.last_sync_at;
            is_due := EXTRACT(EPOCH FROM time_since_last_sync) >= integration.interval_seconds;
        END IF;
        
        IF is_due THEN
            RAISE NOTICE '[%] Triggering sync for % (type: %)', 
                        NOW()::time, integration.name, integration.type;
        END IF;
        
        -- Trigger sync if due
        IF is_due THEN
            BEGIN
                -- Determine the edge function to call based on type
                function_name := format('sync-%s-integration', integration.type);
                
                -- Update status to running
                UPDATE data_sources 
                SET sync_status = 'running',
                    updated_at = NOW()
                WHERE id = integration.id;
                
                -- Call the edge function via HTTP
                SELECT * INTO response FROM net.http_post(
                    url := format('%s/functions/v1/%s', supabase_url, function_name),
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || anon_key
                    )::jsonb,
                    body := jsonb_build_object(
                        'dataSourceId', integration.id::text,
                        'force', false
                    )::jsonb
                );
                
                -- Handle response
                IF response.status_code BETWEEN 200 AND 299 THEN
                    -- Success - update sync information
                    UPDATE data_sources 
                    SET 
                        last_sync_at = NOW(),
                        sync_status = 'success',
                        next_sync_at = NOW() + 
                            CASE 
                                WHEN (sync_config->>'intervalUnit') = 'seconds' THEN
                                    format('%s seconds', sync_config->>'interval')::interval
                                WHEN (sync_config->>'intervalUnit') = 'minutes' THEN
                                    format('%s minutes', sync_config->>'interval')::interval
                                WHEN (sync_config->>'intervalUnit') = 'hours' THEN
                                    format('%s hours', sync_config->>'interval')::interval
                                WHEN (sync_config->>'intervalUnit') = 'days' THEN
                                    format('%s days', sync_config->>'interval')::interval
                                ELSE INTERVAL '1 hour'
                            END,
                        last_sync_result = response.body::jsonb,
                        last_sync_count = COALESCE((response.body::jsonb->>'itemsProcessed')::integer, 0),
                        last_sync_error = NULL,  -- Clear any previous error
                        updated_at = NOW()
                    WHERE id = integration.id;
                    
                    RAISE NOTICE 'Successfully synced % - Status: %', 
                                integration.name, response.status_code;
                ELSE
                    -- Error - update with error information
                    UPDATE data_sources 
                    SET 
                        sync_status = 'error',
                        last_sync_error = format('HTTP %s: %s', 
                                               response.status_code, 
                                               LEFT(response.body::text, 500)),  -- Limit error message length
                        updated_at = NOW()
                    WHERE id = integration.id;
                    
                    RAISE WARNING 'Sync failed for % - HTTP %', 
                                integration.name, response.status_code;
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                -- Handle any exceptions during sync
                RAISE WARNING 'Error syncing %: %', integration.name, SQLERRM;
                
                UPDATE data_sources 
                SET sync_status = 'error',
                    last_sync_error = LEFT(SQLERRM, 500),  -- Limit error message length
                    updated_at = NOW()
                WHERE id = integration.id;
            END;
        END IF;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."check_and_trigger_syncs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_is_superuser"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT is_superuser FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1),
    false
  );
$$;


ALTER FUNCTION "public"."check_is_superuser"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_pg_net_request"("request_id" bigint) RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    response_record RECORD;
    pending_record RECORD;
BEGIN
    -- Check _http_response table
    SELECT * INTO response_record
    FROM net._http_response
    WHERE id = request_id;
    
    -- Check http_request_queue (pending requests)
    SELECT * INTO pending_record
    FROM net.http_request_queue
    WHERE id = request_id;
    
    RETURN json_build_object(
        'request_id', request_id,
        'response_exists', response_record IS NOT NULL,
        'response_status', response_record.status_code,
        'response_created', response_record.created,
        'pending_exists', pending_record IS NOT NULL,
        'pending_status', pending_record.status,
        'pending_created', pending_record.created
    );
END;
$$;


ALTER FUNCTION "public"."check_pg_net_request"("request_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_sync_intervals_detailed"() RETURNS TABLE("data_source_id" "uuid", "name" "text", "sync_enabled" boolean, "interval_value" integer, "interval_unit" "text", "interval_string" "text", "check_time" timestamp with time zone, "next_sync_calculated" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.id,
        ds.name::TEXT,  -- Cast VARCHAR to TEXT
        COALESCE((ds.sync_config->>'enabled')::boolean, true) as sync_enabled,
        COALESCE((ds.sync_config->>'interval')::INTEGER, 60) as interval_value,
        COALESCE(ds.sync_config->>'intervalUnit', 'minutes')::TEXT as interval_unit,  -- Cast to TEXT
        (COALESCE((ds.sync_config->>'interval')::INTEGER, 60) || ' ' || 
            COALESCE(ds.sync_config->>'intervalUnit', 'minutes'))::TEXT as interval_string,  -- Cast to TEXT
        NOW() as check_time,
        NOW() + (
            COALESCE((ds.sync_config->>'interval')::INTEGER, 60) || ' ' || 
            COALESCE(ds.sync_config->>'intervalUnit', 'minutes')
        )::INTERVAL as next_sync_calculated
    FROM data_sources ds
    WHERE ds.type = 'file'
    AND ds.active = true
    ORDER BY ds.name;
END;
$$;


ALTER FUNCTION "public"."check_sync_intervals_detailed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_sync_results"() RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    recent_response RECORD;
    recent_items INTEGER;
    queue_stats json;
BEGIN
    -- Get most recent Edge Function response
    SELECT * INTO recent_response
    FROM net._http_response
    WHERE content::text LIKE '%processed%'
    ORDER BY id DESC
    LIMIT 1;
    
    -- Count recently created items
    SELECT COUNT(*) INTO recent_items
    FROM content
    WHERE type = 'item'
    AND created_at > NOW() - INTERVAL '10 minutes';
    
    -- Get queue stats
    SELECT json_object_agg(status, count) INTO queue_stats
    FROM (
        SELECT status, COUNT(*) as count
        FROM file_sync_queue
        GROUP BY status
    ) s;
    
    RETURN json_build_object(
        'last_sync_response', recent_response.content::json,
        'recent_items_created', recent_items,
        'queue_status', queue_stats,
        'last_sync_time', recent_response.created
    );
END;
$$;


ALTER FUNCTION "public"."check_sync_results"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_org_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT organization_id FROM u_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."check_user_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_log_tables"() RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    debug_log_deleted INTEGER := 0;
    sync_logs_deleted INTEGER := 0;
    sync_logs_old_deleted INTEGER := 0;
    queue_deleted INTEGER := 0;
BEGIN
    -- Clean debug_log table
    -- Keep only last 3 days of debug logs
    DELETE FROM debug_log
    WHERE created_at < NOW() - INTERVAL '3 days';
    GET DIAGNOSTICS debug_log_deleted = ROW_COUNT;
    
    -- Clean data_source_sync_logs table
    -- Keep last 7 days of error logs, 1 day of success logs
    DELETE FROM data_source_sync_logs
    WHERE (status = 'success' AND created_at < NOW() - INTERVAL '1 day')
       OR (status = 'error' AND created_at < NOW() - INTERVAL '7 days')
       OR (status = 'debug' AND created_at < NOW() - INTERVAL '1 day');
    GET DIAGNOSTICS sync_logs_deleted = ROW_COUNT;
    
    -- Also clean very old logs regardless of status (30 days)
    DELETE FROM data_source_sync_logs
    WHERE created_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS sync_logs_old_deleted = ROW_COUNT;
    
    -- Clean old completed items from file_sync_queue
    DELETE FROM file_sync_queue
    WHERE status = 'completed'
    AND processed_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS queue_deleted = ROW_COUNT;
    
    -- Log the cleanup action itself (but this will be cleaned up in future runs)
    INSERT INTO data_source_sync_logs (status, error_message)
    VALUES ('success', format('Cleanup: deleted %s debug logs, %s sync logs, %s old sync logs, %s queue items',
                              debug_log_deleted, sync_logs_deleted, sync_logs_old_deleted, queue_deleted));
    
    RETURN json_build_object(
        'debug_log_deleted', debug_log_deleted,
        'sync_logs_deleted', sync_logs_deleted,
        'sync_logs_old_deleted', sync_logs_old_deleted,
        'queue_deleted', queue_deleted,
        'total_deleted', debug_log_deleted + sync_logs_deleted + sync_logs_old_deleted + queue_deleted
    );
END;
$$;


ALTER FUNCTION "public"."cleanup_log_tables"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_agent_runs"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_deleted INT;
BEGIN
  WITH runs_to_keep AS (
    SELECT id
    FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY agent_id ORDER BY started_at DESC) as rn
      FROM agent_runs
    ) ranked
    WHERE rn <= 1000
  )
  DELETE FROM agent_runs
  WHERE id NOT IN (SELECT id FROM runs_to_keep);
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_agent_runs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_agent_runs"() IS 'Removes old agent run records, keeping last 1000 per agent';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_drafts"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Delete drafts older than 24 hours
  DELETE FROM api_endpoints 
  WHERE is_draft = true 
  AND created_at < NOW() - INTERVAL '24 hours';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_drafts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_weather_data"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Delete hourly forecasts older than 30 days
    DELETE FROM weather_hourly_forecast
    WHERE fetched_at < NOW() - INTERVAL '30 days';
    
    -- Delete daily forecasts older than 60 days
    DELETE FROM weather_daily_forecast
    WHERE fetched_at < NOW() - INTERVAL '60 days';
    
    -- Delete current conditions older than 7 days
    DELETE FROM weather_current
    WHERE fetched_at < NOW() - INTERVAL '7 days';
    
    -- Delete air quality data older than 30 days
    DELETE FROM weather_air_quality
    WHERE fetched_at < NOW() - INTERVAL '30 days';
    
    -- Delete expired alerts
    DELETE FROM weather_alerts
    WHERE end_time < NOW() - INTERVAL '7 days';
    
    RAISE NOTICE 'Old weather data cleaned up successfully';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_weather_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_stuck_syncs"() RETURNS TABLE("cleaned_id" "uuid", "cleaned_name" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  UPDATE data_sources 
  SET 
    sync_status = 'error',
    last_sync_error = 'Sync timeout - automatically reset after ' || 
                      EXTRACT(EPOCH FROM (NOW() - last_sync_at))::int || ' seconds'
  WHERE 
    sync_status = 'running'
    AND type = 'file'
    AND last_sync_at < NOW() - INTERVAL '5 minutes'
  RETURNING id, name;
END;
$$;


ALTER FUNCTION "public"."cleanup_stuck_syncs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."copy_gfx_project_complete"("p_source_project_id" "uuid", "p_target_org_id" "uuid", "p_new_name" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_project_id UUID;
  source_project RECORD;
  id_map_layers JSONB := '{}';
  id_map_folders JSONB := '{}';
  id_map_templates JSONB := '{}';
  id_map_elements JSONB := '{}';
  id_map_animations JSONB := '{}';
  old_id UUID;
  new_id UUID;
BEGIN
  -- Get source project
  SELECT * INTO source_project FROM gfx_projects WHERE id = p_source_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source project not found';
  END IF;

  -- 1. Copy project
  INSERT INTO gfx_projects (
    organization_id, name, description, slug, canvas_width, canvas_height,
    frame_rate, background_color, api_enabled, is_live, archived, created_at, updated_at
  )
  SELECT
    p_target_org_id,
    COALESCE(p_new_name, source_project.name),
    source_project.description,
    source_project.slug || '-' || substring(gen_random_uuid()::text, 1, 8),
    source_project.canvas_width,
    source_project.canvas_height,
    source_project.frame_rate,
    source_project.background_color,
    source_project.api_enabled,
    false,  -- not live by default
    false,
    now(),
    now()
  RETURNING id INTO new_project_id;

  -- 2. Copy design system
  INSERT INTO gfx_project_design_systems (project_id, colors, fonts, spacing, animation_defaults)
  SELECT new_project_id, colors, fonts, spacing, animation_defaults
  FROM gfx_project_design_systems WHERE project_id = p_source_project_id;

  -- 3. Copy layers and build ID map
  FOR old_id, new_id IN
    INSERT INTO gfx_layers (
      project_id, name, layer_type, z_index, sort_order, position_anchor,
      position_offset_x, position_offset_y, width, height, auto_out, auto_out_delay,
      allow_multiple, always_on, transition_in, transition_in_duration,
      transition_out, transition_out_duration, enabled, created_at
    )
    SELECT
      new_project_id, name, layer_type, z_index, sort_order, position_anchor,
      position_offset_x, position_offset_y, width, height, auto_out, auto_out_delay,
      allow_multiple, always_on, transition_in, transition_in_duration,
      transition_out, transition_out_duration, enabled, now()
    FROM gfx_layers WHERE project_id = p_source_project_id
    RETURNING id, (SELECT id FROM gfx_layers l2 WHERE l2.project_id = p_source_project_id AND l2.name = gfx_layers.name AND l2.z_index = gfx_layers.z_index LIMIT 1)
  LOOP
    -- This approach doesn't work, need different strategy
  END LOOP;

  -- Actually, let's use a simpler approach with temp tables
  CREATE TEMP TABLE IF NOT EXISTS temp_layer_map (old_id UUID, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS temp_folder_map (old_id UUID, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS temp_template_map (old_id UUID, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS temp_element_map (old_id UUID, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS temp_animation_map (old_id UUID, new_id UUID) ON COMMIT DROP;

  -- Clear temp tables
  DELETE FROM temp_layer_map;
  DELETE FROM temp_folder_map;
  DELETE FROM temp_template_map;
  DELETE FROM temp_element_map;
  DELETE FROM temp_animation_map;

  -- 3. Copy layers
  WITH source_layers AS (
    SELECT * FROM gfx_layers WHERE project_id = p_source_project_id ORDER BY z_index
  ),
  inserted_layers AS (
    INSERT INTO gfx_layers (
      project_id, name, layer_type, z_index, sort_order, position_anchor,
      position_offset_x, position_offset_y, width, height, auto_out, auto_out_delay,
      allow_multiple, always_on, transition_in, transition_in_duration,
      transition_out, transition_out_duration, enabled, created_at
    )
    SELECT
      new_project_id, name, layer_type, z_index, sort_order, position_anchor,
      position_offset_x, position_offset_y, width, height, auto_out, auto_out_delay,
      allow_multiple, always_on, transition_in, transition_in_duration,
      transition_out, transition_out_duration, enabled, now()
    FROM source_layers
    RETURNING id, z_index, name
  )
  INSERT INTO temp_layer_map (old_id, new_id)
  SELECT sl.id, il.id
  FROM source_layers sl
  JOIN inserted_layers il ON sl.z_index = il.z_index AND sl.name = il.name;

  -- 4. Copy folders (without parent references first, then update)
  WITH source_folders AS (
    SELECT * FROM gfx_folders WHERE project_id = p_source_project_id ORDER BY sort_order
  ),
  inserted_folders AS (
    INSERT INTO gfx_folders (
      project_id, layer_id, name, color, icon, sort_order, expanded, created_at
    )
    SELECT
      new_project_id,
      (SELECT new_id FROM temp_layer_map WHERE old_id = sf.layer_id),
      sf.name,
      sf.color,
      sf.icon,
      sf.sort_order,
      sf.expanded,
      now()
    FROM source_folders sf
    RETURNING id, name, sort_order
  )
  INSERT INTO temp_folder_map (old_id, new_id)
  SELECT sf.id, inf.id
  FROM source_folders sf
  JOIN inserted_folders inf ON sf.name = inf.name AND sf.sort_order = inf.sort_order;

  -- Update folder parent references
  UPDATE gfx_folders f
  SET parent_folder_id = (SELECT new_id FROM temp_folder_map WHERE old_id = (
    SELECT parent_folder_id FROM gfx_folders WHERE id = (SELECT old_id FROM temp_folder_map WHERE new_id = f.id)
  ))
  WHERE f.project_id = new_project_id
    AND EXISTS (SELECT 1 FROM temp_folder_map tfm WHERE tfm.new_id = f.id);

  -- 5. Copy templates
  WITH source_templates AS (
    SELECT * FROM gfx_templates WHERE project_id = p_source_project_id ORDER BY sort_order
  ),
  inserted_templates AS (
    INSERT INTO gfx_templates (
      project_id, layer_id, folder_id, name, description, tags, thumbnail_url,
      html_template, css_styles, width, height, in_duration, loop_duration,
      loop_iterations, out_duration, libraries, custom_script, locked, archived,
      version, sort_order, form_schema, created_at, updated_at
    )
    SELECT
      new_project_id,
      (SELECT new_id FROM temp_layer_map WHERE old_id = st.layer_id),
      (SELECT new_id FROM temp_folder_map WHERE old_id = st.folder_id),
      st.name,
      st.description,
      st.tags,
      st.thumbnail_url,
      st.html_template,
      st.css_styles,
      st.width,
      st.height,
      st.in_duration,
      st.loop_duration,
      st.loop_iterations,
      st.out_duration,
      st.libraries,
      st.custom_script,
      st.locked,
      false,  -- not archived
      st.version,
      st.sort_order,
      st.form_schema,
      now(),
      now()
    FROM source_templates st
    RETURNING id, name, sort_order
  )
  INSERT INTO temp_template_map (old_id, new_id)
  SELECT st.id, it.id
  FROM source_templates st
  JOIN inserted_templates it ON st.name = it.name AND st.sort_order = it.sort_order;

  -- 6. Copy elements (without parent references first)
  WITH source_elements AS (
    SELECT e.* FROM gfx_elements e
    JOIN temp_template_map tm ON e.template_id = tm.old_id
    ORDER BY e.sort_order
  ),
  inserted_elements AS (
    INSERT INTO gfx_elements (
      template_id, name, element_id, element_type, sort_order,
      position_x, position_y, width, height, rotation, scale_x, scale_y,
      anchor_x, anchor_y, opacity, content, styles, classes, visible, locked
    )
    SELECT
      (SELECT new_id FROM temp_template_map WHERE old_id = se.template_id),
      se.name,
      se.element_id,
      se.element_type,
      se.sort_order,
      se.position_x,
      se.position_y,
      se.width,
      se.height,
      se.rotation,
      se.scale_x,
      se.scale_y,
      se.anchor_x,
      se.anchor_y,
      se.opacity,
      se.content,
      se.styles,
      se.classes,
      se.visible,
      se.locked
    FROM source_elements se
    RETURNING id, element_id, template_id
  )
  INSERT INTO temp_element_map (old_id, new_id)
  SELECT se.id, ie.id
  FROM source_elements se
  JOIN inserted_elements ie ON se.element_id = ie.element_id
    AND (SELECT new_id FROM temp_template_map WHERE old_id = se.template_id) = ie.template_id;

  -- Update element parent references
  UPDATE gfx_elements e
  SET parent_element_id = (SELECT new_id FROM temp_element_map WHERE old_id = (
    SELECT parent_element_id FROM gfx_elements WHERE id = (SELECT old_id FROM temp_element_map WHERE new_id = e.id)
  ))
  WHERE EXISTS (SELECT 1 FROM temp_element_map tem WHERE tem.new_id = e.id);

  -- 7. Copy animations
  WITH source_animations AS (
    SELECT a.* FROM gfx_animations a
    JOIN temp_template_map tm ON a.template_id = tm.old_id
  ),
  inserted_animations AS (
    INSERT INTO gfx_animations (
      template_id, element_id, phase, delay, duration, iterations, direction, easing, created_at
    )
    SELECT
      (SELECT new_id FROM temp_template_map WHERE old_id = sa.template_id),
      (SELECT new_id FROM temp_element_map WHERE old_id = sa.element_id),
      sa.phase,
      sa.delay,
      sa.duration,
      sa.iterations,
      sa.direction,
      sa.easing,
      now()
    FROM source_animations sa
    RETURNING id, element_id, phase
  )
  INSERT INTO temp_animation_map (old_id, new_id)
  SELECT sa.id, ia.id
  FROM source_animations sa
  JOIN inserted_animations ia ON
    (SELECT new_id FROM temp_element_map WHERE old_id = sa.element_id) = ia.element_id
    AND sa.phase = ia.phase;

  -- 8. Copy keyframes
  INSERT INTO gfx_keyframes (
    animation_id, position, easing, position_x, position_y, rotation,
    scale_x, scale_y, opacity, clip_path, filter_blur, filter_brightness,
    color, background_color, custom, sort_order
  )
  SELECT
    (SELECT new_id FROM temp_animation_map WHERE old_id = k.animation_id),
    k.position,
    k.easing,
    k.position_x,
    k.position_y,
    k.rotation,
    k.scale_x,
    k.scale_y,
    k.opacity,
    k.clip_path,
    k.filter_blur,
    k.filter_brightness,
    k.color,
    k.background_color,
    k.custom,
    k.sort_order
  FROM gfx_keyframes k
  JOIN temp_animation_map tam ON k.animation_id = tam.old_id;

  -- 9. Copy bindings
  INSERT INTO gfx_bindings (
    template_id, element_id, binding_key, target_property, binding_type,
    default_value, formatter, formatter_options, required
  )
  SELECT
    (SELECT new_id FROM temp_template_map WHERE old_id = b.template_id),
    (SELECT new_id FROM temp_element_map WHERE old_id = b.element_id),
    b.binding_key,
    b.target_property,
    b.binding_type,
    b.default_value,
    b.formatter,
    b.formatter_options,
    b.required
  FROM gfx_bindings b
  JOIN temp_template_map ttm ON b.template_id = ttm.old_id;

  RETURN new_project_id;
END;
$$;


ALTER FUNCTION "public"."copy_gfx_project_complete"("p_source_project_id" "uuid", "p_target_org_id" "uuid", "p_new_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_data_provider"("_type" "text", "_category" "text", "_name" "text", "_id" "text" DEFAULT NULL::"text", "_description" "text" DEFAULT NULL::"text", "_is_active" boolean DEFAULT true, "_api_key" "text" DEFAULT NULL::"text", "_api_secret" "text" DEFAULT NULL::"text", "_base_url" "text" DEFAULT NULL::"text", "_api_version" "text" DEFAULT NULL::"text", "_config" "jsonb" DEFAULT '{}'::"jsonb", "_source_url" "text" DEFAULT NULL::"text", "_storage_path" "text" DEFAULT NULL::"text", "_refresh_interval_minutes" integer DEFAULT NULL::integer, "_last_run" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  _record RECORD;
  _new_id TEXT;
BEGIN
  -- Auto-generate ID if not provided
  _new_id := COALESCE(_id, CONCAT(_category, '_provider:', _type));

  INSERT INTO public.data_providers (
    id,
    type,
    category,
    name,
    description,
    is_active,
    api_key,
    api_secret,
    base_url,
    api_version,
    config,
    source_url,
    storage_path,
    refresh_interval_minutes,
    last_run,
    created_at,
    updated_at
  )
  VALUES (
    _new_id,
    _type,
    _category,
    _name,
    _description,
    _is_active,
    _api_key,
    _api_secret,
    _base_url,
    _api_version,
    _config,
    _source_url,
    _storage_path,
    _refresh_interval_minutes,
    _last_run,
    NOW(),
    NOW()
  )
  RETURNING * INTO _record;

  RETURN to_jsonb(_record);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Data provider with id % already exists', _new_id;
  WHEN others THEN
    RAISE EXCEPTION 'Error creating data provider: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_data_provider"("_type" "text", "_category" "text", "_name" "text", "_id" "text", "_description" "text", "_is_active" boolean, "_api_key" "text", "_api_secret" "text", "_base_url" "text", "_api_version" "text", "_config" "jsonb", "_source_url" "text", "_storage_path" "text", "_refresh_interval_minutes" integer, "_last_run" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invitation"("p_user_id" "uuid", "p_email" "text", "p_organization_id" "uuid", "p_role" "text" DEFAULT 'member'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_auth_uid UUID;
  v_user_auth_id UUID;
  v_user_org_id UUID;
  v_user_org_role TEXT;
  v_is_superuser BOOLEAN;
  v_invitation_id UUID;
  v_result JSONB;
BEGIN
  -- Get the current auth user id
  v_auth_uid := auth.uid();

  -- Get the user's details from the provided user_id
  SELECT auth_user_id, organization_id, org_role, is_superuser
  INTO v_user_auth_id, v_user_org_id, v_user_org_role, v_is_superuser
  FROM u_users
  WHERE id = p_user_id;

  IF v_user_auth_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Security check: ensure user can only use their own user_id
  -- Allow if auth.uid matches OR if they are a superuser
  IF v_auth_uid IS NOT NULL AND v_user_auth_id != v_auth_uid THEN
    -- Check if caller is superuser
    IF NOT EXISTS (
      SELECT 1 FROM u_users
      WHERE auth_user_id = v_auth_uid AND is_superuser = true
    ) THEN
      RAISE EXCEPTION 'Not authorized to create invitation as this user';
    END IF;
  END IF;

  -- Authorization check: must be superuser OR (same org AND admin/owner)
  IF NOT v_is_superuser THEN
    IF v_user_org_id != p_organization_id THEN
      RAISE EXCEPTION 'Cannot invite to a different organization';
    END IF;

    IF v_user_org_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'Must be org admin or owner to send invitations';
    END IF;
  END IF;

  -- Validate email format
  IF p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Validate role
  IF p_role NOT IN ('owner', 'admin', 'member', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role. Must be owner, admin, member, or viewer';
  END IF;

  -- Check if invitation already exists
  IF EXISTS (
    SELECT 1 FROM u_invitations
    WHERE email = lower(trim(p_email))
    AND organization_id = p_organization_id
    AND accepted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'An invitation already exists for this email in this organization';
  END IF;

  -- Check if user already exists in the organization
  IF EXISTS (
    SELECT 1 FROM u_users
    WHERE email = lower(trim(p_email))
    AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'A user with this email already exists in this organization';
  END IF;

  -- Create the invitation
  INSERT INTO u_invitations (email, organization_id, invited_by, role)
  VALUES (lower(trim(p_email)), p_organization_id, p_user_id, p_role)
  RETURNING id INTO v_invitation_id;

  -- Return the created invitation
  SELECT jsonb_build_object(
    'id', i.id,
    'email', i.email,
    'organization_id', i.organization_id,
    'role', i.role,
    'token', i.token,
    'expires_at', i.expires_at,
    'created_at', i.created_at,
    'invited_by', i.invited_by
  ) INTO v_result
  FROM u_invitations i
  WHERE i.id = v_invitation_id;

  RETURN v_result;
END;
$_$;


ALTER FUNCTION "public"."create_invitation"("p_user_id" "uuid", "p_email" "text", "p_organization_id" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_organization_with_seed"("p_name" "text", "p_slug" "text", "p_allowed_domains" "text"[], "p_admin_email" "text", "p_seed_config" "jsonb" DEFAULT '{}'::"jsonb", "p_dashboard_config" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_org_id UUID;
  invitation_token TEXT;
  seed_result JSONB;
  dashboard_result JSONB;
BEGIN
  -- Check caller is superuser
  IF NOT EXISTS (SELECT 1 FROM u_users WHERE auth_user_id = auth.uid() AND is_superuser = true) THEN
    RAISE EXCEPTION 'Only superusers can create organizations';
  END IF;

  -- Validate slug uniqueness
  IF EXISTS (SELECT 1 FROM u_organizations WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'Organization slug already exists';
  END IF;

  -- Create organization
  INSERT INTO u_organizations (name, slug, allowed_domains)
  VALUES (p_name, p_slug, p_allowed_domains)
  RETURNING id INTO new_org_id;

  -- Seed data if config provided
  IF p_seed_config IS NOT NULL AND p_seed_config != '{}'::JSONB THEN
    seed_result := seed_organization_data(new_org_id, p_seed_config);
  ELSE
    seed_result := '{}'::JSONB;
  END IF;

  -- Seed dashboard data if config provided
  IF p_dashboard_config IS NOT NULL AND p_dashboard_config != '{}'::JSONB THEN
    dashboard_result := seed_dashboard_data(new_org_id, p_dashboard_config);
  ELSE
    dashboard_result := '{}'::JSONB;
  END IF;

  -- Create invitation for admin if email provided
  IF p_admin_email IS NOT NULL AND p_admin_email != '' THEN
    INSERT INTO u_invitations (email, organization_id, invited_by, role)
    VALUES (
      p_admin_email,
      new_org_id,
      (SELECT id FROM u_users WHERE auth_user_id = auth.uid()),
      'owner'
    )
    RETURNING token INTO invitation_token;
  END IF;

  RETURN jsonb_build_object(
    'organization_id', new_org_id,
    'slug', p_slug,
    'seed_result', seed_result,
    'dashboard_result', dashboard_result,
    'invitation_token', invitation_token
  );
END;
$$;


ALTER FUNCTION "public"."create_organization_with_seed"("p_name" "text", "p_slug" "text", "p_allowed_domains" "text"[], "p_admin_email" "text", "p_seed_config" "jsonb", "p_dashboard_config" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_organization_with_seed"("p_name" "text", "p_slug" "text", "p_allowed_domains" "text"[], "p_admin_email" "text", "p_seed_config" "jsonb", "p_dashboard_config" "jsonb") IS 'Creates org with seed data, dashboard data, and admin invitation - superuser only';



CREATE OR REPLACE FUNCTION "public"."create_project"("p_name" "text", "p_description" "text" DEFAULT NULL::"text", "p_default_channel_id" "uuid" DEFAULT NULL::"uuid", "p_default_instance_id" "text" DEFAULT NULL::"text", "p_color" "text" DEFAULT 'blue'::"text", "p_icon" "text" DEFAULT '📁'::"text", "p_settings" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_project_id UUID;
    v_result jsonb;
BEGIN
    INSERT INTO pulsar_projects (
        name, description, default_channel_id, default_instance_id,
        color, icon, settings
    )
    VALUES (
        p_name, p_description, p_default_channel_id, p_default_instance_id,
        p_color, p_icon, p_settings
    )
    RETURNING id INTO v_project_id;

    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'description', p.description,
            'default_channel_id', p.default_channel_id,
            'default_instance_id', p.default_instance_id,
            'color', p.color,
            'icon', p.icon,
            'is_active', p.is_active,
            'created_at', p.created_at
        )
    )
    INTO v_result
    FROM pulsar_projects p
    WHERE p.id = v_project_id;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."create_project"("p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "text", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_pulsar_channel_state"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO pulsar_channel_state (channel_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_pulsar_channel_state"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_auth"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return 'uid=' || coalesce(auth.uid()::text, 'NULL');
end;
$$;


ALTER FUNCTION "public"."debug_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_auth_uid"() RETURNS TABLE("current_uid" "uuid", "current_role_name" "text", "is_authenticated" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT 
        auth.uid() as current_uid,
        auth.role() as current_role_name,
        (auth.role() = 'authenticated') as is_authenticated;
$$;


ALTER FUNCTION "public"."debug_auth_uid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_get_user_layout"("p_layout_name" "text" DEFAULT 'main'::"text") RETURNS TABLE("found_user_id" "uuid", "auth_user_id" "uuid", "layout_exists" boolean, "layout_data" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ul.user_id as found_user_id,
    auth.uid() as auth_user_id,
    (ul.layout_data IS NOT NULL) as layout_exists,
    ul.layout_data
  FROM user_layouts ul
  WHERE ul.user_id = auth.uid()
  AND ul.layout_name = p_layout_name;
  
  -- If no rows found, return debug info
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      NULL::uuid as found_user_id,
      auth.uid() as auth_user_id,
      false as layout_exists,
      NULL::jsonb as layout_data;
  END IF;
END;
$$;


ALTER FUNCTION "public"."debug_get_user_layout"("p_layout_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_data_provider"("_id" "text" DEFAULT NULL::"text", "_type" "text" DEFAULT NULL::"text", "_category" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  _deleted RECORD;
BEGIN
  -- ========================================================
  -- Determine which provider to delete
  -- ========================================================
  IF _id IS NULL AND (_type IS NULL OR _category IS NULL) THEN
    RAISE EXCEPTION 'You must provide either _id OR both _type and _category';
  END IF;

  -- ========================================================
  -- Perform the deletion
  -- ========================================================
  DELETE FROM public.data_providers
  WHERE id = COALESCE(_id, CONCAT(_category, '_provider:', _type))
  RETURNING * INTO _deleted;

  -- ========================================================
  -- Return result
  -- ========================================================
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No data provider found with ID or type/category provided';
  END IF;

  RETURN to_jsonb(_deleted);
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error deleting data provider: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."delete_data_provider"("_id" "text", "_type" "text", "_category" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."map_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "map_style" "public"."map_style_type" DEFAULT 'light'::"public"."map_style_type" NOT NULL,
    "show_map_labels" boolean DEFAULT true NOT NULL,
    "projection_type" "public"."projection_type" DEFAULT 'mercator'::"public"."projection_type" NOT NULL,
    "default_latitude" numeric(10,7) DEFAULT 38.0 NOT NULL,
    "default_longitude" numeric(10,7) DEFAULT '-97.0'::numeric NOT NULL,
    "default_zoom" numeric(4,2) DEFAULT 3.5 NOT NULL,
    "saved_positions" "jsonb" DEFAULT '[]'::"jsonb",
    "additional_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "globe_mode" boolean DEFAULT false,
    "map_opacity" real DEFAULT 1.0,
    "election_map_opacity" real DEFAULT 1.0,
    "atmosphere_enabled" boolean DEFAULT true,
    CONSTRAINT "valid_latitude" CHECK ((("default_latitude" >= ('-90'::integer)::numeric) AND ("default_latitude" <= (90)::numeric))),
    CONSTRAINT "valid_longitude" CHECK ((("default_longitude" >= ('-180'::integer)::numeric) AND ("default_longitude" <= (180)::numeric))),
    CONSTRAINT "valid_zoom" CHECK ((("default_zoom" >= (0)::numeric) AND ("default_zoom" <= (22)::numeric)))
);


ALTER TABLE "public"."map_settings" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_map_position"("p_user_id" "uuid", "p_position_id" "uuid") RETURNS "public"."map_settings"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  updated map_settings;
BEGIN
  UPDATE map_settings
  SET saved_positions = (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(saved_positions) elem
    WHERE (elem->>'id')::uuid <> p_position_id
  ),
  updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO updated;

  RETURN updated;
END;
$$;


ALTER FUNCTION "public"."delete_map_position"("p_user_id" "uuid", "p_position_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_calculate_party_strength"("p_party_id" "uuid", "p_election_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("division_id" "uuid", "division_name" character varying, "total_races" integer, "races_won" integer, "win_percentage" numeric, "avg_vote_share" numeric, "total_votes" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH party_results AS (
        SELECT 
            rr.division_id,
            gd.name as division_name,
            COUNT(DISTINCT r.id) as total_races,
            COUNT(DISTINCT CASE 
                WHEN cr.winner OR cr.winner_override THEN r.id 
            END) as races_won,
            AVG(COALESCE(cr.vote_percentage_override, cr.vote_percentage)) as avg_vote_share,
            SUM(COALESCE(cr.votes_override, cr.votes)) as total_votes
        FROM public.e_candidate_results cr
        JOIN public.e_candidates c ON cr.candidate_id = c.id
        JOIN public.e_race_results rr ON cr.race_result_id = rr.id
        JOIN public.e_races r ON rr.race_id = r.id
        JOIN public.e_geographic_divisions gd ON rr.division_id = gd.id
        WHERE c.party_id = p_party_id
        AND (p_election_id IS NULL OR r.election_id = p_election_id)
        GROUP BY rr.division_id, gd.name
    )
    SELECT 
        pr.division_id,
        pr.division_name,
        pr.total_races::INTEGER,
        pr.races_won::INTEGER,
        ROUND((pr.races_won::DECIMAL / NULLIF(pr.total_races, 0)) * 100, 2) as win_percentage,
        ROUND(pr.avg_vote_share, 2) as avg_vote_share,
        pr.total_votes
    FROM public.e_party_results pr
    ORDER BY win_percentage DESC;
END;
$$;


ALTER FUNCTION "public"."e_calculate_party_strength"("p_party_id" "uuid", "p_election_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_calculate_vote_percentages"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only proceed if this isn't already a percentage update
    IF TG_OP = 'UPDATE' AND 
       OLD.votes = NEW.votes AND 
       OLD.vote_percentage != NEW.vote_percentage THEN
        RETURN NEW; -- Skip if only percentage changed
    END IF;
    
    -- Update total votes in race_results using effective values
    UPDATE public.e_race_results
    SET total_votes = (
        SELECT SUM(COALESCE(votes_override, votes))
        FROM e_candidate_results
        WHERE race_result_id = NEW.race_result_id
    )
    WHERE id = NEW.race_result_id 
    AND total_votes_override IS NULL;
    
    -- Update percentages for all candidates EXCEPT the current one
    -- to avoid recursion
    UPDATE public.e_candidate_results
    SET vote_percentage = CASE 
        WHEN (
            SELECT COALESCE(total_votes_override, total_votes) 
            FROM e_race_results 
            WHERE id = race_result_id
        ) > 0
        THEN ROUND(
            (COALESCE(votes_override, votes)::DECIMAL / 
            (SELECT COALESCE(total_votes_override, total_votes) 
             FROM e_race_results 
             WHERE id = race_result_id)) * 100, 2
        )
        ELSE 0
    END
    WHERE race_result_id = NEW.race_result_id 
    AND id != NEW.id  -- Don't update the row that triggered this
    AND vote_percentage_override IS NULL;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."e_calculate_vote_percentages"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_create_synthetic_group"("p_name" character varying, "p_description" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_group_id UUID;
BEGIN
    INSERT INTO public.e_synthetic_groups (name, description, created_by)
    VALUES (p_name, p_description, p_user_id)
    RETURNING id INTO v_group_id;

    RETURN v_group_id;
END;
$$;


ALTER FUNCTION "public"."e_create_synthetic_group"("p_name" character varying, "p_description" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_create_synthetic_race"("p_user_id" "uuid", "p_base_race_id" "uuid", "p_base_election_id" "uuid", "p_name" "text", "p_description" "text", "p_scenario_input" "jsonb", "p_ai_response" "jsonb", "p_summary" "jsonb", "p_office" "text", "p_state" "text", "p_district" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_race_id uuid;
  cand jsonb;
  county jsonb;
  c_result jsonb;
  county_result_id uuid;
BEGIN
  -----------------------------------------------------------------------
  -- INSERT RACE
  -----------------------------------------------------------------------
  INSERT INTO e_synthetic_races (
    user_id,
    base_race_id,
    base_election_id,
    name,
    description,
    scenario_input,
    ai_response_raw,
    summary,
    office,
    state,
    district
  )
  VALUES (
    p_user_id,
    p_base_race_id,
    p_base_election_id,
    p_name,
    p_description,
    p_scenario_input,
    p_ai_response,
    COALESCE(p_summary, p_ai_response->'summary'),
    p_office,
    p_state,
    p_district
  )
  RETURNING id INTO new_race_id;

  -----------------------------------------------------------------------
  -- INSERT CANDIDATES (candidate_id TEXT)
  -----------------------------------------------------------------------
  IF p_ai_response ? 'candidates' THEN
    FOR cand IN SELECT * FROM jsonb_array_elements(p_ai_response->'candidates')
    LOOP
      INSERT INTO e_synthetic_race_candidates (
        synthetic_race_id,
        candidate_id,
        ballot_order,
        withdrew,
        write_in,
        metadata
      )
      VALUES (
        new_race_id,
        cand->>'candidate_id',
        COALESCE((cand->>'ballot_order')::int, 0),
        COALESCE((cand->>'withdrew')::boolean, false),
        COALESCE((cand->>'write_in')::boolean, false),
        cand
      );
    END LOOP;
  END IF;

  -----------------------------------------------------------------------
  -- INSERT COUNTY RESULTS
  -----------------------------------------------------------------------
  IF p_ai_response ? 'county_results' THEN
    FOR county IN SELECT * FROM jsonb_array_elements(p_ai_response->'county_results')
    LOOP
      INSERT INTO e_synthetic_race_results (
        synthetic_race_id,
        division_id,
        reporting_level,
        precincts_reporting,
        precincts_total,
        percent_reporting,
        registered_voters,
        total_votes,
        winner_candidate_id,
        metadata
      )
      VALUES (
        new_race_id,
        NULLIF(county->>'division_id',''),
        COALESCE(county->>'reporting_level','county'),
        NULLIF(county->>'precincts_reporting','')::int,
        NULLIF(county->>'precincts_total','')::int,
        NULLIF(county->>'percent_reporting','')::numeric,
        NULLIF(county->>'registered_voters','')::int,
        NULLIF(county->>'total_votes','')::int,
        county->>'winner_candidate_id',
        county
      )
      RETURNING id INTO county_result_id;

      -----------------------------------------------------------------------
      -- INSERT COUNTY CANDIDATE RESULTS (candidate_id TEXT)
      -----------------------------------------------------------------------
      IF county ? 'results' THEN
        FOR c_result IN SELECT * FROM jsonb_array_elements(county->'results')
        LOOP
          INSERT INTO e_synthetic_candidate_results (
            synthetic_race_id,
            division_id,
            candidate_id,
            votes,
            vote_percentage,
            electoral_votes,
            winner,
            rank,
            metadata
          )
          VALUES (
            new_race_id,
            NULLIF(county->>'division_id',''),
            c_result->>'candidate_id',
            NULLIF(c_result->>'votes','')::int,
            NULLIF(c_result->>'vote_percentage','')::numeric,
            COALESCE((c_result->>'electoral_votes')::int, 0),
            COALESCE((c_result->>'winner')::boolean, false),
            COALESCE((c_result->>'rank')::int, 0),
            c_result
          );
        END LOOP;
      END IF;

    END LOOP;
  END IF;

  RETURN new_race_id;
END;
$$;


ALTER FUNCTION "public"."e_create_synthetic_race"("p_user_id" "uuid", "p_base_race_id" "uuid", "p_base_election_id" "uuid", "p_name" "text", "p_description" "text", "p_scenario_input" "jsonb", "p_ai_response" "jsonb", "p_summary" "jsonb", "p_office" "text", "p_state" "text", "p_district" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_create_synthetic_race"("p_user_id" "uuid", "p_base_race_id" "uuid", "p_base_election_id" "uuid", "p_name" character varying, "p_description" "text", "p_scenario_input" "jsonb", "p_ai_response" "jsonb", "p_office" character varying, "p_state" character varying, "p_district" character varying DEFAULT NULL::character varying, "p_summary" "jsonb" DEFAULT NULL::"jsonb", "p_synthetic_group_id" "uuid" DEFAULT 'a0000000-0000-0000-0000-000000000001'::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_synthetic_race_id UUID;
    v_race_id UUID;
    v_race_result_id UUID;
    v_division_id UUID;
    v_election_id UUID;
    v_candidate_id UUID;
    v_party_id UUID;
    v_candidate_result_id UUID;
    v_race_candidate_id UUID;
    v_base_candidate RECORD;
    v_ai_candidate JSONB;
    v_county_result JSONB;
    v_county_candidate JSONB;
    v_state_code VARCHAR;
    v_county_division_id UUID;
    v_county_race_result_id UUID;
BEGIN
    -- Generate new IDs
    v_synthetic_race_id := gen_random_uuid();
    v_race_id := gen_random_uuid();
    v_race_result_id := gen_random_uuid();
    v_election_id := gen_random_uuid();

    -- Get state code from p_state (might be full name or 2-letter code)
    v_state_code := CASE
        WHEN LENGTH(p_state) = 2 THEN UPPER(p_state)
        ELSE (SELECT code FROM public.e_geographic_divisions WHERE LOWER(name) = LOWER(p_state) AND type = 'state' LIMIT 1)
    END;

    -- If we couldn't find the code, use the state as-is
    IF v_state_code IS NULL THEN
        v_state_code := p_state;
    END IF;

    -- Get division_id for the state
    SELECT id INTO v_division_id
    FROM public.e_geographic_divisions
    WHERE (code = v_state_code OR LOWER(name) = LOWER(p_state))
    AND type = 'state'
    LIMIT 1;

    -- If no state division found and it's national, use national division
    IF v_division_id IS NULL AND LOWER(p_state) IN ('national', 'us', 'usa', 'united states') THEN
        SELECT id INTO v_division_id
        FROM public.e_geographic_divisions
        WHERE type = 'national'
        LIMIT 1;
    END IF;

    -- Create the synthetic race record
    INSERT INTO public.e_synthetic_races (
        id,
        name,
        description,
        base_race_id,
        base_election_id,
        scenario_input,
        ai_response,
        office,
        state,
        district,
        summary,
        created_by,
        synthetic_group_id
    ) VALUES (
        v_synthetic_race_id,
        p_name,
        p_description,
        p_base_race_id,
        p_base_election_id,
        p_scenario_input,
        p_ai_response,
        p_office,
        p_state,
        p_district,
        p_summary,
        p_user_id,
        p_synthetic_group_id
    );

    -- Create a synthetic election record
    INSERT INTO public.e_elections (
        id,
        election_id,
        name,
        type,
        level,
        election_date,
        status,
        metadata
    ) VALUES (
        v_election_id,
        'synthetic_' || v_synthetic_race_id,
        COALESCE(p_name, 'Synthetic Election'),
        'synthetic',
        'state',
        CURRENT_DATE,
        'synthetic',
        jsonb_build_object(
            'synthetic', true,
            'synthetic_race_id', v_synthetic_race_id,
            'base_election_id', p_base_election_id
        )
    );

    -- Create the synthetic race in e_races
    INSERT INTO public.e_races (
        id,
        race_id,
        election_id,
        division_id,
        name,
        display_name,
        type,
        office,
        metadata
    ) VALUES (
        v_race_id,
        'synthetic_' || v_synthetic_race_id,
        v_election_id,
        v_division_id,
        COALESCE(
            p_ai_response->'race'->>'title',
            p_name,
            'Synthetic Race'
        ),
        p_name,
        CASE
            WHEN LOWER(p_office) LIKE '%president%' THEN 'presidential'
            WHEN LOWER(p_office) LIKE '%senate%' OR LOWER(p_office) LIKE '%senator%' THEN 'senate'
            WHEN LOWER(p_office) LIKE '%house%' OR LOWER(p_office) LIKE '%representative%' THEN 'house'
            WHEN LOWER(p_office) LIKE '%governor%' THEN 'governor'
            ELSE 'other'
        END,
        p_office,
        jsonb_build_object(
            'synthetic', true,
            'synthetic_race_id', v_synthetic_race_id,
            'base_race_id', p_base_race_id,
            'electoral_votes', COALESCE((p_ai_response->'race'->>'electoral_votes')::INT, 0),
            'state_code', COALESCE(p_ai_response->'race'->>'state_code', v_state_code)
        )
    );

    -- Create the synthetic race result in e_race_results
    INSERT INTO public.e_race_results (
        id,
        race_id,
        division_id,
        reporting_level,
        precincts_reporting,
        precincts_total,
        percent_reporting,
        total_votes,
        called,
        called_status,
        metadata
    ) VALUES (
        v_race_result_id,
        v_race_id,
        v_division_id,
        'state',
        100,
        100,
        100.00,
        COALESCE((p_ai_response->'race'->>'totalVotes')::INT, 0),
        true,
        'CALLED',
        jsonb_build_object('synthetic', true, 'synthetic_race_id', v_synthetic_race_id)
    );

    -- Process each candidate from AI response
    FOR v_ai_candidate IN SELECT * FROM jsonb_array_elements(p_ai_response->'candidates')
    LOOP
        -- Check if candidate_id is null or starts with 'synthetic_' (indicating a new synthetic candidate)
        IF v_ai_candidate->>'candidate_id' IS NULL OR (v_ai_candidate->>'candidate_id')::TEXT LIKE 'synthetic_%' THEN
            -- Create a new synthetic candidate
            v_candidate_id := gen_random_uuid();

            -- Try to find or create party
            SELECT id INTO v_party_id
            FROM public.e_parties
            WHERE LOWER(abbreviation) = LOWER(COALESCE(v_ai_candidate->>'party', v_ai_candidate->>'candidate_party', 'IND'))
            LIMIT 1;

            -- If no party found, use a default or create one
            IF v_party_id IS NULL THEN
                SELECT id INTO v_party_id FROM public.e_parties WHERE abbreviation = 'IND' LIMIT 1;
            END IF;

            -- Create the candidate
            INSERT INTO public.e_candidates (
                id,
                candidate_id,
                full_name,
                party_id,
                photo_url,
                metadata
            ) VALUES (
                v_candidate_id,
                'synthetic_' || v_candidate_id,
                COALESCE(v_ai_candidate->>'candidate_name', 'Synthetic Candidate'),
                v_party_id,
                v_ai_candidate->>'headshot',
                jsonb_build_object('synthetic', true, 'synthetic_race_id', v_synthetic_race_id)
            );
        ELSE
            -- Use existing candidate ID from e_race_candidates
            v_race_candidate_id := (v_ai_candidate->>'candidate_id')::UUID;

            -- Look up the actual candidate ID from e_race_candidates
            SELECT candidate_id INTO v_candidate_id
            FROM public.e_race_candidates
            WHERE id = v_race_candidate_id;

            -- If not found, the candidate_id might be the actual candidate ID
            IF v_candidate_id IS NULL THEN
                v_candidate_id := v_race_candidate_id;
            END IF;
        END IF;

        -- Generate IDs for junction tables
        v_candidate_result_id := gen_random_uuid();
        v_race_candidate_id := gen_random_uuid();

        -- Create candidate result
        INSERT INTO public.e_candidate_results (
            id,
            race_result_id,
            candidate_id,
            votes,
            vote_percentage,
            electoral_votes,
            winner,
            metadata
        ) VALUES (
            v_candidate_result_id,
            v_race_result_id,
            v_candidate_id,
            COALESCE((v_ai_candidate->'metadata'->>'votes')::INT, 0),
            COALESCE((v_ai_candidate->'metadata'->>'vote_percentage')::DECIMAL, 0),
            COALESCE((v_ai_candidate->'metadata'->>'electoral_votes')::INT, 0),
            COALESCE((v_ai_candidate->'metadata'->>'winner')::BOOLEAN, false),
            jsonb_build_object('synthetic', true, 'synthetic_race_id', v_synthetic_race_id)
        );

        -- Create race candidate junction
        INSERT INTO public.e_race_candidates (
            id,
            race_id,
            candidate_id,
            ballot_order,
            withdrew,
            write_in
        ) VALUES (
            v_race_candidate_id,
            v_race_id,
            v_candidate_id,
            COALESCE((v_ai_candidate->>'ballot_order')::INT, 1),
            COALESCE((v_ai_candidate->>'withdrew')::BOOLEAN, false),
            COALESCE((v_ai_candidate->>'write_in')::BOOLEAN, false)
        );
    END LOOP;

    -- Process county results if present
    FOR v_county_result IN SELECT * FROM jsonb_array_elements(COALESCE(p_ai_response->'county_results', '[]'::jsonb))
    LOOP
        -- Get or create county division
        v_county_division_id := (v_county_result->>'division_id')::UUID;

        IF v_county_division_id IS NOT NULL THEN
            v_county_race_result_id := gen_random_uuid();

            -- Create county-level race result
            INSERT INTO public.e_race_results (
                id,
                race_id,
                division_id,
                reporting_level,
                precincts_reporting,
                precincts_total,
                percent_reporting,
                total_votes,
                called,
                called_status,
                metadata
            ) VALUES (
                v_county_race_result_id,
                v_race_id,
                v_county_division_id,
                'county',
                COALESCE((v_county_result->>'precincts_reporting')::INT, 0),
                COALESCE((v_county_result->>'precincts_total')::INT, 0),
                CASE
                    WHEN (v_county_result->>'precincts_total')::INT > 0
                    THEN ((v_county_result->>'precincts_reporting')::DECIMAL / (v_county_result->>'precincts_total')::DECIMAL) * 100
                    ELSE 100
                END,
                COALESCE((v_county_result->>'total_votes')::INT, 0),
                true,
                'CALLED',
                jsonb_build_object('synthetic', true, 'synthetic_race_id', v_synthetic_race_id)
            ) ON CONFLICT (race_id, division_id, reporting_level) DO UPDATE
            SET total_votes = EXCLUDED.total_votes,
                precincts_reporting = EXCLUDED.precincts_reporting;

            -- Process county candidate results
            FOR v_county_candidate IN SELECT * FROM jsonb_array_elements(v_county_result->'results')
            LOOP
                v_candidate_result_id := gen_random_uuid();

                -- Look up candidate ID
                v_race_candidate_id := (v_county_candidate->>'candidate_id')::UUID;
                SELECT candidate_id INTO v_candidate_id
                FROM public.e_race_candidates
                WHERE id = v_race_candidate_id;

                IF v_candidate_id IS NULL THEN
                    v_candidate_id := v_race_candidate_id;
                END IF;

                -- Create county candidate result
                INSERT INTO public.e_candidate_results (
                    id,
                    race_result_id,
                    candidate_id,
                    votes,
                    vote_percentage,
                    rank,
                    metadata
                ) VALUES (
                    v_candidate_result_id,
                    v_county_race_result_id,
                    v_candidate_id,
                    COALESCE((v_county_candidate->>'votes')::INT, 0),
                    CASE
                        WHEN (v_county_result->>'total_votes')::INT > 0
                        THEN ((v_county_candidate->>'votes')::DECIMAL / (v_county_result->>'total_votes')::DECIMAL) * 100
                        ELSE 0
                    END,
                    COALESCE((v_county_candidate->>'rank')::INT, NULL),
                    jsonb_build_object('synthetic', true, 'synthetic_race_id', v_synthetic_race_id)
                ) ON CONFLICT (race_result_id, candidate_id) DO UPDATE
                SET votes = EXCLUDED.votes,
                    vote_percentage = EXCLUDED.vote_percentage;
            END LOOP;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'synthetic_race_id', v_synthetic_race_id,
        'race_id', v_race_id,
        'election_id', v_election_id,
        'race_result_id', v_race_result_id,
        'group_id', p_synthetic_group_id
    );
END;
$$;


ALTER FUNCTION "public"."e_create_synthetic_race"("p_user_id" "uuid", "p_base_race_id" "uuid", "p_base_election_id" "uuid", "p_name" character varying, "p_description" "text", "p_scenario_input" "jsonb", "p_ai_response" "jsonb", "p_office" character varying, "p_state" character varying, "p_district" character varying, "p_summary" "jsonb", "p_synthetic_group_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."e_create_synthetic_race"("p_user_id" "uuid", "p_base_race_id" "uuid", "p_base_election_id" "uuid", "p_name" character varying, "p_description" "text", "p_scenario_input" "jsonb", "p_ai_response" "jsonb", "p_office" character varying, "p_state" character varying, "p_district" character varying, "p_summary" "jsonb", "p_synthetic_group_id" "uuid") IS 'Creates a synthetic election race with full results data. Accepts a p_synthetic_group_id parameter to organize synthetic races into groups/versions.';



CREATE OR REPLACE FUNCTION "public"."e_delete_synthetic_group"("p_group_id" "uuid", "p_cascade_delete_races" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_race_count INTEGER;
    v_group_name VARCHAR;
BEGIN
    -- Get group info
    SELECT name INTO v_group_name FROM public.e_synthetic_groups WHERE id = p_group_id;

    IF v_group_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Group not found');
    END IF;

    -- Don't allow deleting the default group
    IF p_group_id = 'a0000000-0000-0000-0000-000000000001' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot delete the default group');
    END IF;

    -- Count races in this group
    SELECT COUNT(*) INTO v_race_count
    FROM public.e_synthetic_races
    WHERE synthetic_group_id = p_group_id;

    IF v_race_count > 0 AND NOT p_cascade_delete_races THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Group has ' || v_race_count || ' races. Set cascade_delete_races to true to delete them.',
            'race_count', v_race_count
        );
    END IF;

    -- Delete races if cascade is enabled
    IF p_cascade_delete_races AND v_race_count > 0 THEN
        -- Delete all synthetic races in this group using the existing RPC
        PERFORM public.e_delete_synthetic_race(sr.id)
        FROM public.e_synthetic_races sr
        WHERE sr.synthetic_group_id = p_group_id;
    END IF;

    -- Delete the group
    DELETE FROM public.e_synthetic_groups WHERE id = p_group_id;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_group', v_group_name,
        'deleted_races', v_race_count
    );
END;
$$;


ALTER FUNCTION "public"."e_delete_synthetic_group"("p_group_id" "uuid", "p_cascade_delete_races" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_delete_synthetic_race"("p_user_id" "uuid" DEFAULT NULL::"uuid", "p_synthetic_race_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Delete candidate-level results
  DELETE FROM e_synthetic_candidate_results
  WHERE synthetic_race_id = p_synthetic_race_id;

  -- Delete county-level results
  DELETE FROM e_synthetic_race_results
  WHERE synthetic_race_id = p_synthetic_race_id;

  -- Delete race candidates
  DELETE FROM e_synthetic_race_candidates
  WHERE synthetic_race_id = p_synthetic_race_id;

  -- Delete the race itself
  DELETE FROM e_synthetic_races
  WHERE id = p_synthetic_race_id;

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."e_delete_synthetic_race"("p_user_id" "uuid", "p_synthetic_race_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_get_effective_value"("original_value" "anyelement", "override_value" "anyelement") RETURNS "anyelement"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    RETURN COALESCE(override_value, original_value);
END;
$$;


ALTER FUNCTION "public"."e_get_effective_value"("original_value" "anyelement", "override_value" "anyelement") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_get_race_counties"("p_race_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'race_result_id', rr.id,
      'division_id', rr.division_id,
      'county_name', gd.name,
      'county_fips', gd.fips,
      'county_code', gd.code,
      'level', gd.level,
      'precincts_reporting', rr.precincts_reporting,
      'precincts_total', rr.precincts_total,
      'percent_reporting', rr.percent_reporting,
      'registered_voters', rr.registered_voters,
      'total_votes', rr.total_votes,
      'winner_candidate_id', rr.winner_candidate_id
    )
  )
  INTO result
  FROM e_race_results rr
  LEFT JOIN e_geographic_divisions gd ON gd.id = rr.division_id
  WHERE rr.race_id = p_race_id
    AND rr.reporting_level = 'county';

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;


ALTER FUNCTION "public"."e_get_race_counties"("p_race_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_get_synthetic_race_full"("p_synthetic_race_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  race_row jsonb;
  candidate_rows jsonb;
  county_rows jsonb;
BEGIN
  ---------------------------------------------------------
  -- 1. Fetch the main synthetic race (INCLUDING SUMMARY)
  ---------------------------------------------------------
  SELECT to_jsonb(r)
  INTO race_row
  FROM e_synthetic_races r
  WHERE r.id = p_synthetic_race_id;

  IF race_row IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Synthetic race not found'
    );
  END IF;

  ---------------------------------------------------------
  -- 2. Fetch all candidates for the synthetic race
  ---------------------------------------------------------
  SELECT jsonb_agg(to_jsonb(c))
  INTO candidate_rows
  FROM e_synthetic_race_candidates c
  WHERE c.synthetic_race_id = p_synthetic_race_id;

  ---------------------------------------------------------
  -- 3. Fetch county-level results (if any)
  ---------------------------------------------------------
  SELECT jsonb_agg(to_jsonb(cr))
  INTO county_rows
  FROM e_synthetic_race_results cr
  WHERE cr.synthetic_race_id = p_synthetic_race_id;

  ---------------------------------------------------------
  -- 4. Return complete bundle
  ---------------------------------------------------------
  RETURN jsonb_build_object(
    'race', race_row,
    'candidates', COALESCE(candidate_rows, '[]'::jsonb),
    'counties', COALESCE(county_rows, '[]'::jsonb)
  );
END;
$$;


ALTER FUNCTION "public"."e_get_synthetic_race_full"("p_synthetic_race_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_get_synthetic_races"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  result jsonb;
begin
  with race_data as (
    select
      sr.id,
      sr.name,
      sr.state,
      sr.office,
      sr.summary,
      sr.district,
      sr.description,
      sr.base_race_id,
      sr.base_election_id,
      sr.scenario_input,
      sr.created_at,

      -- =============================
      -- CANDIDATES (with e_candidates data)
      -- =============================
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', src.id,
            'candidate_id', src.candidate_id,
            'ballot_order', src.ballot_order,
            'withdrew', src.withdrew,
            'write_in', src.write_in,
            'metadata', src.metadata,

            'candidate',
              jsonb_build_object(
                'full_name', c.full_name,
                'party_id', c.party_id,
                'photo_url', c.photo_url,
                'photo_thumbnail_url', c.photo_thumbnail_url
              )
          )
        )
        from e_synthetic_race_candidates src
        left join e_candidates c
          on c.candidate_id = src.candidate_id::text  -- FIX: cast uuid → text
        where src.synthetic_race_id = sr.id
      ) as candidates,

      -- =============================
      -- COUNTY RESULTS
      -- =============================
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'division_id', r.division_id,
            'total_votes', r.total_votes,
            'reporting_level', r.reporting_level,
            'metadata', r.metadata,
            'candidate_results',
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'candidate_id', cr.candidate_id,
                    'votes', cr.votes,
                    'vote_percentage', cr.vote_percentage,
                    'winner', cr.winner,
                    'metadata', cr.metadata
                  )
                )
                from e_synthetic_candidate_results cr
                where cr.synthetic_race_id = sr.id
                  and cr.division_id = r.division_id
              )
          )
        )
        from e_synthetic_race_results r
        where r.synthetic_race_id = sr.id
      ) as county_results

    from e_synthetic_races sr
    order by sr.created_at desc
  )

  select jsonb_agg(to_jsonb(race_data))
  into result
  from race_data;

  return coalesce(result, '[]'::jsonb);
end;
$$;


ALTER FUNCTION "public"."e_get_synthetic_races"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_list_synthetic_groups"() RETURNS TABLE("id" "uuid", "name" character varying, "description" "text", "created_by" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "race_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        g.id,
        g.name,
        g.description,
        g.created_by,
        g.created_at,
        g.updated_at,
        COALESCE(COUNT(sr.id), 0) as race_count
    FROM public.e_synthetic_groups g
    LEFT JOIN public.e_synthetic_races sr ON sr.synthetic_group_id = g.id
    GROUP BY g.id, g.name, g.description, g.created_by, g.created_at, g.updated_at
    ORDER BY g.name;
END;
$$;


ALTER FUNCTION "public"."e_list_synthetic_groups"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_list_synthetic_races"() RETURNS TABLE("synthetic_race_id" "uuid", "name" character varying, "description" "text", "office" character varying, "state" character varying, "district" character varying, "group_id" "uuid", "group_name" character varying, "created_at" timestamp with time zone, "created_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        sr.id as synthetic_race_id,
        sr.name,
        sr.description,
        sr.office,
        sr.state,
        sr.district,
        sr.synthetic_group_id as group_id,
        g.name as group_name,
        sr.created_at,
        sr.created_by
    FROM public.e_synthetic_races sr
    LEFT JOIN public.e_synthetic_groups g ON g.id = sr.synthetic_group_id
    ORDER BY sr.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."e_list_synthetic_races"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_synthetic_races" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "base_race_id" "uuid",
    "base_election_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "scenario_input" "jsonb",
    "ai_response_raw" "jsonb",
    "summary" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "office" "text",
    "state" "text",
    "district" "text",
    "synthetic_group_id" "uuid" DEFAULT 'a0000000-0000-0000-0000-000000000001'::"uuid",
    "ai_response" "jsonb",
    "created_by" "uuid"
);


ALTER TABLE "public"."e_synthetic_races" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_list_synthetic_races"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "public"."e_synthetic_races"
    LANGUAGE "sql"
    AS $$
  SELECT *
  FROM e_synthetic_races
  WHERE (p_user_id IS NULL OR user_id = p_user_id)
  ORDER BY created_at DESC;
$$;


ALTER FUNCTION "public"."e_list_synthetic_races"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_list_synthetic_races_by_group"("p_group_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("synthetic_race_id" "uuid", "name" "text", "description" "text", "office" "text", "state" "text", "district" "text", "group_id" "uuid", "group_name" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        sr.id as synthetic_race_id,
        sr.name::TEXT,
        sr.description::TEXT,
        sr.office::TEXT,
        sr.state::TEXT,
        sr.district::TEXT,
        sr.synthetic_group_id as group_id,
        g.name::TEXT as group_name,
        sr.created_at
    FROM public.e_synthetic_races sr
    LEFT JOIN public.e_synthetic_groups g ON g.id = sr.synthetic_group_id
    WHERE p_group_id IS NULL OR sr.synthetic_group_id = p_group_id
    ORDER BY sr.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."e_list_synthetic_races_by_group"("p_group_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."e_list_synthetic_races_by_group"("p_group_id" "uuid") IS 'List synthetic races filtered by group ID. Returns all races if p_group_id is NULL.';



CREATE OR REPLACE FUNCTION "public"."e_log_override_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    changed_fields JSONB = '{}';
    field_name TEXT;
    old_val TEXT;
    new_val TEXT;
BEGIN
    -- Check each override field for changes
    IF TG_TABLE_NAME = 'e_race_results' THEN
        -- Check each override field
        IF OLD.precincts_reporting_override IS DISTINCT FROM NEW.precincts_reporting_override THEN
            INSERT INTO e_election_data_overrides_log (
                table_name, record_id, field_name,
                original_value, override_value, previous_override_value,
                action, reason, performed_by, created_at
            ) VALUES (
                TG_TABLE_NAME, NEW.id, 'precincts_reporting',
                OLD.precincts_reporting::TEXT,
                NEW.precincts_reporting_override::TEXT,
                OLD.precincts_reporting_override::TEXT,
                CASE WHEN OLD.precincts_reporting_override IS NULL THEN 'create' ELSE 'update' END,
                NEW.override_reason,
                NEW.override_by,
                NOW()
            );
        END IF;
        
        -- Repeat for other override fields...
        -- (You can add similar checks for all override fields)
        
    ELSIF TG_TABLE_NAME = 'e_candidate_results' THEN
        -- Similar logic for candidate_results overrides
        IF OLD.votes_override IS DISTINCT FROM NEW.votes_override THEN
            INSERT INTO e_election_data_overrides_log (
                table_name, record_id, field_name,
                original_value, override_value, previous_override_value,
                action, reason, performed_by, created_at
            ) VALUES (
                TG_TABLE_NAME, NEW.id, 'votes',
                OLD.votes::TEXT,
                NEW.votes_override::TEXT,
                OLD.votes_override::TEXT,
                CASE WHEN OLD.votes_override IS NULL THEN 'create' ELSE 'update' END,
                NEW.override_reason,
                NEW.override_by,
                NOW()
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."e_log_override_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_merge_parties"("source_party_id" "uuid", "target_party_id" "uuid", "update_references" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    result JSONB;
    candidates_updated INTEGER := 0;
    merged_data JSONB;
BEGIN
    -- Merge metadata and arrays from source into target
    UPDATE public.e_parties 
    SET 
        media_assets = target.media_assets || source.media_assets,
        policy_priorities = array_distinct(target.policy_priorities || source.policy_priorities),
        coalition_partners = array_distinct(target.coalition_partners || source.coalition_partners),
        affiliated_organizations = target.affiliated_organizations || source.affiliated_organizations,
        electoral_performance = target.electoral_performance || source.electoral_performance,
        metadata = target.metadata || source.metadata,
        updated_at = NOW()
    FROM parties source, parties target
    WHERE source.id = source_party_id 
    AND target.id = target_party_id
    AND parties.id = target_party_id;
    
    -- Update references if requested
    IF update_references THEN
        UPDATE public.e_candidates 
        SET party_id = target_party_id 
        WHERE party_id = source_party_id;
        
        GET DIAGNOSTICS candidates_updated = ROW_COUNT;
    END IF;
    
    -- Mark source party as inactive
    UPDATE public.e_parties 
    SET 
        active = false,
        successor_party_id = target_party_id,
        updated_at = NOW()
    WHERE id = source_party_id;
    
    -- Return result summary
    result := jsonb_build_object(
        'success', true,
        'source_party_id', source_party_id,
        'target_party_id', target_party_id,
        'candidates_updated', candidates_updated,
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."e_merge_parties"("source_party_id" "uuid", "target_party_id" "uuid", "update_references" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_rename_synthetic_group"("p_group_id" "uuid", "p_new_name" character varying, "p_new_description" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.e_synthetic_groups
    SET
        name = p_new_name,
        description = COALESCE(p_new_description, description),
        updated_at = NOW()
    WHERE id = p_group_id;

    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."e_rename_synthetic_group"("p_group_id" "uuid", "p_new_name" character varying, "p_new_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_search_candidates"("p_query" "text") RETURNS TABLE("id" "uuid", "candidate_id" "text", "full_name" "text", "display_name" "text", "short_name" "text", "party_id" "uuid", "party_name" "text", "party_abbreviation" "text", "photo_url" "text")
    LANGUAGE "sql"
    AS $$
  SELECT 
    c.id,
    c.candidate_id,
    c.full_name,
    c.display_name,
    c.short_name,
    c.party_id,
    p.name AS party_name,
    p.abbreviation AS party_abbreviation,
    c.photo_url
  FROM public.e_candidates c
  LEFT JOIN public.e_parties p 
    ON p.id = c.party_id
  WHERE 
    to_tsvector(
      'english',
      coalesce(c.first_name, '') || ' ' ||
      coalesce(c.last_name, '') || ' ' ||
      coalesce(c.full_name, '') || ' ' ||
      coalesce(c.display_name, '') || ' ' ||
      coalesce(c.short_name, '')
    ) @@ plainto_tsquery('english', p_query)
    OR c.full_name ILIKE '%' || p_query || '%'
    OR c.display_name ILIKE '%' || p_query || '%'
    OR c.short_name ILIKE '%' || p_query || '%'
  ORDER BY c.full_name ASC
  LIMIT 25;
$$;


ALTER FUNCTION "public"."e_search_candidates"("p_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."e_update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."e_update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_active_playout"("p_channel_id" "uuid", "p_layer_index" integer, "p_end_reason" "text" DEFAULT 'replaced'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE pulsar_playout_log
  SET
    ended_at = NOW(),
    duration_ms = EXTRACT(EPOCH FROM (NOW() - COALESCE(started_at, created_at, NOW()))) * 1000,
    end_reason = p_end_reason
  WHERE
    channel_id = p_channel_id
    AND layer_index = p_layer_index
    AND ended_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."end_active_playout"("p_channel_id" "uuid", "p_layer_index" integer, "p_end_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_all_channel_playout"("p_channel_id" "uuid", "p_end_reason" "text" DEFAULT 'channel_offline'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE pulsar_playout_log
  SET
    ended_at = NOW(),
    duration_ms = EXTRACT(EPOCH FROM (NOW() - COALESCE(started_at, created_at, NOW()))) * 1000,
    end_reason = p_end_reason
  WHERE
    channel_id = p_channel_id
    AND ended_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."end_all_channel_playout"("p_channel_id" "uuid", "p_end_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_schema_not_null"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.schema IS NULL THEN
    NEW.schema := '{}'::jsonb;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_schema_not_null"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_default_sponsor_per_category"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    new_category_normalized TEXT;
    existing_category_normalized TEXT;
BEGIN
    IF NEW.is_default = true THEN
        -- Normalize empty string to NULL for comparison
        new_category_normalized := NULLIF(TRIM(COALESCE(NEW.category, '')), '');

        -- Set all other schedules for channels in this schedule's channel_ids array
        -- with the SAME category to not default
        -- Using jsonb_array_elements_text to check channel overlap
        UPDATE public.sponsor_schedules
        SET is_default = false
        WHERE id != NEW.id
          AND is_default = true
          AND (
            -- Same category (treat NULL and empty string as equivalent)
            NULLIF(TRIM(COALESCE(category, '')), '') IS NOT DISTINCT FROM new_category_normalized
          )
          AND EXISTS (
            -- Check if there's any overlap in channel_ids
            SELECT 1
            FROM jsonb_array_elements_text(channel_ids) AS existing_channel
            WHERE existing_channel::text IN (
              SELECT jsonb_array_elements_text(NEW.channel_ids)::text
            )
          );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_default_sponsor_per_category"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_default_template"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If setting a template as default, unset all others for this user
  IF NEW.is_default = TRUE THEN
    UPDATE templates
    SET is_default = FALSE
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_default_template"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fetch_bop_data"("p_election_year" integer DEFAULT NULL::integer, "p_race_type" character varying DEFAULT NULL::character varying) RETURNS TABLE("election_year" integer, "race_type" character varying, "party_name" character varying, "won" integer, "leading" integer, "holdovers" integer, "winning_trend" integer, "current_seats" integer, "insufficient_vote" integer, "total_seats" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "statement_timeout" TO '10s'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.election_year,
        r.race_type,
        p.party_name,
        p.won,
        p.leading,
        p.holdovers,
        p.winning_trend,
        p.current_seats,
        p.insufficient_vote,
        -- Calculate total seats (for majority calculation)
        CASE
            WHEN r.race_type = 'senate' THEN 100
            WHEN r.race_type = 'house' THEN 435
            ELSE 0
        END as total_seats
    FROM public.bop_party_results p
    INNER JOIN public.bop_election_results r ON r.id = p.election_result_id
    WHERE
        (p_election_year IS NULL OR r.election_year = p_election_year)
        AND (p_race_type IS NULL OR r.race_type = p_race_type)
    ORDER BY r.election_year DESC, r.race_type, p.party_name;
END;
$$;


ALTER FUNCTION "public"."fetch_bop_data"("p_election_year" integer, "p_race_type" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fetch_bop_data"("p_election_year" integer, "p_race_type" character varying) IS 'Fetches Balance of Power data for specified election year and race type. Returns party seat counts and trends.';



CREATE OR REPLACE FUNCTION "public"."fetch_county_data_extended"("p_race_type" "text", "p_year" integer, "p_state" "text" DEFAULT 'all'::"text", "p_offset" integer DEFAULT 0, "p_limit" integer DEFAULT 5000) RETURNS TABLE("votes" integer, "vote_percentage" numeric, "winner" boolean, "candidate_id" "text", "full_name" "text", "incumbent" boolean, "photo_url" "text", "party_abbreviation" "text", "party_name" "text", "color_hex" "text", "state_code" "text", "fips_code" "text", "county_name" "text", "election_year" integer, "election_name" "text", "percent_reporting" numeric, "division_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "statement_timeout" TO '60s'
    AS $$
BEGIN
  SET LOCAL statement_timeout = '60s';

  RETURN QUERY
  SELECT
    cr.votes::INT,
    cr.vote_percentage::DECIMAL,
    cr.winner::BOOLEAN,
    c.id::TEXT,
    COALESCE(NULLIF(c.display_name, ''), c.full_name)::TEXT AS full_name,
    COALESCE(c.incumbent_override, c.incumbent)::BOOLEAN AS incumbent,
    c.photo_url::TEXT,
    p.abbreviation::TEXT,
    COALESCE(NULLIF(p.display_name, ''), p.name)::TEXT AS party_name,
    p.color_hex::TEXT,
    -- Get state code from the county's code (first 2 chars) or from parent state
    COALESCE(SUBSTRING(gd_county.code, 1, 2), gd_state.code)::TEXT AS state_code,
    gd_county.fips_code::TEXT,
    gd_county.name::TEXT AS county_name,
    e.year::INT,
    e.name::TEXT,
    rr.percent_reporting::DECIMAL,
    gd_county.id AS division_id
  FROM e_candidate_results_effective cr
  JOIN e_candidates c ON cr.candidate_id = c.id
  JOIN e_parties p ON c.party_id = p.id
  JOIN e_race_results_effective rr ON cr.race_result_id = rr.id
  JOIN e_races r ON rr.race_id = r.id
  -- Join county division from race_results, not races
  JOIN e_geographic_divisions gd_county ON rr.division_id = gd_county.id
  -- Join state division from races for filtering
  JOIN e_geographic_divisions gd_state ON r.division_id = gd_state.id
  JOIN e_elections e ON r.election_id = e.id
  WHERE
    r.type = p_race_type
    AND gd_county.type = 'county'  -- Filter for county-level results
    AND e.year = p_year
    AND (p_state = 'all' OR SUBSTRING(gd_county.code, 1, 2) = p_state OR gd_state.code = p_state)
  ORDER BY cr.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."fetch_county_data_extended"("p_race_type" "text", "p_year" integer, "p_state" "text", "p_offset" integer, "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fetch_county_data_extended"("p_race_type" "text", "p_year" integer, "p_state" "text", "p_offset" integer, "p_limit" integer) IS 'Fetches county-level election results. Joins on e_race_results.division_id (county level) instead of e_races.division_id (state level for presidential races).';



CREATE OR REPLACE FUNCTION "public"."fetch_election_data_for_api"("p_year" integer DEFAULT NULL::integer, "p_race_type" character varying DEFAULT NULL::character varying, "p_level" character varying DEFAULT NULL::character varying, "p_state" character varying DEFAULT NULL::character varying) RETURNS TABLE("last_fetch_at" timestamp with time zone, "election_id" character varying, "election_name" "text", "year" integer, "race_id" "uuid", "race_race_id" character varying, "race_name" character varying, "race_display_name" character varying, "office" character varying, "race_type" character varying, "num_elect" integer, "uncontested" boolean, "division_type" character varying, "state_code" character varying, "fips_code" character varying, "race_results_id" "uuid", "called" boolean, "called_status" character varying, "percent_reporting" numeric, "last_updated" timestamp with time zone, "precincts_reporting" integer, "precincts_total" integer, "called_timestamp" timestamp with time zone, "total_votes" integer, "candidate_id" character varying, "full_name" character varying, "first_name" character varying, "last_name" character varying, "candidate_display_name" character varying, "party_code" character varying, "party_name" character varying, "party_color_primary" character varying, "party_color_secondary" character varying, "party_color_light" character varying, "party_color_dark" character varying, "party_short_name" character varying, "party_display_name" character varying, "party_founded_year" character varying, "party_description" "text", "party_ideology" character varying, "party_headquarters" "text", "party_history" "text", "party_website" character varying, "party_twitter" character varying, "party_facebook" character varying, "party_instagram" character varying, "party_leadership" "jsonb", "party_abbreviations" "text"[], "party_aliases" "text"[], "candidate_results_id" "uuid", "votes" integer, "vote_percentage" numeric, "incumbent" boolean, "winner" boolean, "photo_url" character varying, "race_candidates_id" "uuid", "ballot_order" integer, "withdrew" boolean, "electoral_votes" integer, "state_electoral_votes" integer, "bio" "text", "date_of_birth" "date", "bio_short" "text", "education" "text"[], "professional_background" "text"[], "political_experience" "text"[], "website" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "statement_timeout" TO '30s'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.last_fetch_at,
        e.election_id,
        e.name::TEXT as election_name,
        e.year,
        r.id as race_id,
        r.race_id as race_race_id,
        r.name as race_name,
        r.display_name as race_display_name,
        r.office,
        r.type as race_type,
        r.num_elect,
        r.uncontested,
        d.type as division_type,
        d.code as state_code,
        d.fips_code,

        -- Race result values (using effective view with overrides applied)
        rr.id as race_results_id,
        rre.called,
        rre.called_status,
        rre.percent_reporting,
        rr.last_updated,
        rre.precincts_reporting,
        rre.precincts_total,
        rre.called_timestamp,
        rre.total_votes,

        -- Candidate info
        c.candidate_id,
        c.full_name,
        c.first_name,
        c.last_name,
        c.display_name as candidate_display_name,
        p.abbreviation as party_code,
        p.name as party_name,
        p.color_hex as party_color_primary,
        p.color_secondary_hex as party_color_secondary,
        COALESCE((p.color_palette->>'light')::VARCHAR, NULL) as party_color_light,
        COALESCE((p.color_palette->>'dark')::VARCHAR, NULL) as party_color_dark,

        -- Additional party fields
        p.short_name as party_short_name,
        p.display_name as party_display_name,
        p.founded_year as party_founded_year,
        p.description as party_description,
        p.ideology as party_ideology,
        p.headquarters_address as party_headquarters,
        p.historical_overview as party_history,
        p.website as party_website,
        p.twitter_handle as party_twitter,
        p.facebook_page as party_facebook,
        p.instagram_handle as party_instagram,
        p.leadership_structure as party_leadership,
        p.policy_priorities as party_abbreviations,
        p.coalition_partners as party_aliases,

        -- Candidate result values (using effective view with overrides applied)
        cr.id as candidate_results_id,
        cre.votes,
        cre.vote_percentage,
        COALESCE(c.incumbent_override, c.incumbent) as incumbent,
        cre.winner,
        c.photo_url,
        rc.id as race_candidates_id,
        rc.ballot_order,
        COALESCE(rc.withdrew_override, rc.withdrew) as withdrew,
        cre.electoral_votes::INTEGER,
        (r.metadata->>'electoral_votes')::INTEGER AS state_electoral_votes,

        -- Additional candidate profile fields
        c.bio,
        c.date_of_birth,
        c.bio_short,
        c.education,
        c.professional_background,
        c.political_experience,
        c.website

    FROM public.e_race_results rr
    INNER JOIN public.e_race_results_effective rre ON rre.id = rr.id
    INNER JOIN public.e_candidate_results cr ON cr.race_result_id = rr.id
    INNER JOIN public.e_candidate_results_effective cre ON cre.id = cr.id
    INNER JOIN public.e_candidates c ON c.id = cr.candidate_id
    INNER JOIN public.e_parties p ON p.id = c.party_id
    INNER JOIN public.e_races r ON r.id = rr.race_id
    INNER JOIN public.e_elections e ON r.election_id = e.id
    INNER JOIN public.e_geographic_divisions d ON r.division_id = d.id
    INNER JOIN public.e_election_data_sources s ON s.election_id = e.id
    INNER JOIN public.e_race_candidates rc ON rc.race_id = r.id AND rc.candidate_id = c.id
    WHERE s.provider = 'ap'
      AND (p_year IS NULL OR e.year = p_year)
      AND (p_race_type IS NULL OR r.type = p_race_type)
      AND (p_level IS NULL OR d.type = p_level)
      AND (
        p_state IS NULL
        OR p_state = 'all'
        OR (
          -- For state-level divisions, match the state code directly
          (d.type = 'state' AND d.code = p_state)
          -- For district-level divisions (House races), match the first 2 characters of the code
          OR (d.type = 'district' AND LEFT(d.code, 2) = p_state)
          -- For county-level divisions, match the state code portion
          OR (d.type = 'county' AND LEFT(d.code, 2) = p_state)
        )
      )
    ORDER BY
      e.year DESC,
      r.type,
      CASE
        WHEN d.type = 'national' THEN '00'
        ELSE d.code
      END,
      CASE
        WHEN d.type = 'district' THEN LPAD(RIGHT(d.fips_code, 2), 10, '0')
        WHEN d.type = 'county' THEN LPAD(d.fips_code, 10, '0')
        ELSE '0000000000'
      END,
      cre.votes DESC;
END;
$$;


ALTER FUNCTION "public"."fetch_election_data_for_api"("p_year" integer, "p_race_type" character varying, "p_level" character varying, "p_state" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fetch_election_data_for_api"("p_year" integer, "p_race_type" character varying, "p_level" character varying, "p_state" character varying) IS 'Fetches election data for API consumers with optional filters for year, race_type (presidential, senate, house), level (national, state, district, county), and state (two-letter state code or "all"). Returns data with all overrides already applied.';



CREATE OR REPLACE FUNCTION "public"."fetch_election_data_for_ui"("p_year" integer DEFAULT NULL::integer) RETURNS TABLE("last_fetch_at" timestamp with time zone, "election_id" character varying, "election_name" "text", "year" integer, "race_id" "uuid", "race_race_id" character varying, "race_name" character varying, "race_display_name" character varying, "office" character varying, "race_type" character varying, "num_elect" integer, "uncontested" boolean, "division_type" character varying, "state_code" character varying, "fips_code" character varying, "race_results_id" "uuid", "called" boolean, "called_status" character varying, "percent_reporting" numeric, "last_updated" timestamp with time zone, "precincts_reporting" integer, "precincts_total" integer, "called_timestamp" timestamp with time zone, "total_votes" integer, "called_override" boolean, "called_status_override" character varying, "percent_reporting_override" numeric, "precincts_reporting_override" integer, "precincts_total_override" integer, "called_override_timestamp" timestamp with time zone, "total_votes_override" integer, "candidate_id" character varying, "full_name" character varying, "first_name" character varying, "last_name" character varying, "candidate_display_name" character varying, "party_code" character varying, "party_name" character varying, "party_color_primary" character varying, "party_color_secondary" character varying, "party_color_light" character varying, "party_color_dark" character varying, "party_color_primary_override" character varying, "party_short_name" character varying, "party_display_name" character varying, "party_founded_year" character varying, "party_description" "text", "party_ideology" character varying, "party_headquarters" "text", "party_history" "text", "party_website" character varying, "party_twitter" character varying, "party_facebook" character varying, "party_instagram" character varying, "party_leadership" "jsonb", "party_abbreviations" "text"[], "party_aliases" "text"[], "candidate_results_id" "uuid", "votes" integer, "vote_percentage" numeric, "incumbent" boolean, "winner" boolean, "photo_url" character varying, "race_candidates_id" "uuid", "ballot_order" integer, "withdrew" boolean, "electoral_votes" integer, "state_electoral_votes" integer, "bio" "text", "date_of_birth" "date", "bio_short" "text", "education" "text"[], "professional_background" "text"[], "political_experience" "text"[], "website" character varying, "votes_override" integer, "vote_percentage_override" numeric, "winner_override" boolean, "electoral_votes_override" integer, "incumbent_override" boolean, "withdrew_override" boolean, "race_override_at" timestamp with time zone, "race_override_by" "uuid", "race_override_reason" "text", "candidate_override_at" timestamp with time zone, "candidate_override_by" "uuid", "candidate_override_reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "statement_timeout" TO '30s'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.last_fetch_at,
        e.election_id,
        e.name::TEXT as election_name,
        e.year,
        r.id as race_id,
        r.race_id as race_race_id,
        r.name as race_name,
        r.display_name as race_display_name,
        r.office,
        r.type as race_type,
        r.num_elect,
        r.uncontested,
        d.type as division_type,
        d.code as state_code,
        d.fips_code,

        -- Original race result values
        rr.id as race_results_id,
        rr.called,
        rr.called_status,
        rr.percent_reporting,
        rr.last_updated,
        rr.precincts_reporting,
        rr.precincts_total,
        rr.called_timestamp,
        rr.total_votes,

        -- Override values for race results
        rr.called_override,
        rr.called_status_override,
        rr.percent_reporting_override,
        rr.precincts_reporting_override,
        rr.precincts_total_override,
        rr.called_override_timestamp,
        rr.total_votes_override,

        -- Candidate info
        c.candidate_id,
        c.full_name,
        c.first_name,
        c.last_name,
        c.display_name as candidate_display_name,
        p.abbreviation as party_code,
        p.name as party_name,
        p.color_hex as party_color_primary,
        p.color_secondary_hex as party_color_secondary,
        COALESCE((p.color_palette->>'light')::VARCHAR, NULL) as party_color_light,
        COALESCE((p.color_palette->>'dark')::VARCHAR, NULL) as party_color_dark,

        -- Overrides
        COALESCE((p.color_palette->>'primary')::VARCHAR, NULL) as party_color_primary_override,

        -- Additional party fields
        p.short_name as party_short_name,
        p.display_name as party_display_name,
        p.founded_year as party_founded_year,
        p.description as party_description,
        p.ideology as party_ideology,
        p.headquarters_address as party_headquarters,
        p.historical_overview as party_history,
        p.website as party_website,
        p.twitter_handle as party_twitter,
        p.facebook_page as party_facebook,
        p.instagram_handle as party_instagram,
        p.leadership_structure as party_leadership,
        p.policy_priorities as party_abbreviations,
        p.coalition_partners as party_aliases,

        -- Original candidate result values
        cr.id as candidate_results_id,
        cr.votes,
        cr.vote_percentage,
        c.incumbent,
        cr.winner,
        c.photo_url,
        rc.id as race_candidates_id,
        rc.ballot_order,
        rc.withdrew,
        cr.electoral_votes::INTEGER,
        (r.metadata->>'electoral_votes')::INTEGER AS state_electoral_votes,

        -- Additional candidate profile fields
        c.bio,
        c.date_of_birth,
        c.bio_short,
        c.education,
        c.professional_background,
        c.political_experience,
        c.website,

        -- Override values for candidate results
        cr.votes_override,
        cr.vote_percentage_override,
        cr.winner_override,
        cr.electoral_votes_override::INTEGER,

        -- Override values for candidate results
        c.incumbent_override,

        -- Override values for race candidates
        rc.withdrew_override,

        -- Override metadata
        rr.override_at as race_override_at,
        rr.override_by as race_override_by,
        rr.override_reason as race_override_reason,
        cr.override_at as candidate_override_at,
        cr.override_by as candidate_override_by,
        cr.override_reason as candidate_override_reason

    FROM public.e_race_results rr
    INNER JOIN public.e_candidate_results cr ON cr.race_result_id = rr.id
    INNER JOIN public.e_candidates c ON c.id = cr.candidate_id
    INNER JOIN public.e_parties p ON p.id = c.party_id
    INNER JOIN public.e_races r ON r.id = rr.race_id
    INNER JOIN public.e_elections e ON r.election_id = e.id
    INNER JOIN public.e_geographic_divisions d ON r.division_id = d.id
    INNER JOIN public.e_election_data_sources s ON s.election_id = e.id
    INNER JOIN public.e_race_candidates rc ON rc.race_id = r.id AND rc.candidate_id = c.id
    WHERE r.type IN ('presidential', 'senate', 'house')
      AND (p_year IS NULL AND e.year >= 2012 OR p_year IS NOT NULL AND e.year = p_year)
      AND d.type IN ('national', 'state', 'district')
      AND s.provider = 'ap'
    ORDER BY
      e.year DESC,
      r.type,
      CASE
        WHEN d.type = 'national' THEN '00' -- National always first
        ELSE d.code
      END,
      CASE
        WHEN d.type = 'district' THEN RIGHT(d.fips_code, 2)::INTEGER -- Order districts by number
        ELSE 0
      END,
      cr.votes DESC;
END;
$$;


ALTER FUNCTION "public"."fetch_election_data_for_ui"("p_year" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fetch_election_data_for_ui"("p_year" integer) IS 'Fetches election data including override fields for UI display. Returns both original and override values for supported fields.';



CREATE OR REPLACE FUNCTION "public"."fetch_house_district_data_extended"("p_year" integer, "p_offset" integer DEFAULT 0, "p_limit" integer DEFAULT 5000) RETURNS TABLE("votes" integer, "vote_percentage" numeric, "winner" boolean, "candidate_id" "text", "full_name" "text", "incumbent" boolean, "photo_url" "text", "party_abbreviation" "text", "party_name" "text", "color_hex" "text", "fips_code" "text", "state_code" "text", "district_name" "text", "election_year" integer, "election_name" "text", "percent_reporting" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "statement_timeout" TO '60s'
    AS $$
BEGIN
  SET LOCAL statement_timeout = '60s';
  
  RETURN QUERY
  SELECT 
    cr.votes::INT,
    cr.vote_percentage::DECIMAL,
    cr.winner::BOOLEAN,
    c.id::TEXT,
    COALESCE(NULLIF(c.display_name, ''), c.full_name)::TEXT AS full_name,
    COALESCE(c.incumbent_override, c.incumbent)::BOOLEAN AS incumbent,
    c.photo_url::TEXT,
    p.abbreviation::TEXT,
    COALESCE(NULLIF(p.display_name, ''), p.name)::TEXT AS party_name,
    p.color_hex::TEXT,
    gd.fips_code::TEXT,
    gd.code::TEXT,
    gd.name::TEXT,
    e.year::INT,
    e.name::TEXT,
    rr.percent_reporting::DECIMAL
  FROM e_candidate_results_effective cr
  JOIN e_candidates c ON cr.candidate_id = c.id
  JOIN e_parties p ON c.party_id = p.id
  JOIN e_race_results_effective rr ON cr.race_result_id = rr.id
  JOIN e_races r ON rr.race_id = r.id
  JOIN e_geographic_divisions gd ON r.division_id = gd.id
  JOIN e_elections e ON r.election_id = e.id
  WHERE 
    r.type = 'house'
    AND gd.type = 'district'
    AND e.year = p_year
  ORDER BY cr.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."fetch_house_district_data_extended"("p_year" integer, "p_offset" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fetch_presidential_national_data_extended"("p_year" integer) RETURNS TABLE("votes" integer, "vote_percentage" numeric, "electoral_votes" integer, "winner" boolean, "candidate_id" "text", "full_name" "text", "incumbent" boolean, "photo_url" "text", "party_abbreviation" "text", "party_name" "text", "color_hex" "text", "state_code" "text", "state_name" "text", "state_type" "text", "election_year" integer, "election_name" "text", "state_electoral_votes" integer, "race_metadata" "jsonb", "percent_reporting" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "statement_timeout" TO '60s'
    AS $$
BEGIN
  SET LOCAL statement_timeout = '60s';
  
  RETURN QUERY
  SELECT 
    cr.votes::INT,
    cr.vote_percentage::DECIMAL,
    cr.electoral_votes::INT,
    cr.winner::BOOLEAN,
    c.id::TEXT,
    COALESCE(NULLIF(c.display_name, ''), c.full_name)::TEXT AS full_name,
    COALESCE(c.incumbent_override, c.incumbent)::BOOLEAN AS incumbent,
    c.photo_url::TEXT,
    p.abbreviation::TEXT,
    COALESCE(NULLIF(p.display_name, ''), p.name)::TEXT AS party_name,
    p.color_hex::TEXT,
    gd.code::TEXT,
    gd.name::TEXT,
    gd.type::TEXT,
    e.year::INT,
    e.name::TEXT,
    COALESCE((r.metadata->>'electoral_votes')::INT, 0) as state_electoral_votes,
    r.metadata,
    rr.percent_reporting
  FROM e_candidate_results_effective cr
  JOIN e_candidates c ON cr.candidate_id = c.id
  JOIN e_parties p ON c.party_id = p.id
  JOIN e_race_results_effective rr ON cr.race_result_id = rr.id
  JOIN e_races r ON rr.race_id = r.id
  JOIN e_geographic_divisions gd ON r.division_id = gd.id
  JOIN e_elections e ON r.election_id = e.id
  WHERE 
    r.type = 'presidential'
    AND gd.type = 'national'
    AND e.year = p_year
    AND p.abbreviation IN ('GOP', 'Dem')
  ORDER BY 
    gd.code ASC,  -- Sort by state code
    cr.votes DESC; -- Then by votes descending
END;
$$;


ALTER FUNCTION "public"."fetch_presidential_national_data_extended"("p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fetch_presidential_state_data_extended"("p_year" integer) RETURNS TABLE("votes" integer, "vote_percentage" numeric, "electoral_votes" integer, "winner" boolean, "candidate_id" "text", "full_name" "text", "incumbent" boolean, "photo_url" "text", "party_abbreviation" "text", "party_name" "text", "color_hex" "text", "state_code" "text", "state_name" "text", "state_type" "text", "election_year" integer, "election_name" "text", "state_electoral_votes" integer, "race_metadata" "jsonb", "percent_reporting" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "statement_timeout" TO '60s'
    AS $$
BEGIN
  SET LOCAL statement_timeout = '60s';
  
  RETURN QUERY
  SELECT 
    cr.votes::INT,
    cr.vote_percentage::DECIMAL,
    cr.electoral_votes::INT,
    cr.winner::BOOLEAN,
    c.id::TEXT,
    COALESCE(NULLIF(c.display_name, ''), c.full_name)::TEXT AS full_name,
    COALESCE(c.incumbent_override, c.incumbent)::BOOLEAN AS incumbent,
    c.photo_url::TEXT,
    p.abbreviation::TEXT,
    COALESCE(NULLIF(p.display_name, ''), p.name)::TEXT AS party_name,
    p.color_hex::TEXT,
    gd.code::TEXT,
    gd.name::TEXT,
    gd.type::TEXT,
    e.year::INT,
    e.name::TEXT,
    COALESCE((r.metadata->>'electoral_votes')::INT, 0) as state_electoral_votes,
    r.metadata,
    rr.percent_reporting
  FROM e_candidate_results_effective cr
  JOIN e_candidates c ON cr.candidate_id = c.id
  JOIN e_parties p ON c.party_id = p.id
  JOIN e_race_results_effective rr ON cr.race_result_id = rr.id
  JOIN e_races r ON rr.race_id = r.id
  JOIN e_geographic_divisions gd ON r.division_id = gd.id
  JOIN e_elections e ON r.election_id = e.id
  WHERE 
    r.type = 'presidential'
    AND gd.type = 'state'
    AND e.year = p_year
    AND p.abbreviation IN ('GOP', 'Dem')
  ORDER BY 
    gd.code ASC,  -- Sort by state code
    cr.votes DESC; -- Then by votes descending
END;
$$;


ALTER FUNCTION "public"."fetch_presidential_state_data_extended"("p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fetch_senate_state_data_extended"("p_year" integer) RETURNS TABLE("votes" integer, "vote_percentage" numeric, "winner" boolean, "candidate_id" "text", "full_name" "text", "incumbent" boolean, "photo_url" "text", "party_abbreviation" "text", "party_name" "text", "color_hex" "text", "state_code" "text", "state_name" "text", "state_type" "text", "election_year" integer, "election_name" "text", "race_metadata" "jsonb", "percent_reporting" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "statement_timeout" TO '60s'
    AS $$
BEGIN
  SET LOCAL statement_timeout = '60s';
  
  RETURN QUERY
  SELECT 
    cr.votes::INT,
    cr.vote_percentage::DECIMAL,
    cr.winner::BOOLEAN,
    c.id::TEXT,
    COALESCE(NULLIF(c.display_name, ''), c.full_name)::TEXT AS full_name,
    COALESCE(c.incumbent_override, c.incumbent)::BOOLEAN AS incumbent,
    c.photo_url::TEXT,
    p.abbreviation::TEXT,
    COALESCE(NULLIF(p.display_name, ''), p.name)::TEXT AS party_name,
    p.color_hex::TEXT,
    gd.code::TEXT,
    gd.name::TEXT,
    gd.type::TEXT,
    e.year::INT,
    e.name::TEXT,
    r.metadata,
    rr.percent_reporting
  FROM e_candidate_results_effective cr
  JOIN e_candidates c ON cr.candidate_id = c.id
  JOIN e_parties p ON c.party_id = p.id
  JOIN e_race_results_effective rr ON cr.race_result_id = rr.id
  JOIN e_races r ON rr.race_id = r.id
  JOIN e_geographic_divisions gd ON r.division_id = gd.id
  JOIN e_elections e ON r.election_id = e.id
  WHERE 
    r.type = 'senate'
    AND gd.type = 'state'
    AND e.year = p_year
  ORDER BY 
    gd.code ASC,  -- Sort by state code
    cr.votes DESC; -- Then by votes descending
END;
$$;


ALTER FUNCTION "public"."fetch_senate_state_data_extended"("p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fix_order_gaps"("table_name" "text", "parent_id_value" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  fixed_count INTEGER := 0;
  current_order INTEGER := 0;
  item RECORD;
BEGIN
  -- Build and execute dynamic query based on whether parent_id is provided
  IF parent_id_value IS NULL THEN
    -- Fix top-level items
    FOR item IN EXECUTE format('
      SELECT id, "order"
      FROM %I
      WHERE parent_id IS NULL
      ORDER BY "order", id',
      table_name
    ) LOOP
      EXECUTE format('UPDATE %I SET "order" = $1 WHERE id = $2', table_name)
      USING current_order, item.id;
      
      IF item.order != current_order THEN
        fixed_count := fixed_count + 1;
      END IF;
      
      current_order := current_order + 1;
    END LOOP;
  ELSE
    -- Fix child items
    FOR item IN EXECUTE format('
      SELECT id, "order"
      FROM %I
      WHERE parent_id = $1
      ORDER BY "order", id',
      table_name
    ) USING parent_id_value LOOP
      EXECUTE format('UPDATE %I SET "order" = $1 WHERE id = $2', table_name)
      USING current_order, item.id;
      
      IF item.order != current_order THEN
        fixed_count := fixed_count + 1;
      END IF;
      
      current_order := current_order + 1;
    END LOOP;
  END IF;
  
  RETURN fixed_count;
END;
$_$;


ALTER FUNCTION "public"."fix_order_gaps"("table_name" "text", "parent_id_value" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fix_order_gaps"("table_name" "text", "parent_id_value" "uuid") IS 'Utility function to fix order gaps in channels or content tables. Usage: SELECT fix_order_gaps(''channels'', parent_id) or SELECT fix_order_gaps(''channels'') for top-level items';



CREATE OR REPLACE FUNCTION "public"."get_active_feeds_by_category"("p_category" "text") RETURNS TABLE("id" "uuid", "name" "text", "type" "text", "configuration" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.name, f.type, f.configuration, f.created_at
  FROM feeds f
  WHERE f.category = p_category
    AND f.active = true
  ORDER BY f.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_active_feeds_by_category"("p_category" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_feeds_by_category"("p_category" "text") IS 'Returns all active feeds for a specific category';



CREATE OR REPLACE FUNCTION "public"."get_api_endpoint_dependencies"("p_endpoint_ids" "uuid"[]) RETURNS TABLE("endpoint_id" "uuid", "data_source_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT aes.endpoint_id, aes.data_source_id
  FROM api_endpoint_sources aes
  WHERE aes.endpoint_id = ANY(p_endpoint_ids)
    AND aes.data_source_id IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."get_api_endpoint_dependencies"("p_endpoint_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_competition_with_seasons"("p_competition_id" integer) RETURNS TABLE("competition_id" integer, "competition_name" character varying, "competition_sportradar_id" character varying, "category_name" character varying, "country_code" character varying, "seasons" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT l.id, l.name, l.sportradar_id, c.name, c.country_code,
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', s.id, 'sportradar_id', s.sportradar_id, 'name', s.name,
            'year', s.year, 'start_date', s.start_date, 'end_date', s.end_date, 'is_current', s.is_current
        ) ORDER BY s.start_date DESC) FILTER (WHERE s.id IS NOT NULL), '[]'::jsonb)
    FROM sports_leagues l
    LEFT JOIN sports_categories c ON l.category_id = c.id
    LEFT JOIN sports_seasons s ON s.league_id = l.id
    WHERE l.id = p_competition_id
    GROUP BY l.id, l.name, l.sportradar_id, c.name, c.country_code;
END;
$$;


ALTER FUNCTION "public"."get_competition_with_seasons"("p_competition_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_competitions"("p_sport" character varying DEFAULT 'football'::character varying, "p_active_only" boolean DEFAULT true) RETURNS TABLE("id" integer, "sportradar_id" character varying, "name" character varying, "alternative_name" character varying, "type" character varying, "gender" character varying, "sport" character varying, "logo_url" "text", "active" boolean, "category_name" character varying, "country_code" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT l.id, l.sportradar_id, l.name, l.alternative_name, l.type, l.gender, l.sport, l.logo_url, l.active, c.name, c.country_code
    FROM sports_leagues l
    LEFT JOIN sports_categories c ON l.category_id = c.id
    WHERE l.sport = p_sport AND (NOT p_active_only OR l.active = true)
    ORDER BY c.name, l.name;
END;
$$;


ALTER FUNCTION "public"."get_competitions"("p_sport" character varying, "p_active_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_season"("p_competition_id" integer) RETURNS TABLE("season_id" integer, "sportradar_id" character varying, "name" character varying, "year" character varying, "start_date" "date", "end_date" "date", "team_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.sportradar_id, s.name, s.year, s.start_date, s.end_date, COUNT(DISTINCT st.team_id)
    FROM sports_seasons s
    LEFT JOIN sports_season_teams st ON st.season_id = s.id
    WHERE s.league_id = p_competition_id AND s.is_current = true
    GROUP BY s.id, s.sportradar_id, s.name, s.year, s.start_date, s.end_date;
END;
$$;


ALTER FUNCTION "public"."get_current_season"("p_competition_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_stats"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'feeds', jsonb_build_object(
      'total', COUNT(*),
      'active', COUNT(*) FILTER (WHERE active = true)
    ),
    'stocks', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM alpaca_stocks),
      'gainers', (SELECT COUNT(*) FROM alpaca_stocks WHERE change_1d_pct > 0),
      'losers', (SELECT COUNT(*) FROM alpaca_stocks WHERE change_1d_pct < 0)
    ),
    'sports', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM sports_events),
      'live', (SELECT COUNT(*) FROM sports_events WHERE status = 'LIVE')
    ),
    'weather', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM weather_locations)
    ),
    'news', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM news_articles),
      'today', (SELECT COUNT(*) FROM news_articles WHERE published_at > NOW() - INTERVAL '24 hours')
    ),
    'agents', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM agents),
      'active', (SELECT COUNT(*) FROM agents WHERE status = 'ACTIVE')
    ),
    'users', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM users),
      'active', (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE')
    )
  ) INTO v_stats
  FROM feeds;
  
  RETURN v_stats;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dashboard_stats"() IS 'Returns comprehensive dashboard statistics';



CREATE OR REPLACE FUNCTION "public"."get_endpoints_by_target_app"("p_target_app" "text", "p_organization_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "name" character varying, "slug" character varying, "description" "text", "endpoint_url" "text", "output_format" character varying, "target_apps" "text"[], "schema_config" "jsonb", "sample_data" "jsonb", "active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_endpoints_by_target_app"("p_target_app" "text", "p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_event_details"("p_event_id" integer) RETURNS TABLE("event_data" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT jsonb_build_object(
        'event', jsonb_build_object(
            'id', e.id, 'sportradar_id', e.sportradar_id, 'start_time', e.start_time,
            'status', e.status, 'round', e.round,
            'venue', jsonb_build_object('name', e.venue_name, 'city', e.venue_city, 'capacity', e.venue_capacity),
            'attendance', e.attendance, 'referee', e.referee
        ),
        'home_team', jsonb_build_object('id', ht.id, 'name', ht.name, 'abbreviation', ht.abbreviation, 'logo_url', ht.logo_url, 'score', e.home_score),
        'away_team', jsonb_build_object('id', at.id, 'name', at.name, 'abbreviation', at.abbreviation, 'logo_url', at.logo_url, 'score', e.away_score),
        'home_lineup', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'player_id', p.id, 'name', p.name, 'jersey_number', lu.jersey_number, 'position', lu.position,
                'lineup_type', lu.lineup_type, 'goals', lu.goals, 'assists', lu.assists,
                'yellow_cards', lu.yellow_cards, 'red_cards', lu.red_cards
            ) ORDER BY lu.lineup_type, lu.formation_position)
            FROM sports_lineups lu JOIN sports_players p ON lu.player_id = p.id
            WHERE lu.event_id = e.id AND lu.team_id = e.home_team_id
        ), '[]'::jsonb),
        'away_lineup', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'player_id', p.id, 'name', p.name, 'jersey_number', lu.jersey_number, 'position', lu.position,
                'lineup_type', lu.lineup_type, 'goals', lu.goals, 'assists', lu.assists,
                'yellow_cards', lu.yellow_cards, 'red_cards', lu.red_cards
            ) ORDER BY lu.lineup_type, lu.formation_position)
            FROM sports_lineups lu JOIN sports_players p ON lu.player_id = p.id
            WHERE lu.event_id = e.id AND lu.team_id = e.away_team_id
        ), '[]'::jsonb),
        'competition', jsonb_build_object('id', l.id, 'name', l.name, 'logo_url', l.logo_url),
        'season', jsonb_build_object('id', s.id, 'name', s.name, 'year', s.year)
    )
    FROM sports_events e
    LEFT JOIN sports_teams ht ON e.home_team_id = ht.id
    LEFT JOIN sports_teams at ON e.away_team_id = at.id
    LEFT JOIN sports_seasons s ON e.season_id = s.id
    LEFT JOIN sports_leagues l ON s.league_id = l.id
    WHERE e.id = p_event_id;
END;
$$;


ALTER FUNCTION "public"."get_event_details"("p_event_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_gfx_project_templates"("p_project_ids" "uuid"[]) RETURNS TABLE("project_id" "uuid", "template_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT t.project_id, t.id as template_id
  FROM gfx_templates t
  WHERE t.project_id = ANY(p_project_ids);
END;
$$;


ALTER FUNCTION "public"."get_gfx_project_templates"("p_project_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_instance_by_channel"("p_channel_name" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', id,
            'friendly_name', friendly_name,
            'channel_name', channel_name,
            'rcp_name', rcp_name,
            'project_type', project_type,
            'set_manager_json', set_manager_json::jsonb,
            'created_at', created_at,
            'updated_at', updated_at
        )
    )
    INTO v_result
    FROM pulsar_connections
    WHERE friendly_name = p_channel_name  -- ✅ Search by friendly_name
    LIMIT 1;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Connection not found for: ' || p_channel_name
        );
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_instance_by_channel"("p_channel_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_integrations_to_sync"() RETURNS TABLE("id" "uuid", "name" "text", "file_config" "jsonb", "sync_config" "jsonb", "template_mapping" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.name,
    ds.file_config,
    ds.sync_config,
    ds.template_mapping
  FROM data_sources ds
  WHERE 
    ds.type = 'file'
    AND ds.active = true
    AND (ds.sync_config->>'enabled')::boolean = true
    AND ds.sync_status != 'running'
    AND (
      ds.next_sync_at IS NULL  -- For first-time syncs
      OR ds.next_sync_at <= NOW()  -- For scheduled syncs
    );
END;
$$;


ALTER FUNCTION "public"."get_integrations_to_sync"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_league_team_stats"("p_season_id" integer) RETURNS TABLE("team_id" integer, "team_name" character varying, "team_logo" "text", "played" integer, "wins" integer, "draws" integer, "losses" integer, "goals_for" integer, "goals_against" integer, "goal_difference" integer, "points" integer, "clean_sheets" integer, "avg_possession" numeric, "total_shots" integer, "shot_accuracy" numeric, "pass_accuracy" numeric, "tackles" integer, "yellow_cards" integer, "red_cards" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.logo_url as team_logo,
    COALESCE(ts.played, 0) as played,
    COALESCE(ts.wins, 0) as wins,
    COALESCE(ts.draws, 0) as draws,
    COALESCE(ts.losses, 0) as losses,
    COALESCE(ts.goals_for, 0) as goals_for,
    COALESCE(ts.goals_against, 0) as goals_against,
    COALESCE(ts.goal_difference, 0) as goal_difference,
    COALESCE(ts.points, 0) as points,
    COALESCE(ts.clean_sheets, 0) as clean_sheets,
    ts.avg_possession,
    COALESCE(ts.total_shots, 0) as total_shots,
    ts.shot_accuracy,
    ts.pass_accuracy,
    COALESCE(ts.tackles, 0) as tackles,
    COALESCE(ts.yellow_cards, 0) as yellow_cards,
    COALESCE(ts.red_cards, 0) as red_cards
  FROM sports_team_stats ts
  JOIN sports_teams t ON ts.team_id = t.id
  WHERE ts.season_id = p_season_id
  ORDER BY ts.points DESC, ts.goal_difference DESC;
END;
$$;


ALTER FUNCTION "public"."get_league_team_stats"("p_season_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_map_settings"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  s map_settings;
BEGIN
  SELECT * INTO s
  FROM map_settings
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'isDefault', true,
      'settings', jsonb_build_object(
        'map_style', 'light',
        'show_map_labels', true,
        'projection_type', 'mercator',
        'default_latitude', 38.0,
        'default_longitude', -97.0,
        'default_zoom', 3.5,
        'saved_positions', '[]'::jsonb,
        'additional_settings', '{}'::jsonb
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'isDefault', false,
    'settings', to_jsonb(s)
  );
END;
$$;


ALTER FUNCTION "public"."get_map_settings"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_match_odds"("p_event_id" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'event', jsonb_build_object(
        'id', e.id,
        'start_time', e.start_time,
        'status', e.status,
        'home_team', jsonb_build_object(
          'id', ht.id,
          'name', ht.name,
          'logo_url', ht.logo_url
        ),
        'away_team', jsonb_build_object(
          'id', at.id,
          'name', at.name,
          'logo_url', at.logo_url
        )
      ),
      'odds', jsonb_build_object(
        'match_winner', jsonb_build_object(
          'home', o.home_win_odds,
          'draw', o.draw_odds,
          'away', o.away_win_odds
        ),
        'probabilities', jsonb_build_object(
          'home', o.home_win_prob,
          'draw', o.draw_prob,
          'away', o.away_win_prob
        ),
        'over_under', jsonb_build_object(
          'over_1_5', o.over_1_5_odds,
          'under_1_5', o.under_1_5_odds,
          'over_2_5', o.over_2_5_odds,
          'under_2_5', o.under_2_5_odds,
          'over_3_5', o.over_3_5_odds,
          'under_3_5', o.under_3_5_odds
        ),
        'btts', jsonb_build_object(
          'yes', o.btts_yes_odds,
          'no', o.btts_no_odds
        ),
        'double_chance', jsonb_build_object(
          'home_or_draw', o.home_or_draw_odds,
          'away_or_draw', o.away_or_draw_odds,
          'home_or_away', o.home_or_away_odds
        ),
        'asian_handicap', jsonb_build_object(
          'line', o.asian_handicap_line,
          'home', o.asian_home_odds,
          'away', o.asian_away_odds
        ),
        'correct_score', jsonb_build_object(
          '1-0', o.correct_score_1_0,
          '2-0', o.correct_score_2_0,
          '2-1', o.correct_score_2_1,
          '1-1', o.correct_score_1_1,
          '0-0', o.correct_score_0_0,
          '0-1', o.correct_score_0_1,
          '0-2', o.correct_score_0_2,
          '1-2', o.correct_score_1_2,
          '2-2', o.correct_score_2_2,
          '3-0', o.correct_score_3_0,
          '3-1', o.correct_score_3_1,
          '3-2', o.correct_score_3_2
        ),
        'half_time', jsonb_build_object(
          'home', o.ht_home_win_odds,
          'draw', o.ht_draw_odds,
          'away', o.ht_away_win_odds
        )
      ),
      'meta', jsonb_build_object(
        'provider', o.provider,
        'last_updated', o.last_updated,
        'is_live', o.is_live,
        'suspended', o.suspended
      )
    )
  )
  INTO v_result
  FROM sports_events e
  JOIN sports_teams ht ON e.home_team_id = ht.id
  JOIN sports_teams at ON e.away_team_id = at.id
  LEFT JOIN sports_match_odds o ON o.event_id = e.id
  WHERE e.id = p_event_id;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."get_match_odds"("p_event_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_for_email_domain"("p_email" "text") RETURNS TABLE("organization_id" "uuid", "organization_name" "text", "organization_slug" "text", "allowed" boolean, "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_domain TEXT;
  v_org RECORD;
BEGIN
  -- Extract domain from email
  v_domain := lower(split_part(p_email, '@', 2));

  -- Find org with this allowed domain
  SELECT * INTO v_org
  FROM u_organizations
  WHERE v_domain = ANY(allowed_domains)
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_org.id, v_org.name, v_org.slug, true, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, false,
      'Email domain not allowed for self-signup. Please request an invitation.'::TEXT;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_org_for_email_domain"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_player_stats"("p_player_id" integer, "p_season_id" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'player', jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'photo_url', p.photo_url,
        'position', p.position,
        'jersey_number', p.jersey_number,
        'nationality', p.nationality,
        'nationality_code', p.nationality_code,
        'date_of_birth', p.date_of_birth
      ),
      'current_team', jsonb_build_object(
        'team_id', t.id,
        'team_name', t.name,
        'team_logo', t.logo_url,
        'colors', t.colors
      ),
      'season_stats', jsonb_build_object(
        'season_id', ps.season_id,
        'appearances', COALESCE(ps.appearances, 0),
        'starts', COALESCE(ps.starts, 0),
        'minutes_played', COALESCE(ps.minutes_played, 0),
        'goals', COALESCE(ps.goals, 0),
        'assists', COALESCE(ps.assists, 0),
        'penalties_scored', COALESCE(ps.penalties_scored, 0),
        'yellow_cards', COALESCE(ps.yellow_cards, 0),
        'red_cards', COALESCE(ps.red_cards, 0),
        'shots', COALESCE(ps.shots, 0),
        'shots_on_target', COALESCE(ps.shots_on_target, 0),
        'passes', COALESCE(ps.passes, 0),
        'pass_accuracy', ps.pass_accuracy,
        'key_passes', COALESCE(ps.key_passes, 0),
        'tackles', COALESCE(ps.tackles, 0),
        'interceptions', COALESCE(ps.interceptions, 0),
        'saves', COALESCE(ps.saves, 0),
        'clean_sheets', COALESCE(ps.clean_sheets, 0),
        'rating', ps.rating
      ),
      'career_stats', (
        SELECT jsonb_build_object(
          'total_appearances', SUM(COALESCE(appearances, 0)),
          'total_goals', SUM(COALESCE(goals, 0)),
          'total_assists', SUM(COALESCE(assists, 0)),
          'total_minutes', SUM(COALESCE(minutes_played, 0)),
          'seasons_played', COUNT(DISTINCT season_id)
        )
        FROM sports_player_stats
        WHERE player_id = p_player_id
      )
    )
  )
  INTO v_result
  FROM sports_players p
  LEFT JOIN sports_teams t ON p.team_id = t.id
  LEFT JOIN sports_player_stats ps ON ps.player_id = p.id 
    AND (p_season_id IS NULL OR ps.season_id = p_season_id)
  WHERE p.id = p_player_id;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."get_player_stats"("p_player_id" integer, "p_season_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_provider_details"("p_id" "text") RETURNS TABLE("id" "text", "name" "text", "type" "text", "category" "text", "description" "text", "is_active" boolean, "api_key" "text", "api_secret" "text", "base_url" "text", "source_url" "text", "storage_path" "text", "api_version" "text", "config" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "refresh_interval_minutes" integer, "last_run" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    id,
    name,
    type,
    category,
    description,
    is_active,
    api_key,
    api_secret,
    base_url,
    source_url,
    storage_path,
    api_version,
    config::jsonb,
    created_at,
    updated_at,
    refresh_interval_minutes,
    last_run
  FROM data_providers
  WHERE id = p_id;
$$;


ALTER FUNCTION "public"."get_provider_details"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recent_results"("p_season_id" integer, "p_limit" integer DEFAULT 10) RETURNS TABLE("event_id" integer, "sportradar_id" character varying, "start_time" timestamp with time zone, "status" character varying, "round" character varying, "match_day" integer, "venue_name" character varying, "home_team" "jsonb", "away_team" "jsonb", "home_score" integer, "away_score" integer, "winner_id" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.sportradar_id, e.start_time, e.status, e.round, e.match_day, e.venue_name,
        jsonb_build_object('id', ht.id, 'name', ht.name, 'abbreviation', ht.abbreviation, 'logo_url', ht.logo_url),
        jsonb_build_object('id', at.id, 'name', at.name, 'abbreviation', at.abbreviation, 'logo_url', at.logo_url),
        e.home_score, e.away_score, e.winner_id
    FROM sports_events e
    LEFT JOIN sports_teams ht ON e.home_team_id = ht.id
    LEFT JOIN sports_teams at ON e.away_team_id = at.id
    WHERE e.season_id = p_season_id AND e.status = 'ended'
    ORDER BY e.start_time DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_recent_results"("p_season_id" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_season_outrights"("p_season_id" integer) RETURNS TABLE("team_id" integer, "team_name" character varying, "team_logo" "text", "winner_odds" numeric, "winner_prob" numeric, "top_4_odds" numeric, "top_4_prob" numeric, "relegation_odds" numeric, "relegation_prob" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.logo_url as team_logo,
    o.winner_odds,
    o.winner_prob,
    o.top_4_odds,
    o.top_4_prob,
    o.relegation_odds,
    o.relegation_prob
  FROM sports_outright_odds o
  JOIN sports_teams t ON o.team_id = t.id
  WHERE o.season_id = p_season_id
  ORDER BY o.winner_odds ASC NULLS LAST;
END;
$$;


ALTER FUNCTION "public"."get_season_outrights"("p_season_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_season_schedule"("p_season_id" integer) RETURNS TABLE("event_id" integer, "start_time" timestamp with time zone, "status" character varying, "round" character varying, "home_team_name" character varying, "home_team_logo" "text", "home_score" integer, "away_team_name" character varying, "away_team_logo" "text", "away_score" integer, "venue_name" character varying, "attendance" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id AS event_id,
    e.start_time,
    e.status,
    e.round,
    ht.name AS home_team_name,
    ht.logo_url AS home_team_logo,
    e.home_score,
    at.name AS away_team_name,
    at.logo_url AS away_team_logo,
    e.away_score,
    v.name AS venue_name,
    e.attendance
  FROM sports_events e
  JOIN sports_teams ht ON e.home_team_id = ht.id
  JOIN sports_teams at ON e.away_team_id = at.id
  LEFT JOIN sports_venues v ON ht.venue_id = v.id
  WHERE e.season_id = p_season_id
  ORDER BY e.round, e.start_time;
END;
$$;


ALTER FUNCTION "public"."get_season_schedule"("p_season_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_season_standings"("p_season_id" integer) RETURNS TABLE("rank" integer, "team_id" integer, "team_name" character varying, "team_abbreviation" character varying, "team_logo" "text", "played" integer, "win" integer, "draw" integer, "loss" integer, "goals_for" integer, "goals_against" integer, "goals_diff" integer, "points" integer, "form" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT st.rank, t.id, t.name, t.abbreviation, t.logo_url,
        st.played, st.win, st.draw, st.loss, st.goals_for, st.goals_against, st.goals_diff, st.points, st.form
    FROM sports_standings st
    INNER JOIN sports_teams t ON st.team_id = t.id
    WHERE st.season_id = p_season_id
    ORDER BY st.rank;
END;
$$;


ALTER FUNCTION "public"."get_season_standings"("p_season_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_season_teams"("p_season_id" integer) RETURNS TABLE("team_id" integer, "sportradar_id" character varying, "name" character varying, "short_name" character varying, "abbreviation" character varying, "logo_url" "text", "country" character varying, "country_code" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.sportradar_id, t.name, t.short_name, t.abbreviation, t.logo_url, t.country, t.country_code
    FROM sports_teams t
    INNER JOIN sports_season_teams st ON st.team_id = t.id
    WHERE st.season_id = p_season_id
    ORDER BY t.name;
END;
$$;


ALTER FUNCTION "public"."get_season_teams"("p_season_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_seedable_dashboard_data"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  emergent_org_id UUID;
  result JSONB := '{}';
BEGIN
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Emergent organization not found');
  END IF;

  -- Weather locations
  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'name', COALESCE(custom_name, name),
    'location', CONCAT(name, ', ', admin1, ', ', country),
    'is_active', is_active
  ) ORDER BY name)
  INTO result
  FROM weather_locations
  WHERE organization_id = emergent_org_id;

  result := jsonb_build_object('weather_locations', COALESCE(result, '[]'::jsonb));

  -- Stocks
  SELECT result || jsonb_build_object('stocks', COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'symbol', symbol,
    'name', COALESCE(custom_name, name),
    'type', type,
    'exchange', exchange
  ) ORDER BY symbol), '[]'::jsonb))
  INTO result
  FROM f_stocks
  WHERE organization_id = emergent_org_id;

  -- Sports leagues
  SELECT result || jsonb_build_object('sports_leagues', COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'sport', sport,
    'type', type,
    'active', active
  ) ORDER BY sport, name), '[]'::jsonb))
  INTO result
  FROM sports_leagues
  WHERE organization_id = emergent_org_id;

  -- Elections
  SELECT result || jsonb_build_object('elections', COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'year', year,
    'type', type,
    'level', level,
    'status', status,
    'election_date', election_date
  ) ORDER BY year DESC, name), '[]'::jsonb))
  INTO result
  FROM e_elections
  WHERE organization_id = emergent_org_id;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_seedable_dashboard_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_seedable_data_summary"() RETURNS TABLE("category" "text", "table_name" "text", "item_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  emergent_org_id UUID;
BEGIN
  -- Get Emergent org ID
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RETURN;
  END IF;

  -- AI Providers (global - no org filter)
  RETURN QUERY
  SELECT 'ai_providers'::TEXT, 'ai_providers'::TEXT,
    (SELECT COUNT(*) FROM ai_providers);

  -- Data Providers
  RETURN QUERY
  SELECT 'data_providers'::TEXT, 'data_providers'::TEXT,
    (SELECT COUNT(*) FROM data_providers WHERE organization_id = emergent_org_id);

  -- Feeds
  RETURN QUERY
  SELECT 'feeds'::TEXT, 'feeds'::TEXT,
    (SELECT COUNT(*) FROM feeds WHERE organization_id = emergent_org_id);

  -- Agents (scheduled automation)
  RETURN QUERY
  SELECT 'agents'::TEXT, 'agents'::TEXT,
    (SELECT COUNT(*) FROM agents WHERE organization_id = emergent_org_id);

  -- API Endpoints (Nova "Agents" - data endpoints)
  RETURN QUERY
  SELECT 'api_endpoints'::TEXT, 'api_endpoints'::TEXT,
    (SELECT COUNT(*) FROM api_endpoints WHERE organization_id = emergent_org_id);

  -- Data Sources
  RETURN QUERY
  SELECT 'data_sources'::TEXT, 'data_sources'::TEXT,
    (SELECT COUNT(*) FROM data_sources WHERE organization_id = emergent_org_id);

  -- Pulsar Channels
  BEGIN
    RETURN QUERY
    SELECT 'pulsar_channels'::TEXT, 'pulsar_channels'::TEXT,
      (SELECT COUNT(*) FROM pulsar_channels WHERE organization_id = emergent_org_id);
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    NULL;
  END;

  -- GFX Projects
  BEGIN
    RETURN QUERY
    SELECT 'gfx_projects'::TEXT, 'gfx_projects'::TEXT,
      (SELECT COUNT(*) FROM gfx_projects WHERE organization_id = emergent_org_id);
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    NULL;
  END;

  -- Templates
  BEGIN
    RETURN QUERY
    SELECT 'templates'::TEXT, 'templates'::TEXT,
      (SELECT COUNT(*) FROM templates WHERE organization_id = emergent_org_id);
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    NULL;
  END;

END;
$$;


ALTER FUNCTION "public"."get_seedable_data_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_seedable_items"("p_category" "text") RETURNS TABLE("id" "text", "name" "text", "description" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  emergent_org_id UUID;
BEGIN
  -- Get Emergent org ID
  SELECT u_organizations.id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RETURN;
  END IF;

  CASE p_category
    WHEN 'ai_providers' THEN
      RETURN QUERY
      SELECT ap.id::TEXT, ap.name::TEXT, ap.provider_name::TEXT
      FROM ai_providers ap;

    WHEN 'data_providers' THEN
      RETURN QUERY
      SELECT dp.id::TEXT, dp.name::TEXT, COALESCE(dp.description, dp.category)::TEXT
      FROM data_providers dp
      WHERE dp.organization_id = emergent_org_id;

    WHEN 'feeds' THEN
      RETURN QUERY
      SELECT f.id::TEXT, f.name::TEXT, f.category::TEXT
      FROM feeds f
      WHERE f.organization_id = emergent_org_id;

    WHEN 'agents' THEN
      RETURN QUERY
      SELECT a.id::TEXT, a.name::TEXT, COALESCE(a.description, a.agent_type)::TEXT
      FROM agents a
      WHERE a.organization_id = emergent_org_id;

    WHEN 'api_endpoints' THEN
      -- API Endpoints (Nova "Agents")
      RETURN QUERY
      SELECT ae.id::TEXT, ae.name::TEXT, COALESCE(ae.description, ae.slug)::TEXT
      FROM api_endpoints ae
      WHERE ae.organization_id = emergent_org_id;

    WHEN 'data_sources' THEN
      RETURN QUERY
      SELECT ds.id::TEXT, ds.name::TEXT, ds.type::TEXT
      FROM data_sources ds
      WHERE ds.organization_id = emergent_org_id;

    WHEN 'pulsar_channels' THEN
      RETURN QUERY
      SELECT pc.id::TEXT, pc.name::TEXT, COALESCE(pc.description, '')::TEXT
      FROM pulsar_channels pc
      WHERE pc.organization_id = emergent_org_id;

    WHEN 'gfx_projects' THEN
      RETURN QUERY
      SELECT gp.id::TEXT, gp.name::TEXT, COALESCE(gp.description, '')::TEXT
      FROM gfx_projects gp
      WHERE gp.organization_id = emergent_org_id;

    WHEN 'templates' THEN
      RETURN QUERY
      SELECT t.id::TEXT, t.name::TEXT, t.type::TEXT
      FROM templates t
      WHERE t.organization_id = emergent_org_id;

    ELSE
      RETURN;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."get_seedable_items"("p_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_table_stats"() RETURNS TABLE("table_name" "text", "row_count" bigint, "total_size" "text", "table_size" "text", "indexes_size" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename AS table_name,
    n_live_tup AS row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$;


ALTER FUNCTION "public"."get_table_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_table_stats"() IS 'Returns size and row count statistics for all tables';



CREATE OR REPLACE FUNCTION "public"."get_team_schedule"("p_team_id" integer, "p_season_id" integer DEFAULT NULL::integer, "p_limit" integer DEFAULT 20) RETURNS TABLE("event_id" integer, "sportradar_id" character varying, "start_time" timestamp with time zone, "status" character varying, "round" character varying, "venue_name" character varying, "is_home" boolean, "opponent" "jsonb", "home_score" integer, "away_score" integer, "season_name" character varying, "competition_name" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.sportradar_id, e.start_time, e.status, e.round, e.venue_name,
        (e.home_team_id = p_team_id),
        CASE WHEN e.home_team_id = p_team_id 
            THEN jsonb_build_object('id', at.id, 'name', at.name, 'abbreviation', at.abbreviation, 'logo_url', at.logo_url)
            ELSE jsonb_build_object('id', ht.id, 'name', ht.name, 'abbreviation', ht.abbreviation, 'logo_url', ht.logo_url)
        END,
        e.home_score, e.away_score, s.name, l.name
    FROM sports_events e
    LEFT JOIN sports_teams ht ON e.home_team_id = ht.id
    LEFT JOIN sports_teams at ON e.away_team_id = at.id
    LEFT JOIN sports_seasons s ON e.season_id = s.id
    LEFT JOIN sports_leagues l ON s.league_id = l.id
    WHERE (e.home_team_id = p_team_id OR e.away_team_id = p_team_id)
      AND (p_season_id IS NULL OR e.season_id = p_season_id)
    ORDER BY e.start_time DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_team_schedule"("p_team_id" integer, "p_season_id" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_team_stats"("p_team_id" integer, "p_season_id" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'team', jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'short_name', t.short_name,
        'abbreviation', t.abbreviation,
        'logo_url', t.logo_url,
        'colors', t.colors,
        'venue', t.venue,
        'city', t.city,
        'country', t.country
      ),
      'season_stats', jsonb_build_object(
        'season_id', ts.season_id,
        'played', COALESCE(ts.played, 0),
        'wins', COALESCE(ts.wins, 0),
        'draws', COALESCE(ts.draws, 0),
        'losses', COALESCE(ts.losses, 0),
        'goals_for', COALESCE(ts.goals_for, 0),
        'goals_against', COALESCE(ts.goals_against, 0),
        'goal_difference', COALESCE(ts.goal_difference, 0),
        'points', COALESCE(ts.points, 0),
        'clean_sheets', COALESCE(ts.clean_sheets, 0),
        'avg_possession', ts.avg_possession,
        'total_shots', COALESCE(ts.total_shots, 0),
        'shots_on_target', COALESCE(ts.shots_on_target, 0),
        'shot_accuracy', ts.shot_accuracy,
        'total_passes', COALESCE(ts.total_passes, 0),
        'pass_accuracy', ts.pass_accuracy,
        'tackles', COALESCE(ts.tackles, 0),
        'interceptions', COALESCE(ts.interceptions, 0),
        'yellow_cards', COALESCE(ts.yellow_cards, 0),
        'red_cards', COALESCE(ts.red_cards, 0),
        'corners', COALESCE(ts.corners, 0),
        'offsides', COALESCE(ts.offsides, 0),
        'fouls_committed', COALESCE(ts.fouls_committed, 0),
        'home_record', jsonb_build_object(
          'wins', COALESCE(ts.home_wins, 0),
          'draws', COALESCE(ts.home_draws, 0),
          'losses', COALESCE(ts.home_losses, 0)
        ),
        'away_record', jsonb_build_object(
          'wins', COALESCE(ts.away_wins, 0),
          'draws', COALESCE(ts.away_draws, 0),
          'losses', COALESCE(ts.away_losses, 0)
        )
      ),
      'season', (
        SELECT jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'year', s.year
        )
        FROM sports_seasons s
        WHERE s.id = ts.season_id
      )
    )
  )
  INTO v_result
  FROM sports_teams t
  LEFT JOIN sports_team_stats ts ON ts.team_id = t.id 
    AND (p_season_id IS NULL OR ts.season_id = p_season_id)
  WHERE t.id = p_team_id;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Team not found');
  END IF;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."get_team_stats"("p_team_id" integer, "p_season_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_text_providers_for_dashboard"("dash" "text") RETURNS TABLE("id" "uuid", "name" "text", "provider_name" "text", "type" "text", "enabled" boolean, "model" "text", "api_key" "text", "dashboard_assignments" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.provider_name,
    p.type,
    p.enabled,
    p.model,
    p.api_key,
    p.dashboard_assignments,
    p.created_at,
    p.updated_at
  FROM ai_providers p
  WHERE 
    p.enabled = true
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p.dashboard_assignments) AS assignment
      WHERE 
        LOWER(assignment->>'dashboard') = LOWER(dash)
        AND (assignment->>'textProvider')::boolean = true
    );
END;
$$;


ALTER FUNCTION "public"."get_text_providers_for_dashboard"("dash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_assists"("p_season_id" integer, "p_limit" integer DEFAULT 20) RETURNS TABLE("rank" bigint, "player_id" integer, "player_name" character varying, "player_photo" "text", "player_position" character varying, "team_id" integer, "team_name" character varying, "team_logo" "text", "appearances" integer, "assists" integer, "goals" integer, "minutes_played" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY ps.assists DESC, ps.goals DESC) as rank,
        p.id as player_id,
        p.name as player_name,
        p.photo_url as player_photo,
        p.position as player_position,
        t.id as team_id,
        t.name as team_name,
        t.logo_url as team_logo,
        ps.appearances,
        ps.assists,
        ps.goals,
        ps.minutes_played
    FROM sports_player_stats ps
    JOIN sports_players p ON ps.player_id = p.id
    JOIN sports_teams t ON ps.team_id = t.id
    WHERE ps.season_id = p_season_id
    ORDER BY ps.assists DESC, ps.goals DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_top_assists"("p_season_id" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_scorer_odds"("p_season_id" integer) RETURNS TABLE("player_id" integer, "player_name" character varying, "player_photo" "text", "team_name" character varying, "team_logo" "text", "current_goals" integer, "top_scorer_odds" numeric, "top_scorer_prob" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as player_id,
    p.name as player_name,
    p.photo_url as player_photo,
    t.name as team_name,
    t.logo_url as team_logo,
    o.current_goals,
    o.top_scorer_odds,
    o.top_scorer_prob
  FROM sports_player_odds o
  JOIN sports_players p ON o.player_id = p.id
  JOIN sports_teams t ON p.team_id = t.id
  WHERE o.season_id = p_season_id
    AND o.top_scorer_odds IS NOT NULL
  ORDER BY o.top_scorer_odds ASC;
END;
$$;


ALTER FUNCTION "public"."get_top_scorer_odds"("p_season_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_scorers"("p_season_id" integer, "p_limit" integer DEFAULT 20) RETURNS TABLE("rank" bigint, "player_id" integer, "player_name" character varying, "player_photo" "text", "player_position" character varying, "team_id" integer, "team_name" character varying, "team_logo" "text", "appearances" integer, "goals" integer, "assists" integer, "minutes_played" integer, "rating" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY ps.goals DESC, ps.assists DESC) as rank,
        p.id as player_id,
        p.name as player_name,
        p.photo_url as player_photo,
        p.position as player_position,
        t.id as team_id,
        t.name as team_name,
        t.logo_url as team_logo,
        ps.appearances,
        ps.goals,
        ps.assists,
        ps.minutes_played,
        ps.rating
    FROM sports_player_stats ps
    JOIN sports_players p ON ps.player_id = p.id
    JOIN sports_teams t ON ps.team_id = t.id
    WHERE ps.season_id = p_season_id
    ORDER BY ps.goals DESC, ps.assists DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_top_scorers"("p_season_id" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_upcoming_events"("p_season_id" integer, "p_limit" integer DEFAULT 10) RETURNS TABLE("event_id" integer, "sportradar_id" character varying, "start_time" timestamp with time zone, "status" character varying, "round" character varying, "match_day" integer, "venue_name" character varying, "home_team" "jsonb", "away_team" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.sportradar_id, e.start_time, e.status, e.round, e.match_day, e.venue_name,
        jsonb_build_object('id', ht.id, 'name', ht.name, 'abbreviation', ht.abbreviation, 'logo_url', ht.logo_url),
        jsonb_build_object('id', at.id, 'name', at.name, 'abbreviation', at.abbreviation, 'logo_url', at.logo_url)
    FROM sports_events e
    LEFT JOIN sports_teams ht ON e.home_team_id = ht.id
    LEFT JOIN sports_teams at ON e.away_team_id = at.id
    WHERE e.season_id = p_season_id AND e.start_time > NOW() AND e.status = 'scheduled'
    ORDER BY e.start_time
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_upcoming_events"("p_season_id" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_upcoming_with_odds"("p_season_id" integer, "p_limit" integer DEFAULT 10) RETURNS TABLE("event_id" integer, "start_time" timestamp with time zone, "home_team_name" character varying, "home_team_logo" "text", "away_team_name" character varying, "away_team_logo" "text", "home_win_odds" numeric, "draw_odds" numeric, "away_win_odds" numeric, "home_win_prob" numeric, "draw_prob" numeric, "away_win_prob" numeric, "over_2_5_odds" numeric, "btts_yes_odds" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.start_time,
    ht.name as home_team_name,
    ht.logo_url as home_team_logo,
    at.name as away_team_name,
    at.logo_url as away_team_logo,
    o.home_win_odds,
    o.draw_odds,
    o.away_win_odds,
    o.home_win_prob,
    o.draw_prob,
    o.away_win_prob,
    o.over_2_5_odds,
    o.btts_yes_odds
  FROM sports_events e
  JOIN sports_teams ht ON e.home_team_id = ht.id
  JOIN sports_teams at ON e.away_team_id = at.id
  LEFT JOIN sports_match_odds o ON o.event_id = e.id
  WHERE e.season_id = p_season_id
    AND e.status = 'scheduled'
    AND e.start_time > NOW()
  ORDER BY e.start_time ASC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_upcoming_with_odds"("p_season_id" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_layout"("p_layout_name" "text" DEFAULT 'main'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_layout_data jsonb;
BEGIN
  SELECT layout_data INTO v_layout_data
  FROM user_layouts
  WHERE user_id = auth.uid()
  AND layout_name = p_layout_name;
  
  RETURN v_layout_data;
END;
$$;


ALTER FUNCTION "public"."get_user_layout"("p_layout_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organization_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT organization_id FROM u_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_organization_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_permissions"("p_auth_user_id" "uuid") RETURNS TABLE("app_key" "text", "resource" "text", "action" "text", "granted" boolean, "source" "text")
    LANGUAGE "sql" STABLE
    AS $$
  -- Direct user permissions (these take precedence)
  SELECT p.app_key, p.resource, p.action, up.granted, 'user'::text as source
  FROM u_user_permissions up
  JOIN u_permissions p ON up.permission_id = p.id
  JOIN u_users u ON up.user_id = u.id
  WHERE u.auth_user_id = p_auth_user_id

  UNION ALL

  -- Group permissions
  SELECT DISTINCT p.app_key, p.resource, p.action, true as granted, 'group'::text as source
  FROM u_group_members gm
  JOIN u_group_permissions gp ON gm.group_id = gp.group_id
  JOIN u_permissions p ON gp.permission_id = p.id
  JOIN u_users u ON gm.user_id = u.id
  WHERE u.auth_user_id = p_auth_user_id;
$$;


ALTER FUNCTION "public"."get_user_permissions"("p_auth_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_venue_details"("p_venue_id" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'venue', jsonb_build_object(
        'id', v.id,
        'sportradar_id', v.sportradar_id,
        'name', v.name,
        'city', v.city,
        'country', v.country,
        'address', v.address,
        'capacity', v.capacity,
        'surface', v.surface,
        'roof_type', v.roof_type,
        'latitude', v.latitude,
        'longitude', v.longitude,
        'image_url', v.image_url,
        'year_opened', v.year_opened,
        'architect', v.architect,
        'description', v.description
      ),
      'teams', (
        SELECT jsonb_agg(jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'logo_url', t.logo_url
        ))
        FROM sports_teams t
        WHERE t.venue_id = v.id
      )
    )
  )
  INTO v_result
  FROM sports_venues v
  WHERE v.id = p_venue_id;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Venue not found');
  END IF;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."get_venue_details"("p_venue_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_venues"("p_country" character varying DEFAULT NULL::character varying, "p_limit" integer DEFAULT 50) RETURNS TABLE("id" integer, "sportradar_id" character varying, "name" character varying, "city" character varying, "country" character varying, "capacity" integer, "surface" character varying, "image_url" "text", "latitude" numeric, "longitude" numeric, "team_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.sportradar_id,
    v.name,
    v.city,
    v.country,
    v.capacity,
    v.surface,
    v.image_url,
    v.latitude,
    v.longitude,
    COUNT(t.id) as team_count
  FROM sports_venues v
  LEFT JOIN sports_teams t ON t.venue_id = v.id
  WHERE (p_country IS NULL OR v.country = p_country)
  GROUP BY v.id
  ORDER BY v.capacity DESC NULLS LAST
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_venues"("p_country" character varying, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inspect_pg_net_tables"() RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    response_count INTEGER;
    queue_count INTEGER;
    recent_responses jsonb;
    recent_queue jsonb;
BEGIN
    -- Count responses
    SELECT COUNT(*) INTO response_count FROM net._http_response;
    
    -- Count queued requests
    SELECT COUNT(*) INTO queue_count FROM net.http_request_queue;
    
    -- Get recent responses
    SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'status_code', status_code,
        'created', created,
        'url_host', (headers->>'host')
    ) ORDER BY created DESC)
    INTO recent_responses
    FROM net._http_response
    LIMIT 5;
    
    -- Get recent queue items
    SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'method', method,
        'url', url,
        'status', status,
        'created', created
    ) ORDER BY created DESC)
    INTO recent_queue
    FROM net.http_request_queue
    LIMIT 5;
    
    RETURN json_build_object(
        'response_count', response_count,
        'queue_count', queue_count,
        'recent_responses', recent_responses,
        'recent_queue', recent_queue
    );
END;
$$;


ALTER FUNCTION "public"."inspect_pg_net_tables"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_superuser"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM u_users
    WHERE auth_user_id = auth.uid()
    AND is_superuser = true
  );
$$;


ALTER FUNCTION "public"."is_superuser"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "app_key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon_url" "text",
    "app_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_active_applications"() RETURNS SETOF "public"."applications"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT *
  FROM public.applications
  WHERE is_active = true
  ORDER BY sort_order, name;
$$;


ALTER FUNCTION "public"."list_active_applications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_invitations"("p_user_id" "uuid", "p_pending_only" boolean DEFAULT true) RETURNS TABLE("id" "uuid", "email" "text", "organization_id" "uuid", "invited_by" "uuid", "role" "text", "token" "text", "expires_at" timestamp with time zone, "accepted_at" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_auth_uid UUID;
  v_user_auth_id UUID;
  v_user_org_id UUID;
  v_user_org_role TEXT;
  v_is_superuser BOOLEAN;
BEGIN
  -- Get the current auth user id
  v_auth_uid := auth.uid();

  -- Get the user's details from the provided user_id
  SELECT u.auth_user_id, u.organization_id, u.org_role, u.is_superuser
  INTO v_user_auth_id, v_user_org_id, v_user_org_role, v_is_superuser
  FROM u_users u
  WHERE u.id = p_user_id;

  IF v_user_auth_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Security check: ensure user can only use their own user_id
  IF v_auth_uid IS NOT NULL AND v_user_auth_id != v_auth_uid THEN
    IF NOT EXISTS (
      SELECT 1 FROM u_users u2
      WHERE u2.auth_user_id = v_auth_uid AND u2.is_superuser = true
    ) THEN
      RAISE EXCEPTION 'Not authorized to list invitations as this user';
    END IF;
  END IF;

  -- Authorization check: must be superuser OR admin/owner
  IF NOT v_is_superuser AND v_user_org_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Must be org admin or owner to view invitations';
  END IF;

  -- Return invitations
  IF v_is_superuser THEN
    -- Superusers can see all invitations
    IF p_pending_only THEN
      RETURN QUERY
      SELECT inv.id, inv.email, inv.organization_id, inv.invited_by, inv.role, inv.token, inv.expires_at, inv.accepted_at, inv.created_at
      FROM u_invitations inv
      WHERE inv.accepted_at IS NULL
      ORDER BY inv.created_at DESC;
    ELSE
      RETURN QUERY
      SELECT inv.id, inv.email, inv.organization_id, inv.invited_by, inv.role, inv.token, inv.expires_at, inv.accepted_at, inv.created_at
      FROM u_invitations inv
      ORDER BY inv.created_at DESC;
    END IF;
  ELSE
    -- Non-superusers only see their organization's invitations
    IF p_pending_only THEN
      RETURN QUERY
      SELECT inv.id, inv.email, inv.organization_id, inv.invited_by, inv.role, inv.token, inv.expires_at, inv.accepted_at, inv.created_at
      FROM u_invitations inv
      WHERE inv.organization_id = v_user_org_id AND inv.accepted_at IS NULL
      ORDER BY inv.created_at DESC;
    ELSE
      RETURN QUERY
      SELECT inv.id, inv.email, inv.organization_id, inv.invited_by, inv.role, inv.token, inv.expires_at, inv.accepted_at, inv.created_at
      FROM u_invitations inv
      WHERE inv.organization_id = v_user_org_id
      ORDER BY inv.created_at DESC;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION "public"."list_invitations"("p_user_id" "uuid", "p_pending_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_providers_with_status"() RETURNS TABLE("id" "text", "name" "text", "type" "text", "category" "text", "is_active" boolean, "api_key_configured" boolean, "api_key_len" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.id::TEXT,
    ap.name::TEXT,
    ap.provider_name::TEXT as type,
    'ai'::TEXT as category,
    ap.enabled as is_active,
    (ap.api_key IS NOT NULL AND ap.api_key != '') as api_key_configured,
    CASE 
      WHEN ap.api_key IS NOT NULL THEN LENGTH(ap.api_key)
      ELSE 0
    END as api_key_len
  FROM ai_providers ap
  ORDER BY ap.name;
END;
$$;


ALTER FUNCTION "public"."list_providers_with_status"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."list_providers_with_status"() IS 'Returns AI providers with status information (id, name, type, category, is_active, api_key_configured, api_key_len). Does not expose actual API keys for security. Used by the AI Settings panel.';



CREATE OR REPLACE FUNCTION "public"."list_providers_with_status_all"() RETURNS TABLE("id" "text", "name" "text", "type" "text", "category" "text", "is_active" boolean, "api_key_configured" boolean, "api_key_len" integer, "api_secret_configured" boolean, "api_secret_len" integer, "source_url" "text", "storage_path" "text", "refresh_interval_minutes" integer)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    id,
    name,
    type,
    category,
    is_active,
    (api_key IS NOT NULL AND api_key != '') AS api_key_configured,
    COALESCE(LENGTH(api_key), 0) AS api_key_len,
    (api_secret IS NOT NULL AND api_secret != '') AS api_secret_configured,
    COALESCE(LENGTH(api_secret), 0) AS api_secret_len,
    source_url,
    storage_path,
    refresh_interval_minutes
  FROM data_providers
  ORDER BY name;
$$;


ALTER FUNCTION "public"."list_providers_with_status_all"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_providers_with_status_category"("p_category" "text") RETURNS TABLE("id" "text", "name" "text", "type" "text", "category" "text", "is_active" boolean, "api_key_configured" boolean, "api_key_len" integer, "api_secret_configured" boolean, "api_secret_len" integer, "source_url" "text", "storage_path" "text", "refresh_interval_minutes" integer)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    id,
    name,
    type,
    category,
    is_active,
    (api_key IS NOT NULL AND api_key != '') AS api_key_configured,
    COALESCE(LENGTH(api_key), 0) AS api_key_len,
    (api_secret IS NOT NULL AND api_secret != '') AS api_secret_configured,
    COALESCE(LENGTH(api_secret), 0) AS api_secret_len,
    source_url,
    storage_path,
    refresh_interval_minutes
  FROM data_providers
  WHERE category = p_category
  ORDER BY name;
$$;


ALTER FUNCTION "public"."list_providers_with_status_category"("p_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_debug"("func_name" "text", "msg" "text", "data" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO debug_log (function_name, message, data)
    VALUES (func_name, msg, data);
END;
$$;


ALTER FUNCTION "public"."log_debug"("func_name" "text", "msg" "text", "data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_ai_providers_from_kv"() RETURNS TABLE("migrated_count" integer, "skipped_count" integer, "errors" "text"[])
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  kv_records RECORD;
  migrated INTEGER := 0;
  skipped INTEGER := 0;
  error_list TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Note: This is a placeholder function structure
  -- Actual KV → Table migration would need to be implemented based on KV store structure
  -- For now, this serves as documentation
  
  RAISE NOTICE 'KV → Table migration function is a placeholder';
  RAISE NOTICE 'Manual migration steps:';
  RAISE NOTICE '1. Export KV data with prefix "ai_provider:"';
  RAISE NOTICE '2. Transform to match ai_providers table schema';
  RAISE NOTICE '3. INSERT into ai_providers table';
  
  RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, ARRAY['Not implemented - see function comments']::TEXT[];
END;
$$;


ALTER FUNCTION "public"."migrate_ai_providers_from_kv"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ndi_preset_rpc"("p_action" "text", "p_id" "uuid" DEFAULT NULL::"uuid", "p_name" "text" DEFAULT NULL::"text", "p_resolution" "text" DEFAULT NULL::"text", "p_fps" "text" DEFAULT NULL::"text", "p_pixel_format" "text" DEFAULT NULL::"text", "p_stream_name" "text" DEFAULT NULL::"text", "p_alpha" boolean DEFAULT NULL::boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
    result jsonb;
begin
    if p_action = 'create' then
        insert into ndi_presets(name, resolution, fps, pixel_format, stream_name, alpha)
        values (p_name, p_resolution, p_fps, p_pixel_format, p_stream_name, p_alpha)
        returning to_jsonb(ndi_presets.*) into result;

    elsif p_action = 'update' then
        update ndi_presets
        set name = coalesce(p_name, name),
            resolution = coalesce(p_resolution, resolution),
            fps = coalesce(p_fps, fps),
            pixel_format = coalesce(p_pixel_format, pixel_format),
            stream_name = coalesce(p_stream_name, stream_name),
            alpha = coalesce(p_alpha, alpha)
        where id = p_id
        returning to_jsonb(ndi_presets.*) into result;

    elsif p_action = 'delete' then
        delete from ndi_presets where id = p_id;
        result := jsonb_build_object('deleted', true);

    elsif p_action = 'get' then
        select to_jsonb(t.*) into result
        from ndi_presets t where id = p_id;

    elsif p_action = 'list' then
        select jsonb_agg(to_jsonb(t.*)) into result
        from ndi_presets t;

    else
        raise exception 'Invalid NDI preset action';
    end if;

    return result;
end;
$$;


ALTER FUNCTION "public"."ndi_preset_rpc"("p_action" "text", "p_id" "uuid", "p_name" "text", "p_resolution" "text", "p_fps" "text", "p_pixel_format" "text", "p_stream_name" "text", "p_alpha" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_edge_function"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- When a queue item becomes 'ready', your app can listen to this
    PERFORM pg_notify(
        'sync_ready',
        json_build_object(
            'queue_id', NEW.id,
            'data_source_id', NEW.data_source_id
        )::text
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_edge_function"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."output_profile_rpc"("p_action" "text", "p_id" "uuid" DEFAULT NULL::"uuid", "p_name" "text" DEFAULT NULL::"text", "p_output_type" "text" DEFAULT NULL::"text", "p_source_url" "text" DEFAULT NULL::"text", "p_source_file_path" "text" DEFAULT NULL::"text", "p_reload_source" boolean DEFAULT NULL::boolean, "p_ndi_preset_id" "uuid" DEFAULT NULL::"uuid", "p_ndi_settings" "jsonb" DEFAULT NULL::"jsonb", "p_2110_preset_id" "uuid" DEFAULT NULL::"uuid", "p_2110_settings" "jsonb" DEFAULT NULL::"jsonb", "p_auto_start" boolean DEFAULT NULL::boolean, "p_full_config" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
    result jsonb;
begin
    if p_action = 'create' then
        insert into output_profiles(
            name,
            output_type,
            source_url,
            source_file_path,
            reload_source_on_start,
            ndi_preset_id,
            ndi_settings,
            st2110_preset_id,
            st2110_settings,
            auto_start,
            full_config
        )
        values (
            p_name,
            p_output_type,
            p_source_url,
            p_source_file_path,
            p_reload_source,
            p_ndi_preset_id,
            p_ndi_settings,
            p_2110_preset_id,
            p_2110_settings,
            p_auto_start,
            p_full_config
        )
        returning to_jsonb(output_profiles.*) into result;

    elsif p_action = 'update' then
        update output_profiles
        set name = coalesce(p_name, name),
            output_type = coalesce(p_output_type, output_type),
            source_url = coalesce(p_source_url, source_url),
            source_file_path = coalesce(p_source_file_path, source_file_path),
            reload_source_on_start = coalesce(p_reload_source, reload_source_on_start),
            ndi_preset_id = coalesce(p_ndi_preset_id, ndi_preset_id),
            ndi_settings = coalesce(p_ndi_settings, ndi_settings),
            st2110_preset_id = coalesce(p_2110_preset_id, st2110_preset_id),
            st2110_settings = coalesce(p_2110_settings, st2110_settings),
            auto_start = coalesce(p_auto_start, auto_start),
            full_config = coalesce(p_full_config, full_config)
        where id = p_id
        returning to_jsonb(output_profiles.*) into result;

    elsif p_action = 'delete' then
        delete from output_profiles where id = p_id;
        result := jsonb_build_object('deleted', true);

    elsif p_action = 'get' then
        select to_jsonb(t.*) into result
        from output_profiles t
        where id = p_id;

    elsif p_action = 'list' then
        select jsonb_agg(to_jsonb(t.*)) into result
        from output_profiles t;

    else
        raise exception 'Invalid output profile action';
    end if;

    return result;
end;
$$;


ALTER FUNCTION "public"."output_profile_rpc"("p_action" "text", "p_id" "uuid", "p_name" "text", "p_output_type" "text", "p_source_url" "text", "p_source_file_path" "text", "p_reload_source" boolean, "p_ndi_preset_id" "uuid", "p_ndi_settings" "jsonb", "p_2110_preset_id" "uuid", "p_2110_settings" "jsonb", "p_auto_start" boolean, "p_full_config" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populate_sync_queue"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    inserted_count INTEGER;
BEGIN
    INSERT INTO sync_queue (data_source_id, priority)
    SELECT 
        id,
        CASE 
            WHEN type = 'database' THEN 1
            ELSE 0 
        END as priority
    FROM data_sources 
    WHERE active = true
      AND (sync_config->>'enabled')::boolean = true
      AND (next_sync_at IS NULL OR next_sync_at <= NOW())
    ON CONFLICT (data_source_id) WHERE status IN ('pending', 'processing')
    DO NOTHING;
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    
    RETURN json_build_object(
        'inserted', inserted_count,
        'message', format('Added %s items to sync queue', inserted_count)
    );
END;
$$;


ALTER FUNCTION "public"."populate_sync_queue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preview_log_cleanup"() RETURNS TABLE("table_name" "text", "status" "text", "age_category" "text", "count" bigint, "oldest" timestamp with time zone, "size_estimate" "text")
    LANGUAGE "plpgsql"
    AS $$BEGIN
    -- Debug log preview
    RETURN QUERY
    SELECT 
        'debug_log'::TEXT,
        'all'::TEXT,
        'older than 3 days'::TEXT,
        COUNT(*),
        MIN(created_at),
        pg_size_pretty(SUM(pg_column_size(debug_log.*))::BIGINT) as size_estimate
    FROM debug_log
    WHERE created_at < NOW() - INTERVAL '3 days';
    
    -- Sync logs - success
    RETURN QUERY
    SELECT 
        'data_source_sync_logs'::TEXT,
        'success'::TEXT,
        'older than 1 day'::TEXT,
        COUNT(*),
        MIN(created_at),
        pg_size_pretty(SUM(pg_column_size(data_source_sync_logs.*))::BIGINT)
    FROM data_source_sync_logs
    WHERE data_source_sync_logs.status = 'success' 
    AND data_source_sync_logs.created_at < NOW() - INTERVAL '1 day';
    
    -- Sync logs - errors
    RETURN QUERY
    SELECT 
        'data_source_sync_logs'::TEXT,
        'error'::TEXT,
        'older than 7 days'::TEXT,
        COUNT(*),
        MIN(created_at),
        pg_size_pretty(SUM(pg_column_size(data_source_sync_logs.*))::BIGINT)
    FROM data_source_sync_logs
    WHERE data_source_sync_logs.status = 'error' 
    AND created_at < NOW() - INTERVAL '7 days';
    
    -- Very old logs
    RETURN QUERY
    SELECT 
        'data_source_sync_logs'::TEXT,
        'any'::TEXT,
        'older than 30 days'::TEXT,
        COUNT(*),
        MIN(created_at),
        pg_size_pretty(SUM(pg_column_size(data_source_sync_logs.*))::BIGINT)
    FROM data_source_sync_logs
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- File sync queue
    RETURN QUERY
    SELECT 
        'file_sync_queue'::TEXT,
        'completed'::TEXT,
        'older than 7 days'::TEXT,
        COUNT(*),
        MIN(processed_at),
        pg_size_pretty(SUM(pg_column_size(file_sync_queue.*))::BIGINT)
    FROM file_sync_queue
    WHERE file_sync_queue.status = 'completed'
    AND processed_at < NOW() - INTERVAL '7 days';
END;$$;


ALTER FUNCTION "public"."preview_log_cleanup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_sync_queue"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    service_key TEXT;
    project_ref TEXT;
    request_id BIGINT;
    queue_record RECORD;
    total_requests INTEGER := 0;
    edge_function TEXT;
BEGIN
    -- Get credentials
    SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
    SELECT decrypted_secret INTO project_ref FROM vault.decrypted_secrets WHERE name = 'project_ref';
    
    -- Process pending queue items
    FOR queue_record IN 
        SELECT 
            q.id as queue_id,
            q.data_source_id,
            q.attempts,
            ds.name,
            ds.type
        FROM sync_queue q
        JOIN data_sources ds ON ds.id = q.data_source_id
        WHERE q.status = 'pending'
          AND ds.active = true
        ORDER BY q.priority DESC, q.created_at ASC
        LIMIT 10
    LOOP
        -- Mark as processing
        UPDATE sync_queue 
        SET status = 'processing',
            started_at = NOW(),
            attempts = attempts + 1
        WHERE id = queue_record.queue_id;
        
        -- Update data source status - USE 'running' NOT 'syncing'
        UPDATE data_sources 
        SET sync_status = 'running',  -- Changed from 'syncing' to 'running'
            last_sync_at = NOW()
        WHERE id = queue_record.data_source_id;
        
        -- Determine edge function
        edge_function := CASE queue_record.type
            WHEN 'file' THEN 'sync-file-integration'
            WHEN 'database' THEN 'sync-database-integration'
            ELSE NULL
        END;
        
        IF edge_function IS NOT NULL THEN
            -- Call the edge function
            request_id := net.http_post(
                url := format('https://%s.supabase.co/functions/v1/%s', project_ref, edge_function),
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || service_key,
                    'Content-Type', 'application/json'
                )::jsonb,
                body := jsonb_build_object(
                    'dataSourceId', queue_record.data_source_id,
                    'queueId', queue_record.queue_id
                )
            );
            
            total_requests := total_requests + 1;
            
            -- Log the request
            INSERT INTO data_source_sync_logs (
                data_source_id,
                status, 
                error_message
            )
            VALUES (
                queue_record.data_source_id,
                'running', 
                format('Started %s sync for "%s", request ID: %s', queue_record.type, queue_record.name, request_id)
            );
        ELSE
            -- Mark as failed for unknown type
            UPDATE sync_queue 
            SET status = 'failed',
                completed_at = NOW(),
                error_message = 'Unknown data source type'
            WHERE id = queue_record.queue_id;
        END IF;
    END LOOP;
    
    -- Clean up old completed/failed entries (older than 7 days)
    DELETE FROM sync_queue 
    WHERE status IN ('completed', 'failed') 
      AND completed_at < NOW() - INTERVAL '7 days';
    
    RETURN json_build_object(
        'processed', total_requests,
        'message', format('Started %s sync requests', total_requests)
    );
END;
$$;


ALTER FUNCTION "public"."process_sync_queue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_create_project"("p_name" "text", "p_description" "text" DEFAULT NULL::"text", "p_default_channel_id" "uuid" DEFAULT NULL::"uuid", "p_default_instance_id" "uuid" DEFAULT NULL::"uuid", "p_color" "text" DEFAULT 'blue'::"text", "p_icon" "text" DEFAULT '📁'::"text", "p_settings" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_project pulsarvs_projects;
BEGIN
  INSERT INTO pulsarvs_projects (
    name, description, default_channel_id, default_instance_id,
    color, icon, settings
  )
  VALUES (
    p_name, p_description, p_default_channel_id, p_default_instance_id,
    p_color, p_icon, p_settings
  )
  RETURNING * INTO new_project;

  RETURN json_build_object('success', true, 'data', row_to_json(new_project));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_create_project"("p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "uuid", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_delete_project"("p_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM pulsarvs_projects WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Project not found');
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_delete_project"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_get_active_project"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result JSON;
  project_data JSON;
BEGIN
  SELECT row_to_json(p) INTO project_data
  FROM pulsarvs_projects p
  WHERE p.is_active = true
  LIMIT 1;

  IF project_data IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active project');
  END IF;

  RETURN json_build_object('success', true, 'data', project_data);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_get_active_project"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_get_projects"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'success', true,
    'data', COALESCE(json_agg(row_to_json(p) ORDER BY p.name), '[]'::json)
  ) INTO result
  FROM pulsarvs_projects p;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."pulsarvs_get_projects"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_playlist_create"("p_name" character varying, "p_description" "text" DEFAULT NULL::"text", "p_project_id" "uuid" DEFAULT NULL::"uuid", "p_loop_enabled" boolean DEFAULT false) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_playlist pulsarvs_playlists;
BEGIN
    INSERT INTO pulsarvs_playlists (name, description, project_id, loop_enabled)
    VALUES (p_name, p_description, p_project_id, p_loop_enabled)
    RETURNING * INTO new_playlist;

    RETURN json_build_object('success', true, 'data', row_to_json(new_playlist));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_playlist_create"("p_name" character varying, "p_description" "text", "p_project_id" "uuid", "p_loop_enabled" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_playlist_delete"("p_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM pulsarvs_playlists WHERE id = p_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Playlist not found');
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_playlist_delete"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_playlist_get"("p_playlist_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
    playlist_data JSON;
    items_data JSON;
BEGIN
    -- Get playlist
    SELECT row_to_json(pl) INTO playlist_data
    FROM (
        SELECT
            id, name, description, project_id,
            is_active, loop_enabled, created_at, updated_at
        FROM pulsarvs_playlists
        WHERE id = p_playlist_id
    ) pl;

    IF playlist_data IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Playlist not found');
    END IF;

    -- Get items with joined data (top-level items only, nested items included in metadata)
    SELECT COALESCE(json_agg(row_to_json(i) ORDER BY i.sort_order), '[]'::json) INTO items_data
    FROM (
        SELECT
            pi.id,
            pi.playlist_id,
            pi.item_type,
            pi.content_id,
            pi.media_id,
            pi.folder_id,
            pi.name,
            pi.channel_id,
            c.name as channel_name,
            c.type as channel_type,
            pi.duration,
            pi.scheduled_time,
            pi.sort_order,
            pi.metadata,
            pi.parent_item_id,
            pi.created_at,
            -- Content details if applicable
            vc.backdrop_url as content_backdrop,
            -- Media details if applicable
            ma.file_url as media_url,
            ma.thumbnail_url as media_thumbnail,
            ma.media_type,
            -- Count of nested items (for groups)
            (SELECT COUNT(*) FROM pulsarvs_playlist_items WHERE parent_item_id = pi.id) as nested_count
        FROM pulsarvs_playlist_items pi
        LEFT JOIN channels c ON pi.channel_id = c.id
        LEFT JOIN vs_content vc ON pi.content_id = vc.id
        LEFT JOIN media_assets ma ON pi.media_id = ma.id
        WHERE pi.playlist_id = p_playlist_id AND pi.parent_item_id IS NULL
    ) i;

    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'playlist', playlist_data,
            'items', items_data
        )
    );
END;
$$;


ALTER FUNCTION "public"."pulsarvs_playlist_get"("p_playlist_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_playlist_item_add"("p_playlist_id" "uuid", "p_item_type" "public"."pulsarvs_playlist_item_type", "p_name" character varying, "p_content_id" "uuid" DEFAULT NULL::"uuid", "p_media_id" "uuid" DEFAULT NULL::"uuid", "p_channel_id" "uuid" DEFAULT NULL::"uuid", "p_duration" integer DEFAULT 10, "p_scheduled_time" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_item pulsarvs_playlist_items;
    max_sort INTEGER;
BEGIN
    -- Get next sort order
    SELECT COALESCE(MAX(sort_order), -1) + 1 INTO max_sort
    FROM pulsarvs_playlist_items
    WHERE playlist_id = p_playlist_id;

    INSERT INTO pulsarvs_playlist_items (
        playlist_id, item_type, name, content_id, media_id,
        channel_id, duration, scheduled_time, sort_order, metadata
    )
    VALUES (
        p_playlist_id, p_item_type, p_name, p_content_id, p_media_id,
        p_channel_id, p_duration, p_scheduled_time, max_sort, p_metadata
    )
    RETURNING * INTO new_item;

    RETURN json_build_object('success', true, 'data', row_to_json(new_item));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_playlist_item_add"("p_playlist_id" "uuid", "p_item_type" "public"."pulsarvs_playlist_item_type", "p_name" character varying, "p_content_id" "uuid", "p_media_id" "uuid", "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_playlist_item_add"("p_playlist_id" "uuid", "p_item_type" "public"."pulsarvs_playlist_item_type", "p_name" character varying, "p_content_id" "uuid" DEFAULT NULL::"uuid", "p_media_id" "uuid" DEFAULT NULL::"uuid", "p_folder_id" "uuid" DEFAULT NULL::"uuid", "p_channel_id" "uuid" DEFAULT NULL::"uuid", "p_duration" integer DEFAULT 10, "p_scheduled_time" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_parent_item_id" "uuid" DEFAULT NULL::"uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_item pulsarvs_playlist_items;
    max_sort INTEGER;
BEGIN
    -- Get next sort order (within parent if applicable)
    IF p_parent_item_id IS NOT NULL THEN
        SELECT COALESCE(MAX(sort_order), -1) + 1 INTO max_sort
        FROM pulsarvs_playlist_items
        WHERE playlist_id = p_playlist_id AND parent_item_id = p_parent_item_id;
    ELSE
        SELECT COALESCE(MAX(sort_order), -1) + 1 INTO max_sort
        FROM pulsarvs_playlist_items
        WHERE playlist_id = p_playlist_id AND parent_item_id IS NULL;
    END IF;

    INSERT INTO pulsarvs_playlist_items (
        playlist_id, item_type, name, content_id, media_id, folder_id,
        channel_id, duration, scheduled_time, sort_order, metadata, parent_item_id
    )
    VALUES (
        p_playlist_id, p_item_type, p_name, p_content_id, p_media_id, p_folder_id,
        p_channel_id, p_duration, p_scheduled_time, max_sort, p_metadata, p_parent_item_id
    )
    RETURNING * INTO new_item;

    RETURN json_build_object('success', true, 'data', row_to_json(new_item));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_playlist_item_add"("p_playlist_id" "uuid", "p_item_type" "public"."pulsarvs_playlist_item_type", "p_name" character varying, "p_content_id" "uuid", "p_media_id" "uuid", "p_folder_id" "uuid", "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb", "p_parent_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_playlist_item_delete"("p_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM pulsarvs_playlist_items WHERE id = p_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Item not found');
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_playlist_item_delete"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_playlist_item_get_nested"("p_parent_item_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    items_data JSON;
BEGIN
    SELECT COALESCE(json_agg(row_to_json(i) ORDER BY i.sort_order), '[]'::json) INTO items_data
    FROM (
        SELECT
            pi.id,
            pi.playlist_id,
            pi.item_type,
            pi.content_id,
            pi.media_id,
            pi.folder_id,
            pi.name,
            pi.channel_id,
            c.name as channel_name,
            pi.duration,
            pi.scheduled_time,
            pi.sort_order,
            pi.metadata,
            pi.parent_item_id,
            pi.created_at,
            vc.backdrop_url as content_backdrop,
            ma.file_url as media_url,
            ma.thumbnail_url as media_thumbnail,
            ma.media_type
        FROM pulsarvs_playlist_items pi
        LEFT JOIN channels c ON pi.channel_id = c.id
        LEFT JOIN vs_content vc ON pi.content_id = vc.id
        LEFT JOIN media_assets ma ON pi.media_id = ma.id
        WHERE pi.parent_item_id = p_parent_item_id
    ) i;

    RETURN json_build_object('success', true, 'data', items_data);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_playlist_item_get_nested"("p_parent_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_playlist_item_set_channel"("p_id" "uuid", "p_channel_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    updated_item pulsarvs_playlist_items;
BEGIN
    UPDATE pulsarvs_playlist_items
    SET channel_id = p_channel_id
    WHERE id = p_id
    RETURNING * INTO updated_item;

    IF updated_item IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Item not found');
    END IF;

    RETURN json_build_object('success', true, 'data', row_to_json(updated_item));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_playlist_item_set_channel"("p_id" "uuid", "p_channel_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_playlist_item_update"("p_id" "uuid", "p_name" character varying DEFAULT NULL::character varying, "p_channel_id" "uuid" DEFAULT NULL::"uuid", "p_duration" integer DEFAULT NULL::integer, "p_scheduled_time" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    updated_item pulsarvs_playlist_items;
BEGIN
    UPDATE pulsarvs_playlist_items
    SET
        name = COALESCE(p_name, name),
        channel_id = COALESCE(p_channel_id, channel_id),
        duration = COALESCE(p_duration, duration),
        scheduled_time = COALESCE(p_scheduled_time, scheduled_time),
        metadata = COALESCE(p_metadata, metadata)
    WHERE id = p_id
    RETURNING * INTO updated_item;

    IF updated_item IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Item not found');
    END IF;

    RETURN json_build_object('success', true, 'data', row_to_json(updated_item));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_playlist_item_update"("p_id" "uuid", "p_name" character varying, "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_playlist_item_update"("p_id" "uuid", "p_name" character varying DEFAULT NULL::character varying, "p_channel_id" "uuid" DEFAULT NULL::"uuid", "p_duration" integer DEFAULT NULL::integer, "p_scheduled_time" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_metadata" "jsonb" DEFAULT NULL::"jsonb", "p_media_id" "uuid" DEFAULT NULL::"uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    updated_item pulsarvs_playlist_items;
    v_item_type pulsarvs_playlist_item_type;
BEGIN
    -- Get the current item type
    SELECT item_type INTO v_item_type FROM pulsarvs_playlist_items WHERE id = p_id;

    IF v_item_type IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Item not found');
    END IF;

    -- Only allow media_id update for media type items
    IF p_media_id IS NOT NULL AND v_item_type != 'media' THEN
        RETURN json_build_object('success', false, 'error', 'Cannot update media_id for non-media items');
    END IF;

    UPDATE pulsarvs_playlist_items
    SET
        name = COALESCE(p_name, name),
        channel_id = COALESCE(p_channel_id, channel_id),
        duration = COALESCE(p_duration, duration),
        scheduled_time = COALESCE(p_scheduled_time, scheduled_time),
        metadata = COALESCE(p_metadata, metadata),
        media_id = COALESCE(p_media_id, media_id),
        updated_at = NOW()
    WHERE id = p_id
    RETURNING * INTO updated_item;

    IF updated_item IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Item not found');
    END IF;

    RETURN json_build_object('success', true, 'data', row_to_json(updated_item));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_playlist_item_update"("p_id" "uuid", "p_name" character varying, "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb", "p_media_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_playlist_items_group"("p_playlist_id" "uuid", "p_item_ids" "uuid"[], "p_group_name" character varying) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_group pulsarvs_playlist_items;
    max_sort INTEGER;
    min_sort INTEGER;
    i INTEGER;
BEGIN
    -- Get the minimum sort_order of selected items (where to insert group)
    SELECT MIN(sort_order) INTO min_sort
    FROM pulsarvs_playlist_items
    WHERE id = ANY(p_item_ids);

    -- Create the group item
    INSERT INTO pulsarvs_playlist_items (
        playlist_id, item_type, name, sort_order, metadata
    )
    VALUES (
        p_playlist_id, 'group', p_group_name, min_sort, '{}'::jsonb
    )
    RETURNING * INTO new_group;

    -- Move selected items under the group
    FOR i IN 1..array_length(p_item_ids, 1) LOOP
        UPDATE pulsarvs_playlist_items
        SET
            parent_item_id = new_group.id,
            sort_order = i - 1
        WHERE id = p_item_ids[i];
    END LOOP;

    -- Reorder remaining top-level items
    WITH sorted_items AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) - 1 as new_order
        FROM pulsarvs_playlist_items
        WHERE playlist_id = p_playlist_id AND parent_item_id IS NULL
    )
    UPDATE pulsarvs_playlist_items pi
    SET sort_order = si.new_order
    FROM sorted_items si
    WHERE pi.id = si.id;

    RETURN json_build_object('success', true, 'data', row_to_json(new_group));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_playlist_items_group"("p_playlist_id" "uuid", "p_item_ids" "uuid"[], "p_group_name" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_playlist_items_reorder"("p_playlist_id" "uuid", "p_item_ids" "uuid"[]) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 1..array_length(p_item_ids, 1) LOOP
        UPDATE pulsarvs_playlist_items
        SET sort_order = i - 1
        WHERE id = p_item_ids[i] AND playlist_id = p_playlist_id;
    END LOOP;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_playlist_items_reorder"("p_playlist_id" "uuid", "p_item_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_playlist_items_ungroup"("p_group_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    group_item pulsarvs_playlist_items;
    group_sort INTEGER;
BEGIN
    -- Get the group item
    SELECT * INTO group_item FROM pulsarvs_playlist_items WHERE id = p_group_id AND item_type = 'group';

    IF group_item IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Group not found');
    END IF;

    group_sort := group_item.sort_order;

    -- Move nested items to top level, positioning them where the group was
    UPDATE pulsarvs_playlist_items
    SET
        parent_item_id = NULL,
        sort_order = group_sort + sort_order
    WHERE parent_item_id = p_group_id;

    -- Delete the group item
    DELETE FROM pulsarvs_playlist_items WHERE id = p_group_id;

    -- Reorder all items
    WITH sorted_items AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) - 1 as new_order
        FROM pulsarvs_playlist_items
        WHERE playlist_id = group_item.playlist_id AND parent_item_id IS NULL
    )
    UPDATE pulsarvs_playlist_items pi
    SET sort_order = si.new_order
    FROM sorted_items si
    WHERE pi.id = si.id;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_playlist_items_ungroup"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_playlist_list"("p_project_id" "uuid" DEFAULT NULL::"uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'success', true,
        'data', COALESCE(json_agg(row_to_json(p)), '[]'::json)
    ) INTO result
    FROM (
        SELECT
            pl.id,
            pl.name,
            pl.description,
            pl.project_id,
            pl.is_active,
            pl.loop_enabled,
            pl.created_at,
            pl.updated_at,
            (SELECT COUNT(*) FROM pulsarvs_playlist_items WHERE playlist_id = pl.id) as item_count
        FROM pulsarvs_playlists pl
        WHERE (p_project_id IS NULL OR pl.project_id = p_project_id)
        ORDER BY pl.name ASC
    ) p;

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."pulsarvs_playlist_list"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_playlist_update"("p_id" "uuid", "p_name" character varying DEFAULT NULL::character varying, "p_description" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT NULL::boolean, "p_loop_enabled" boolean DEFAULT NULL::boolean) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    updated_playlist pulsarvs_playlists;
BEGIN
    UPDATE pulsarvs_playlists
    SET
        name = COALESCE(p_name, name),
        description = COALESCE(p_description, description),
        is_active = COALESCE(p_is_active, is_active),
        loop_enabled = COALESCE(p_loop_enabled, loop_enabled)
    WHERE id = p_id
    RETURNING * INTO updated_playlist;

    IF updated_playlist IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Playlist not found');
    END IF;

    RETURN json_build_object('success', true, 'data', row_to_json(updated_playlist));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_playlist_update"("p_id" "uuid", "p_name" character varying, "p_description" "text", "p_is_active" boolean, "p_loop_enabled" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_set_active_project"("p_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  activated_project pulsarvs_projects;
BEGIN
  -- Deactivate all projects
  UPDATE pulsarvs_projects SET is_active = false WHERE is_active = true;

  -- Activate the selected project
  UPDATE pulsarvs_projects
  SET is_active = true, updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO activated_project;

  IF activated_project IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Project not found');
  END IF;

  RETURN json_build_object('success', true, 'data', row_to_json(activated_project));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_set_active_project"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pulsarvs_update_project"("p_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_default_channel_id" "uuid" DEFAULT NULL::"uuid", "p_default_instance_id" "uuid" DEFAULT NULL::"uuid", "p_color" "text" DEFAULT NULL::"text", "p_icon" "text" DEFAULT NULL::"text", "p_settings" "jsonb" DEFAULT NULL::"jsonb") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  updated_project pulsarvs_projects;
BEGIN
  UPDATE pulsarvs_projects
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    default_channel_id = COALESCE(p_default_channel_id, default_channel_id),
    default_instance_id = COALESCE(p_default_instance_id, default_instance_id),
    color = COALESCE(p_color, color),
    icon = COALESCE(p_icon, icon),
    settings = COALESCE(p_settings, settings),
    updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO updated_project;

  IF updated_project IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Project not found');
  END IF;

  RETURN json_build_object('success', true, 'data', row_to_json(updated_project));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."pulsarvs_update_project"("p_id" "uuid", "p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "uuid", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_agent_run"("p_agent_id" "uuid", "p_status" "text", "p_duration_ms" integer DEFAULT NULL::integer, "p_logs" "jsonb" DEFAULT NULL::"jsonb", "p_error_message" "text" DEFAULT NULL::"text", "p_results" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_run_id UUID;
BEGIN
  INSERT INTO agent_runs (
    agent_id,
    status,
    completed_at,
    duration_ms,
    logs,
    error_message,
    results
  )
  VALUES (
    p_agent_id,
    p_status,
    CASE WHEN p_status IN ('COMPLETED', 'FAILED') THEN NOW() ELSE NULL END,
    p_duration_ms,
    p_logs,
    p_error_message,
    p_results
  )
  RETURNING id INTO v_run_id;
  
  -- Update agent statistics
  UPDATE agents
  SET
    last_run = NOW(),
    run_count = run_count + 1,
    error_count = CASE WHEN p_status = 'FAILED' THEN error_count + 1 ELSE error_count END
  WHERE id = p_agent_id;
  
  RETURN v_run_id;
END;
$$;


ALTER FUNCTION "public"."record_agent_run"("p_agent_id" "uuid", "p_status" "text", "p_duration_ms" integer, "p_logs" "jsonb", "p_error_message" "text", "p_results" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."record_agent_run"("p_agent_id" "uuid", "p_status" "text", "p_duration_ms" integer, "p_logs" "jsonb", "p_error_message" "text", "p_results" "jsonb") IS 'Records an agent run and updates agent statistics';



CREATE OR REPLACE FUNCTION "public"."resend_invitation"("p_user_id" "uuid", "p_invitation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_auth_uid UUID;
  v_user_auth_id UUID;
  v_user_org_id UUID;
  v_user_org_role TEXT;
  v_is_superuser BOOLEAN;
  v_invitation_org_id UUID;
  v_result JSONB;
BEGIN
  -- Get the current auth user id
  v_auth_uid := auth.uid();

  -- Get the user's details from the provided user_id
  SELECT auth_user_id, organization_id, org_role, is_superuser
  INTO v_user_auth_id, v_user_org_id, v_user_org_role, v_is_superuser
  FROM u_users
  WHERE id = p_user_id;

  IF v_user_auth_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Security check: ensure user can only use their own user_id
  IF v_auth_uid IS NOT NULL AND v_user_auth_id != v_auth_uid THEN
    IF NOT EXISTS (
      SELECT 1 FROM u_users
      WHERE auth_user_id = v_auth_uid AND is_superuser = true
    ) THEN
      RAISE EXCEPTION 'Not authorized to resend invitation as this user';
    END IF;
  END IF;

  -- Get the invitation's organization
  SELECT organization_id INTO v_invitation_org_id
  FROM u_invitations
  WHERE id = p_invitation_id;

  IF v_invitation_org_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  -- Authorization check: must be superuser OR (same org AND admin/owner)
  IF NOT v_is_superuser THEN
    IF v_user_org_id != v_invitation_org_id THEN
      RAISE EXCEPTION 'Cannot resend invitation from a different organization';
    END IF;

    IF v_user_org_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'Must be org admin or owner to resend invitations';
    END IF;
  END IF;

  -- Update the invitation - reset expiry date and generate new token
  UPDATE u_invitations
  SET
    expires_at = NOW() + INTERVAL '7 days',
    token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  WHERE id = p_invitation_id;

  -- Return the updated invitation
  SELECT jsonb_build_object(
    'success', true,
    'invitation_id', id,
    'email', email,
    'token', token,
    'expires_at', expires_at
  ) INTO v_result
  FROM u_invitations
  WHERE id = p_invitation_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."resend_invitation"("p_user_id" "uuid", "p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_invitation"("p_user_id" "uuid", "p_invitation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_auth_uid UUID;
  v_user_auth_id UUID;
  v_user_org_id UUID;
  v_user_org_role TEXT;
  v_is_superuser BOOLEAN;
  v_invitation_org_id UUID;
BEGIN
  -- Get the current auth user id
  v_auth_uid := auth.uid();

  -- Get the user's details from the provided user_id
  SELECT auth_user_id, organization_id, org_role, is_superuser
  INTO v_user_auth_id, v_user_org_id, v_user_org_role, v_is_superuser
  FROM u_users
  WHERE id = p_user_id;

  IF v_user_auth_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Security check: ensure user can only use their own user_id
  IF v_auth_uid IS NOT NULL AND v_user_auth_id != v_auth_uid THEN
    IF NOT EXISTS (
      SELECT 1 FROM u_users
      WHERE auth_user_id = v_auth_uid AND is_superuser = true
    ) THEN
      RAISE EXCEPTION 'Not authorized to revoke invitation as this user';
    END IF;
  END IF;

  -- Get the invitation's organization
  SELECT organization_id INTO v_invitation_org_id
  FROM u_invitations
  WHERE id = p_invitation_id;

  IF v_invitation_org_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  -- Authorization check: must be superuser OR (same org AND admin/owner)
  IF NOT v_is_superuser THEN
    IF v_user_org_id != v_invitation_org_id THEN
      RAISE EXCEPTION 'Cannot revoke invitation from a different organization';
    END IF;

    IF v_user_org_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'Must be org admin or owner to revoke invitations';
    END IF;
  END IF;

  -- Delete the invitation
  DELETE FROM u_invitations WHERE id = p_invitation_id;

  RETURN jsonb_build_object('success', true, 'invitation_id', p_invitation_id);
END;
$$;


ALTER FUNCTION "public"."revoke_invitation"("p_user_id" "uuid", "p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_map_position"("p_user_id" "uuid", "p_name" "text", "p_lat" numeric, "p_lng" numeric, "p_zoom" numeric) RETURNS "public"."map_settings"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_pos jsonb;
  settings map_settings;
BEGIN
  new_pos := jsonb_build_object(
    'id', gen_random_uuid(),
    'name', p_name,
    'latitude', p_lat,
    'longitude', p_lng,
    'zoom', p_zoom,
    'created_at', NOW()
  );

  UPDATE map_settings
  SET saved_positions = 
    CASE
      WHEN saved_positions IS NULL THEN jsonb_build_array(new_pos)
      ELSE jsonb_build_array(new_pos) || saved_positions
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO settings;

  RETURN settings;
END;
$$;


ALTER FUNCTION "public"."save_map_position"("p_user_id" "uuid", "p_name" "text", "p_lat" numeric, "p_lng" numeric, "p_zoom" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_map_settings"("p_user_id" "uuid", "p_settings" "jsonb") RETURNS "public"."map_settings"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  updated map_settings;
  existing map_settings;
BEGIN
  -- Get existing settings
  SELECT * INTO existing FROM map_settings WHERE user_id = p_user_id;
  
  -- If no existing record, create with defaults merged with provided settings
  IF NOT FOUND THEN
    INSERT INTO map_settings (
      user_id,
      map_style,
      show_map_labels,
      projection_type,
      default_latitude,
      default_longitude,
      default_zoom,
      saved_positions,
      additional_settings,
      globe_mode,
      atmosphere_enabled,
      map_opacity,
      election_map_opacity,
      updated_at
    )
    VALUES (
      p_user_id,
      COALESCE((p_settings->>'map_style')::map_style_type, 'light'::map_style_type),
      COALESCE((p_settings->>'show_map_labels')::boolean, true),
      COALESCE((p_settings->>'projection_type')::projection_type, 'mercator'::projection_type),
      COALESCE((p_settings->>'default_latitude')::numeric, 38.0),
      COALESCE((p_settings->>'default_longitude')::numeric, -97.0),
      COALESCE((p_settings->>'default_zoom')::numeric, 3.5),
      COALESCE((p_settings->'saved_positions'), '[]'::jsonb),
      COALESCE((p_settings->'additional_settings'), '{}'::jsonb),
      COALESCE((p_settings->>'globe_mode')::boolean, false),
      COALESCE((p_settings->>'atmosphere_enabled')::boolean, true),
      COALESCE((p_settings->>'map_opacity')::real, 1.0),
      COALESCE((p_settings->>'election_map_opacity')::real, 1.0),
      NOW()
    )
    RETURNING * INTO updated;
  ELSE
    -- Update existing record, keeping existing values if not provided
    UPDATE map_settings
    SET
      map_style = COALESCE((p_settings->>'map_style')::map_style_type, existing.map_style),
      show_map_labels = COALESCE((p_settings->>'show_map_labels')::boolean, existing.show_map_labels),
      projection_type = COALESCE((p_settings->>'projection_type')::projection_type, existing.projection_type),
      default_latitude = COALESCE((p_settings->>'default_latitude')::numeric, existing.default_latitude),
      default_longitude = COALESCE((p_settings->>'default_longitude')::numeric, existing.default_longitude),
      default_zoom = COALESCE((p_settings->>'default_zoom')::numeric, existing.default_zoom),
      saved_positions = COALESCE((p_settings->'saved_positions'), existing.saved_positions),
      additional_settings = COALESCE((p_settings->'additional_settings'), existing.additional_settings),
      globe_mode = COALESCE((p_settings->>'globe_mode')::boolean, existing.globe_mode),
      atmosphere_enabled = COALESCE((p_settings->>'atmosphere_enabled')::boolean, existing.atmosphere_enabled),
      map_opacity = COALESCE((p_settings->>'map_opacity')::real, existing.map_opacity),
      election_map_opacity = COALESCE((p_settings->>'election_map_opacity')::real, existing.election_map_opacity),
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO updated;
  END IF;

  RETURN updated;
END;
$$;


ALTER FUNCTION "public"."save_map_settings"("p_user_id" "uuid", "p_settings" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_layouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "layout_name" "text" DEFAULT 'default'::"text",
    "layout_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_layouts" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_user_layout"("p_layout_data" "jsonb") RETURNS "public"."user_layouts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result user_layouts;
BEGIN
  -- Always use 'main' as the layout name
  INSERT INTO user_layouts (user_id, layout_name, layout_data, updated_at)
  VALUES (auth.uid(), 'main', p_layout_data, now())
  ON CONFLICT (user_id, layout_name) 
  DO UPDATE SET 
    layout_data = EXCLUDED.layout_data,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."save_user_layout"("p_layout_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_e_candidates"("p_query" "text") RETURNS SETOF "jsonb"
    LANGUAGE "sql"
    AS $$
  SELECT jsonb_build_object(
    'id', c.id,
    'candidate_id', c.candidate_id,
    'full_name', c.full_name,
    'display_name', c.display_name,
    'short_name', c.short_name,

    -- Party code from e_parties.party_id (TEXT)
    'party_code', p.party_id,
    'party_name', p.name,
    'party_abbreviation', p.abbreviation,
    'party_color', p.color_hex,

    'photo_url', c.photo_url
  )
  FROM public.e_candidates c
  LEFT JOIN public.e_parties p ON p.id = c.party_id
  WHERE
      -- Full-text match
      to_tsvector('english',
        coalesce(c.first_name, '') || ' ' ||
        coalesce(c.last_name, '')  || ' ' ||
        coalesce(c.full_name, '')  || ' ' ||
        coalesce(c.display_name, '') || ' ' ||
        coalesce(c.short_name, '')
      ) @@ plainto_tsquery('english', p_query)
    OR
      -- Fallback fuzzy
      c.full_name ILIKE '%' || p_query || '%'
    OR
      c.display_name ILIKE '%' || p_query || '%';
$$;


ALTER FUNCTION "public"."search_e_candidates"("p_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_teams"("p_query" character varying, "p_limit" integer DEFAULT 20) RETURNS TABLE("team_id" integer, "name" character varying, "short_name" character varying, "abbreviation" character varying, "logo_url" "text", "country" character varying, "country_code" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name, t.short_name, t.abbreviation, t.logo_url, t.country, t.country_code
    FROM sports_teams t
    WHERE t.name ILIKE '%' || p_query || '%'
       OR t.short_name ILIKE '%' || p_query || '%'
       OR t.abbreviation ILIKE '%' || p_query || '%'
    ORDER BY CASE WHEN t.name ILIKE p_query || '%' THEN 0 ELSE 1 END, t.name
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."search_teams"("p_query" character varying, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_dashboard_data"("p_target_org_id" "uuid", "p_dashboard_config" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result JSONB := '{}';
  weather_result JSONB;
  stocks_result JSONB;
  sports_result JSONB;
  elections_result JSONB;
BEGIN
  -- Seed weather locations
  IF p_dashboard_config ? 'weather_locations' AND jsonb_array_length(p_dashboard_config->'weather_locations') > 0 THEN
    SELECT seed_weather_locations(
      p_target_org_id,
      ARRAY(SELECT jsonb_array_elements_text(p_dashboard_config->'weather_locations'))
    ) INTO weather_result;
    result := result || jsonb_build_object('weather', weather_result);
  END IF;

  -- Seed stocks
  IF p_dashboard_config ? 'stocks' AND jsonb_array_length(p_dashboard_config->'stocks') > 0 THEN
    SELECT seed_finance_stocks(
      p_target_org_id,
      ARRAY(SELECT (jsonb_array_elements_text(p_dashboard_config->'stocks'))::UUID)
    ) INTO stocks_result;
    result := result || jsonb_build_object('stocks', stocks_result);
  END IF;

  -- Seed sports leagues
  IF p_dashboard_config ? 'sports_leagues' AND jsonb_array_length(p_dashboard_config->'sports_leagues') > 0 THEN
    SELECT seed_sports_leagues(
      p_target_org_id,
      ARRAY(SELECT (jsonb_array_elements_text(p_dashboard_config->'sports_leagues'))::UUID)
    ) INTO sports_result;
    result := result || jsonb_build_object('sports', sports_result);
  END IF;

  -- Seed elections
  IF p_dashboard_config ? 'elections' AND jsonb_array_length(p_dashboard_config->'elections') > 0 THEN
    SELECT seed_elections(
      p_target_org_id,
      ARRAY(SELECT (jsonb_array_elements_text(p_dashboard_config->'elections'))::UUID)
    ) INTO elections_result;
    result := result || jsonb_build_object('elections', elections_result);
  END IF;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."seed_dashboard_data"("p_target_org_id" "uuid", "p_dashboard_config" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_elections"("p_target_org_id" "uuid", "p_election_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  emergent_org_id UUID;
  election_record RECORD;
  race_record RECORD;
  candidate_record RECORD;
  new_election_id UUID;
  new_race_id UUID;
  new_candidate_id UUID;
  old_new_election_map JSONB := '{}';
  old_new_race_map JSONB := '{}';
  old_new_candidate_map JSONB := '{}';
  election_count INTEGER := 0;
  race_count INTEGER := 0;
  candidate_count INTEGER := 0;
  race_candidate_count INTEGER := 0;
BEGIN
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RAISE EXCEPTION 'Emergent organization not found';
  END IF;

  -- Copy elections
  FOR election_record IN
    SELECT * FROM e_elections
    WHERE id = ANY(p_election_ids) AND organization_id = emergent_org_id
  LOOP
    new_election_id := gen_random_uuid();

    INSERT INTO e_elections (
      id, election_id, country_id, name, type, level, election_date,
      registration_deadline, early_voting_start, early_voting_end,
      status, year, cycle, description, metadata, organization_id,
      created_at, updated_at
    )
    VALUES (
      new_election_id, election_record.election_id, election_record.country_id,
      election_record.name, election_record.type, election_record.level,
      election_record.election_date, election_record.registration_deadline,
      election_record.early_voting_start, election_record.early_voting_end,
      election_record.status, election_record.year, election_record.cycle,
      election_record.description, election_record.metadata, p_target_org_id,
      now(), now()
    );

    election_count := election_count + 1;
    old_new_election_map := old_new_election_map || jsonb_build_object(election_record.id::TEXT, new_election_id::TEXT);

    -- Copy races for this election
    FOR race_record IN
      SELECT * FROM e_races
      WHERE election_id = election_record.id AND organization_id = emergent_org_id
    LOOP
      new_race_id := gen_random_uuid();

      INSERT INTO e_races (
        id, race_id, election_id, division_id, name, display_name, short_name,
        type, office, seat_name, term_length_years, num_elect, partisan,
        uncontested, incumbent_party, rating, priority_level, sort_order,
        description, key_issues, historical_context, editorial_notes,
        metadata, ui_config, organization_id, created_at, updated_at
      )
      VALUES (
        new_race_id, race_record.race_id, new_election_id, race_record.division_id,
        race_record.name, race_record.display_name, race_record.short_name,
        race_record.type, race_record.office, race_record.seat_name,
        race_record.term_length_years, race_record.num_elect, race_record.partisan,
        race_record.uncontested, race_record.incumbent_party, race_record.rating,
        race_record.priority_level, race_record.sort_order, race_record.description,
        race_record.key_issues, race_record.historical_context, race_record.editorial_notes,
        race_record.metadata, race_record.ui_config, p_target_org_id, now(), now()
      );

      race_count := race_count + 1;
      old_new_race_map := old_new_race_map || jsonb_build_object(race_record.id::TEXT, new_race_id::TEXT);
    END LOOP;
  END LOOP;

  -- Copy candidates referenced by the copied races
  -- First, collect all candidate IDs from e_race_candidates for our copied races
  FOR candidate_record IN
    SELECT DISTINCT c.*
    FROM e_candidates c
    JOIN e_race_candidates rc ON rc.candidate_id = c.id
    WHERE rc.race_id IN (SELECT (value::TEXT)::UUID FROM jsonb_each_text(old_new_race_map))
    AND c.organization_id = emergent_org_id
  LOOP
    -- Check if we already copied this candidate
    IF NOT old_new_candidate_map ? candidate_record.id::TEXT THEN
      new_candidate_id := gen_random_uuid();

      INSERT INTO e_candidates (
        id, candidate_id, first_name, last_name, full_name, display_name,
        short_name, party_id, incumbent, age, date_of_birth, gender,
        photo_url, photo_thumbnail_url, photo_credit, video_intro_url,
        media_assets, bio, bio_short, website, twitter_handle, facebook_page,
        instagram_handle, youtube_channel, campaign_email, campaign_phone,
        campaign_headquarters_address, education, professional_background,
        political_experience, endorsements, policy_positions, campaign_finance,
        scandals_controversies, metadata, incumbent_override, organization_id,
        created_at, updated_at
      )
      VALUES (
        new_candidate_id, candidate_record.candidate_id, candidate_record.first_name,
        candidate_record.last_name, candidate_record.full_name, candidate_record.display_name,
        candidate_record.short_name, candidate_record.party_id, candidate_record.incumbent,
        candidate_record.age, candidate_record.date_of_birth, candidate_record.gender,
        candidate_record.photo_url, candidate_record.photo_thumbnail_url,
        candidate_record.photo_credit, candidate_record.video_intro_url,
        candidate_record.media_assets, candidate_record.bio, candidate_record.bio_short,
        candidate_record.website, candidate_record.twitter_handle, candidate_record.facebook_page,
        candidate_record.instagram_handle, candidate_record.youtube_channel,
        candidate_record.campaign_email, candidate_record.campaign_phone,
        candidate_record.campaign_headquarters_address, candidate_record.education,
        candidate_record.professional_background, candidate_record.political_experience,
        candidate_record.endorsements, candidate_record.policy_positions,
        candidate_record.campaign_finance, candidate_record.scandals_controversies,
        candidate_record.metadata, candidate_record.incumbent_override, p_target_org_id,
        now(), now()
      );

      candidate_count := candidate_count + 1;
      old_new_candidate_map := old_new_candidate_map || jsonb_build_object(candidate_record.id::TEXT, new_candidate_id::TEXT);
    END IF;
  END LOOP;

  -- Copy race_candidates junction table with new IDs
  INSERT INTO e_race_candidates (race_id, candidate_id, created_at, updated_at)
  SELECT
    (old_new_race_map->>rc.race_id::TEXT)::UUID,
    (old_new_candidate_map->>rc.candidate_id::TEXT)::UUID,
    now(), now()
  FROM e_race_candidates rc
  WHERE rc.race_id IN (SELECT (key::TEXT)::UUID FROM jsonb_each_text(old_new_race_map))
  AND old_new_candidate_map ? rc.candidate_id::TEXT
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS race_candidate_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'elections_copied', election_count,
    'races_copied', race_count,
    'candidates_copied', candidate_count,
    'race_candidates_copied', race_candidate_count,
    'election_id_map', old_new_election_map,
    'race_id_map', old_new_race_map,
    'candidate_id_map', old_new_candidate_map
  );
END;
$$;


ALTER FUNCTION "public"."seed_elections"("p_target_org_id" "uuid", "p_election_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_finance_stocks"("p_target_org_id" "uuid", "p_stock_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  emergent_org_id UUID;
  copied_count INTEGER;
BEGIN
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RAISE EXCEPTION 'Emergent organization not found';
  END IF;

  WITH inserted AS (
    INSERT INTO f_stocks (
      symbol, name, type, exchange, price, change_1d, change_1d_pct,
      change_1w_pct, change_1y_pct, year_high, year_low, chart_1y,
      rating, custom_name, last_update, class, source, source_id,
      volume, logo_url, organization_id, created_at, updated_at
    )
    SELECT
      symbol, name, type, exchange, price, change_1d, change_1d_pct,
      change_1w_pct, change_1y_pct, year_high, year_low, chart_1y,
      rating, custom_name, last_update, class, source, source_id,
      volume, logo_url, p_target_org_id, now(), now()
    FROM f_stocks
    WHERE id = ANY(p_stock_ids) AND organization_id = emergent_org_id
    -- Avoid duplicates by symbol
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO copied_count FROM inserted;

  RETURN jsonb_build_object('copied_count', copied_count);
END;
$$;


ALTER FUNCTION "public"."seed_finance_stocks"("p_target_org_id" "uuid", "p_stock_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_organization_data"("p_new_org_id" "uuid", "p_seed_config" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  emergent_org_id UUID;
  result JSONB := '{}';
  item_ids TEXT[];
  uuid_ids UUID[];
  copied_count INTEGER;
  project_uuid UUID;
  new_project_id UUID;
BEGIN
  -- Get Emergent org ID
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RAISE EXCEPTION 'Emergent organization not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM u_organizations WHERE id = p_new_org_id) THEN
    RAISE EXCEPTION 'Target organization not found';
  END IF;

  -- Copy AI Providers (id is TEXT)
  IF p_seed_config ? 'ai_providers' AND jsonb_array_length(p_seed_config->'ai_providers') > 0 THEN
    item_ids := ARRAY(SELECT jsonb_array_elements_text(p_seed_config->'ai_providers'));
    WITH inserted AS (
      INSERT INTO ai_providers (id, name, provider_name, type, description, api_key, enabled, created_at, updated_at)
      SELECT gen_random_uuid()::TEXT, name, provider_name, type, description, '', false, now(), now()
      FROM ai_providers WHERE id = ANY(item_ids)
      ON CONFLICT DO NOTHING
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('ai_providers', copied_count);
  END IF;

  -- Copy Data Providers (id is TEXT)
  IF p_seed_config ? 'data_providers' AND jsonb_array_length(p_seed_config->'data_providers') > 0 THEN
    item_ids := ARRAY(SELECT jsonb_array_elements_text(p_seed_config->'data_providers'));
    WITH inserted AS (
      INSERT INTO data_providers (id, organization_id, name, description, type, category, is_active, config, created_at, updated_at)
      SELECT gen_random_uuid()::TEXT, p_new_org_id, name, description, type, category, false,
        config - 'api_key' - 'secret' - 'credentials' - 'password', now(), now()
      FROM data_providers WHERE id = ANY(item_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('data_providers', copied_count);
  END IF;

  -- Copy Feeds (id is UUID)
  IF p_seed_config ? 'feeds' AND jsonb_array_length(p_seed_config->'feeds') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'feeds'))::UUID);
    WITH inserted AS (
      INSERT INTO feeds (organization_id, name, type, category, active, configuration, created_at, updated_at)
      SELECT p_new_org_id, name, type, category, false, configuration, now(), now()
      FROM feeds WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('feeds', copied_count);
  END IF;

  -- Copy Agents (id is UUID)
  IF p_seed_config ? 'agents' AND jsonb_array_length(p_seed_config->'agents') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'agents'))::UUID);
    WITH inserted AS (
      INSERT INTO agents (organization_id, name, description, agent_type, status, configuration, created_at, updated_at)
      SELECT p_new_org_id, name, description, agent_type, 'PAUSED', configuration, now(), now()
      FROM agents WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('agents', copied_count);
  END IF;

  -- Copy API Endpoints (id is UUID)
  IF p_seed_config ? 'api_endpoints' AND jsonb_array_length(p_seed_config->'api_endpoints') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'api_endpoints'))::UUID);
    WITH inserted AS (
      INSERT INTO api_endpoints (
        organization_id, name, slug, description, output_format,
        query_template, transformation_config, cache_duration_seconds,
        active, category, target_apps, created_at, updated_at
      )
      SELECT
        p_new_org_id,
        name,
        slug || '-' || substring(gen_random_uuid()::TEXT, 1, 8),
        description,
        output_format,
        query_template,
        transformation_config,
        cache_duration_seconds,
        false,
        category,
        target_apps,
        now(),
        now()
      FROM api_endpoints
      WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('api_endpoints', copied_count);
  END IF;

  -- Copy Data Sources (id is UUID)
  IF p_seed_config ? 'data_sources' AND jsonb_array_length(p_seed_config->'data_sources') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'data_sources'))::UUID);
    WITH inserted AS (
      INSERT INTO data_sources (organization_id, name, type, active, file_config, sync_config, category, metadata, created_at, updated_at)
      SELECT p_new_org_id, name, type, false, file_config, sync_config, category, metadata, now(), now()
      FROM data_sources WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
      RETURNING 1
    )
    SELECT COUNT(*) INTO copied_count FROM inserted;
    result := result || jsonb_build_object('data_sources', copied_count);
  END IF;

  -- Copy Pulsar Channels
  IF p_seed_config ? 'pulsar_channels' AND jsonb_array_length(p_seed_config->'pulsar_channels') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'pulsar_channels'))::UUID);
    BEGIN
      WITH inserted AS (
        INSERT INTO pulsar_channels (organization_id, name, description, config, is_active, created_at, updated_at)
        SELECT p_new_org_id, name, description, config, false, now(), now()
        FROM pulsar_channels WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
        RETURNING 1
      )
      SELECT COUNT(*) INTO copied_count FROM inserted;
      result := result || jsonb_build_object('pulsar_channels', copied_count);
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END IF;

  -- Copy GFX Projects using complete copy function
  IF p_seed_config ? 'gfx_projects' AND jsonb_array_length(p_seed_config->'gfx_projects') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'gfx_projects'))::UUID);
    copied_count := 0;
    BEGIN
      FOREACH project_uuid IN ARRAY uuid_ids LOOP
        -- Use the complete copy function that copies all child tables
        SELECT copy_gfx_project_complete(project_uuid, p_new_org_id, NULL) INTO new_project_id;
        IF new_project_id IS NOT NULL THEN
          copied_count := copied_count + 1;
        END IF;
      END LOOP;
      result := result || jsonb_build_object('gfx_projects', copied_count);
    EXCEPTION WHEN undefined_table OR undefined_function THEN
      -- Fallback to simple copy if function doesn't exist
      WITH inserted AS (
        INSERT INTO gfx_projects (organization_id, name, description, canvas_width, canvas_height, frame_rate, background_color, created_at, updated_at)
        SELECT p_new_org_id, name, description, canvas_width, canvas_height, frame_rate, background_color, now(), now()
        FROM gfx_projects WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
        RETURNING 1
      )
      SELECT COUNT(*) INTO copied_count FROM inserted;
      result := result || jsonb_build_object('gfx_projects', copied_count);
    END;
  END IF;

  -- Copy Templates
  IF p_seed_config ? 'templates' AND jsonb_array_length(p_seed_config->'templates') > 0 THEN
    uuid_ids := ARRAY(SELECT (jsonb_array_elements_text(p_seed_config->'templates'))::UUID);
    BEGIN
      WITH inserted AS (
        INSERT INTO templates (organization_id, name, type, active, "order", created_at, updated_at)
        SELECT p_new_org_id, name, type, true, "order", now(), now()
        FROM templates WHERE id = ANY(uuid_ids) AND organization_id = emergent_org_id
        RETURNING 1
      )
      SELECT COUNT(*) INTO copied_count FROM inserted;
      result := result || jsonb_build_object('templates', copied_count);
    EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
    END;
  END IF;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."seed_organization_data"("p_new_org_id" "uuid", "p_seed_config" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_sports_leagues"("p_target_org_id" "uuid", "p_league_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  emergent_org_id UUID;
  old_new_league_map JSONB := '{}';
  old_new_team_map JSONB := '{}';
  league_record RECORD;
  team_record RECORD;
  new_league_id UUID;
  new_team_id UUID;
  league_count INTEGER := 0;
  team_count INTEGER := 0;
BEGIN
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RAISE EXCEPTION 'Emergent organization not found';
  END IF;

  -- Copy leagues
  FOR league_record IN
    SELECT * FROM sports_leagues
    WHERE id = ANY(p_league_ids) AND organization_id = emergent_org_id
  LOOP
    new_league_id := gen_random_uuid();

    INSERT INTO sports_leagues (
      id, sportradar_id, sportmonks_id, name, alternative_name,
      short_name, type, gender, sport, category_id, logo_url,
      active, api_source, organization_id, created_at, updated_at
    )
    VALUES (
      new_league_id, league_record.sportradar_id, league_record.sportmonks_id,
      league_record.name, league_record.alternative_name, league_record.short_name,
      league_record.type, league_record.gender, league_record.sport,
      league_record.category_id, league_record.logo_url, true,
      league_record.api_source, p_target_org_id, now(), now()
    );

    league_count := league_count + 1;
    old_new_league_map := old_new_league_map || jsonb_build_object(league_record.id::TEXT, new_league_id::TEXT);

    -- Copy teams that belong to this league (via season_teams or direct association)
    -- First, find teams from sports_season_teams for this league's seasons
    FOR team_record IN
      SELECT DISTINCT t.*
      FROM sports_teams t
      WHERE t.organization_id = emergent_org_id
      AND EXISTS (
        SELECT 1 FROM sports_season_teams st
        JOIN sports_seasons s ON s.id = st.season_id
        WHERE s.league_id = league_record.id AND st.team_id = t.id
      )
    LOOP
      -- Check if we already copied this team
      IF NOT old_new_team_map ? team_record.id::TEXT THEN
        new_team_id := gen_random_uuid();

        INSERT INTO sports_teams (
          id, sportradar_id, sportmonks_id, name, short_name, abbreviation,
          gender, country, country_code, city, venue, founded, logo_url,
          colors, sport, api_source, venue_id, organization_id, created_at, updated_at
        )
        VALUES (
          new_team_id, team_record.sportradar_id, team_record.sportmonks_id,
          team_record.name, team_record.short_name, team_record.abbreviation,
          team_record.gender, team_record.country, team_record.country_code,
          team_record.city, team_record.venue, team_record.founded, team_record.logo_url,
          team_record.colors, team_record.sport, team_record.api_source,
          team_record.venue_id, p_target_org_id, now(), now()
        );

        team_count := team_count + 1;
        old_new_team_map := old_new_team_map || jsonb_build_object(team_record.id::TEXT, new_team_id::TEXT);
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'leagues_copied', league_count,
    'teams_copied', team_count,
    'league_id_map', old_new_league_map,
    'team_id_map', old_new_team_map
  );
END;
$$;


ALTER FUNCTION "public"."seed_sports_leagues"("p_target_org_id" "uuid", "p_league_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_weather_locations"("p_target_org_id" "uuid", "p_location_ids" "text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  emergent_org_id UUID;
  old_new_map JSONB := '{}';
  old_id TEXT;
  new_id TEXT;
  copied_count INTEGER := 0;
BEGIN
  SELECT id INTO emergent_org_id FROM u_organizations WHERE slug = 'emergent';

  IF emergent_org_id IS NULL THEN
    RAISE EXCEPTION 'Emergent organization not found';
  END IF;

  -- For each location, create a copy with new ID
  FOREACH old_id IN ARRAY p_location_ids LOOP
    -- Generate new location ID (text based)
    new_id := 'loc_' || substring(gen_random_uuid()::TEXT, 1, 8);

    INSERT INTO weather_locations (
      id, name, admin1, country, lat, lon, elevation_m,
      station_id, timezone, is_active, custom_name,
      provider_id, provider_name, channel_id, organization_id,
      created_at, updated_at
    )
    SELECT
      new_id, name, admin1, country, lat, lon, elevation_m,
      station_id, timezone, true, custom_name,
      provider_id, provider_name, NULL, p_target_org_id,
      now(), now()
    FROM weather_locations
    WHERE id = old_id AND organization_id = emergent_org_id;

    IF FOUND THEN
      copied_count := copied_count + 1;
      old_new_map := old_new_map || jsonb_build_object(old_id, new_id);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'copied_count', copied_count,
    'id_map', old_new_map
  );
END;
$$;


ALTER FUNCTION "public"."seed_weather_locations"("p_target_org_id" "uuid", "p_location_ids" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."shift_items_after_deletion"("p_parent_id" "uuid", "p_deleted_order" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$BEGIN
    UPDATE content
    SET "order" = "order" - 1
    WHERE parent_id = p_parent_id AND "order" > p_deleted_order;
END;$$;


ALTER FUNCTION "public"."shift_items_after_deletion"("p_parent_id" "uuid", "p_deleted_order" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."shift_items_for_insertion"("p_parent_id" "uuid", "p_start_order" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  UPDATE content
  SET "order" = "order" + 1
  WHERE parent_id = p_parent_id AND "order" >= p_start_order;
END;$$;


ALTER FUNCTION "public"."shift_items_for_insertion"("p_parent_id" "uuid", "p_start_order" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."shift_order_on_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    shift_count INTEGER;
BEGIN
  -- Only shift if the deleted item had an order value
  IF OLD."order" IS NULL THEN
    RETURN OLD;
  END IF;

  -- Log the deletion (helps with debugging)
  RAISE NOTICE 'Deleting % from % with order % and parent_id %', 
    OLD.id, TG_TABLE_NAME, OLD."order", OLD.parent_id;

  -- Perform the order shift
  IF OLD.parent_id IS NULL THEN
    -- Top-level item (no parent)
    EXECUTE format('
      UPDATE %I
      SET "order" = "order" - 1
      WHERE parent_id IS NULL
        AND "order" > $1',
      TG_TABLE_NAME
    ) USING OLD."order";
    
    GET DIAGNOSTICS shift_count = ROW_COUNT;
  ELSE
    -- Child item (has parent)
    EXECUTE format('
      UPDATE %I
      SET "order" = "order" - 1
      WHERE parent_id = $1
        AND "order" > $2',
      TG_TABLE_NAME
    ) USING OLD.parent_id, OLD."order";
    
    GET DIAGNOSTICS shift_count = ROW_COUNT;
  END IF;
  
  -- Log the result
  RAISE NOTICE 'Shifted % items in % after deleting item with order %', 
    shift_count, TG_TABLE_NAME, OLD."order";
  
  RETURN OLD;
END;
$_$;


ALTER FUNCTION "public"."shift_order_on_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sportsmonks_leagues"("p_dashboard" "text" DEFAULT 'nova'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_provider_id TEXT;
  v_provider RECORD;
BEGIN
  -- Get active SportMonks provider
  SELECT id INTO v_provider_id
  FROM data_providers
  WHERE type = 'sportmonks'
    AND category = 'sports'
    AND is_active = true
  LIMIT 1;

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'No active SportMonks provider configured';
  END IF;

  -- Get provider details including API key
  SELECT * INTO v_provider
  FROM data_providers
  WHERE id = v_provider_id;

  IF v_provider.api_key IS NULL OR v_provider.api_key = '' THEN
    RAISE EXCEPTION 'SportMonks API key not configured';
  END IF;

  -- Return provider status (frontend should call backend endpoint for actual leagues)
  RETURN jsonb_build_object(
    'ready', true,
    'provider_id', v_provider.id,
    'provider_name', v_provider.name,
    'message', 'SportMonks provider is configured and active. Use backend endpoint to fetch leagues.'
  );
END;
$$;


ALTER FUNCTION "public"."sportsmonks_leagues"("p_dashboard" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sportsmonks_leagues"("p_dashboard" "text") IS 'Checks if SportMonks provider is configured and active. Frontend should call GET /make-server-cbef71cf/sports/sportmonks/soccer/leagues for actual leagues.';



CREATE OR REPLACE FUNCTION "public"."st2110_preset_rpc"("p_action" "text", "p_id" "uuid" DEFAULT NULL::"uuid", "p_name" "text" DEFAULT NULL::"text", "p_resolution" "text" DEFAULT NULL::"text", "p_fps" "text" DEFAULT NULL::"text", "p_pixel_format" "text" DEFAULT NULL::"text", "p_nic" "text" DEFAULT NULL::"text", "p_multicast_ip" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
    result jsonb;
begin
    if p_action = 'create' then
        insert into st2110_presets(name, resolution, fps, pixel_format, nic, multicast_ip)
        values (p_name, p_resolution, p_fps, p_pixel_format, p_nic, p_multicast_ip)
        returning to_jsonb(st2110_presets.*) into result;

    elsif p_action = 'update' then
        update st2110_presets
        set name = coalesce(p_name, name),
            resolution = coalesce(p_resolution, resolution),
            fps = coalesce(p_fps, fps),
            pixel_format = coalesce(p_pixel_format, pixel_format),
            nic = coalesce(p_nic, nic),
            multicast_ip = coalesce(p_multicast_ip, multicast_ip)
        where id = p_id
        returning to_jsonb(st2110_presets.*) into result;

    elsif p_action = 'delete' then
        delete from st2110_presets where id = p_id;
        result := jsonb_build_object('deleted', true);

    elsif p_action = 'get' then
        select to_jsonb(t.*) into result
        from st2110_presets t where id = p_id;

    elsif p_action = 'list' then
        select jsonb_agg(to_jsonb(t.*)) into result
        from st2110_presets t;

    else
        raise exception 'Invalid 2110 preset action';
    end if;

    return result;
end;
$$;


ALTER FUNCTION "public"."st2110_preset_rpc"("p_action" "text", "p_id" "uuid", "p_name" "text", "p_resolution" "text", "p_fps" "text", "p_pixel_format" "text", "p_nic" "text", "p_multicast_ip" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_ap_bop_data"("results_type" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  service_key TEXT;
  project_ref TEXT;
  request_url text;
  request_id_senate BIGINT;
  request_body_senate jsonb;
  request_id_house BIGINT;
  request_body_house jsonb;
begin
  -- Get credentials
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  SELECT decrypted_secret INTO project_ref FROM vault.decrypted_secrets WHERE name = 'project_ref';

  request_body_senate := jsonb_build_object(
    'subType', 'S',
    'resultsType', results_type,
    'raceName', 'Senate Election',
    'raceType', 'senate'
  );

  request_url := 'https://' || project_ref || '.supabase.co/functions/v1/import-ap-bop';

  request_id_senate := net.http_post(
                request_url,
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || service_key,
                    'Content-Type', 'application/json'
                )::jsonb,
                body := request_body_senate
            );

  request_body_house := jsonb_build_object(
    'subType', 'H',
    'resultsType', results_type,
    'raceName', 'House Election',
    'raceType', 'house'
  );

  request_url := 'https://' || project_ref || '.supabase.co/functions/v1/import-ap-bop';

  request_id_house := net.http_post(
                request_url,
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || service_key,
                    'Content-Type', 'application/json'
                )::jsonb,
                body := request_body_house
            );
end;
$$;


ALTER FUNCTION "public"."sync_ap_bop_data"("results_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_ap_election_data"("office_id" "text", "results_type" "text", "race_name" "text", "race_type" "text", "race_level" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$declare
  service_key TEXT;
  project_ref TEXT;
  request_id BIGINT;
  request_body jsonb;
  request_url text;
begin
  -- Get credentials
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  SELECT decrypted_secret INTO project_ref FROM vault.decrypted_secrets WHERE name = 'project_ref';


  request_body := jsonb_build_object(
    'officeID', office_id,
    'resultsType', results_type,
    'raceName', race_name,
    'raceType', race_type
  );

  request_url := 'https://' || project_ref || '.supabase.co/functions/v1/import-ap-' || race_level || '-results';

  request_id := net.http_post(
                request_url,
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || service_key,
                    'Content-Type', 'application/json'
                )::jsonb,
                body := request_body
            );
end;$$;


ALTER FUNCTION "public"."sync_ap_election_data"("office_id" "text", "results_type" "text", "race_name" "text", "race_type" "text", "race_level" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_school_closings"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  supabase_url TEXT;
  anon_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get configuration from environment or app settings
  -- For local: http://localhost:54321, for cloud: your project URL
  supabase_url := COALESCE(
    current_setting('app.supabase_url', true),
    'http://kong:8000'  -- Internal docker network URL for local Supabase
  );

  anon_key := COALESCE(
    current_setting('app.supabase_anon_key', true),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'  -- Local dev anon key
  );

  -- Make HTTP POST request to the edge function to trigger sync
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/school_closing/fetch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || anon_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  RAISE NOTICE 'School closings sync triggered, request_id: %', request_id;
END;
$$;


ALTER FUNCTION "public"."sync_school_closings"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_school_closings"() IS 'Syncs school closings data from XML feed via the school_closing edge function. Called by pg_cron every 5 minutes.';



CREATE OR REPLACE FUNCTION "public"."sync_weather_csv"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  supabase_url TEXT;
  anon_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get configuration from environment or app settings
  -- For local: http://localhost:54321, for cloud: your project URL
  supabase_url := COALESCE(
    current_setting('app.supabase_url', true),
    'http://kong:8000'  -- Internal docker network URL for local Supabase
  );

  anon_key := COALESCE(
    current_setting('app.supabase_anon_key', true),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'  -- Local dev anon key
  );

  -- Make HTTP request to the edge function
  SELECT net.http_get(
    url := supabase_url || '/functions/v1/weather_dashboard/weather-data-csv',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || anon_key,
      'Content-Type', 'application/json'
    )
  ) INTO request_id;

  RAISE NOTICE 'Weather CSV sync triggered, request_id: %', request_id;
END;
$$;


ALTER FUNCTION "public"."sync_weather_csv"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_weather_csv"() IS 'Syncs weather data from CSV file via the weather_dashboard edge function. Called by pg_cron every 15 minutes.';



CREATE OR REPLACE FUNCTION "public"."system_initialized"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT EXISTS (SELECT 1 FROM u_users WHERE is_superuser = true);
$$;


ALTER FUNCTION "public"."system_initialized"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_auth"() RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    service_key TEXT;
    project_ref TEXT;
    request_id BIGINT;
    response_status INTEGER;
    response_body TEXT;
BEGIN
    -- Get credentials
    SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
    SELECT decrypted_secret INTO project_ref FROM vault.decrypted_secrets WHERE name = 'project_ref';
    
    -- Make a test call
    request_id := net.http_post(
        url := format('https://%s.supabase.co/functions/v1/sync-file-integration', project_ref),
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || service_key,
            'Content-Type', 'application/json'
        )::jsonb,
        body := jsonb_build_object('test', true)::jsonb
    );
    
    -- Wait for response
    PERFORM pg_sleep(3);
    
    SELECT status_code, content::text
    INTO response_status, response_body
    FROM net._http_response
    WHERE id = request_id;
    
    RETURN json_build_object(
        'status', response_status,
        'response', response_body,
        'key_preview', LEFT(service_key, 20) || '...',
        'key_length', LENGTH(service_key)
    );
END;
$$;


ALTER FUNCTION "public"."test_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_cascade_delete_order_shift"() RETURNS TABLE("test_name" "text", "result" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    test_bucket_id UUID;
    test_playlist_id UUID;
    bucket_count_before INTEGER;
    bucket_count_after INTEGER;
    max_order_before INTEGER;
    max_order_after INTEGER;
BEGIN
    -- Find a test playlist
    SELECT id INTO test_playlist_id 
    FROM channels 
    WHERE type = 'playlist' 
    LIMIT 1;
    
    IF test_playlist_id IS NULL THEN
        RETURN QUERY SELECT 'Setup', 'No playlist found for testing';
        RETURN;
    END IF;
    
    -- Count existing buckets and get max order
    SELECT COUNT(*), COALESCE(MAX("order"), -1) 
    INTO bucket_count_before, max_order_before
    FROM channels 
    WHERE parent_id = test_playlist_id AND type = 'bucket';
    
    -- Create a test content bucket
    INSERT INTO content (id, name, type, active, "order", user_id)
    VALUES (gen_random_uuid(), 'Test Cascade Bucket', 'bucket', true, 999, 
            (SELECT id FROM auth.users LIMIT 1))
    RETURNING id INTO test_bucket_id;
    
    -- Create channel bucket references
    INSERT INTO channels (name, type, active, parent_id, content_id, "order", user_id)
    VALUES 
        ('Test Channel Bucket 1', 'bucket', true, test_playlist_id, test_bucket_id, 
         max_order_before + 1, (SELECT id FROM auth.users LIMIT 1)),
        ('Test Channel Bucket 2', 'bucket', true, test_playlist_id, test_bucket_id, 
         max_order_before + 2, (SELECT id FROM auth.users LIMIT 1)),
        ('Test Channel Bucket 3', 'bucket', true, test_playlist_id, test_bucket_id, 
         max_order_before + 3, (SELECT id FROM auth.users LIMIT 1));
    
    RETURN QUERY SELECT 'Setup', format('Created test bucket %s with 3 channel references', test_bucket_id);
    
    -- Delete the content bucket (should cascade)
    DELETE FROM content WHERE id = test_bucket_id;
    
    -- Check results
    SELECT COUNT(*), COALESCE(MAX("order"), -1)
    INTO bucket_count_after, max_order_after
    FROM channels 
    WHERE parent_id = test_playlist_id AND type = 'bucket';
    
    -- Verify cascade delete worked
    IF EXISTS (SELECT 1 FROM channels WHERE content_id = test_bucket_id) THEN
        RETURN QUERY SELECT 'Cascade Delete', 'FAILED - Channel buckets still exist';
    ELSE
        RETURN QUERY SELECT 'Cascade Delete', 'PASSED - Channel buckets were deleted';
    END IF;
    
    -- Verify order shifting worked
    IF bucket_count_after = bucket_count_before THEN
        RETURN QUERY SELECT 'Order Shift', 'PASSED - Bucket count unchanged, orders maintained';
    ELSE
        RETURN QUERY SELECT 'Order Shift', 'FAILED - Order shifting may have issues';
    END IF;
    
    -- Check for order gaps
    IF EXISTS (
        WITH ordered_buckets AS (
            SELECT "order", ROW_NUMBER() OVER (ORDER BY "order") - 1 as expected_order
            FROM channels
            WHERE parent_id = test_playlist_id AND type = 'bucket'
        )
        SELECT 1 FROM ordered_buckets WHERE "order" != expected_order
    ) THEN
        RETURN QUERY SELECT 'Order Gaps', 'FAILED - Gaps found in order sequence';
    ELSE
        RETURN QUERY SELECT 'Order Gaps', 'PASSED - No gaps in order sequence';
    END IF;
END;
$$;


ALTER FUNCTION "public"."test_cascade_delete_order_shift"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_edge_function_simple"() RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    service_key TEXT;
    project_ref TEXT;
    request_id BIGINT;
    response_record RECORD;
    wait_count INTEGER := 0;
BEGIN
    -- Get credentials
    SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
    SELECT decrypted_secret INTO project_ref FROM vault.decrypted_secrets WHERE name = 'project_ref';
    
    -- Make request
    request_id := net.http_post(
        url := format('https://%s.supabase.co/functions/v1/sync-file-integration', project_ref),
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || service_key,
            'Content-Type', 'application/json'
        )::jsonb,
        body := '{}'::jsonb
    );
    
    -- Wait up to 20 seconds
    WHILE wait_count < 10 LOOP
        wait_count := wait_count + 1;
        PERFORM pg_sleep(2);
        
        -- Try to get response
        BEGIN
            SELECT * INTO response_record
            FROM net._http_response
            WHERE id = request_id;
            
            IF response_record IS NOT NULL THEN
                EXIT;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors and continue waiting
        END;
    END LOOP;
    
    -- Return whatever we have
    IF response_record IS NOT NULL THEN
        RETURN json_build_object(
            'request_id', request_id,
            'status_code', response_record.status_code,
            'response_body', LEFT(response_record.content::text, 500),
            'waited_seconds', wait_count * 2
        );
    ELSE
        RETURN json_build_object(
            'request_id', request_id,
            'status_code', null,
            'error', 'No response after ' || (wait_count * 2) || ' seconds',
            'edge_function_url', format('https://%s.supabase.co/functions/v1/sync-file-integration', project_ref)
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."test_edge_function_simple"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_intervals_basic"() RETURNS TABLE("id" "uuid", "name" "text", "interval_num" integer, "interval_unit" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.id,
        ds.name::TEXT,
        COALESCE((ds.sync_config->>'interval')::INTEGER, 60),
        COALESCE(ds.sync_config->>'intervalUnit', 'minutes')::TEXT
    FROM data_sources ds
    WHERE ds.type = 'file'
    AND ds.active = true
    LIMIT 10;
END;
$$;


ALTER FUNCTION "public"."test_intervals_basic"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_pg_net_basic"() RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    request_id BIGINT;
    attempts INTEGER := 0;
    response_status INTEGER;
    response_body TEXT;
BEGIN
    -- Make a simple request to a known endpoint
    request_id := net.http_get('https://httpbin.org/get');
    
    -- Log the request
    INSERT INTO debug_log (function_name, message, data)
    VALUES ('test_pg_net_basic', 'Request sent', jsonb_build_object('request_id', request_id));
    
    -- Wait for response with multiple checks
    WHILE attempts < 10 LOOP
        attempts := attempts + 1;
        PERFORM pg_sleep(1);
        
        -- Check for response
        SELECT status_code, content::text
        INTO response_status, response_body
        FROM net._http_response
        WHERE id = request_id;
        
        -- Log each attempt
        INSERT INTO debug_log (function_name, message, data)
        VALUES ('test_pg_net_basic', 'Check attempt', jsonb_build_object(
            'attempt', attempts,
            'found', response_status IS NOT NULL
        ));
        
        EXIT WHEN response_status IS NOT NULL;
    END LOOP;
    
    -- Check the request status
    PERFORM check_pg_net_request(request_id);
    
    RETURN json_build_object(
        'request_id', request_id,
        'attempts', attempts,
        'status', response_status,
        'body_preview', LEFT(response_body, 200),
        'success', response_status IS NOT NULL
    );
END;
$$;


ALTER FUNCTION "public"."test_pg_net_basic"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_pg_net_with_logging"() RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    request_id BIGINT;
    result_status INTEGER;
    result_body TEXT;
    service_key TEXT;
    project_ref TEXT;
BEGIN
    -- Log start
    PERFORM log_debug('test_pg_net', 'Starting test');
    
    -- Get secrets
    SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
    SELECT decrypted_secret INTO project_ref FROM vault.decrypted_secrets WHERE name = 'project_ref';
    
    -- Log what we found
    PERFORM log_debug('test_pg_net', 'Vault check', jsonb_build_object(
        'service_key_exists', service_key IS NOT NULL,
        'service_key_length', LENGTH(service_key),
        'project_ref', project_ref
    ));
    
    -- Make request
    request_id := net.http_get('https://httpstat.us/200');
    
    PERFORM log_debug('test_pg_net', 'Request made', jsonb_build_object('request_id', request_id));
    
    -- Wait
    PERFORM pg_sleep(2);
    
    -- Check response
    SELECT status_code, content::text
    INTO result_status, result_body
    FROM net._http_response
    WHERE id = request_id;
    
    PERFORM log_debug('test_pg_net', 'Response received', jsonb_build_object(
        'status', result_status,
        'body_length', LENGTH(result_body),
        'body_preview', LEFT(result_body, 100)
    ));
    
    RETURN json_build_object(
        'request_id', request_id,
        'status', result_status,
        'check_logs', 'SELECT * FROM debug_log ORDER BY id DESC LIMIT 10'
    );
END;
$$;


ALTER FUNCTION "public"."test_pg_net_with_logging"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_simple"() RETURNS TABLE("id" "uuid", "name" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.id,
        ds.name::TEXT
    FROM data_sources ds
    WHERE ds.type = 'file'
    LIMIT 5;
END;
$$;


ALTER FUNCTION "public"."test_simple"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_single_item_processing"() RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    test_item RECORD;
    result json := '{}';
BEGIN
    -- Get one item
    SELECT 
        q.id as queue_id,
        q.data_source_id,
        q.status,
        ds.name,
        ds.sync_config
    INTO test_item
    FROM file_sync_queue q
    JOIN data_sources ds ON ds.id = q.data_source_id
    WHERE q.status = 'pending'
    LIMIT 1;
    
    IF test_item IS NULL THEN
        RETURN json_build_object('error', 'No pending items found');
    END IF;
    
    -- Build the result step by step
    result := json_build_object(
        'found_item', test_item.name,
        'queue_id', test_item.queue_id,
        'current_status', test_item.status,
        'sync_config', test_item.sync_config
    );
    
    -- Try to update it
    BEGIN
        UPDATE file_sync_queue 
        SET status = 'processing', processed_at = NOW()
        WHERE id = test_item.queue_id;
        
        result := result || json_build_object('step1', 'Updated to processing');
        
        UPDATE data_sources
        SET sync_status = 'idle'
        WHERE id = test_item.data_source_id;
        
        result := result || json_build_object('step2', 'Updated data source');
        
        UPDATE file_sync_queue 
        SET status = 'ready'
        WHERE id = test_item.queue_id;
        
        result := result || json_build_object('step3', 'Updated to ready', 'success', true);
        
    EXCEPTION WHEN OTHERS THEN
        result := result || json_build_object('error', SQLERRM);
    END;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."test_single_item_processing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_sync_components"() RETURNS TABLE("test_name" "text", "result" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    service_key TEXT;
    vault_count INTEGER;
    queue_count INTEGER;
    http_test RECORD;
    url_test TEXT;
BEGIN
    -- Test 1: Queue status
    SELECT COUNT(*) INTO queue_count FROM file_sync_queue WHERE status = 'pending';
    RETURN QUERY SELECT 'Queue Count'::TEXT, format('%s pending items', queue_count);
    
    -- Test 2: Vault secrets
    SELECT COUNT(*) INTO vault_count FROM vault.secrets;
    RETURN QUERY SELECT 'Vault Secrets'::TEXT, format('%s secrets found', vault_count);
    
    -- Test 3: List vault secrets
    FOR vault_count IN SELECT name FROM vault.secrets LOOP
        RETURN QUERY SELECT 'Vault Secret Name'::TEXT, vault_count::TEXT;
    END LOOP;
    
    -- Test 4: Service key retrieval
    BEGIN
        SELECT decrypted_secret INTO service_key 
        FROM vault.decrypted_secrets 
        LIMIT 1;
        
        RETURN QUERY SELECT 'Service Key'::TEXT, 
            CASE WHEN service_key IS NOT NULL 
                 THEN format('Found (length: %s)', LENGTH(service_key))
                 ELSE 'Not found' 
            END;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'Service Key'::TEXT, format('Error: %s', SQLERRM);
    END;
    
    -- Test 5: URL construction
    BEGIN
        url_test := format('https://%s.supabase.co/functions/v1/sync-file-integration', 
                          split_part(current_setting('app.supabase_url', true), '.', 1));
        RETURN QUERY SELECT 'Edge Function URL'::TEXT, url_test;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'Edge Function URL'::TEXT, format('Error: %s', SQLERRM);
    END;
    
    -- Test 6: HTTP connectivity
    BEGIN
        SELECT net.http_get('https://httpstat.us/200') INTO http_test;
        RETURN QUERY SELECT 'HTTP Test'::TEXT, format('Status: %s', http_test.status);
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'HTTP Test'::TEXT, format('Error: %s', SQLERRM);
    END;
END;
$$;


ALTER FUNCTION "public"."test_sync_components"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_vault_secrets"() RETURNS TABLE("secret_name" "text", "status" "text", "preview" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check service_role_key
    RETURN QUERY
    SELECT 
        'service_role_key'::TEXT,
        CASE WHEN decrypted_secret IS NOT NULL THEN 'OK' ELSE 'MISSING' END,
        CASE 
            WHEN decrypted_secret IS NOT NULL 
            THEN 'Length: ' || LENGTH(decrypted_secret) || ', starts with: ' || LEFT(decrypted_secret, 20)
            ELSE 'Not found in vault'
        END
    FROM vault.decrypted_secrets 
    WHERE name = 'service_role_key';
    
    -- Check project_ref
    RETURN QUERY
    SELECT 
        'project_ref'::TEXT,
        CASE WHEN decrypted_secret IS NOT NULL THEN 'OK' ELSE 'MISSING' END,
        CASE 
            WHEN decrypted_secret IS NOT NULL 
            THEN 'Value: ' || decrypted_secret
            ELSE 'Not found in vault'
        END
    FROM vault.decrypted_secrets 
    WHERE name = 'project_ref';
    
    -- Check if we can build a valid URL
    RETURN QUERY
    WITH vault_data AS (
        SELECT 
            MAX(CASE WHEN name = 'project_ref' THEN decrypted_secret END) as proj_ref,
            MAX(CASE WHEN name = 'service_role_key' THEN decrypted_secret END) as svc_key
        FROM vault.decrypted_secrets
        WHERE name IN ('project_ref', 'service_role_key')
    )
    SELECT 
        'edge_function_url'::TEXT,
        CASE 
            WHEN proj_ref IS NOT NULL AND svc_key IS NOT NULL THEN 'OK'
            ELSE 'CANNOT_BUILD'
        END,
        CASE 
            WHEN proj_ref IS NOT NULL 
            THEN format('https://%s.supabase.co/functions/v1/sync-file-integration', proj_ref)
            ELSE 'Missing project_ref'
        END
    FROM vault_data;
END;
$$;


ALTER FUNCTION "public"."test_vault_secrets"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."u_audit_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_email text;
  v_app_key text;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  -- Get app_key from trigger argument
  v_app_key := TG_ARGV[0];

  IF TG_OP = 'DELETE' THEN
    INSERT INTO u_audit_log (user_id, user_email, app_key, action, resource_type, resource_id, old_values)
    VALUES (auth.uid(), v_user_email, v_app_key, 'delete', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO u_audit_log (user_id, user_email, app_key, action, resource_type, resource_id, old_values, new_values)
    VALUES (auth.uid(), v_user_email, v_app_key, 'update', TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO u_audit_log (user_id, user_email, app_key, action, resource_type, resource_id, new_values)
    VALUES (auth.uid(), v_user_email, v_app_key, 'create', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."u_audit_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ui_delete_weather_location"("p_location_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result jsonb;
  v_deleted_count integer;
BEGIN
  -- Check if location exists
  IF NOT EXISTS (SELECT 1 FROM weather_locations WHERE id = p_location_id) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Location not found',
      'location_id', p_location_id
    );
  END IF;

  -- Delete the parent row (cascades to all child tables automatically)
  DELETE FROM weather_locations WHERE id = p_location_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Return success
  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Location and all weather data deleted',
    'location_id', p_location_id,
    'deleted', v_deleted_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', SQLERRM,
      'location_id', p_location_id
    );
END;
$$;


ALTER FUNCTION "public"."ui_delete_weather_location"("p_location_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."ui_delete_weather_location"("p_location_id" "text") IS 'Safely deletes a weather location and all related data using CASCADE. Bypasses RLS with SECURITY DEFINER.';



CREATE OR REPLACE FUNCTION "public"."update_ai_providers_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ai_providers_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_banner_schedules_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_banner_schedules_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_channels_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_channels_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_data_provider"("p_id" "text", "p_is_active" boolean DEFAULT NULL::boolean, "p_api_key" "text" DEFAULT NULL::"text", "p_api_secret" "text" DEFAULT NULL::"text", "p_base_url" "text" DEFAULT NULL::"text", "p_storage_path" "text" DEFAULT NULL::"text", "p_source_url" "text" DEFAULT NULL::"text", "p_config" "jsonb" DEFAULT NULL::"jsonb", "p_refresh_interval_minutes" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_old record;
BEGIN
  SELECT * INTO v_old FROM public.data_providers WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Provider not found', 'id', p_id);
  END IF;

  UPDATE public.data_providers
  SET
    is_active = COALESCE(p_is_active, v_old.is_active),
    api_key = COALESCE(p_api_key, v_old.api_key),
    api_secret = COALESCE(p_api_secret, v_old.api_secret),
    base_url = COALESCE(p_base_url, v_old.base_url),
    storage_path = COALESCE(p_storage_path, v_old.storage_path),
    source_url = COALESCE(p_source_url, v_old.source_url),
    config = COALESCE(p_config, v_old.config),
    refresh_interval_minutes = COALESCE(p_refresh_interval_minutes, v_old.refresh_interval_minutes),
    updated_at = NOW()
  WHERE id = p_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', p_id,
    'message', 'Provider updated successfully'
  );
END;
$$;


ALTER FUNCTION "public"."update_data_provider"("p_id" "text", "p_is_active" boolean, "p_api_key" "text", "p_api_secret" "text", "p_base_url" "text", "p_storage_path" "text", "p_source_url" "text", "p_config" "jsonb", "p_refresh_interval_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_data_providers_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_data_providers_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_map_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_map_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_media_assets_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_media_assets_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_news_articles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_news_articles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_order_after_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update order for remaining items in the same parent
  IF OLD.parent_id IS NOT NULL THEN
    -- Update items with same parent
    UPDATE channels 
    SET "order" = "order" - 1 
    WHERE parent_id = OLD.parent_id 
    AND "order" > OLD."order";
    
    UPDATE content 
    SET "order" = "order" - 1 
    WHERE parent_id = OLD.parent_id 
    AND "order" > OLD."order";
    
    UPDATE templates 
    SET "order" = "order" - 1 
    WHERE parent_id = OLD.parent_id 
    AND "order" > OLD."order";
  ELSE
    -- For top-level items (parent_id is NULL)
    UPDATE channels 
    SET "order" = "order" - 1 
    WHERE parent_id IS NULL 
    AND "order" > OLD."order"
    AND id != OLD.id;
    
    UPDATE content 
    SET "order" = "order" - 1 
    WHERE parent_id IS NULL 
    AND "order" > OLD."order"
    AND id != OLD.id;
    
    UPDATE templates 
    SET "order" = "order" - 1 
    WHERE parent_id IS NULL 
    AND "order" > OLD."order"
    AND id != OLD.id;
  END IF;
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."update_order_after_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_project"("p_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_default_channel_id" "uuid" DEFAULT NULL::"uuid", "p_default_instance_id" "text" DEFAULT NULL::"text", "p_color" "text" DEFAULT NULL::"text", "p_icon" "text" DEFAULT NULL::"text", "p_settings" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_result jsonb;
BEGIN
    UPDATE pulsar_projects
    SET
        name = COALESCE(p_name, name),
        description = COALESCE(p_description, description),
        default_channel_id = COALESCE(p_default_channel_id, default_channel_id),
        default_instance_id = COALESCE(p_default_instance_id, default_instance_id),
        color = COALESCE(p_color, color),
        icon = COALESCE(p_icon, icon),
        settings = COALESCE(p_settings, settings)
    WHERE id = p_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project not found'
        );
    END IF;

    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'description', p.description,
            'default_channel_id', p.default_channel_id,
            'default_instance_id', p.default_instance_id,
            'color', p.color,
            'icon', p.icon,
            'is_active', p.is_active,
            'updated_at', p.updated_at
        )
    )
    INTO v_result
    FROM pulsar_projects p
    WHERE p.id = p_id;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."update_project"("p_id" "uuid", "p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "text", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_provider_settings_by_id"("p_id" "text", "p_api_key" "text" DEFAULT NULL::"text", "p_api_secret" "text" DEFAULT NULL::"text", "p_api_version" "text" DEFAULT NULL::"text", "p_base_url" "text" DEFAULT NULL::"text", "p_config_patch" "jsonb" DEFAULT NULL::"jsonb", "p_dashboard" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT NULL::boolean, "p_allow_api_key" boolean DEFAULT NULL::boolean, "p_source_url" "text" DEFAULT NULL::"text", "p_storage_path" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE data_providers
  SET
    api_key = COALESCE(p_api_key, api_key),
    api_secret = COALESCE(p_api_secret, api_secret),
    api_version = COALESCE(p_api_version, api_version),
    base_url = COALESCE(p_base_url, base_url),
    config = CASE
      WHEN p_config_patch IS NOT NULL THEN config || p_config_patch
      ELSE config
    END,
    is_active = COALESCE(p_is_active, is_active),
    source_url = COALESCE(p_source_url, source_url),    -- ✅ added
    storage_path = COALESCE(p_storage_path, storage_path),  -- ✅ added
    updated_at = NOW()
  WHERE id = p_id;
END;
$$;


ALTER FUNCTION "public"."update_provider_settings_by_id"("p_id" "text", "p_api_key" "text", "p_api_secret" "text", "p_api_version" "text", "p_base_url" "text", "p_config_patch" "jsonb", "p_dashboard" "text", "p_is_active" boolean, "p_allow_api_key" boolean, "p_source_url" "text", "p_storage_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pulsar_projects_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pulsar_projects_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pulsarvs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pulsarvs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_sponsor_schedules_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_sponsor_schedules_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_full_name" "text", "p_preferences" "jsonb", "p_avatar_url" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_auth_uid UUID;
  v_user_auth_id UUID;
  v_result JSONB;
BEGIN
  -- Get the current auth user id
  v_auth_uid := auth.uid();

  -- Verify that the user owns this record
  SELECT auth_user_id INTO v_user_auth_id
  FROM u_users
  WHERE id = p_user_id;

  IF v_user_auth_id IS NULL THEN
    RAISE EXCEPTION 'User record not found';
  END IF;

  -- Security check: ensure user can only update their own profile
  -- Allow if auth.uid matches OR if they are a superuser
  IF v_auth_uid IS NOT NULL AND v_user_auth_id != v_auth_uid THEN
    -- Check if caller is superuser
    IF NOT EXISTS (
      SELECT 1 FROM u_users
      WHERE auth_user_id = v_auth_uid AND is_superuser = true
    ) THEN
      RAISE EXCEPTION 'Not authorized to update this profile';
    END IF;
  END IF;

  -- Update the user profile
  UPDATE u_users
  SET
    full_name = COALESCE(p_full_name, full_name),
    preferences = COALESCE(p_preferences, preferences),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Return the updated user data
  SELECT jsonb_build_object(
    'id', id,
    'full_name', full_name,
    'preferences', preferences,
    'avatar_url', avatar_url,
    'updated_at', updated_at
  ) INTO v_result
  FROM u_users
  WHERE id = p_user_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_full_name" "text", "p_preferences" "jsonb", "p_avatar_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_category"("p_sportradar_id" character varying, "p_name" character varying, "p_country_code" character varying DEFAULT NULL::character varying) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE v_id INTEGER;
BEGIN
    INSERT INTO sports_categories (sportradar_id, name, country_code)
    VALUES (p_sportradar_id, p_name, p_country_code)
    ON CONFLICT (sportradar_id) DO UPDATE SET name = EXCLUDED.name, country_code = EXCLUDED.country_code, updated_at = NOW()
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."upsert_category"("p_sportradar_id" character varying, "p_name" character varying, "p_country_code" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_league"("p_sportradar_id" character varying, "p_name" character varying, "p_alternative_name" character varying DEFAULT NULL::character varying, "p_gender" character varying DEFAULT 'men'::character varying, "p_category_sportradar_id" character varying DEFAULT NULL::character varying) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE v_id INTEGER; v_category_id INTEGER;
BEGIN
    IF p_category_sportradar_id IS NOT NULL THEN
        SELECT id INTO v_category_id FROM sports_categories WHERE sportradar_id = p_category_sportradar_id;
    END IF;
    INSERT INTO sports_leagues (sportradar_id, name, alternative_name, gender, category_id)
    VALUES (p_sportradar_id, p_name, p_alternative_name, p_gender, v_category_id)
    ON CONFLICT (sportradar_id) DO UPDATE SET name = EXCLUDED.name, alternative_name = EXCLUDED.alternative_name, gender = EXCLUDED.gender, category_id = EXCLUDED.category_id, updated_at = NOW()
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."upsert_league"("p_sportradar_id" character varying, "p_name" character varying, "p_alternative_name" character varying, "p_gender" character varying, "p_category_sportradar_id" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_season"("p_sportradar_id" character varying, "p_league_sportradar_id" character varying, "p_name" character varying, "p_year" character varying DEFAULT NULL::character varying, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_is_current" boolean DEFAULT false) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE v_id INTEGER; v_league_id INTEGER;
BEGIN
    SELECT id INTO v_league_id FROM sports_leagues WHERE sportradar_id = p_league_sportradar_id;
    IF v_league_id IS NULL THEN RAISE EXCEPTION 'League not found: %', p_league_sportradar_id; END IF;
    IF p_is_current THEN UPDATE sports_seasons SET is_current = false WHERE league_id = v_league_id; END IF;
    INSERT INTO sports_seasons (sportradar_id, league_id, name, year, start_date, end_date, is_current)
    VALUES (p_sportradar_id, v_league_id, p_name, p_year, p_start_date, p_end_date, p_is_current)
    ON CONFLICT (sportradar_id) DO UPDATE SET name = EXCLUDED.name, year = EXCLUDED.year, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, is_current = EXCLUDED.is_current, updated_at = NOW()
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."upsert_season"("p_sportradar_id" character varying, "p_league_sportradar_id" character varying, "p_name" character varying, "p_year" character varying, "p_start_date" "date", "p_end_date" "date", "p_is_current" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_stock_prices"("p_stocks" "jsonb") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_count INT := 0;
  v_stock JSONB;
BEGIN
  FOR v_stock IN SELECT * FROM jsonb_array_elements(p_stocks)
  LOOP
    INSERT INTO alpaca_stocks (
      symbol,
      name,
      type,
      price,
      change_1d,
      change_1d_pct,
      change_1y_pct,
      year_high,
      year_low,
      chart_1y,
      rating,
      last_update
    )
    VALUES (
      v_stock->>'symbol',
      v_stock->>'name',
      v_stock->>'type',
      (v_stock->>'price')::DECIMAL,
      (v_stock->>'change_1d')::DECIMAL,
      (v_stock->>'change_1d_pct')::DECIMAL,
      (v_stock->>'change_1y_pct')::DECIMAL,
      (v_stock->>'year_high')::DECIMAL,
      (v_stock->>'year_low')::DECIMAL,
      v_stock->'chart_1y',
      v_stock->'rating',
      NOW()
    )
    ON CONFLICT (symbol)
    DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      price = EXCLUDED.price,
      change_1d = EXCLUDED.change_1d,
      change_1d_pct = EXCLUDED.change_1d_pct,
      change_1y_pct = EXCLUDED.change_1y_pct,
      year_high = EXCLUDED.year_high,
      year_low = EXCLUDED.year_low,
      chart_1y = EXCLUDED.chart_1y,
      rating = EXCLUDED.rating,
      last_update = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."upsert_stock_prices"("p_stocks" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."upsert_stock_prices"("p_stocks" "jsonb") IS 'Bulk upsert stock prices from JSONB array';



CREATE OR REPLACE FUNCTION "public"."upsert_team"("p_sportradar_id" character varying, "p_name" character varying, "p_short_name" character varying DEFAULT NULL::character varying, "p_abbreviation" character varying DEFAULT NULL::character varying, "p_gender" character varying DEFAULT 'male'::character varying, "p_country" character varying DEFAULT NULL::character varying, "p_country_code" character varying DEFAULT NULL::character varying) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE v_id INTEGER;
BEGIN
    INSERT INTO sports_teams (sportradar_id, name, short_name, abbreviation, gender, country, country_code)
    VALUES (p_sportradar_id, p_name, p_short_name, p_abbreviation, p_gender, p_country, p_country_code)
    ON CONFLICT (sportradar_id) DO UPDATE SET name = EXCLUDED.name, short_name = EXCLUDED.short_name, abbreviation = EXCLUDED.abbreviation, gender = EXCLUDED.gender, country = EXCLUDED.country, country_code = EXCLUDED.country_code, updated_at = NOW()
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."upsert_team"("p_sportradar_id" character varying, "p_name" character varying, "p_short_name" character varying, "p_abbreviation" character varying, "p_gender" character varying, "p_country" character varying, "p_country_code" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_user_layout"("p_layout_name" "text", "p_layout_data" "jsonb") RETURNS "public"."user_layouts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result user_layouts;
  v_user_id uuid;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Insert or update the layout
  INSERT INTO user_layouts (user_id, layout_name, layout_data, updated_at)
  VALUES (v_user_id, p_layout_name, p_layout_data, now())
  ON CONFLICT (user_id, layout_name) 
  DO UPDATE SET 
    layout_data = EXCLUDED.layout_data,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."upsert_user_layout"("p_layout_name" "text", "p_layout_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_user_layout_with_id"("p_user_id" "uuid", "p_layout_name" "text", "p_layout_data" "jsonb") RETURNS "public"."user_layouts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result user_layouts;
BEGIN
  -- Verify the user is updating their own layout
  IF p_user_id != auth.uid() AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot update layout for another user';
  END IF;
  
  -- Insert or update the layout
  INSERT INTO user_layouts (user_id, layout_name, layout_data, updated_at)
  VALUES (p_user_id, p_layout_name, p_layout_data, now())
  ON CONFLICT (user_id, layout_name) 
  DO UPDATE SET 
    layout_data = EXCLUDED.layout_data,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."upsert_user_layout_with_id"("p_user_id" "uuid", "p_layout_name" "text", "p_layout_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_channel_hierarchy"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Channels (type='channel') in channel_playlists should reference a channel in channels table
  IF NEW.type = 'channel' AND NEW.channel_id IS NULL THEN
    RAISE EXCEPTION 'Channel playlist records must reference a channel via channel_id';
  END IF;

  -- Playlists must have a channel-type parent OR can be parentless but must have channel_id
  IF NEW.type = 'playlist' THEN
    IF NEW.channel_id IS NULL THEN
      RAISE EXCEPTION 'Playlists must reference a channel via channel_id';
    END IF;
    -- Optional: validate parent if it exists
    IF NEW.parent_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM channel_playlists
      WHERE id = NEW.parent_id AND type = 'channel'
    ) THEN
      RAISE EXCEPTION 'Playlist parent_id must reference a channel-type record or be NULL';
    END IF;
  END IF;

  -- Buckets must have a playlist as parent
  IF NEW.type = 'bucket' AND (
    NEW.parent_id IS NULL OR
    NOT EXISTS (
      SELECT 1 FROM channel_playlists
      WHERE id = NEW.parent_id AND type = 'playlist'
    )
  ) THEN
    RAISE EXCEPTION 'Buckets must have a playlist as parent';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_channel_hierarchy"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_content_hierarchy"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM content WHERE id = NEW.parent_id) THEN
      RAISE EXCEPTION 'Parent content with ID % does not exist', NEW.parent_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_content_hierarchy"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_item_tabfields_content"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM content 
    WHERE content.id = NEW.item_id 
    AND content.type = 'item'
  ) THEN
    RAISE EXCEPTION 'content_id must reference a content record of type "item"';
  END IF;
  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."validate_item_tabfields_content"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_template_hierarchy"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM templates WHERE id = NEW.parent_id) THEN
      RAISE EXCEPTION 'Parent template with ID % does not exist', NEW.parent_id;
    END IF;
    
    IF NEW.type = 'template' AND EXISTS (
      SELECT 1 FROM templates 
      WHERE id = NEW.parent_id 
      AND type != 'templateFolder'
    ) THEN
      RAISE EXCEPTION 'Templates can only have template folders as parents';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_template_hierarchy"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_u_invitation_token"("p_token" "text") RETURNS TABLE("invitation_id" "uuid", "email" "text", "role" "text", "organization_id" "uuid", "organization_name" "text", "organization_slug" "text", "expires_at" timestamp with time zone, "is_valid" boolean, "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Find the invitation
  SELECT i.*, o.name as org_name, o.slug as org_slug
  INTO v_invite
  FROM u_invitations i
  JOIN u_organizations o ON i.organization_id = o.id
  WHERE i.token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ,
      false, 'Invalid invitation token'::TEXT;
    RETURN;
  END IF;

  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN QUERY SELECT
      v_invite.id, v_invite.email, v_invite.role, v_invite.organization_id,
      v_invite.org_name, v_invite.org_slug, v_invite.expires_at,
      false, 'Invitation has already been accepted'::TEXT;
    RETURN;
  END IF;

  IF v_invite.expires_at < now() THEN
    RETURN QUERY SELECT
      v_invite.id, v_invite.email, v_invite.role, v_invite.organization_id,
      v_invite.org_name, v_invite.org_slug, v_invite.expires_at,
      false, 'Invitation has expired'::TEXT;
    RETURN;
  END IF;

  -- Valid invitation
  RETURN QUERY SELECT
    v_invite.id, v_invite.email, v_invite.role, v_invite.organization_id,
    v_invite.org_name, v_invite.org_slug, v_invite.expires_at,
    true, NULL::TEXT;
END;
$$;


ALTER FUNCTION "public"."validate_u_invitation_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vs_content_delete"("p_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_deleted_count INTEGER;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Delete the record (will fail if user doesn't own it due to RLS)
    DELETE FROM vs_content
    WHERE id = p_id AND user_id = v_user_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Content not found or access denied'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Content deleted successfully'
    );
END;
$$;


ALTER FUNCTION "public"."vs_content_delete"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vs_content_folder_create"("p_name" "text", "p_parent_id" "uuid" DEFAULT NULL::"uuid", "p_color" "text" DEFAULT 'gray'::"text", "p_icon" "text" DEFAULT '📁'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_id uuid;
  v_user_id uuid;
BEGIN
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  INSERT INTO vs_content_folders (name, parent_id, user_id, color, icon)
  VALUES (p_name, p_parent_id, v_user_id, p_color, p_icon)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object('id', v_id)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."vs_content_folder_create"("p_name" "text", "p_parent_id" "uuid", "p_color" "text", "p_icon" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vs_content_folder_delete"("p_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Set folder_id to NULL for all content in this folder
  UPDATE vs_content
  SET folder_id = NULL
  WHERE folder_id = p_id;

  -- Delete the folder (cascade will delete child folders)
  DELETE FROM vs_content_folders WHERE id = p_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."vs_content_folder_delete"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vs_content_folder_list"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_folders jsonb;
  v_user_id uuid;
BEGIN
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'parent_id', parent_id,
      'color', color,
      'icon', icon,
      'created_at', created_at
    )
    ORDER BY created_at ASC
  )
  INTO v_folders
  FROM vs_content_folders
  WHERE user_id IS NULL OR user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'data', COALESCE(v_folders, '[]'::jsonb)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."vs_content_folder_list"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vs_content_folder_rename"("p_id" "uuid", "p_name" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE vs_content_folders
  SET name = p_name, updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."vs_content_folder_rename"("p_id" "uuid", "p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vs_content_get"("p_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- Fetch the content (RLS will handle access control)
    SELECT jsonb_build_object(
        'success', true,
        'data', row_to_json(vs_content.*)
    )
    INTO v_result
    FROM vs_content
    WHERE id = p_id
        AND (user_id = v_user_id OR is_public = true);
    
    IF v_result IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Content not found or access denied'
        );
    END IF;
    
    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."vs_content_get"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vs_content_list"("p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0, "p_tags" "text"[] DEFAULT NULL::"text"[], "p_search" "text" DEFAULT NULL::"text", "p_my_content_only" boolean DEFAULT false, "p_public_only" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_user_id uuid;
  v_items jsonb;
  v_total_count integer;
BEGIN
  -- Get current user ID (handle missing session)
  BEGIN
    v_current_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_current_user_id := NULL;
  END;

  -- Count total
  SELECT COUNT(*)
  INTO v_total_count
  FROM vs_content
  WHERE
    -- Key fix: Include anonymous saves
    (
      (p_my_content_only = false AND p_public_only = false AND (is_public = true OR user_id = v_current_user_id OR user_id IS NULL))
      OR (p_my_content_only = true AND user_id = v_current_user_id)
      OR (p_public_only = true AND is_public = true)
    )
    AND (p_search IS NULL OR name ILIKE '%' || p_search || '%' OR description ILIKE '%' || p_search || '%')
    AND (p_tags IS NULL OR tags && p_tags);

  -- Get items
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'description', description,
      'scene_config', scene_config,
      'backdrop_url', backdrop_url,
      'thumbnail_url', thumbnail_url,
      'tags', tags,
      'is_public', is_public,
      'created_at', created_at,
      'updated_at', updated_at,
      'user_id', user_id
    )
    ORDER BY created_at DESC
  )
  INTO v_items
  FROM vs_content
  WHERE
    (
      (p_my_content_only = false AND p_public_only = false AND (is_public = true OR user_id = v_current_user_id OR user_id IS NULL))
      OR (p_my_content_only = true AND user_id = v_current_user_id)
      OR (p_public_only = true AND is_public = true)
    )
    AND (p_search IS NULL OR name ILIKE '%' || p_search || '%' OR description ILIKE '%' || p_search || '%')
    AND (p_tags IS NULL OR tags && p_tags)
  LIMIT p_limit
  OFFSET p_offset;

  RETURN jsonb_build_object(
    'success', true,
    'data', COALESCE(v_items, '[]'::jsonb),
    'total', v_total_count,
    'limit', p_limit,
    'offset', p_offset
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."vs_content_list"("p_limit" integer, "p_offset" integer, "p_tags" "text"[], "p_search" "text", "p_my_content_only" boolean, "p_public_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vs_content_list"("p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0, "p_tags" "text"[] DEFAULT NULL::"text"[], "p_search" "text" DEFAULT NULL::"text", "p_my_content_only" boolean DEFAULT false, "p_public_only" boolean DEFAULT false, "p_folder_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_user_id uuid;
  v_items jsonb;
  v_total_count integer;
BEGIN
  BEGIN
    v_current_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_current_user_id := NULL;
  END;

  -- Count total
  SELECT COUNT(*)
  INTO v_total_count
  FROM vs_content
  WHERE
    (
      (p_my_content_only = false AND p_public_only = false AND (is_public = true OR user_id = v_current_user_id OR user_id IS NULL))
      OR (p_my_content_only = true AND user_id = v_current_user_id)
      OR (p_public_only = true AND is_public = true)
    )
    AND (p_search IS NULL OR name ILIKE '%' || p_search || '%' OR description ILIKE '%' || p_search || '%')
    AND (p_tags IS NULL OR tags && p_tags)
    AND (p_folder_id IS NULL OR folder_id = p_folder_id);  -- NEW: Folder filter

  -- Get items
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'description', description,
      'scene_config', scene_config,
      'backdrop_url', backdrop_url,
      'thumbnail_url', thumbnail_url,
      'tags', tags,
      'is_public', is_public,
      'folder_id', folder_id,  -- NEW
      'created_at', created_at,
      'updated_at', updated_at,
      'user_id', user_id
    )
    ORDER BY created_at DESC
  )
  INTO v_items
  FROM vs_content
  WHERE
    (
      (p_my_content_only = false AND p_public_only = false AND (is_public = true OR user_id = v_current_user_id OR user_id IS NULL))
      OR (p_my_content_only = true AND user_id = v_current_user_id)
      OR (p_public_only = true AND is_public = true)
    )
    AND (p_search IS NULL OR name ILIKE '%' || p_search || '%' OR description ILIKE '%' || p_search || '%')
    AND (p_tags IS NULL OR tags && p_tags)
    AND (p_folder_id IS NULL OR folder_id = p_folder_id)  -- NEW: Folder filter
  LIMIT p_limit
  OFFSET p_offset;

  RETURN jsonb_build_object(
    'success', true,
    'data', COALESCE(v_items, '[]'::jsonb),
    'total', v_total_count,
    'limit', p_limit,
    'offset', p_offset
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."vs_content_list"("p_limit" integer, "p_offset" integer, "p_tags" "text"[], "p_search" "text", "p_my_content_only" boolean, "p_public_only" boolean, "p_folder_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vs_content_list"("p_folder_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 50, "p_my_content_only" boolean DEFAULT false, "p_offset" integer DEFAULT 0, "p_project_id" "uuid" DEFAULT NULL::"uuid", "p_public_only" boolean DEFAULT false, "p_search" "text" DEFAULT NULL::"text", "p_tags" "text"[] DEFAULT NULL::"text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_result jsonb;
    v_items jsonb;
    v_total bigint;
BEGIN
    -- Get total count
    SELECT COUNT(*) INTO v_total
    FROM vs_content c
    WHERE (p_folder_id IS NULL OR c.folder_id = p_folder_id)
    AND (p_project_id IS NULL OR c.project_id = p_project_id)
    AND (p_search IS NULL OR p_search = '' OR c.name ILIKE '%' || p_search || '%' OR c.description ILIKE '%' || p_search || '%')
    AND (p_tags IS NULL OR c.tags && p_tags)
    AND (NOT p_public_only OR c.is_public = true);

    -- Get items with all columns
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'description', c.description,
            'scene_config', c.scene_config,
            'backdrop_url', c.backdrop_url,
            'thumbnail_url', c.thumbnail_url,
            'tags', c.tags,
            'folder_id', c.folder_id,
            'project_id', c.project_id,
            'user_id', c.user_id,
            'is_public', c.is_public,
            'rcp_bindings', c.rcp_bindings,
            'metadata', c.metadata,
            'created_at', c.created_at,
            'updated_at', c.updated_at
        ) ORDER BY c.updated_at DESC
    ), '[]'::jsonb)
    INTO v_items
    FROM vs_content c
    WHERE (p_folder_id IS NULL OR c.folder_id = p_folder_id)
    AND (p_project_id IS NULL OR c.project_id = p_project_id)
    AND (p_search IS NULL OR p_search = '' OR c.name ILIKE '%' || p_search || '%' OR c.description ILIKE '%' || p_search || '%')
    AND (p_tags IS NULL OR c.tags && p_tags)
    AND (NOT p_public_only OR c.is_public = true)
    LIMIT p_limit
    OFFSET p_offset;

    v_result := jsonb_build_object(
        'success', true,
        'data', v_items,
        'total', v_total
    );

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."vs_content_list"("p_folder_id" "uuid", "p_limit" integer, "p_my_content_only" boolean, "p_offset" integer, "p_project_id" "uuid", "p_public_only" boolean, "p_search" "text", "p_tags" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vs_content_move_to_folder"("p_content_id" "uuid", "p_folder_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE vs_content
  SET folder_id = p_folder_id, updated_at = now()
  WHERE id = p_content_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."vs_content_move_to_folder"("p_content_id" "uuid", "p_folder_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vs_content_save"("p_name" "text", "p_scene_config" "jsonb", "p_backdrop_url" "text", "p_description" "text" DEFAULT NULL::"text", "p_tags" "text"[] DEFAULT NULL::"text"[], "p_is_public" boolean DEFAULT false, "p_id" "uuid" DEFAULT NULL::"uuid", "p_folder_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user ID (handle missing session)
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF p_id IS NOT NULL THEN
    -- Update existing
    UPDATE vs_content
    SET 
      name = p_name,
      scene_config = p_scene_config,
      backdrop_url = p_backdrop_url,
      description = p_description,
      tags = p_tags,
      is_public = p_is_public,
      folder_id = p_folder_id,
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
  ELSE
    -- Insert new
    INSERT INTO vs_content (
      user_id, name, scene_config, backdrop_url, 
      description, tags, is_public, folder_id
    )
    VALUES (
      v_user_id, p_name, p_scene_config, p_backdrop_url,
      p_description, p_tags, p_is_public, p_folder_id
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object('id', v_id)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."vs_content_save"("p_name" "text", "p_scene_config" "jsonb", "p_backdrop_url" "text", "p_description" "text", "p_tags" "text"[], "p_is_public" boolean, "p_id" "uuid", "p_folder_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vs_content_save"("p_id" "uuid" DEFAULT NULL::"uuid", "p_name" "text" DEFAULT NULL::"text", "p_scene_config" "jsonb" DEFAULT NULL::"jsonb", "p_backdrop_url" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_tags" "text"[] DEFAULT NULL::"text"[], "p_is_public" boolean DEFAULT false, "p_folder_id" "uuid" DEFAULT NULL::"uuid", "p_project_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user ID (handle missing session)
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF p_id IS NOT NULL THEN
    -- Update existing
    UPDATE vs_content
    SET 
      name = p_name,
      scene_config = p_scene_config,
      backdrop_url = p_backdrop_url,
      description = p_description,
      tags = p_tags,
      is_public = p_is_public,
      folder_id = p_folder_id,
      project_id = p_project_id,
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
  ELSE
    -- Insert new
    INSERT INTO vs_content (
      user_id, name, scene_config, backdrop_url, 
      description, tags, is_public, folder_id, project_id
    )
    VALUES (
      v_user_id, p_name, p_scene_config, p_backdrop_url,
      p_description, p_tags, p_is_public, p_folder_id, p_project_id
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object('id', v_id)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."vs_content_save"("p_id" "uuid", "p_name" "text", "p_scene_config" "jsonb", "p_backdrop_url" "text", "p_description" "text", "p_tags" "text"[], "p_is_public" boolean, "p_folder_id" "uuid", "p_project_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "duration_ms" integer,
    "logs" "jsonb",
    "error_message" "text",
    "results" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    CONSTRAINT "agent_runs_status_check" CHECK (("status" = ANY (ARRAY['RUNNING'::"text", 'COMPLETED'::"text", 'FAILED'::"text"])))
);


ALTER TABLE "public"."agent_runs" OWNER TO "postgres";


COMMENT ON TABLE "public"."agent_runs" IS 'Historical log of agent execution runs';



CREATE TABLE IF NOT EXISTS "public"."agents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "agent_type" "text" NOT NULL,
    "status" "text" DEFAULT 'PAUSED'::"text" NOT NULL,
    "schedule" "text",
    "configuration" "jsonb" NOT NULL,
    "last_run" timestamp with time zone,
    "next_run" timestamp with time zone,
    "run_count" integer DEFAULT 0,
    "error_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    CONSTRAINT "agents_agent_type_check" CHECK (("agent_type" = ANY (ARRAY['DATA_COLLECTOR'::"text", 'ANALYZER'::"text", 'PREDICTOR'::"text", 'NOTIFIER'::"text", 'CUSTOM'::"text"]))),
    CONSTRAINT "agents_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'PAUSED'::"text", 'STOPPED'::"text", 'ERROR'::"text"])))
);


ALTER TABLE "public"."agents" OWNER TO "postgres";


COMMENT ON TABLE "public"."agents" IS 'Schedule uses cron format: minute hour day month day-of-week';



CREATE TABLE IF NOT EXISTS "public"."ai_insights_elections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "insight" "text" NOT NULL,
    "category" "text",
    "topic" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."ai_insights_elections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_insights_finance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "topic" "text" NOT NULL,
    "insight" "text" NOT NULL,
    "category" "text" DEFAULT 'all'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."ai_insights_finance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_insights_news" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "topic" "text" NOT NULL,
    "insight" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."ai_insights_news" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_insights_news" IS 'Stores AI-generated insights for news articles. Migrated from kv_store_cbef71cf (news_ai_insight:* keys).';



COMMENT ON COLUMN "public"."ai_insights_news"."topic" IS 'The question or topic of the AI insight';



COMMENT ON COLUMN "public"."ai_insights_news"."insight" IS 'The AI-generated insight/response';



COMMENT ON COLUMN "public"."ai_insights_news"."category" IS 'Category of news (e.g., general, business, sports, technology)';



COMMENT ON COLUMN "public"."ai_insights_news"."metadata" IS 'Additional context: question, response, selectedArticles, aiProvider, model, etc.';



CREATE TABLE IF NOT EXISTS "public"."ai_insights_school_closing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "topic" "text" NOT NULL,
    "insight" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."ai_insights_school_closing" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_insights_school_closing" IS 'This is a duplicate of ai_insights_news';



COMMENT ON COLUMN "public"."ai_insights_school_closing"."topic" IS 'The question or topic of the AI insight';



COMMENT ON COLUMN "public"."ai_insights_school_closing"."insight" IS 'The AI-generated insight/response';



COMMENT ON COLUMN "public"."ai_insights_school_closing"."category" IS 'Category of news (e.g., general, business, sports, technology)';



COMMENT ON COLUMN "public"."ai_insights_school_closing"."metadata" IS 'Additional context: question, response, selectedArticles, aiProvider, model, etc.';



CREATE TABLE IF NOT EXISTS "public"."ai_insights_weather" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "insight" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text" NOT NULL,
    "topic" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."ai_insights_weather" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_prompt_injectors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature" "public"."ai_injector_feature" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "model" "text",
    "provider_id" "uuid",
    "prompt_template" "text",
    "params" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid"
);


ALTER TABLE "public"."ai_prompt_injectors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_providers" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "provider_name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "description" "text",
    "api_key" "text" NOT NULL,
    "api_secret" "text",
    "endpoint" "text",
    "model" "text",
    "available_models" "jsonb" DEFAULT '[]'::"jsonb",
    "enabled" boolean DEFAULT true,
    "rate_limit_per_minute" integer DEFAULT 60,
    "max_tokens" integer DEFAULT 4096,
    "temperature" numeric(3,2) DEFAULT 0.7,
    "top_p" numeric(3,2) DEFAULT 1.0,
    "dashboard_assignments" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."ai_providers" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_providers" IS 'AI provider configurations for all apps (Nova, Nova-GFX, Pulsar-VS, etc.)';



COMMENT ON COLUMN "public"."ai_providers"."id" IS 'Unique provider identifier (e.g., claude-default)';



COMMENT ON COLUMN "public"."ai_providers"."provider_name" IS 'Provider type: claude, openai, gemini, mistral, etc.';



COMMENT ON COLUMN "public"."ai_providers"."type" IS 'Capability type: text, image, video, multimodal';



COMMENT ON COLUMN "public"."ai_providers"."available_models" IS 'Array of models fetched from provider API';



COMMENT ON COLUMN "public"."ai_providers"."dashboard_assignments" IS 'Array of dashboard assignments with provider roles';



COMMENT ON COLUMN "public"."ai_providers"."organization_id" IS 'Organization that owns this provider. NULL means global/shared provider.';



CREATE OR REPLACE VIEW "public"."ai_providers_public" AS
 SELECT "ai_providers"."id",
    "ai_providers"."name",
    "ai_providers"."provider_name",
    "ai_providers"."type",
    "ai_providers"."description",
    "ai_providers"."endpoint",
    "ai_providers"."model",
    "ai_providers"."available_models",
    "ai_providers"."enabled",
    "ai_providers"."rate_limit_per_minute",
    "ai_providers"."max_tokens",
    "ai_providers"."temperature",
    "ai_providers"."top_p",
    "ai_providers"."dashboard_assignments",
    "ai_providers"."created_at",
    "ai_providers"."updated_at"
   FROM "public"."ai_providers";


ALTER TABLE "public"."ai_providers_public" OWNER TO "postgres";


COMMENT ON VIEW "public"."ai_providers_public" IS 'Public view of AI providers without sensitive credentials';



CREATE TABLE IF NOT EXISTS "public"."api_access_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "endpoint_id" "uuid",
    "request_method" character varying(10),
    "request_path" "text",
    "request_params" "jsonb",
    "request_headers" "jsonb",
    "response_status" integer,
    "response_time_ms" integer,
    "response_size_bytes" integer,
    "client_ip" "inet",
    "user_agent" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."api_access_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."api_access_logs" IS 'API Builder: Tracks API usage and performance';



CREATE TABLE IF NOT EXISTS "public"."api_documentation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "endpoint_id" "uuid",
    "openapi_spec" "jsonb",
    "markdown_docs" "text",
    "examples" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."api_documentation" OWNER TO "postgres";


COMMENT ON TABLE "public"."api_documentation" IS 'API Builder: Stores API documentation and examples';



CREATE TABLE IF NOT EXISTS "public"."api_endpoint_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "endpoint_id" "uuid",
    "data_source_id" "uuid",
    "is_primary" boolean DEFAULT false,
    "join_config" "jsonb" DEFAULT '{}'::"jsonb",
    "filter_config" "jsonb" DEFAULT '{}'::"jsonb",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."api_endpoint_sources" OWNER TO "postgres";


COMMENT ON TABLE "public"."api_endpoint_sources" IS 'API Builder: Links endpoints to data sources';



CREATE TABLE IF NOT EXISTS "public"."api_endpoints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "slug" character varying(255) NOT NULL,
    "description" "text",
    "output_format" character varying(50),
    "schema_config" "jsonb" DEFAULT '{}'::"jsonb",
    "transform_config" "jsonb" DEFAULT '{}'::"jsonb",
    "relationship_config" "jsonb" DEFAULT '{}'::"jsonb",
    "cache_config" "jsonb" DEFAULT '{"ttl": 300, "enabled": false}'::"jsonb",
    "auth_config" "jsonb" DEFAULT '{"type": "none", "required": false}'::"jsonb",
    "rate_limit_config" "jsonb" DEFAULT '{"enabled": false, "requests_per_minute": 60}'::"jsonb",
    "active" boolean DEFAULT true,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "is_draft" boolean DEFAULT false,
    "sample_data" "jsonb",
    "organization_id" "uuid",
    "target_apps" "text"[] DEFAULT '{}'::"text"[],
    CONSTRAINT "api_endpoints_output_format_check" CHECK ((("output_format")::"text" = ANY ((ARRAY['json'::character varying, 'xml'::character varying, 'rss'::character varying, 'csv'::character varying, 'custom'::character varying])::"text"[])))
);


ALTER TABLE "public"."api_endpoints" OWNER TO "postgres";


COMMENT ON TABLE "public"."api_endpoints" IS 'API Builder: Main endpoints configuration table';



COMMENT ON COLUMN "public"."api_endpoints"."is_draft" IS 'Indicates if this endpoint is an auto-draft for testing purposes';



COMMENT ON COLUMN "public"."api_endpoints"."target_apps" IS 'Array of target apps this endpoint is built for. Values: nova-gfx, pulsar-vs, fusion, pulsar-mcr';



CREATE TABLE IF NOT EXISTS "public"."banner_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "channel_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "media_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "time_ranges" "jsonb" DEFAULT '[]'::"jsonb",
    "days_of_week" "jsonb" DEFAULT '{"friday": false, "monday": false, "sunday": false, "tuesday": false, "saturday": false, "thursday": false, "wednesday": false}'::"jsonb",
    "triggers" "jsonb" DEFAULT '[]'::"jsonb",
    "active" boolean DEFAULT true,
    "priority" integer DEFAULT 0,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."banner_schedules" OWNER TO "postgres";


COMMENT ON TABLE "public"."banner_schedules" IS 'Banner scheduling for channels - allows scheduling media (from Novadevgrig) to display at specific times';



COMMENT ON COLUMN "public"."banner_schedules"."channel_ids" IS 'Array of channel UUIDs this schedule applies to';



COMMENT ON COLUMN "public"."banner_schedules"."media_id" IS 'References media_assets table in Novadevgrig database';



COMMENT ON COLUMN "public"."banner_schedules"."time_ranges" IS 'JSON array of time ranges: [{start: "09:00", end: "17:00"}]';



COMMENT ON COLUMN "public"."banner_schedules"."days_of_week" IS 'JSON object with boolean for each day';



COMMENT ON COLUMN "public"."banner_schedules"."triggers" IS 'JSON array of hourly triggers: [{start: "00:00", end: "05:00"}] - when within each hour to display banner';



COMMENT ON COLUMN "public"."banner_schedules"."priority" IS 'Higher priority banners take precedence in conflicts';



CREATE TABLE IF NOT EXISTS "public"."bop_election_results" (
    "id" integer NOT NULL,
    "office" character varying(50) NOT NULL,
    "office_type_code" character varying(10),
    "race_type" character varying(20) NOT NULL,
    "election_year" integer NOT NULL,
    "is_test" boolean DEFAULT false,
    "timestamp" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "organization_id" "uuid",
    CONSTRAINT "check_race_type" CHECK ((("race_type")::"text" = ANY ((ARRAY['house'::character varying, 'senate'::character varying])::"text"[])))
);


ALTER TABLE "public"."bop_election_results" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."bop_election_results_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."bop_election_results_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bop_election_results_id_seq" OWNED BY "public"."bop_election_results"."id";



CREATE TABLE IF NOT EXISTS "public"."bop_net_changes" (
    "id" integer NOT NULL,
    "party_result_id" integer NOT NULL,
    "winners_change" integer DEFAULT 0 NOT NULL,
    "leaders_change" integer DEFAULT 0 NOT NULL,
    "organization_id" "uuid"
);


ALTER TABLE "public"."bop_net_changes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bop_party_results" (
    "id" integer NOT NULL,
    "election_result_id" integer NOT NULL,
    "party_name" character varying(50) NOT NULL,
    "won" integer DEFAULT 0 NOT NULL,
    "leading" integer DEFAULT 0 NOT NULL,
    "holdovers" integer DEFAULT 0 NOT NULL,
    "winning_trend" integer DEFAULT 0 NOT NULL,
    "current_seats" integer DEFAULT 0 NOT NULL,
    "insufficient_vote" integer DEFAULT 0 NOT NULL,
    "organization_id" "uuid"
);


ALTER TABLE "public"."bop_party_results" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."bop_election_summary" AS
 SELECT "er"."id",
    "er"."office",
    "er"."race_type",
    "er"."election_year",
    "er"."timestamp",
    "pr"."party_name",
    "pr"."won",
    "pr"."leading",
    "pr"."holdovers",
    "pr"."winning_trend",
    "pr"."current_seats",
    "nc"."winners_change",
    "nc"."leaders_change"
   FROM (("public"."bop_election_results" "er"
     JOIN "public"."bop_party_results" "pr" ON (("er"."id" = "pr"."election_result_id")))
     LEFT JOIN "public"."bop_net_changes" "nc" ON (("pr"."id" = "nc"."party_result_id")))
  ORDER BY "er"."timestamp" DESC, "pr"."party_name";


ALTER TABLE "public"."bop_election_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bop_insufficient_vote_details" (
    "id" integer NOT NULL,
    "election_result_id" integer NOT NULL,
    "dem_open" integer DEFAULT 0 NOT NULL,
    "gop_open" integer DEFAULT 0 NOT NULL,
    "oth_open" integer DEFAULT 0 NOT NULL,
    "dem_incumbent" integer DEFAULT 0 NOT NULL,
    "gop_incumbent" integer DEFAULT 0 NOT NULL,
    "oth_incumbent" integer DEFAULT 0 NOT NULL,
    "total" integer DEFAULT 0 NOT NULL,
    "organization_id" "uuid"
);


ALTER TABLE "public"."bop_insufficient_vote_details" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."bop_insufficient_vote_details_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."bop_insufficient_vote_details_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bop_insufficient_vote_details_id_seq" OWNED BY "public"."bop_insufficient_vote_details"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."bop_net_changes_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."bop_net_changes_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bop_net_changes_id_seq" OWNED BY "public"."bop_net_changes"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."bop_party_results_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."bop_party_results_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bop_party_results_id_seq" OWNED BY "public"."bop_party_results"."id";



CREATE TABLE IF NOT EXISTS "public"."channel_playlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "schedule" "json",
    "parent_id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "order" integer DEFAULT 0 NOT NULL,
    "content_id" "uuid",
    "display_name" "text",
    "carousel_name" "text",
    "carousel_type" "text",
    "channel_id" "uuid",
    "organization_id" "uuid",
    CONSTRAINT "valid_type" CHECK (("type" = ANY (ARRAY['channel'::"text", 'playlist'::"text", 'bucket'::"text"])))
);


ALTER TABLE "public"."channel_playlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "type" "text",
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "active" boolean,
    "mse_host" character varying(255),
    "mse_port" integer DEFAULT 8595,
    "organization_id" "uuid",
    CONSTRAINT "channels_type_check" CHECK (("type" = ANY (ARRAY['Vizrt'::"text", 'Unreal'::"text", 'Pixera'::"text", 'Web'::"text"])))
);


ALTER TABLE "public"."channels" OWNER TO "postgres";


COMMENT ON COLUMN "public"."channels"."mse_host" IS 'MSE (Media Sequencer) hostname or IP for Vizrt channels';



COMMENT ON COLUMN "public"."channels"."mse_port" IS 'MSE WebSocket port (default 8595)';



CREATE TABLE IF NOT EXISTS "public"."content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "schedule" "json",
    "parent_id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "order" integer DEFAULT 0 NOT NULL,
    "template_id" "uuid",
    "display_name" "text",
    "duration" bigint,
    "data_source_id" "uuid",
    "source_row_id" "text",
    "source_row_hash" "text",
    "bucket_config" "jsonb",
    "config" "jsonb",
    "widget_type" character varying(50),
    "connection_settings" "jsonb",
    "rcp_presets" "jsonb",
    "rcp_fields" "jsonb",
    "organization_id" "uuid",
    CONSTRAINT "check_bucket_config_only_on_buckets" CHECK ((("bucket_config" IS NULL) OR ("type" = 'bucket'::"text"))),
    CONSTRAINT "content_type_check" CHECK (("type" = ANY (ARRAY['bucketFolder'::"text", 'bucket'::"text", 'itemFolder'::"text", 'item'::"text"])))
);


ALTER TABLE "public"."content" OWNER TO "postgres";


COMMENT ON COLUMN "public"."content"."bucket_config" IS 'Configuration for bucket-level item generation. Structure: {
  "generateItem": {
    "enabled": boolean,
    "templateId": string (UUID),
    "fieldName": string,
    "fieldValue": string (optional, defaults to bucket name)
  }
}';



COMMENT ON COLUMN "public"."content"."config" IS 'JSON configuration for widget settings and RCP presets';



COMMENT ON COLUMN "public"."content"."widget_type" IS 'Type of widget (unreal, viz, etc.)';



COMMENT ON COLUMN "public"."content"."connection_settings" IS 'Connection settings for UE5/Viz Engine';



COMMENT ON COLUMN "public"."content"."rcp_presets" IS 'Selected RCP presets configuration';



COMMENT ON COLUMN "public"."content"."rcp_fields" IS 'All fields from selected RCP presets';



CREATE TABLE IF NOT EXISTS "public"."customer_dashboards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "deployment_id" "uuid",
    "dashboard_id" "text" NOT NULL,
    "name" "text",
    "visible" boolean DEFAULT true,
    "order_index" integer DEFAULT 0,
    "access_level" "text" DEFAULT 'read'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "category" "text" DEFAULT 'data'::"text",
    "is_default" boolean DEFAULT false,
    "is_subcategory" boolean DEFAULT false,
    "organization_id" "uuid"
);


ALTER TABLE "public"."customer_dashboards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_providers" (
    "id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT false NOT NULL,
    "api_key" "text",
    "api_secret" "text",
    "base_url" "text",
    "api_version" "text",
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_url" "text",
    "storage_path" "text",
    "refresh_interval_minutes" integer DEFAULT 15,
    "last_run" timestamp with time zone,
    "organization_id" "uuid",
    CONSTRAINT "data_providers_category_check" CHECK (("category" = ANY (ARRAY['finance'::"text", 'weather'::"text", 'sports'::"text", 'news'::"text", 'media'::"text", 'school_closings'::"text", 'maps'::"text"])))
);


ALTER TABLE "public"."data_providers" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_providers" IS 'Unified data providers table - replaces KV store for Weather, Sports, News, Finance providers';



CREATE OR REPLACE VIEW "public"."data_providers_public" AS
 SELECT "data_providers"."id",
    "data_providers"."type",
    "data_providers"."category",
    "data_providers"."name",
    "data_providers"."description",
    "data_providers"."is_active",
    "data_providers"."base_url",
    "data_providers"."api_version",
    "data_providers"."config",
    "data_providers"."source_url",
    "data_providers"."storage_path",
        CASE
            WHEN ("data_providers"."api_key" IS NOT NULL) THEN '****'::"text"
            ELSE NULL::"text"
        END AS "api_key",
        CASE
            WHEN ("data_providers"."api_secret" IS NOT NULL) THEN '****'::"text"
            ELSE NULL::"text"
        END AS "api_secret",
    "data_providers"."created_at",
    "data_providers"."updated_at"
   FROM "public"."data_providers";


ALTER TABLE "public"."data_providers_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_source_sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "data_source_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "status" "text" NOT NULL,
    "items_processed" integer DEFAULT 0,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    CONSTRAINT "data_source_sync_logs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'success'::"text", 'error'::"text", 'debug'::"text", 'completed_with_errors'::"text"])))
);


ALTER TABLE "public"."data_source_sync_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "type" character varying(50) NOT NULL,
    "active" boolean DEFAULT true,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "file_config" "jsonb" DEFAULT '{}'::"jsonb",
    "sync_config" "jsonb" DEFAULT '{}'::"jsonb",
    "template_mapping" "jsonb" DEFAULT '{}'::"jsonb",
    "last_sync_at" timestamp with time zone,
    "next_sync_at" timestamp with time zone,
    "sync_status" "text" DEFAULT 'idle'::"text",
    "last_sync_error" "text",
    "last_sync_count" integer DEFAULT 0,
    "last_sync_result" "jsonb",
    "database_config" "jsonb" DEFAULT '{}'::"jsonb",
    "api_config" "jsonb",
    "rss_config" "jsonb",
    "category" character varying(100),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "organization_id" "uuid",
    CONSTRAINT "data_sources_sync_status_check" CHECK (("sync_status" = ANY (ARRAY['idle'::"text", 'pending'::"text", 'running'::"text", 'success'::"text", 'error'::"text", 'scheduled'::"text", 'ready'::"text"]))),
    CONSTRAINT "data_sources_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['api'::character varying, 'rss'::character varying, 'database'::character varying, 'file'::character varying])::"text"[])))
);


ALTER TABLE "public"."data_sources" OWNER TO "postgres";


COMMENT ON COLUMN "public"."data_sources"."file_config" IS 'Configuration for file-based data sources including format, headers, and parsing options';



COMMENT ON COLUMN "public"."data_sources"."sync_config" IS 'Synchronization settings including intervals, target buckets, and enabled status';



COMMENT ON COLUMN "public"."data_sources"."template_mapping" IS 'Mapping configuration between data source fields and template fields';



CREATE TABLE IF NOT EXISTS "public"."debug_log" (
    "id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "function_name" "text",
    "message" "text",
    "data" "jsonb"
);


ALTER TABLE "public"."debug_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."debug_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."debug_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."debug_log_id_seq" OWNED BY "public"."debug_log"."id";



CREATE TABLE IF NOT EXISTS "public"."e_ap_call_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "officeid" character varying(1),
    "subtype" character varying(1),
    "resultstype" character varying(1),
    "level" character varying(10),
    "electiondate" character varying(10),
    "nextrequest" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_ap_call_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_ballot_measure_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "measure_id" "uuid",
    "division_id" "uuid",
    "reporting_level" character varying(50) NOT NULL,
    "yes_votes" integer DEFAULT 0,
    "no_votes" integer DEFAULT 0,
    "yes_percentage" numeric(5,2),
    "no_percentage" numeric(5,2),
    "passed" boolean,
    "precincts_reporting" integer DEFAULT 0,
    "precincts_total" integer,
    "percent_reporting" numeric(5,2),
    "last_updated" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_ballot_measure_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_ballot_measures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "measure_id" character varying(255) NOT NULL,
    "election_id" "uuid",
    "division_id" "uuid",
    "number" character varying(50),
    "title" character varying(500) NOT NULL,
    "summary" "text",
    "full_text" "text",
    "type" character varying(100),
    "subject" character varying(255),
    "fiscal_impact" "text",
    "proponents" "text",
    "opponents" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_ballot_measures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_candidate_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "race_result_id" "uuid",
    "candidate_id" "uuid",
    "votes" integer DEFAULT 0,
    "vote_percentage" numeric(5,2),
    "electoral_votes" integer DEFAULT 0,
    "votes_override" integer,
    "vote_percentage_override" numeric(5,2),
    "electoral_votes_override" integer,
    "winner" boolean DEFAULT false,
    "winner_override" boolean,
    "runoff" boolean DEFAULT false,
    "runoff_override" boolean,
    "eliminated" boolean DEFAULT false,
    "eliminated_override" boolean,
    "rank" integer,
    "rank_override" integer,
    "override_reason" "text",
    "override_by" "uuid",
    "override_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_candidate_results" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."e_candidate_results_effective" AS
 SELECT "e_candidate_results"."id",
    "e_candidate_results"."race_result_id",
    "e_candidate_results"."candidate_id",
    "public"."e_get_effective_value"("e_candidate_results"."votes", "e_candidate_results"."votes_override") AS "votes",
    "public"."e_get_effective_value"("e_candidate_results"."vote_percentage", "e_candidate_results"."vote_percentage_override") AS "vote_percentage",
    "public"."e_get_effective_value"("e_candidate_results"."electoral_votes", "e_candidate_results"."electoral_votes_override") AS "electoral_votes",
    "public"."e_get_effective_value"("e_candidate_results"."winner", "e_candidate_results"."winner_override") AS "winner",
    "public"."e_get_effective_value"("e_candidate_results"."runoff", "e_candidate_results"."runoff_override") AS "runoff",
    "public"."e_get_effective_value"("e_candidate_results"."eliminated", "e_candidate_results"."eliminated_override") AS "eliminated",
    "public"."e_get_effective_value"("e_candidate_results"."rank", "e_candidate_results"."rank_override") AS "rank",
    "e_candidate_results"."metadata",
    "e_candidate_results"."created_at",
    "e_candidate_results"."updated_at",
        CASE
            WHEN ("e_candidate_results"."override_at" IS NOT NULL) THEN "jsonb_build_object"('has_override', true, 'override_by', "e_candidate_results"."override_by", 'override_at', "e_candidate_results"."override_at", 'override_reason', "e_candidate_results"."override_reason")
            ELSE "jsonb_build_object"('has_override', false)
        END AS "override_info"
   FROM "public"."e_candidate_results";


ALTER TABLE "public"."e_candidate_results_effective" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" character varying(255) NOT NULL,
    "first_name" character varying(255),
    "last_name" character varying(255) NOT NULL,
    "full_name" character varying(500) NOT NULL,
    "display_name" character varying(500),
    "short_name" character varying(255),
    "party_id" "uuid",
    "incumbent" boolean DEFAULT false,
    "age" integer,
    "date_of_birth" "date",
    "gender" character varying(50),
    "photo_url" character varying(1000),
    "photo_thumbnail_url" character varying(1000),
    "photo_credit" character varying(500),
    "video_intro_url" character varying(1000),
    "media_assets" "jsonb" DEFAULT '[]'::"jsonb",
    "bio" "text",
    "bio_short" "text",
    "website" character varying(500),
    "twitter_handle" character varying(100),
    "facebook_page" character varying(255),
    "instagram_handle" character varying(100),
    "youtube_channel" character varying(255),
    "campaign_email" character varying(255),
    "campaign_phone" character varying(50),
    "campaign_headquarters_address" "text",
    "education" "text"[],
    "professional_background" "text"[],
    "political_experience" "text"[],
    "endorsements" "jsonb" DEFAULT '[]'::"jsonb",
    "policy_positions" "jsonb" DEFAULT '{}'::"jsonb",
    "campaign_finance" "jsonb" DEFAULT '{}'::"jsonb",
    "scandals_controversies" "text"[],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "incumbent_override" boolean,
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_candidates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_countries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code_iso2" character varying(2) NOT NULL,
    "code_iso3" character varying(3) NOT NULL,
    "name" character varying(255) NOT NULL,
    "official_name" character varying(255),
    "continent" character varying(50),
    "region" character varying(100),
    "subregion" character varying(100),
    "capital" character varying(255),
    "population" integer,
    "area_sq_km" numeric,
    "timezone_default" character varying(50),
    "currency_code" character varying(3),
    "phone_code" character varying(10),
    "electoral_system" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_countries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_election_data_ingestion_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "election_data_source_id" "uuid",
    "status" character varying(50) NOT NULL,
    "records_received" integer,
    "records_processed" integer,
    "records_updated" integer,
    "records_failed" integer,
    "started_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "completed_at" timestamp with time zone,
    "duration_ms" integer,
    "error_message" "text",
    "raw_response" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_election_data_ingestion_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_election_data_overrides_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" character varying(255) NOT NULL,
    "record_id" "uuid" NOT NULL,
    "field_name" character varying(255) NOT NULL,
    "original_value" "text",
    "override_value" "text",
    "previous_override_value" "text",
    "action" character varying(50) NOT NULL,
    "reason" "text",
    "performed_by" "uuid",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_election_data_overrides_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_election_data_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "data_source_id" "uuid",
    "election_id" "uuid",
    "provider" character varying(100) NOT NULL,
    "feed_type" character varying(50) NOT NULL,
    "update_frequency_seconds" integer DEFAULT 30,
    "priority" integer DEFAULT 1,
    "active" boolean DEFAULT true,
    "last_fetch_at" timestamp with time zone,
    "last_success_at" timestamp with time zone,
    "last_error" "text",
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "field_mapping" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_election_data_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_election_editorial_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "content_type" character varying(50) NOT NULL,
    "title" character varying(500),
    "content" "text" NOT NULL,
    "author" character varying(255),
    "author_id" "uuid",
    "status" character varying(50) DEFAULT 'draft'::character varying,
    "published_at" timestamp with time zone,
    "featured" boolean DEFAULT false,
    "tags" "text"[],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_election_editorial_content" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_elections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "election_id" character varying(255) NOT NULL,
    "country_id" "uuid",
    "name" character varying(500) NOT NULL,
    "type" character varying(100) NOT NULL,
    "level" character varying(50) NOT NULL,
    "election_date" "date" NOT NULL,
    "registration_deadline" "date",
    "early_voting_start" "date",
    "early_voting_end" "date",
    "status" character varying(50) DEFAULT 'scheduled'::character varying,
    "year" integer GENERATED ALWAYS AS (EXTRACT(year FROM "election_date")) STORED,
    "cycle" character varying(50),
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_elections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_exit_polls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "race_id" "uuid",
    "pollster" character varying(255) NOT NULL,
    "sample_size" integer,
    "margin_of_error" numeric(3,1),
    "demographic_group" character varying(255),
    "demographic_value" character varying(255),
    "candidate_id" "uuid",
    "support_percentage" numeric(5,2),
    "collected_date" "date",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_exit_polls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_geographic_divisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "division_id" character varying(255) NOT NULL,
    "country_id" "uuid",
    "parent_division_id" "uuid",
    "name" character varying(500) NOT NULL,
    "type" character varying(100) NOT NULL,
    "code" character varying(50),
    "fips_code" character varying(10),
    "population" integer,
    "registered_voters" integer,
    "timezone" character varying(50),
    "geometry" "public"."geometry"(MultiPolygon,4326),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_geographic_divisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_historical_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "election_year" integer NOT NULL,
    "country_id" "uuid",
    "division_id" "uuid",
    "race_type" character varying(100),
    "office" character varying(255),
    "winning_party" character varying(100),
    "winning_candidate" character varying(500),
    "winning_votes" integer,
    "winning_percentage" numeric(5,2),
    "turnout_percentage" numeric(5,2),
    "total_votes" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_historical_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_media_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "asset_type" character varying(50) NOT NULL,
    "url" character varying(1000) NOT NULL,
    "thumbnail_url" character varying(1000),
    "title" character varying(500),
    "caption" "text",
    "credit" character varying(500),
    "license" character varying(255),
    "mime_type" character varying(100),
    "file_size_bytes" bigint,
    "duration_seconds" integer,
    "width" integer,
    "height" integer,
    "tags" "text"[],
    "is_primary" boolean DEFAULT false,
    "display_order" integer,
    "active" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_media_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_parties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "party_id" character varying(255) NOT NULL,
    "country_id" "uuid",
    "name" character varying(255) NOT NULL,
    "display_name" character varying(255),
    "short_name" character varying(100),
    "abbreviation" character varying(50),
    "color_hex" character varying(7),
    "color_secondary_hex" character varying(7),
    "color_palette" "jsonb" DEFAULT '[]'::"jsonb",
    "logo_url" character varying(1000),
    "logo_thumbnail_url" character varying(1000),
    "logo_svg" "text",
    "icon_url" character varying(1000),
    "header_image_url" character varying(1000),
    "background_image_url" character varying(1000),
    "media_assets" "jsonb" DEFAULT '[]'::"jsonb",
    "founded_year" character varying(20),
    "founded_date" "date",
    "headquarters_address" "text",
    "headquarters_city" character varying(255),
    "headquarters_state" character varying(100),
    "headquarters_country" character varying(100),
    "ideology" character varying(255),
    "ideology_detailed" "text",
    "political_position" character varying(100),
    "political_spectrum_score" numeric(3,2),
    "policy_priorities" "text"[],
    "coalition_partners" "text"[],
    "current_leader" character varying(500),
    "leader_title" character varying(255),
    "leadership_structure" "jsonb" DEFAULT '{}'::"jsonb",
    "website" character varying(500),
    "email" character varying(255),
    "phone" character varying(50),
    "twitter_handle" character varying(100),
    "facebook_page" character varying(255),
    "instagram_handle" character varying(100),
    "youtube_channel" character varying(255),
    "tiktok_handle" character varying(100),
    "linkedin_page" character varying(255),
    "social_media_accounts" "jsonb" DEFAULT '{}'::"jsonb",
    "member_count" integer,
    "registered_voters" integer,
    "youth_wing_name" character varying(255),
    "affiliated_organizations" "jsonb" DEFAULT '[]'::"jsonb",
    "major_donors" "jsonb" DEFAULT '[]'::"jsonb",
    "last_election_vote_share" numeric(5,2),
    "seats_held" "jsonb" DEFAULT '{}'::"jsonb",
    "electoral_performance" "jsonb" DEFAULT '[]'::"jsonb",
    "stronghold_regions" "text"[],
    "active" boolean DEFAULT true,
    "dissolved_date" "date",
    "successor_party_id" "uuid",
    "predecessor_party_id" "uuid",
    "international_affiliation" character varying(500),
    "description" "text",
    "platform_summary" "text",
    "historical_overview" "text",
    "editorial_notes" "text",
    "controversies" "text"[],
    "achievements" "text"[],
    "ui_config" "jsonb" DEFAULT '{}'::"jsonb",
    "display_order" integer,
    "featured" boolean DEFAULT false,
    "show_in_nav" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "color_light_hex" character varying(7),
    "color_dark_hex" character varying(7),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_parties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_race_candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "race_id" "uuid",
    "candidate_id" "uuid",
    "ballot_order" integer,
    "withdrew" boolean DEFAULT false,
    "withdrew_date" "date",
    "write_in" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "withdrew_override" boolean
);


ALTER TABLE "public"."e_race_candidates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_race_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "race_id" "uuid",
    "division_id" "uuid",
    "reporting_level" character varying(50) NOT NULL,
    "precincts_reporting" integer DEFAULT 0,
    "precincts_total" integer,
    "percent_reporting" numeric(5,2),
    "registered_voters" integer,
    "total_votes" integer DEFAULT 0,
    "precincts_reporting_override" integer,
    "precincts_total_override" integer,
    "percent_reporting_override" numeric(5,2),
    "registered_voters_override" integer,
    "total_votes_override" integer,
    "called" boolean DEFAULT false,
    "called_timestamp" timestamp with time zone,
    "called_by_source" character varying(255),
    "called_override" boolean,
    "called_override_timestamp" timestamp with time zone,
    "called_override_by" "uuid",
    "last_updated" timestamp with time zone,
    "winner_candidate_id" "uuid",
    "winner_override_candidate_id" "uuid",
    "recount_status" character varying(50),
    "recount_status_override" character varying(50),
    "override_reason" "text",
    "override_by" "uuid",
    "override_at" timestamp with time zone,
    "override_approved_by" "uuid",
    "override_approved_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "called_status_override" character varying(20),
    "called_status" character varying(20),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_race_results" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."e_race_results_effective" AS
 SELECT "e_race_results"."id",
    "e_race_results"."race_id",
    "e_race_results"."division_id",
    "e_race_results"."reporting_level",
    "public"."e_get_effective_value"("e_race_results"."precincts_reporting", "e_race_results"."precincts_reporting_override") AS "precincts_reporting",
    "public"."e_get_effective_value"("e_race_results"."precincts_total", "e_race_results"."precincts_total_override") AS "precincts_total",
    "public"."e_get_effective_value"("e_race_results"."percent_reporting", "e_race_results"."percent_reporting_override") AS "percent_reporting",
    "public"."e_get_effective_value"("e_race_results"."registered_voters", "e_race_results"."registered_voters_override") AS "registered_voters",
    "public"."e_get_effective_value"("e_race_results"."total_votes", "e_race_results"."total_votes_override") AS "total_votes",
    "public"."e_get_effective_value"("e_race_results"."called", "e_race_results"."called_override") AS "called",
    "public"."e_get_effective_value"("e_race_results"."called_status", "e_race_results"."called_status_override") AS "called_status",
        CASE
            WHEN ("e_race_results"."called_override" IS NOT NULL) THEN "e_race_results"."called_override_timestamp"
            ELSE "e_race_results"."called_timestamp"
        END AS "called_timestamp",
    "public"."e_get_effective_value"("e_race_results"."winner_candidate_id", "e_race_results"."winner_override_candidate_id") AS "winner_candidate_id",
    "public"."e_get_effective_value"("e_race_results"."recount_status", "e_race_results"."recount_status_override") AS "recount_status",
    "e_race_results"."last_updated",
    "e_race_results"."metadata",
    "e_race_results"."created_at",
    "e_race_results"."updated_at",
        CASE
            WHEN ("e_race_results"."override_at" IS NOT NULL) THEN "jsonb_build_object"('has_override', true, 'override_by', "e_race_results"."override_by", 'override_at', "e_race_results"."override_at", 'override_reason', "e_race_results"."override_reason", 'approved_by', "e_race_results"."override_approved_by", 'approved_at', "e_race_results"."override_approved_at")
            ELSE "jsonb_build_object"('has_override', false)
        END AS "override_info"
   FROM "public"."e_race_results";


ALTER TABLE "public"."e_race_results_effective" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_races" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "race_id" character varying(255) NOT NULL,
    "election_id" "uuid",
    "division_id" "uuid",
    "name" character varying(500) NOT NULL,
    "display_name" character varying(500),
    "short_name" character varying(255),
    "type" character varying(100) NOT NULL,
    "office" character varying(255),
    "seat_name" character varying(255),
    "term_length_years" integer,
    "num_elect" integer DEFAULT 1,
    "partisan" boolean DEFAULT true,
    "uncontested" boolean DEFAULT false,
    "incumbent_party" character varying(100),
    "rating" character varying(50),
    "priority_level" integer DEFAULT 5,
    "sort_order" integer,
    "description" "text",
    "key_issues" "text"[],
    "historical_context" "text",
    "editorial_notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ui_config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_races" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_synthetic_candidate_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "synthetic_race_id" "uuid",
    "division_id" "uuid" NOT NULL,
    "candidate_id" "text" NOT NULL,
    "votes" integer DEFAULT 0,
    "vote_percentage" numeric,
    "electoral_votes" integer DEFAULT 0,
    "winner" boolean DEFAULT false,
    "rank" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."e_synthetic_candidate_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_synthetic_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "organization_id" "uuid"
);


ALTER TABLE "public"."e_synthetic_groups" OWNER TO "postgres";


COMMENT ON TABLE "public"."e_synthetic_groups" IS 'Groups/versions for organizing synthetic election data scenarios';



CREATE TABLE IF NOT EXISTS "public"."e_synthetic_race_candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "synthetic_race_id" "uuid",
    "candidate_id" "text",
    "ballot_order" integer,
    "withdrew" boolean DEFAULT false,
    "write_in" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."e_synthetic_race_candidates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."e_synthetic_race_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "synthetic_race_id" "uuid",
    "division_id" "uuid" NOT NULL,
    "reporting_level" character varying DEFAULT 'county'::character varying NOT NULL,
    "precincts_reporting" integer,
    "precincts_total" integer,
    "percent_reporting" numeric,
    "registered_voters" integer,
    "total_votes" integer,
    "winner_candidate_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."e_synthetic_race_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."f_stocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "symbol" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "exchange" "text",
    "price" numeric(12,4),
    "change_1d" numeric(12,4),
    "change_1d_pct" numeric(8,4),
    "change_1w_pct" numeric(8,4),
    "change_1y_pct" numeric(8,4),
    "year_high" numeric(12,4),
    "year_low" numeric(12,4),
    "chart_1y" "jsonb",
    "rating" "jsonb",
    "custom_name" "text",
    "last_update" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "class" "text" DEFAULT 'stock'::"text",
    "source" "text",
    "source_id" "text",
    "volume" numeric(20,8),
    "logo_url" "text",
    "organization_id" "uuid",
    CONSTRAINT "alpaca_stocks_type_check" CHECK (("type" = ANY (ARRAY['EQUITY'::"text", 'ETF'::"text", 'INDEX'::"text", 'CRYPTO'::"text", 'us_equity'::"text", 'crypto'::"text"])))
);


ALTER TABLE "public"."f_stocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feeds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "configuration" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    CONSTRAINT "feeds_category_check" CHECK (("category" = ANY (ARRAY['Elections'::"text", 'Finance'::"text", 'Sports'::"text", 'Weather'::"text", 'News'::"text"]))),
    CONSTRAINT "feeds_type_check" CHECK (("type" = ANY (ARRAY['REST API'::"text", 'Database'::"text", 'File'::"text", 'Webhook'::"text"])))
);


ALTER TABLE "public"."feeds" OWNER TO "postgres";


COMMENT ON TABLE "public"."feeds" IS 'Note: API keys and secrets should be stored securely and referenced, not stored in plaintext';



CREATE TABLE IF NOT EXISTS "public"."file_sync_queue" (
    "id" integer NOT NULL,
    "data_source_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed" boolean DEFAULT false,
    "processed_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text",
    "error_message" "text"
);


ALTER TABLE "public"."file_sync_queue" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."file_sync_queue_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."file_sync_queue_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."file_sync_queue_id_seq" OWNED BY "public"."file_sync_queue"."id";



CREATE TABLE IF NOT EXISTS "public"."gfx_animation_presets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "definition" "jsonb" NOT NULL,
    "preview_url" "text",
    "is_system" boolean DEFAULT false,
    "organization_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "gfx_animation_presets_category_check" CHECK (("category" = ANY (ARRAY['entrance'::"text", 'exit'::"text", 'emphasis'::"text", 'motion'::"text"])))
);


ALTER TABLE "public"."gfx_animation_presets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gfx_animations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "element_id" "uuid",
    "phase" "text" NOT NULL,
    "delay" integer DEFAULT 0,
    "duration" integer DEFAULT 500,
    "iterations" integer DEFAULT 1,
    "direction" "text" DEFAULT 'normal'::"text",
    "easing" "text" DEFAULT 'ease-out'::"text",
    "preset_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "gfx_animations_phase_check" CHECK (("phase" = ANY (ARRAY['in'::"text", 'loop'::"text", 'out'::"text"])))
);


ALTER TABLE "public"."gfx_animations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gfx_bindings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "element_id" "uuid",
    "binding_key" "text" NOT NULL,
    "target_property" "text" NOT NULL,
    "binding_type" "text" DEFAULT 'text'::"text",
    "default_value" "text",
    "formatter" "text",
    "formatter_options" "jsonb",
    "required" boolean DEFAULT false,
    CONSTRAINT "gfx_bindings_binding_type_check" CHECK (("binding_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'number'::"text", 'color'::"text", 'boolean'::"text"])))
);


ALTER TABLE "public"."gfx_bindings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gfx_chat_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "user_id" "uuid",
    "context_template_id" "uuid",
    "context_element_ids" "uuid"[],
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "attachments" "jsonb",
    "changes_applied" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "gfx_chat_history_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."gfx_chat_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gfx_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "user_id" "uuid",
    "message" "text",
    "message_type" "text" DEFAULT 'text'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "attachments" "jsonb",
    "changes_applied" boolean DEFAULT false,
    "content" "text",
    "context_element_ids" "text"[],
    "context_template_id" "text",
    "role" "text",
    "error" boolean DEFAULT false,
    CONSTRAINT "gfx_chat_messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'system'::"text", 'action'::"text"]))),
    CONSTRAINT "gfx_chat_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."gfx_chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gfx_elements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "name" "text" NOT NULL,
    "element_id" "text" NOT NULL,
    "element_type" "text" NOT NULL,
    "parent_element_id" "uuid",
    "sort_order" integer DEFAULT 0,
    "position_x" double precision DEFAULT 0,
    "position_y" double precision DEFAULT 0,
    "width" double precision,
    "height" double precision,
    "rotation" double precision DEFAULT 0,
    "scale_x" double precision DEFAULT 1,
    "scale_y" double precision DEFAULT 1,
    "anchor_x" double precision DEFAULT 0.5,
    "anchor_y" double precision DEFAULT 0.5,
    "opacity" double precision DEFAULT 1,
    "content" "jsonb" DEFAULT '{"type": "div"}'::"jsonb",
    "styles" "jsonb" DEFAULT '{}'::"jsonb",
    "classes" "text"[] DEFAULT '{}'::"text"[],
    "visible" boolean DEFAULT true,
    "locked" boolean DEFAULT false,
    "interactions" "jsonb",
    "z_index" integer DEFAULT 0
);


ALTER TABLE "public"."gfx_elements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gfx_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "layer_id" "uuid",
    "parent_folder_id" "uuid",
    "name" "text" NOT NULL,
    "color" "text",
    "icon" "text",
    "sort_order" integer DEFAULT 0,
    "expanded" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gfx_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gfx_keyframes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "animation_id" "uuid",
    "position" double precision NOT NULL,
    "easing" "text" DEFAULT 'linear'::"text",
    "position_x" double precision,
    "position_y" double precision,
    "rotation" double precision,
    "scale_x" double precision,
    "scale_y" double precision,
    "opacity" double precision,
    "clip_path" "text",
    "filter_blur" double precision,
    "filter_brightness" double precision,
    "color" "text",
    "background_color" "text",
    "custom" "jsonb",
    "sort_order" integer DEFAULT 0,
    "name" "text",
    "properties" "jsonb"
);


ALTER TABLE "public"."gfx_keyframes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gfx_layers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "name" "text" NOT NULL,
    "layer_type" "text" NOT NULL,
    "z_index" integer NOT NULL,
    "sort_order" integer DEFAULT 0,
    "position_anchor" "text" DEFAULT 'top-left'::"text",
    "position_offset_x" integer DEFAULT 0,
    "position_offset_y" integer DEFAULT 0,
    "width" integer,
    "height" integer,
    "auto_out" boolean DEFAULT false,
    "auto_out_delay" integer DEFAULT 5000,
    "allow_multiple" boolean DEFAULT false,
    "always_on" boolean DEFAULT false,
    "transition_in" "text" DEFAULT 'fade'::"text",
    "transition_in_duration" integer DEFAULT 500,
    "transition_out" "text" DEFAULT 'fade'::"text",
    "transition_out_duration" integer DEFAULT 300,
    "enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "locked" boolean DEFAULT false,
    CONSTRAINT "gfx_layers_layer_type_check" CHECK (("layer_type" = ANY (ARRAY['fullscreen'::"text", 'background'::"text", 'lower-third'::"text", 'side-panel'::"text", 'ticker'::"text", 'bug'::"text", 'alert'::"text", 'overlay'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."gfx_layers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gfx_playback_commands" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "layer_id" "uuid",
    "template_id" "uuid",
    "command" "text" NOT NULL,
    "data" "jsonb",
    "transition" "text",
    "transition_duration" integer,
    "executed" boolean DEFAULT false,
    "executed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "gfx_playback_commands_command_check" CHECK (("command" = ANY (ARRAY['play_in'::"text", 'play_out'::"text", 'update'::"text", 'clear'::"text", 'clear_all'::"text"])))
);


ALTER TABLE "public"."gfx_playback_commands" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gfx_playback_state" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "layer_id" "uuid",
    "template_id" "uuid",
    "state" "text" DEFAULT 'empty'::"text",
    "data_override" "jsonb",
    "started_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "gfx_playback_state_state_check" CHECK (("state" = ANY (ARRAY['empty'::"text", 'in'::"text", 'hold'::"text", 'loop'::"text", 'out'::"text"])))
);


ALTER TABLE "public"."gfx_playback_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gfx_project_design_systems" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "colors" "jsonb" DEFAULT '{"text": "#FFFFFF", "accent": "#06B6D4", "primary": "#8B5CF6", "secondary": "#EC4899", "background": "#000000"}'::"jsonb",
    "fonts" "jsonb" DEFAULT '{"body": {"family": "Inter", "weight": 400}, "heading": {"family": "Inter", "weight": 700}}'::"jsonb",
    "spacing" "jsonb" DEFAULT '{"lg": 24, "md": 16, "sm": 8, "xl": 32, "xs": 4}'::"jsonb",
    "animation_defaults" "jsonb" DEFAULT '{"easing": "ease-out", "inDuration": 500, "outDuration": 300}'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gfx_project_design_systems" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gfx_projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "created_by" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "slug" "text" NOT NULL,
    "custom_url_slug" "text",
    "canvas_width" integer DEFAULT 1920,
    "canvas_height" integer DEFAULT 1080,
    "frame_rate" integer DEFAULT 60,
    "background_color" "text" DEFAULT 'transparent'::"text",
    "api_key" "text" DEFAULT "replace"((("gen_random_uuid"())::"text" || ("gen_random_uuid"())::"text"), '-'::"text", ''::"text"),
    "api_enabled" boolean DEFAULT true,
    "is_live" boolean DEFAULT false,
    "archived" boolean DEFAULT false,
    "thumbnail_url" "text",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "interactive_config" "jsonb",
    "interactive_enabled" boolean DEFAULT false,
    "published" boolean DEFAULT false,
    "settings" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."gfx_projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gfx_support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "project_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "ticket_type" "text" DEFAULT 'other'::"text",
    "priority" "text" DEFAULT 'medium'::"text",
    "status" "text" DEFAULT 'open'::"text",
    "app" "text",
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "admin_notes" "text",
    "attachments" "jsonb",
    "browser_info" "jsonb",
    "organization_id" "uuid",
    "project_name" "text",
    "type" "text",
    "user_email" "text",
    "user_name" "text",
    "user_agent" "text",
    CONSTRAINT "gfx_support_tickets_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "gfx_support_tickets_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'resolved'::"text"]))),
    CONSTRAINT "gfx_support_tickets_ticket_type_check" CHECK (("ticket_type" = ANY (ARRAY['bug'::"text", 'feature'::"text", 'question'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."gfx_support_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gfx_template_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "version_number" integer NOT NULL,
    "label" "text",
    "snapshot" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."gfx_template_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gfx_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "layer_id" "uuid",
    "folder_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "thumbnail_url" "text",
    "html_template" "text" DEFAULT '<div class="gfx-root"></div>'::"text",
    "css_styles" "text" DEFAULT ''::"text",
    "width" integer,
    "height" integer,
    "in_duration" integer DEFAULT 500,
    "loop_duration" integer,
    "loop_iterations" integer DEFAULT '-1'::integer,
    "out_duration" integer DEFAULT 300,
    "libraries" "text"[] DEFAULT '{}'::"text"[],
    "custom_script" "text",
    "locked" boolean DEFAULT false,
    "archived" boolean DEFAULT false,
    "version" integer DEFAULT 1,
    "sort_order" integer DEFAULT 0,
    "form_schema" "jsonb",
    "data_source_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "data_source_config" "jsonb",
    "enabled" boolean DEFAULT true
);


ALTER TABLE "public"."gfx_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_tabfields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "name" "text" NOT NULL,
    "value" "text",
    "options" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."item_tabfields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kv_store_7eabc66c" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL
);


ALTER TABLE "public"."kv_store_7eabc66c" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weather_locations" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "admin1" "text",
    "country" "text" NOT NULL,
    "lat" numeric(10,7) NOT NULL,
    "lon" numeric(10,7) NOT NULL,
    "elevation_m" numeric(8,2),
    "station_id" "text",
    "timezone" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_name" "text",
    "provider_id" "text",
    "provider_name" "text",
    "channel_id" "uuid",
    "organization_id" "uuid"
);


ALTER TABLE "public"."weather_locations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."weather_locations"."channel_id" IS 'ID of the channel this weather location is assigned to';



CREATE OR REPLACE VIEW "public"."live_weather_locations" AS
 SELECT "weather_locations"."id",
    "weather_locations"."name",
    "weather_locations"."admin1",
    "weather_locations"."country",
    "weather_locations"."lat",
    "weather_locations"."lon",
    "weather_locations"."elevation_m",
    "weather_locations"."station_id",
    "weather_locations"."timezone",
    "weather_locations"."is_active",
    "weather_locations"."created_at",
    "weather_locations"."updated_at",
    "weather_locations"."custom_name",
    "weather_locations"."provider_id",
    "weather_locations"."provider_name"
   FROM "public"."weather_locations"
  WHERE (("weather_locations"."is_active" = true) AND ("weather_locations"."provider_id" !~~ 'weather_provider:news12_local'::"text"));


ALTER TABLE "public"."live_weather_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."map_data" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."map_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "description" "text",
    "media_type" "text" NOT NULL,
    "tags" "text"[],
    "created_by" "text" NOT NULL,
    "ai_model_used" "text",
    "storage_path" "text" NOT NULL,
    "file_url" "text",
    "thumbnail_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "latitude" numeric(10,6),
    "longitude" numeric(10,6),
    "on_map" boolean DEFAULT false NOT NULL,
    "organization_id" "uuid",
    CONSTRAINT "check_latitude_range" CHECK ((("latitude" IS NULL) OR (("latitude" >= ('-90'::integer)::numeric) AND ("latitude" <= (90)::numeric)))),
    CONSTRAINT "check_longitude_range" CHECK ((("longitude" IS NULL) OR (("longitude" >= ('-180'::integer)::numeric) AND ("longitude" <= (180)::numeric)))),
    CONSTRAINT "media_assets_media_type_check" CHECK (("media_type" = ANY (ARRAY['image'::"text", 'video'::"text", 'audio'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."media_assets" OWNER TO "postgres";


COMMENT ON COLUMN "public"."media_assets"."latitude" IS 'Latitude coordinate where media was captured/created (optional, -90 to 90)';



COMMENT ON COLUMN "public"."media_assets"."longitude" IS 'Longitude coordinate where media was captured/created (optional, -180 to 180)';



CREATE TABLE IF NOT EXISTS "public"."media_distribution" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "media_id" "uuid",
    "system_id" "uuid",
    "path" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "last_sync" timestamp with time zone,
    "logs" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "media_distribution_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'synced'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."media_distribution" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_push_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "media_id" "uuid",
    "system_id" "uuid",
    "method" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "attempts" integer DEFAULT 0,
    "log" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "media_push_queue_method_check" CHECK (("method" = ANY (ARRAY['http'::"text", 'smb'::"text", 'ftp'::"text", 'rsync'::"text"]))),
    CONSTRAINT "media_push_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'success'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."media_push_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_tags" (
    "media_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."media_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ndi_presets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "resolution" "text" NOT NULL,
    "fps" "text" NOT NULL,
    "pixel_format" "text" NOT NULL,
    "stream_name" "text",
    "alpha" boolean DEFAULT false,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ndi_presets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "provider_article_id" "text",
    "title" "text" NOT NULL,
    "description" "text",
    "content" "text",
    "url" "text" NOT NULL,
    "image_url" "text",
    "source_name" "text",
    "source_id" "text",
    "author" "text",
    "published_at" timestamp with time zone,
    "fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "language" "text",
    "country" "text",
    "category" "text",
    "keywords" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid"
);


ALTER TABLE "public"."news_articles" OWNER TO "postgres";


COMMENT ON TABLE "public"."news_articles" IS 'Storage for news articles fetched from external providers (NewsAPI, NewsData, etc.)';



CREATE TABLE IF NOT EXISTS "public"."news_clusters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "keywords" "text"[] DEFAULT '{}'::"text"[],
    "category" "text",
    "sentiment" "text",
    "article_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "article_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."news_clusters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_textures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "media_type" "text" DEFAULT 'image'::"text" NOT NULL,
    "mime_type" "text",
    "file_size" integer,
    "width" integer,
    "height" integer,
    "duration" double precision,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "file_name" "text",
    "file_url" "text",
    "size" integer,
    "thumbnail_url" "text",
    "uploaded_by" "uuid",
    CONSTRAINT "organization_textures_media_type_check" CHECK (("media_type" = ANY (ARRAY['image'::"text", 'video'::"text"])))
);


ALTER TABLE "public"."organization_textures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."output_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "output_type" "text" NOT NULL,
    "source_url" "text",
    "source_file_path" "text",
    "reload_source_on_start" boolean DEFAULT false,
    "ndi_preset_id" "uuid",
    "ndi_settings" "jsonb",
    "st2110_preset_id" "uuid",
    "st2110_settings" "jsonb",
    "auto_start" boolean DEFAULT false,
    "full_config" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "output_profiles_output_type_check" CHECK (("output_type" = ANY (ARRAY['ndi'::"text", '2110'::"text"])))
);


ALTER TABLE "public"."output_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulsar_channel_state" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "channel_id" "uuid",
    "layers" "jsonb" DEFAULT '[{"index": 0, "state": "empty", "pageId": null, "onAirSince": null}, {"index": 1, "state": "empty", "pageId": null, "onAirSince": null}, {"index": 2, "state": "empty", "pageId": null, "onAirSince": null}, {"index": 3, "state": "empty", "pageId": null, "onAirSince": null}]'::"jsonb",
    "pending_command" "jsonb",
    "command_sequence" integer DEFAULT 0,
    "last_command" "jsonb",
    "last_command_at" timestamp with time zone,
    "last_acknowledged_at" timestamp with time zone,
    "controlled_by" "uuid",
    "control_locked_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pulsar_channel_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulsar_channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "channel_code" "text" NOT NULL,
    "channel_type" "text" DEFAULT 'graphics'::"text",
    "player_url" "text",
    "player_status" "text" DEFAULT 'disconnected'::"text",
    "last_heartbeat" timestamp with time zone,
    "loaded_project_id" "uuid",
    "last_initialized" timestamp with time zone,
    "layer_count" integer DEFAULT 4,
    "layer_config" "jsonb" DEFAULT '[{"name": "Layer 1", "index": 0, "allowedTypes": []}, {"name": "Layer 2", "index": 1, "allowedTypes": []}, {"name": "Layer 3", "index": 2, "allowedTypes": []}, {"name": "Layer 4", "index": 3, "allowedTypes": []}]'::"jsonb",
    "assigned_operators" "uuid"[],
    "is_locked" boolean DEFAULT false,
    "locked_by" "uuid",
    "auto_initialize_on_connect" boolean DEFAULT true,
    "auto_initialize_on_publish" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "channel_mode" "text",
    CONSTRAINT "pulsar_channels_channel_type_check" CHECK (("channel_type" = ANY (ARRAY['graphics'::"text", 'ticker'::"text", 'fullscreen'::"text", 'preview'::"text"]))),
    CONSTRAINT "pulsar_channels_player_status_check" CHECK (("player_status" = ANY (ARRAY['disconnected'::"text", 'connecting'::"text", 'connected'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."pulsar_channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulsar_command_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "channel_id" "uuid",
    "command_type" "text" NOT NULL,
    "layer_index" integer,
    "page_id" "uuid",
    "payload" "jsonb",
    "executed_at" timestamp with time zone DEFAULT "now"(),
    "acknowledged_at" timestamp with time zone,
    "triggered_by" "uuid",
    "trigger_source" "text",
    CONSTRAINT "pulsar_command_log_trigger_source_check" CHECK (("trigger_source" = ANY (ARRAY['manual'::"text", 'playlist_auto'::"text", 'custom_ui'::"text", 'api'::"text", 'scheduled'::"text"])))
);


ALTER TABLE "public"."pulsar_command_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulsar_commands" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "channel" "text" NOT NULL,
    "payload" "jsonb",
    "project_id" "uuid"
);


ALTER TABLE "public"."pulsar_commands" OWNER TO "postgres";


ALTER TABLE "public"."pulsar_commands" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pulsar_commands_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pulsar_connections" (
    "id" "text" NOT NULL,
    "friendly_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rcp_name" "text",
    "channel_name" "text",
    "project_type" "text",
    "set_manager_json" "json",
    "object_path" "text"
);


ALTER TABLE "public"."pulsar_connections" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pulsar_connections"."object_path" IS 'Unreal Engine object path for the scene controller (e.g., /Game/-Levels/UEDPIE_0_DemoRealTimeGFX.DemoRealTimeGFX:PersistentLevel.BP_SceneController_C_1)';



CREATE TABLE IF NOT EXISTS "public"."pulsar_custom_ui_controls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "custom_ui_id" "uuid",
    "control_type" "text" NOT NULL,
    "label" "text",
    "position_x" integer NOT NULL,
    "position_y" integer NOT NULL,
    "width" integer DEFAULT 1,
    "height" integer DEFAULT 1,
    "color" "text",
    "size" "text" DEFAULT 'medium'::"text",
    "action" "jsonb" NOT NULL,
    "options" "jsonb",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "pulsar_custom_ui_controls_control_type_check" CHECK (("control_type" = ANY (ARRAY['button'::"text", 'number'::"text", 'text'::"text", 'dropdown'::"text", 'toggle'::"text", 'timer'::"text", 'label'::"text", 'spacer'::"text"]))),
    CONSTRAINT "pulsar_custom_ui_controls_size_check" CHECK (("size" = ANY (ARRAY['small'::"text", 'medium'::"text", 'large'::"text"])))
);


ALTER TABLE "public"."pulsar_custom_ui_controls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulsar_custom_uis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "scope_type" "text" DEFAULT 'template'::"text",
    "template_id" "uuid",
    "page_id" "uuid",
    "layout" "jsonb" DEFAULT '{"width": 400, "height": 300, "columns": 2}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "pulsar_custom_uis_scope_type_check" CHECK (("scope_type" = ANY (ARRAY['template'::"text", 'page'::"text", 'standalone'::"text"])))
);


ALTER TABLE "public"."pulsar_custom_uis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulsar_page_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "playlist_id" "uuid",
    "name" "text" NOT NULL,
    "color" "text",
    "sort_order" integer NOT NULL,
    "is_collapsed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "parent_group_id" "uuid"
);


ALTER TABLE "public"."pulsar_page_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulsar_page_library" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "template_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "thumbnail_url" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "is_favorite" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "duration" integer
);


ALTER TABLE "public"."pulsar_page_library" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulsar_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "playlist_id" "uuid",
    "template_id" "uuid",
    "page_group_id" "uuid",
    "channel_id" "uuid",
    "name" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "data_bindings" "jsonb" DEFAULT '[]'::"jsonb",
    "duration" integer,
    "is_on_air" boolean DEFAULT false,
    "sort_order" integer NOT NULL,
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "data_record_index" integer DEFAULT 0
);


ALTER TABLE "public"."pulsar_pages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pulsar_pages"."data_record_index" IS 'Index of the selected data record for templates with data binding';



CREATE TABLE IF NOT EXISTS "public"."pulsar_playlist_page_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "playlist_id" "uuid" NOT NULL,
    "page_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pulsar_playlist_page_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulsar_playlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "channel_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "mode" "text" DEFAULT 'manual'::"text",
    "loop_mode" "text" DEFAULT 'none'::"text",
    "default_duration" integer DEFAULT 5000,
    "end_behavior" "text" DEFAULT 'stop'::"text",
    "status" "text" DEFAULT 'idle'::"text",
    "current_page_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "pulsar_playlists_end_behavior_check" CHECK (("end_behavior" = ANY (ARRAY['stop'::"text", 'hold'::"text", 'loop'::"text"]))),
    CONSTRAINT "pulsar_playlists_loop_mode_check" CHECK (("loop_mode" = ANY (ARRAY['none'::"text", 'loop'::"text", 'bounce'::"text"]))),
    CONSTRAINT "pulsar_playlists_status_check" CHECK (("status" = ANY (ARRAY['idle'::"text", 'playing'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."pulsar_playlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulsar_playout_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "channel_id" "uuid",
    "project_id" "uuid",
    "template_id" "uuid",
    "page_id" "uuid",
    "action" "text",
    "layer_index" integer,
    "payload" "jsonb",
    "duration_ms" integer,
    "operator_id" "uuid",
    "trigger_source" "text" DEFAULT 'manual'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "channel_code" "text",
    "channel_name" "text",
    "end_reason" "text",
    "ended_at" timestamp with time zone,
    "layer_name" "text",
    "template_name" "text",
    "data" "jsonb",
    "triggered_by" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "page_name" "text",
    "project_name" "text",
    "payload_snapshot" "jsonb" DEFAULT '{}'::"jsonb",
    "operator_name" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "pulsar_playout_log_action_check" CHECK (("action" = ANY (ARRAY['play_in'::"text", 'play_out'::"text", 'update'::"text", 'clear'::"text"]))),
    CONSTRAINT "pulsar_playout_log_trigger_source_check" CHECK (("trigger_source" = ANY (ARRAY['manual'::"text", 'playlist'::"text", 'api'::"text", 'scheduled'::"text"])))
);


ALTER TABLE "public"."pulsar_playout_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulsar_user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "theme" "text" DEFAULT 'system'::"text",
    "default_channel_id" "uuid",
    "default_project_id" "uuid",
    "ui_layout" "jsonb" DEFAULT '{}'::"jsonb",
    "keyboard_shortcuts" "jsonb" DEFAULT '{}'::"jsonb",
    "notification_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "active_playlist_id" "uuid",
    "last_project_id" "uuid",
    "open_playlist_ids" "uuid"[],
    "selected_channel_id" "uuid",
    "show_content_editor" boolean DEFAULT true,
    "show_playout_controls" boolean DEFAULT true,
    "show_preview" boolean DEFAULT true,
    CONSTRAINT "pulsar_user_preferences_theme_check" CHECK (("theme" = ANY (ARRAY['light'::"text", 'dark'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."pulsar_user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulsarvs_playlist_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "playlist_id" "uuid" NOT NULL,
    "item_type" "public"."pulsarvs_playlist_item_type" NOT NULL,
    "content_id" "uuid",
    "media_id" "uuid",
    "name" character varying(255) NOT NULL,
    "channel_id" "uuid",
    "duration" integer DEFAULT 10,
    "scheduled_time" timestamp with time zone,
    "sort_order" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "folder_id" "uuid",
    "parent_item_id" "uuid",
    CONSTRAINT "valid_item_reference" CHECK (((("item_type" = 'media'::"public"."pulsarvs_playlist_item_type") AND ("media_id" IS NOT NULL)) OR (("item_type" = 'page'::"public"."pulsarvs_playlist_item_type") AND ("content_id" IS NOT NULL)) OR (("item_type" = 'group'::"public"."pulsarvs_playlist_item_type") AND (("folder_id" IS NOT NULL) OR ("content_id" IS NOT NULL)))))
);


ALTER TABLE "public"."pulsarvs_playlist_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulsarvs_playlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "project_id" "uuid",
    "is_active" boolean DEFAULT true,
    "loop_enabled" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pulsarvs_playlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pulsarvs_projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "default_channel_id" "uuid",
    "default_instance_id" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "color" "text" DEFAULT 'blue'::"text",
    "icon" "text" DEFAULT '📁'::"text",
    "is_active" boolean DEFAULT false,
    "user_id" "uuid",
    "is_public" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pulsarvs_projects" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."ready_for_sync" AS
 SELECT "q"."id" AS "queue_id",
    "q"."data_source_id",
    "q"."processed_at" AS "marked_ready_at",
    "ds"."name",
    "ds"."file_config",
    "ds"."sync_config",
    "ds"."template_mapping",
    "ds"."user_id"
   FROM ("public"."file_sync_queue" "q"
     JOIN "public"."data_sources" "ds" ON (("ds"."id" = "q"."data_source_id")))
  WHERE (("q"."status" = 'ready'::"text") AND (("ds"."type")::"text" = 'file'::"text") AND ("ds"."active" = true))
  ORDER BY "q"."processed_at";


ALTER TABLE "public"."ready_for_sync" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."school_closings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "text",
    "region_id" "text",
    "region_name" "text",
    "state" "text",
    "city" "text",
    "county_name" "text",
    "organization_name" "text",
    "status_day" "text",
    "status_description" "text",
    "notes" "text",
    "source_format" "text",
    "fetched_at" timestamp with time zone DEFAULT "now"(),
    "updated_time" timestamp with time zone,
    "source_url" "text",
    "raw_data" "jsonb",
    "type" "text",
    "is_manual" boolean DEFAULT false,
    "zone_id" "text",
    "organization_id" "uuid"
);


ALTER TABLE "public"."school_closings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sponsor_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "channel_id" "uuid",
    "media_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "time_ranges" "jsonb" DEFAULT '[]'::"jsonb",
    "days_of_week" "jsonb" DEFAULT '{"friday": false, "monday": false, "sunday": false, "tuesday": false, "saturday": false, "thursday": false, "wednesday": false}'::"jsonb",
    "active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "priority" integer DEFAULT 0,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "channel_ids" "jsonb" DEFAULT '[]'::"jsonb",
    "category" character varying(100),
    "organization_id" "uuid"
);


ALTER TABLE "public"."sponsor_schedules" OWNER TO "postgres";


COMMENT ON TABLE "public"."sponsor_schedules" IS 'Sponsor scheduling for channels - allows scheduling media (from Novadevgrig) to display at specific times';



COMMENT ON COLUMN "public"."sponsor_schedules"."media_id" IS 'References media_assets table in Novadevgrig database';



COMMENT ON COLUMN "public"."sponsor_schedules"."time_ranges" IS 'JSON array of time ranges: [{start: "09:00", end: "17:00"}]';



COMMENT ON COLUMN "public"."sponsor_schedules"."days_of_week" IS 'JSON object with boolean for each day';



COMMENT ON COLUMN "public"."sponsor_schedules"."is_default" IS 'Default sponsor shown when no scheduled sponsor is active';



COMMENT ON COLUMN "public"."sponsor_schedules"."priority" IS 'Higher priority sponsors take precedence in conflicts';



COMMENT ON COLUMN "public"."sponsor_schedules"."channel_ids" IS 'JSON array of channel UUIDs this schedule applies to';



COMMENT ON COLUMN "public"."sponsor_schedules"."category" IS 'Category for filtering sponsors. Fixed values: school_closings, elections, or NULL for general sponsors';



CREATE TABLE IF NOT EXISTS "public"."sports_categories" (
    "id" integer NOT NULL,
    "sportradar_id" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "country_code" character varying(10),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sports_categories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sports_categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_categories_id_seq" OWNED BY "public"."sports_categories"."id";



CREATE TABLE IF NOT EXISTS "public"."sports_events" (
    "id" integer NOT NULL,
    "sportradar_id" character varying(50) NOT NULL,
    "season_id" integer,
    "home_team_id" integer,
    "away_team_id" integer,
    "start_time" timestamp with time zone NOT NULL,
    "start_time_confirmed" boolean DEFAULT true,
    "venue_name" character varying(150),
    "venue_city" character varying(100),
    "venue_country" character varying(100),
    "venue_capacity" integer,
    "round" character varying(50),
    "round_number" integer,
    "match_day" integer,
    "home_score" integer,
    "away_score" integer,
    "home_score_ht" integer,
    "away_score_ht" integer,
    "home_score_ft" integer,
    "away_score_ft" integer,
    "home_score_et" integer,
    "away_score_et" integer,
    "home_score_penalties" integer,
    "away_score_penalties" integer,
    "status" character varying(50) DEFAULT 'scheduled'::character varying,
    "winner_id" integer,
    "attendance" integer,
    "referee" character varying(100),
    "weather" "jsonb",
    "statistics" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."sports_events" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_events_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sports_events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_events_id_seq" OWNED BY "public"."sports_events"."id";



CREATE TABLE IF NOT EXISTS "public"."sports_leagues" (
    "id" integer NOT NULL,
    "sportradar_id" character varying(50),
    "sportmonks_id" integer,
    "name" character varying(150) NOT NULL,
    "alternative_name" character varying(150),
    "short_name" character varying(50),
    "type" character varying(50),
    "gender" character varying(20) DEFAULT 'men'::character varying,
    "sport" character varying(50) DEFAULT 'football'::character varying,
    "category_id" integer,
    "logo_url" "text",
    "active" boolean DEFAULT true,
    "api_source" character varying(50) DEFAULT 'sportradar'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."sports_leagues" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_leagues_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sports_leagues_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_leagues_id_seq" OWNED BY "public"."sports_leagues"."id";



CREATE TABLE IF NOT EXISTS "public"."sports_lineups" (
    "id" integer NOT NULL,
    "event_id" integer,
    "team_id" integer,
    "player_id" integer,
    "lineup_type" character varying(20) NOT NULL,
    "position" character varying(50),
    "formation_position" character varying(20),
    "jersey_number" integer,
    "played" boolean DEFAULT false,
    "minutes_played" integer,
    "subbed_in_minute" integer,
    "subbed_out_minute" integer,
    "goals" integer DEFAULT 0,
    "assists" integer DEFAULT 0,
    "yellow_cards" integer DEFAULT 0,
    "red_cards" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sports_lineups" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_lineups_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sports_lineups_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_lineups_id_seq" OWNED BY "public"."sports_lineups"."id";



CREATE TABLE IF NOT EXISTS "public"."sports_match_odds" (
    "id" integer NOT NULL,
    "event_id" integer,
    "provider" character varying(100) DEFAULT 'sportradar'::character varying,
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "home_win_odds" numeric(6,2),
    "draw_odds" numeric(6,2),
    "away_win_odds" numeric(6,2),
    "home_win_prob" numeric(5,2),
    "draw_prob" numeric(5,2),
    "away_win_prob" numeric(5,2),
    "over_1_5_odds" numeric(6,2),
    "under_1_5_odds" numeric(6,2),
    "over_2_5_odds" numeric(6,2),
    "under_2_5_odds" numeric(6,2),
    "over_3_5_odds" numeric(6,2),
    "under_3_5_odds" numeric(6,2),
    "btts_yes_odds" numeric(6,2),
    "btts_no_odds" numeric(6,2),
    "home_or_draw_odds" numeric(6,2),
    "away_or_draw_odds" numeric(6,2),
    "home_or_away_odds" numeric(6,2),
    "asian_handicap_line" numeric(4,2),
    "asian_home_odds" numeric(6,2),
    "asian_away_odds" numeric(6,2),
    "correct_score_1_0" numeric(6,2),
    "correct_score_2_0" numeric(6,2),
    "correct_score_2_1" numeric(6,2),
    "correct_score_1_1" numeric(6,2),
    "correct_score_0_0" numeric(6,2),
    "correct_score_0_1" numeric(6,2),
    "correct_score_0_2" numeric(6,2),
    "correct_score_1_2" numeric(6,2),
    "correct_score_2_2" numeric(6,2),
    "correct_score_3_0" numeric(6,2),
    "correct_score_3_1" numeric(6,2),
    "correct_score_3_2" numeric(6,2),
    "ht_home_win_odds" numeric(6,2),
    "ht_draw_odds" numeric(6,2),
    "ht_away_win_odds" numeric(6,2),
    "is_live" boolean DEFAULT false,
    "suspended" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sports_match_odds" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_match_odds_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sports_match_odds_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_match_odds_id_seq" OWNED BY "public"."sports_match_odds"."id";



CREATE TABLE IF NOT EXISTS "public"."sports_outright_odds" (
    "id" integer NOT NULL,
    "season_id" integer,
    "team_id" integer,
    "provider" character varying(100) DEFAULT 'sportradar'::character varying,
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "winner_odds" numeric(8,2),
    "winner_prob" numeric(5,2),
    "top_4_odds" numeric(6,2),
    "top_4_prob" numeric(5,2),
    "top_6_odds" numeric(6,2),
    "top_6_prob" numeric(5,2),
    "relegation_odds" numeric(6,2),
    "relegation_prob" numeric(5,2),
    "top_scorer_odds" numeric(8,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sports_outright_odds" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_outright_odds_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sports_outright_odds_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_outright_odds_id_seq" OWNED BY "public"."sports_outright_odds"."id";



CREATE TABLE IF NOT EXISTS "public"."sports_player_odds" (
    "id" integer NOT NULL,
    "season_id" integer,
    "player_id" integer,
    "provider" character varying(100) DEFAULT 'sportradar'::character varying,
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "top_scorer_odds" numeric(8,2),
    "top_scorer_prob" numeric(5,2),
    "current_goals" integer DEFAULT 0,
    "top_assists_odds" numeric(8,2),
    "current_assists" integer DEFAULT 0,
    "pots_odds" numeric(8,2),
    "ypots_odds" numeric(8,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sports_player_odds" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_player_odds_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sports_player_odds_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_player_odds_id_seq" OWNED BY "public"."sports_player_odds"."id";



CREATE TABLE IF NOT EXISTS "public"."sports_player_stats" (
    "id" integer NOT NULL,
    "player_id" integer,
    "season_id" integer,
    "team_id" integer,
    "appearances" integer DEFAULT 0,
    "starts" integer DEFAULT 0,
    "minutes_played" integer DEFAULT 0,
    "goals" integer DEFAULT 0,
    "assists" integer DEFAULT 0,
    "penalties_scored" integer DEFAULT 0,
    "penalties_missed" integer DEFAULT 0,
    "yellow_cards" integer DEFAULT 0,
    "red_cards" integer DEFAULT 0,
    "shots" integer DEFAULT 0,
    "shots_on_target" integer DEFAULT 0,
    "passes" integer DEFAULT 0,
    "pass_accuracy" numeric(5,2),
    "key_passes" integer DEFAULT 0,
    "tackles" integer DEFAULT 0,
    "interceptions" integer DEFAULT 0,
    "clearances" integer DEFAULT 0,
    "blocks" integer DEFAULT 0,
    "saves" integer DEFAULT 0,
    "clean_sheets" integer DEFAULT 0,
    "goals_conceded" integer DEFAULT 0,
    "rating" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sports_player_stats" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_player_stats_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sports_player_stats_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_player_stats_id_seq" OWNED BY "public"."sports_player_stats"."id";



CREATE TABLE IF NOT EXISTS "public"."sports_players" (
    "id" integer NOT NULL,
    "sportradar_id" character varying(50) NOT NULL,
    "team_id" integer,
    "name" character varying(150) NOT NULL,
    "first_name" character varying(75),
    "last_name" character varying(75),
    "nationality" character varying(100),
    "nationality_code" character varying(10),
    "date_of_birth" "date",
    "height" integer,
    "weight" integer,
    "jersey_number" integer,
    "position" character varying(50),
    "preferred_foot" character varying(20),
    "photo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sports_players" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_players_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sports_players_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_players_id_seq" OWNED BY "public"."sports_players"."id";



CREATE TABLE IF NOT EXISTS "public"."sports_season_teams" (
    "id" integer NOT NULL,
    "season_id" integer,
    "team_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sports_season_teams" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_season_teams_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sports_season_teams_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_season_teams_id_seq" OWNED BY "public"."sports_season_teams"."id";



CREATE TABLE IF NOT EXISTS "public"."sports_seasons" (
    "id" integer NOT NULL,
    "sportradar_id" character varying(50) NOT NULL,
    "league_id" integer,
    "name" character varying(150) NOT NULL,
    "year" character varying(20),
    "start_date" "date",
    "end_date" "date",
    "is_current" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sports_seasons" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_seasons_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sports_seasons_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_seasons_id_seq" OWNED BY "public"."sports_seasons"."id";



CREATE TABLE IF NOT EXISTS "public"."sports_standings" (
    "id" integer NOT NULL,
    "season_id" integer,
    "team_id" integer,
    "sportradar_league_id" character varying(50),
    "rank" integer NOT NULL,
    "played" integer DEFAULT 0,
    "win" integer DEFAULT 0,
    "draw" integer DEFAULT 0,
    "loss" integer DEFAULT 0,
    "goals_for" integer DEFAULT 0,
    "goals_against" integer DEFAULT 0,
    "goals_diff" integer DEFAULT 0,
    "points" integer DEFAULT 0,
    "form" character varying(20),
    "is_live" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sports_standings" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_standings_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sports_standings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_standings_id_seq" OWNED BY "public"."sports_standings"."id";



CREATE TABLE IF NOT EXISTS "public"."sports_team_stats" (
    "id" integer NOT NULL,
    "team_id" integer,
    "season_id" integer,
    "played" integer DEFAULT 0,
    "wins" integer DEFAULT 0,
    "draws" integer DEFAULT 0,
    "losses" integer DEFAULT 0,
    "goals_for" integer DEFAULT 0,
    "goals_against" integer DEFAULT 0,
    "goal_difference" integer DEFAULT 0,
    "points" integer DEFAULT 0,
    "total_shots" integer DEFAULT 0,
    "shots_on_target" integer DEFAULT 0,
    "shot_accuracy" numeric(5,2),
    "big_chances_created" integer DEFAULT 0,
    "big_chances_missed" integer DEFAULT 0,
    "hit_woodwork" integer DEFAULT 0,
    "total_passes" integer DEFAULT 0,
    "pass_accuracy" numeric(5,2),
    "crosses" integer DEFAULT 0,
    "cross_accuracy" numeric(5,2),
    "long_balls" integer DEFAULT 0,
    "through_balls" integer DEFAULT 0,
    "clean_sheets" integer DEFAULT 0,
    "tackles" integer DEFAULT 0,
    "tackle_success" numeric(5,2),
    "interceptions" integer DEFAULT 0,
    "clearances" integer DEFAULT 0,
    "blocks" integer DEFAULT 0,
    "aerial_duels_won" integer DEFAULT 0,
    "yellow_cards" integer DEFAULT 0,
    "red_cards" integer DEFAULT 0,
    "fouls_committed" integer DEFAULT 0,
    "fouls_won" integer DEFAULT 0,
    "offsides" integer DEFAULT 0,
    "avg_possession" numeric(5,2),
    "corners" integer DEFAULT 0,
    "penalties_scored" integer DEFAULT 0,
    "penalties_missed" integer DEFAULT 0,
    "penalties_conceded" integer DEFAULT 0,
    "free_kicks_scored" integer DEFAULT 0,
    "home_wins" integer DEFAULT 0,
    "home_draws" integer DEFAULT 0,
    "home_losses" integer DEFAULT 0,
    "away_wins" integer DEFAULT 0,
    "away_draws" integer DEFAULT 0,
    "away_losses" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sports_team_stats" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_team_stats_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sports_team_stats_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_team_stats_id_seq" OWNED BY "public"."sports_team_stats"."id";



CREATE TABLE IF NOT EXISTS "public"."sports_teams" (
    "id" integer NOT NULL,
    "sportradar_id" character varying(50),
    "sportmonks_id" integer,
    "name" character varying(150) NOT NULL,
    "short_name" character varying(50),
    "abbreviation" character varying(10),
    "gender" character varying(20) DEFAULT 'male'::character varying,
    "country" character varying(100),
    "country_code" character varying(10),
    "city" character varying(100),
    "venue" character varying(150),
    "founded" integer,
    "logo_url" "text",
    "colors" "jsonb" DEFAULT '{}'::"jsonb",
    "sport" character varying(50) DEFAULT 'football'::character varying,
    "api_source" character varying(50) DEFAULT 'sportradar'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "venue_id" integer,
    "organization_id" "uuid"
);


ALTER TABLE "public"."sports_teams" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_teams_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sports_teams_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_teams_id_seq" OWNED BY "public"."sports_teams"."id";



CREATE TABLE IF NOT EXISTS "public"."sports_venues" (
    "id" integer NOT NULL,
    "sportradar_id" character varying(50),
    "name" character varying(255) NOT NULL,
    "city" character varying(100),
    "country" character varying(100),
    "country_code" character varying(10),
    "address" character varying(255),
    "postal_code" character varying(20),
    "capacity" integer,
    "surface" character varying(50),
    "roof_type" character varying(50),
    "latitude" numeric(10,6),
    "longitude" numeric(10,6),
    "timezone" character varying(50),
    "image_url" "text",
    "thumbnail_url" "text",
    "year_opened" integer,
    "architect" character varying(255),
    "cost" character varying(100),
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sports_venues" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sports_venues_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sports_venues_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sports_venues_id_seq" OWNED BY "public"."sports_venues"."id";



CREATE TABLE IF NOT EXISTS "public"."st2110_presets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "resolution" "text" NOT NULL,
    "fps" "text" NOT NULL,
    "pixel_format" "text" NOT NULL,
    "nic" "text",
    "multicast_ip" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."st2110_presets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_config" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "public"."sync_config" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."sync_intervals_view" AS
 SELECT "ds"."id" AS "data_source_id",
    ("ds"."name")::"text" AS "name",
    COALESCE((("ds"."sync_config" ->> 'enabled'::"text"))::boolean, true) AS "sync_enabled",
    COALESCE((("ds"."sync_config" ->> 'interval'::"text"))::integer, 60) AS "interval_value",
    COALESCE(("ds"."sync_config" ->> 'intervalUnit'::"text"), 'minutes'::"text") AS "interval_unit",
    ((COALESCE((("ds"."sync_config" ->> 'interval'::"text"))::integer, 60) || ' '::"text") || COALESCE(("ds"."sync_config" ->> 'intervalUnit'::"text"), 'minutes'::"text")) AS "interval_string",
    "now"() AS "check_time",
    ("now"() + (((COALESCE((("ds"."sync_config" ->> 'interval'::"text"))::integer, 60) || ' '::"text") || COALESCE(("ds"."sync_config" ->> 'intervalUnit'::"text"), 'minutes'::"text")))::interval) AS "next_sync_calculated"
   FROM "public"."data_sources" "ds"
  WHERE ((("ds"."type")::"text" = 'file'::"text") AND ("ds"."active" = true));


ALTER TABLE "public"."sync_intervals_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."sync_monitor" AS
 SELECT "data_sources"."name",
    "data_sources"."type",
    "data_sources"."sync_status",
    "data_sources"."last_sync_at",
    "data_sources"."next_sync_at",
    "data_sources"."last_sync_count",
    "data_sources"."last_sync_error",
    ("data_sources"."sync_config" ->> 'enabled'::"text") AS "sync_enabled",
    ("data_sources"."sync_config" ->> 'interval'::"text") AS "sync_interval",
    ("data_sources"."sync_config" ->> 'intervalUnit'::"text") AS "sync_interval_unit",
        CASE
            WHEN ("data_sources"."sync_status" = 'running'::"text") THEN 'Currently syncing'::"text"
            WHEN ("data_sources"."sync_status" = 'error'::"text") THEN 'Last sync failed'::"text"
            WHEN (NOT (("data_sources"."sync_config" ->> 'enabled'::"text"))::boolean) THEN 'Sync disabled'::"text"
            WHEN (("data_sources"."next_sync_at" IS NULL) AND ("data_sources"."last_sync_at" IS NULL)) THEN 'Never synced'::"text"
            WHEN ("data_sources"."next_sync_at" < "now"()) THEN 'Overdue for sync'::"text"
            WHEN ("data_sources"."next_sync_at" >= "now"()) THEN 'Scheduled'::"text"
            ELSE 'Unknown'::"text"
        END AS "status_description",
        CASE
            WHEN ("data_sources"."next_sync_at" < "now"()) THEN ('Overdue by '::"text" || "age"("now"(), "data_sources"."next_sync_at"))
            WHEN ("data_sources"."next_sync_at" >= "now"()) THEN ('Due in '::"text" || "age"("data_sources"."next_sync_at", "now"()))
            ELSE NULL::"text"
        END AS "time_until_sync"
   FROM "public"."data_sources"
  WHERE ("data_sources"."active" = true)
  ORDER BY
        CASE "data_sources"."sync_status"
            WHEN 'error'::"text" THEN 0
            WHEN 'running'::"text" THEN 1
            ELSE 2
        END, "data_sources"."next_sync_at";


ALTER TABLE "public"."sync_monitor" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."sync_pipeline_status" AS
 SELECT 'Queue Status'::"text" AS "metric",
    ( SELECT "count"(*) AS "count"
           FROM "public"."file_sync_queue"
          WHERE ("file_sync_queue"."status" = 'pending'::"text")) AS "pending",
    ( SELECT "count"(*) AS "count"
           FROM "public"."file_sync_queue"
          WHERE ("file_sync_queue"."status" = 'processing'::"text")) AS "processing",
    ( SELECT "count"(*) AS "count"
           FROM "public"."file_sync_queue"
          WHERE (("file_sync_queue"."status" = 'completed'::"text") AND ("file_sync_queue"."processed_at" > ("now"() - '01:00:00'::interval)))) AS "recent_completed",
    ( SELECT "count"(*) AS "count"
           FROM "public"."content"
          WHERE (("content"."type" = 'item'::"text") AND ("content"."created_at" > ("now"() - '01:00:00'::interval)))) AS "items_created_last_hour";


ALTER TABLE "public"."sync_pipeline_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_queue" (
    "id" bigint NOT NULL,
    "data_source_id" "uuid" NOT NULL,
    "priority" integer DEFAULT 0,
    "status" "text" DEFAULT 'pending'::"text",
    "attempts" integer DEFAULT 0,
    "max_attempts" integer DEFAULT 3,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error_message" "text",
    CONSTRAINT "sync_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."sync_queue" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sync_queue_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."sync_queue_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sync_queue_id_seq" OWNED BY "public"."sync_queue"."id";



CREATE TABLE IF NOT EXISTS "public"."systems" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "ip_address" "inet",
    "port" integer,
    "system_type" "text" DEFAULT 'Other'::"text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "channel" "text",
    CONSTRAINT "systems_system_type_check" CHECK (("system_type" = ANY (ARRAY['Vizrt'::"text", 'Unreal'::"text", 'Pixera'::"text", 'Web'::"text", 'Disguise'::"text", 'Archive'::"text", 'Other'::"text"])))
);


ALTER TABLE "public"."systems" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tabfields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "name" "text" NOT NULL,
    "value" "text",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "options" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."tabfields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_forms" (
    "template_id" "uuid" NOT NULL,
    "schema" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."template_forms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_settings" (
    "template_id" "uuid" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "scripting_enabled" boolean DEFAULT false,
    "advanced_validation_enabled" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."template_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "parent_id" "uuid",
    "user_id" "uuid",
    "order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "form_schema" "jsonb",
    "is_favorite" boolean DEFAULT false,
    "is_default" boolean DEFAULT false,
    "carousel_name" "text",
    "organization_id" "uuid",
    CONSTRAINT "templates_type_check" CHECK (("type" = ANY (ARRAY['templateFolder'::"text", 'template'::"text"])))
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."templates"."form_schema" IS 'JSON schema defining form components and their configuration for custom rendering';



CREATE TABLE IF NOT EXISTS "public"."u_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "user_email" "text",
    "app_key" "text" NOT NULL,
    "action" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "text",
    "resource_name" "text",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "u_audit_log_action_check" CHECK (("action" = ANY (ARRAY['create'::"text", 'update'::"text", 'delete'::"text", 'login'::"text", 'logout'::"text", 'permission_change'::"text"])))
);


ALTER TABLE "public"."u_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."u_channel_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "channel_id" "uuid" NOT NULL,
    "can_write" boolean DEFAULT true NOT NULL,
    "granted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."u_channel_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."u_group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "group_id" "uuid" NOT NULL,
    "added_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."u_group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."u_group_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."u_group_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."u_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#6366f1'::"text",
    "is_system" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."u_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."u_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "token" "text" DEFAULT ("replace"(("gen_random_uuid"())::"text", '-'::"text", ''::"text") || "replace"(("gen_random_uuid"())::"text", '-'::"text", ''::"text")) NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "u_invitations_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."u_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."u_organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "allowed_domains" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."u_organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."u_page_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "app_key" "text" NOT NULL,
    "page_key" "text" NOT NULL,
    "page_label" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."u_page_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."u_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "app_key" "text" NOT NULL,
    "resource" "text" NOT NULL,
    "action" "text" NOT NULL,
    "description" "text",
    CONSTRAINT "u_permissions_action_check" CHECK (("action" = ANY (ARRAY['read'::"text", 'write'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."u_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."u_user_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "granted" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."u_user_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."u_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "avatar_url" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "is_superuser" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_login" timestamp with time zone,
    "organization_id" "uuid",
    "org_role" "text" DEFAULT 'member'::"text",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "u_users_org_role_check" CHECK (("org_role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text", 'viewer'::"text"]))),
    CONSTRAINT "u_users_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'pending'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."u_users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_active_agents" AS
 SELECT "a"."id",
    "a"."name",
    "a"."agent_type",
    "a"."status",
    "a"."schedule",
    "a"."last_run",
    "a"."next_run",
    "a"."run_count",
    "a"."error_count",
    COALESCE("recent_runs"."success_rate", (0)::double precision) AS "recent_success_rate"
   FROM ("public"."agents" "a"
     LEFT JOIN ( SELECT "agent_runs"."agent_id",
            ((("count"(*) FILTER (WHERE ("agent_runs"."status" = 'COMPLETED'::"text")))::double precision / ("count"(*))::double precision) * (100)::double precision) AS "success_rate"
           FROM "public"."agent_runs"
          WHERE ("agent_runs"."started_at" > ("now"() - '24:00:00'::interval))
          GROUP BY "agent_runs"."agent_id") "recent_runs" ON (("a"."id" = "recent_runs"."agent_id")))
  WHERE ("a"."status" = 'ACTIVE'::"text");


ALTER TABLE "public"."v_active_agents" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_active_feeds" AS
 SELECT "feeds"."id",
    "feeds"."name",
    "feeds"."type",
    "feeds"."category",
        CASE
            WHEN ("feeds"."type" = 'REST API'::"text") THEN ("feeds"."configuration" ->> 'apiUrl'::"text")
            WHEN ("feeds"."type" = 'Database'::"text") THEN ("feeds"."configuration" ->> 'host'::"text")
            WHEN ("feeds"."type" = 'File'::"text") THEN ("feeds"."configuration" ->> 'filePath'::"text")
            WHEN ("feeds"."type" = 'Webhook'::"text") THEN ("feeds"."configuration" ->> 'webhookUrl'::"text")
            ELSE NULL::"text"
        END AS "endpoint",
    "feeds"."created_at",
    "feeds"."updated_at"
   FROM "public"."feeds"
  WHERE ("feeds"."active" = true);


ALTER TABLE "public"."v_active_feeds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vs_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "tags" "text"[],
    "thumbnail_url" "text",
    "user_id" "uuid",
    "is_public" boolean DEFAULT false,
    "scene_config" "jsonb" NOT NULL,
    "backdrop_url" "text",
    "rcp_bindings" "jsonb",
    "metadata" "jsonb",
    "folder_id" "uuid",
    "project_id" "uuid"
);


ALTER TABLE "public"."vs_content" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vs_content_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "parent_id" "uuid",
    "user_id" "uuid",
    "color" "text" DEFAULT 'gray'::"text",
    "icon" "text" DEFAULT '📁'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "project_id" "uuid",
    CONSTRAINT "vs_content_folders_name_check" CHECK (("length"("name") <= 100))
);


ALTER TABLE "public"."vs_content_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weather_alerts" (
    "id" "text" NOT NULL,
    "location_id" "text" NOT NULL,
    "source" "text" NOT NULL,
    "event" "text" NOT NULL,
    "severity" "text",
    "urgency" "text",
    "certainty" "text",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "headline" "text",
    "description" "text",
    "areas" "text"[],
    "instruction" "text",
    "links" "text"[],
    "provider_id" "text",
    "provider_type" "text" DEFAULT 'weatherapi'::"text",
    "fetched_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "alert_id" "text",
    "organization_id" "uuid"
);


ALTER TABLE "public"."weather_alerts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."weather_active_alerts" AS
 SELECT "wa"."id",
    "wa"."location_id",
    "wa"."source",
    "wa"."event",
    "wa"."severity",
    "wa"."urgency",
    "wa"."certainty",
    "wa"."start_time",
    "wa"."end_time",
    "wa"."headline",
    "wa"."description",
    "wa"."areas",
    "wa"."instruction",
    "wa"."links",
    "wa"."provider_id",
    "wa"."provider_type",
    "wa"."fetched_at",
    "wa"."created_at",
    "wl"."name" AS "location_name",
    "wl"."country"
   FROM ("public"."weather_alerts" "wa"
     JOIN "public"."weather_locations" "wl" ON (("wa"."location_id" = "wl"."id")))
  WHERE (("wa"."start_time" <= "now"()) AND ("wa"."end_time" >= "now"()) AND ("wl"."is_active" = true))
  ORDER BY "wa"."severity" DESC, "wa"."start_time" DESC;


ALTER TABLE "public"."weather_active_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weather_air_quality" (
    "id" integer NOT NULL,
    "location_id" "text" NOT NULL,
    "as_of" timestamp with time zone NOT NULL,
    "aqi" integer,
    "aqi_category" "text",
    "aqi_standard" "text" DEFAULT 'US EPA'::"text",
    "pm25" numeric(8,2),
    "pm10" numeric(8,2),
    "o3" numeric(8,2),
    "no2" numeric(8,2),
    "so2" numeric(8,2),
    "co" numeric(8,2),
    "pollen_tree" integer,
    "pollen_grass" integer,
    "pollen_weed" integer,
    "pollen_risk" "text",
    "fetched_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "category" "text",
    "standard" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."weather_air_quality" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."weather_air_quality_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."weather_air_quality_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."weather_air_quality_id_seq" OWNED BY "public"."weather_air_quality"."id";



CREATE TABLE IF NOT EXISTS "public"."weather_current" (
    "id" integer NOT NULL,
    "location_id" "text" NOT NULL,
    "as_of" timestamp with time zone,
    "summary" "text",
    "icon" "text",
    "temperature_value" numeric(5,2),
    "temperature_unit" "text" DEFAULT '°C'::"text",
    "feels_like_value" numeric(5,2),
    "feels_like_unit" "text" DEFAULT '°C'::"text",
    "dew_point_value" numeric(5,2),
    "dew_point_unit" "text" DEFAULT '°C'::"text",
    "humidity" integer,
    "pressure_value" numeric(7,2),
    "pressure_unit" "text" DEFAULT 'mb'::"text",
    "pressure_tendency" "text",
    "cloud_cover" integer,
    "uv_index" numeric,
    "visibility_value" numeric(7,2),
    "visibility_unit" "text" DEFAULT 'km'::"text",
    "wind_speed_value" numeric(6,2),
    "wind_speed_unit" "text" DEFAULT 'km/h'::"text",
    "wind_gust_value" numeric(6,2),
    "wind_gust_unit" "text" DEFAULT 'km/h'::"text",
    "wind_direction_deg" numeric,
    "wind_direction_cardinal" "text",
    "precip_last_hr_value" numeric(6,2),
    "precip_last_hr_unit" "text" DEFAULT 'mm'::"text",
    "precip_type" "text",
    "snow_depth_value" numeric(6,2),
    "snow_depth_unit" "text" DEFAULT 'cm'::"text",
    "sunrise" timestamp with time zone,
    "sunset" timestamp with time zone,
    "moon_phase" "text",
    "moon_illumination" numeric,
    "provider_id" "text",
    "provider_type" "text" DEFAULT 'weatherapi'::"text",
    "fetched_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "precip_mm" numeric,
    "admin1" "text",
    "country" "text",
    "lat" numeric,
    "lon" numeric,
    "name" "text",
    "timestamp" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "organization_id" "uuid",
    CONSTRAINT "weather_current_cloud_cover_check" CHECK ((("cloud_cover" >= 0) AND ("cloud_cover" <= 100))),
    CONSTRAINT "weather_current_humidity_check" CHECK ((("humidity" >= 0) AND ("humidity" <= 100))),
    CONSTRAINT "weather_current_wind_direction_deg_check" CHECK ((("wind_direction_deg" >= (0)::numeric) AND ("wind_direction_deg" < (360)::numeric)))
);


ALTER TABLE "public"."weather_current" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."weather_current_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."weather_current_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."weather_current_id_seq" OWNED BY "public"."weather_current"."id";



CREATE TABLE IF NOT EXISTS "public"."weather_daily_forecast" (
    "id" integer NOT NULL,
    "location_id" "text" NOT NULL,
    "forecast_date" "date" NOT NULL,
    "summary" "text",
    "icon" "text",
    "temp_max_value" numeric,
    "temp_max_unit" "text" DEFAULT '°C'::"text",
    "temp_min_value" numeric,
    "temp_min_unit" "text" DEFAULT '°C'::"text",
    "sunrise" "text",
    "sunset" "text",
    "moon_phase" "text",
    "uv_index_max" numeric,
    "precip_probability" numeric,
    "precip_type" "text",
    "precip_accumulation_value" numeric(6,2),
    "precip_accumulation_unit" "text" DEFAULT 'mm'::"text",
    "snow_accumulation_value" numeric(6,2),
    "snow_accumulation_unit" "text" DEFAULT 'cm'::"text",
    "wind_speed_avg_value" numeric(6,2),
    "wind_speed_avg_unit" "text" DEFAULT 'km/h'::"text",
    "wind_gust_max_value" numeric(6,2),
    "wind_gust_max_unit" "text" DEFAULT 'km/h'::"text",
    "wind_direction_deg" integer,
    "provider_id" "text",
    "provider_type" "text" DEFAULT 'weatherapi'::"text",
    "fetched_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "humidity" numeric,
    "pressure_unit" "text",
    "pressure_value" integer,
    "uv_index" numeric,
    "visibility_unit" "text",
    "visibility_value" integer,
    "wind_direction_cardinal" "text",
    "wind_speed_unit" "text",
    "wind_speed_value" numeric,
    "condition_icon" "text",
    "condition_text" "text",
    "precip_mm" numeric,
    "temp_max_c" numeric,
    "temp_min_c" numeric,
    "temp_max_f" numeric,
    "temp_min_f" numeric,
    "moon_illumination" numeric,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    CONSTRAINT "weather_daily_forecast_precip_probability_check" CHECK ((("precip_probability" >= (0)::numeric) AND ("precip_probability" <= (100)::numeric)))
);


ALTER TABLE "public"."weather_daily_forecast" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."weather_daily_forecast_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."weather_daily_forecast_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."weather_daily_forecast_id_seq" OWNED BY "public"."weather_daily_forecast"."id";



CREATE TABLE IF NOT EXISTS "public"."weather_hourly_forecast" (
    "id" integer NOT NULL,
    "location_id" "text" NOT NULL,
    "forecast_time" timestamp with time zone NOT NULL,
    "summary" "text",
    "icon" "text",
    "temperature_value" numeric(5,2),
    "temperature_unit" "text" DEFAULT '°C'::"text",
    "feels_like_value" numeric(5,2),
    "feels_like_unit" "text" DEFAULT '°C'::"text",
    "dew_point_value" numeric(5,2),
    "dew_point_unit" "text" DEFAULT '°C'::"text",
    "humidity" integer,
    "cloud_cover" integer,
    "uv_index" integer,
    "visibility_value" numeric(7,2),
    "visibility_unit" "text" DEFAULT 'km'::"text",
    "wind_speed_value" numeric(6,2),
    "wind_speed_unit" "text" DEFAULT 'km/h'::"text",
    "wind_gust_value" numeric(6,2),
    "wind_gust_unit" "text" DEFAULT 'km/h'::"text",
    "wind_direction_deg" integer,
    "pressure_value" numeric(7,2),
    "pressure_unit" "text" DEFAULT 'mb'::"text",
    "precip_probability" integer,
    "precip_intensity_value" numeric(6,2),
    "precip_intensity_unit" "text" DEFAULT 'mm/h'::"text",
    "provider_id" "text",
    "provider_type" "text" DEFAULT 'weatherapi'::"text",
    "fetched_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "condition_icon" "text",
    "condition_text" "text",
    "precip_mm" numeric,
    "temp_c" numeric,
    "temp_f" numeric,
    "wind_degree" numeric,
    "wind_kph" numeric,
    "wind_mph" numeric,
    "wind_dir" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    CONSTRAINT "weather_hourly_forecast_precip_probability_check" CHECK ((("precip_probability" >= 0) AND ("precip_probability" <= 100)))
);


ALTER TABLE "public"."weather_hourly_forecast" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."weather_hourly_forecast_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."weather_hourly_forecast_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."weather_hourly_forecast_id_seq" OWNED BY "public"."weather_hourly_forecast"."id";



CREATE TABLE IF NOT EXISTS "public"."weather_ingest_config" (
    "id" integer NOT NULL,
    "provider_id" "text" NOT NULL,
    "interval_minutes" integer DEFAULT 15,
    "file_path" "text" NOT NULL,
    "last_run" timestamp with time zone,
    "organization_id" "uuid"
);


ALTER TABLE "public"."weather_ingest_config" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."weather_ingest_config_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."weather_ingest_config_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."weather_ingest_config_id_seq" OWNED BY "public"."weather_ingest_config"."id";



CREATE OR REPLACE VIEW "public"."weather_latest" AS
 SELECT "wc"."location_id",
    "wc"."as_of",
    "wc"."summary",
    "wc"."icon",
    "wc"."temperature_value",
    "wc"."temperature_unit",
    "wc"."feels_like_value",
    "wc"."feels_like_unit",
    "wc"."humidity",
    "wc"."pressure_value",
    "wc"."pressure_unit",
    "wc"."visibility_value",
    "wc"."visibility_unit",
    "wc"."wind_speed_value",
    "wc"."wind_speed_unit",
    "wc"."wind_direction_cardinal",
    "wc"."wind_direction_deg",
    "wc"."uv_index",
    "wc"."provider_type",
    "wc"."country",
    "wc"."admin1",
    "wc"."name",
    "wc"."lat",
    "wc"."lon",
    "wc"."fetched_at",
    "wc"."created_at"
   FROM "public"."weather_current" "wc";


ALTER TABLE "public"."weather_latest" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weather_location_channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "text" NOT NULL,
    "channel_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."weather_location_channels" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bop_election_results" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bop_election_results_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bop_insufficient_vote_details" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bop_insufficient_vote_details_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bop_net_changes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bop_net_changes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bop_party_results" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bop_party_results_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."debug_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."debug_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."file_sync_queue" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."file_sync_queue_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_leagues" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_leagues_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_lineups" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_lineups_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_match_odds" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_match_odds_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_outright_odds" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_outright_odds_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_player_odds" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_player_odds_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_player_stats" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_player_stats_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_players" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_players_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_season_teams" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_season_teams_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_seasons" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_seasons_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_standings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_standings_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_team_stats" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_team_stats_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_teams" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_teams_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sports_venues" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sports_venues_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sync_queue" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sync_queue_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."weather_air_quality" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."weather_air_quality_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."weather_current" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."weather_current_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."weather_daily_forecast" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."weather_daily_forecast_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."weather_hourly_forecast" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."weather_hourly_forecast_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."weather_ingest_config" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."weather_ingest_config_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."agent_runs"
    ADD CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_insights_elections"
    ADD CONSTRAINT "ai_insights_elections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_insights_finance"
    ADD CONSTRAINT "ai_insights_finance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_insights_news"
    ADD CONSTRAINT "ai_insights_news_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_insights_school_closing"
    ADD CONSTRAINT "ai_insights_school_closing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_prompt_injectors"
    ADD CONSTRAINT "ai_prompt_injectors_feature_key" UNIQUE ("feature");



ALTER TABLE ONLY "public"."ai_prompt_injectors"
    ADD CONSTRAINT "ai_prompt_injectors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_providers"
    ADD CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."f_stocks"
    ADD CONSTRAINT "alpaca_stocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."f_stocks"
    ADD CONSTRAINT "alpaca_stocks_symbol_unique" UNIQUE ("symbol");



ALTER TABLE ONLY "public"."api_access_logs"
    ADD CONSTRAINT "api_access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_documentation"
    ADD CONSTRAINT "api_documentation_endpoint_id_key" UNIQUE ("endpoint_id");



ALTER TABLE ONLY "public"."api_documentation"
    ADD CONSTRAINT "api_documentation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_endpoint_sources"
    ADD CONSTRAINT "api_endpoint_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_endpoint_sources"
    ADD CONSTRAINT "api_endpoint_sources_unique" UNIQUE ("endpoint_id", "data_source_id");



ALTER TABLE ONLY "public"."api_endpoints"
    ADD CONSTRAINT "api_endpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_app_key_key" UNIQUE ("app_key");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banner_schedules"
    ADD CONSTRAINT "banner_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bop_election_results"
    ADD CONSTRAINT "bop_election_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bop_insufficient_vote_details"
    ADD CONSTRAINT "bop_insufficient_vote_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bop_net_changes"
    ADD CONSTRAINT "bop_net_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bop_party_results"
    ADD CONSTRAINT "bop_party_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channel_playlists"
    ADD CONSTRAINT "channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_dashboards"
    ADD CONSTRAINT "customer_dashboards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_providers"
    ADD CONSTRAINT "data_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_source_sync_logs"
    ADD CONSTRAINT "data_source_sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_sources"
    ADD CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."debug_log"
    ADD CONSTRAINT "debug_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_ap_call_history"
    ADD CONSTRAINT "e_ap_call_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_ballot_measure_results"
    ADD CONSTRAINT "e_ballot_measure_results_measure_id_division_id_reporting_l_key" UNIQUE ("measure_id", "division_id", "reporting_level");



ALTER TABLE ONLY "public"."e_ballot_measure_results"
    ADD CONSTRAINT "e_ballot_measure_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_ballot_measures"
    ADD CONSTRAINT "e_ballot_measures_measure_id_key" UNIQUE ("measure_id");



ALTER TABLE ONLY "public"."e_ballot_measures"
    ADD CONSTRAINT "e_ballot_measures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_candidate_results"
    ADD CONSTRAINT "e_candidate_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_candidate_results"
    ADD CONSTRAINT "e_candidate_results_race_result_id_candidate_id_key" UNIQUE ("race_result_id", "candidate_id");



ALTER TABLE ONLY "public"."e_candidates"
    ADD CONSTRAINT "e_candidates_candidate_id_key" UNIQUE ("candidate_id");



ALTER TABLE ONLY "public"."e_candidates"
    ADD CONSTRAINT "e_candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_countries"
    ADD CONSTRAINT "e_countries_code_iso2_key" UNIQUE ("code_iso2");



ALTER TABLE ONLY "public"."e_countries"
    ADD CONSTRAINT "e_countries_code_iso3_key" UNIQUE ("code_iso3");



ALTER TABLE ONLY "public"."e_countries"
    ADD CONSTRAINT "e_countries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_election_data_ingestion_log"
    ADD CONSTRAINT "e_election_data_ingestion_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_election_data_overrides_log"
    ADD CONSTRAINT "e_election_data_overrides_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_election_data_sources"
    ADD CONSTRAINT "e_election_data_sources_data_source_id_election_id_provider_key" UNIQUE ("data_source_id", "election_id", "provider", "feed_type");



ALTER TABLE ONLY "public"."e_election_data_sources"
    ADD CONSTRAINT "e_election_data_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_election_editorial_content"
    ADD CONSTRAINT "e_election_editorial_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_elections"
    ADD CONSTRAINT "e_elections_election_id_key" UNIQUE ("election_id");



ALTER TABLE ONLY "public"."e_elections"
    ADD CONSTRAINT "e_elections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_exit_polls"
    ADD CONSTRAINT "e_exit_polls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_geographic_divisions"
    ADD CONSTRAINT "e_geographic_divisions_division_id_key" UNIQUE ("division_id");



ALTER TABLE ONLY "public"."e_geographic_divisions"
    ADD CONSTRAINT "e_geographic_divisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_historical_results"
    ADD CONSTRAINT "e_historical_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_media_assets"
    ADD CONSTRAINT "e_media_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_parties"
    ADD CONSTRAINT "e_parties_party_id_key" UNIQUE ("party_id");



ALTER TABLE ONLY "public"."e_parties"
    ADD CONSTRAINT "e_parties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_race_candidates"
    ADD CONSTRAINT "e_race_candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_race_candidates"
    ADD CONSTRAINT "e_race_candidates_race_id_candidate_id_key" UNIQUE ("race_id", "candidate_id");



ALTER TABLE ONLY "public"."e_race_results"
    ADD CONSTRAINT "e_race_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_race_results"
    ADD CONSTRAINT "e_race_results_race_id_division_id_reporting_level_key" UNIQUE ("race_id", "division_id", "reporting_level");



ALTER TABLE ONLY "public"."e_races"
    ADD CONSTRAINT "e_races_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_races"
    ADD CONSTRAINT "e_races_race_id_key" UNIQUE ("race_id");



ALTER TABLE ONLY "public"."e_synthetic_candidate_results"
    ADD CONSTRAINT "e_synthetic_candidate_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_synthetic_groups"
    ADD CONSTRAINT "e_synthetic_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_synthetic_race_candidates"
    ADD CONSTRAINT "e_synthetic_race_candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_synthetic_race_results"
    ADD CONSTRAINT "e_synthetic_race_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."e_synthetic_races"
    ADD CONSTRAINT "e_synthetic_races_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feeds"
    ADD CONSTRAINT "feeds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."file_sync_queue"
    ADD CONSTRAINT "file_sync_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_animation_presets"
    ADD CONSTRAINT "gfx_animation_presets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_animations"
    ADD CONSTRAINT "gfx_animations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_bindings"
    ADD CONSTRAINT "gfx_bindings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_chat_history"
    ADD CONSTRAINT "gfx_chat_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_chat_messages"
    ADD CONSTRAINT "gfx_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_elements"
    ADD CONSTRAINT "gfx_elements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_folders"
    ADD CONSTRAINT "gfx_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_keyframes"
    ADD CONSTRAINT "gfx_keyframes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_layers"
    ADD CONSTRAINT "gfx_layers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_playback_commands"
    ADD CONSTRAINT "gfx_playback_commands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_playback_state"
    ADD CONSTRAINT "gfx_playback_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_playback_state"
    ADD CONSTRAINT "gfx_playback_state_project_id_layer_id_key" UNIQUE ("project_id", "layer_id");



ALTER TABLE ONLY "public"."gfx_project_design_systems"
    ADD CONSTRAINT "gfx_project_design_systems_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_project_design_systems"
    ADD CONSTRAINT "gfx_project_design_systems_project_id_key" UNIQUE ("project_id");



ALTER TABLE ONLY "public"."gfx_projects"
    ADD CONSTRAINT "gfx_projects_custom_url_slug_key" UNIQUE ("custom_url_slug");



ALTER TABLE ONLY "public"."gfx_projects"
    ADD CONSTRAINT "gfx_projects_organization_id_slug_key" UNIQUE ("organization_id", "slug");



ALTER TABLE ONLY "public"."gfx_projects"
    ADD CONSTRAINT "gfx_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_support_tickets"
    ADD CONSTRAINT "gfx_support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_template_versions"
    ADD CONSTRAINT "gfx_template_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gfx_template_versions"
    ADD CONSTRAINT "gfx_template_versions_template_id_version_number_key" UNIQUE ("template_id", "version_number");



ALTER TABLE ONLY "public"."gfx_templates"
    ADD CONSTRAINT "gfx_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_tabfields"
    ADD CONSTRAINT "item_tabfields_content_id_name_key" UNIQUE ("item_id", "name");



ALTER TABLE ONLY "public"."item_tabfields"
    ADD CONSTRAINT "item_tabfields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kv_store_7eabc66c"
    ADD CONSTRAINT "kv_store_7eabc66c_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."map_data"
    ADD CONSTRAINT "map_data_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."map_settings"
    ADD CONSTRAINT "map_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_distribution"
    ADD CONSTRAINT "media_distribution_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_push_queue"
    ADD CONSTRAINT "media_push_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_tags"
    ADD CONSTRAINT "media_tags_pkey" PRIMARY KEY ("media_id", "tag_id");



ALTER TABLE ONLY "public"."ndi_presets"
    ADD CONSTRAINT "ndi_presets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_provider_article_id_unique" UNIQUE ("provider_article_id");



ALTER TABLE ONLY "public"."news_clusters"
    ADD CONSTRAINT "news_clusters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_textures"
    ADD CONSTRAINT "organization_textures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."output_profiles"
    ADD CONSTRAINT "output_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsar_channel_state"
    ADD CONSTRAINT "pulsar_channel_state_channel_id_key" UNIQUE ("channel_id");



ALTER TABLE ONLY "public"."pulsar_channel_state"
    ADD CONSTRAINT "pulsar_channel_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsar_channels"
    ADD CONSTRAINT "pulsar_channels_organization_id_channel_code_key" UNIQUE ("organization_id", "channel_code");



ALTER TABLE ONLY "public"."pulsar_channels"
    ADD CONSTRAINT "pulsar_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsar_command_log"
    ADD CONSTRAINT "pulsar_command_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsar_commands"
    ADD CONSTRAINT "pulsar_commands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsar_connections"
    ADD CONSTRAINT "pulsar_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsar_custom_ui_controls"
    ADD CONSTRAINT "pulsar_custom_ui_controls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsar_custom_uis"
    ADD CONSTRAINT "pulsar_custom_uis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsar_page_groups"
    ADD CONSTRAINT "pulsar_page_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsar_page_library"
    ADD CONSTRAINT "pulsar_page_library_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsar_pages"
    ADD CONSTRAINT "pulsar_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsar_playlist_page_links"
    ADD CONSTRAINT "pulsar_playlist_page_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsar_playlist_page_links"
    ADD CONSTRAINT "pulsar_playlist_page_links_playlist_id_page_id_key" UNIQUE ("playlist_id", "page_id");



ALTER TABLE ONLY "public"."pulsar_playlists"
    ADD CONSTRAINT "pulsar_playlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsar_playout_log"
    ADD CONSTRAINT "pulsar_playout_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsarvs_projects"
    ADD CONSTRAINT "pulsar_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsar_user_preferences"
    ADD CONSTRAINT "pulsar_user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsar_user_preferences"
    ADD CONSTRAINT "pulsar_user_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."pulsarvs_playlist_items"
    ADD CONSTRAINT "pulsarvs_playlist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulsarvs_playlists"
    ADD CONSTRAINT "pulsarvs_playlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_closings"
    ADD CONSTRAINT "school_closings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_closings"
    ADD CONSTRAINT "school_closings_provider_id_organization_name_status_day_key" UNIQUE ("provider_id", "organization_name", "status_day");



ALTER TABLE ONLY "public"."sponsor_schedules"
    ADD CONSTRAINT "sponsor_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_categories"
    ADD CONSTRAINT "sports_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_categories"
    ADD CONSTRAINT "sports_categories_sportradar_id_key" UNIQUE ("sportradar_id");



ALTER TABLE ONLY "public"."sports_events"
    ADD CONSTRAINT "sports_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_events"
    ADD CONSTRAINT "sports_events_sportradar_id_key" UNIQUE ("sportradar_id");



ALTER TABLE ONLY "public"."sports_leagues"
    ADD CONSTRAINT "sports_leagues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_leagues"
    ADD CONSTRAINT "sports_leagues_sportradar_id_key" UNIQUE ("sportradar_id");



ALTER TABLE ONLY "public"."sports_lineups"
    ADD CONSTRAINT "sports_lineups_event_id_player_id_key" UNIQUE ("event_id", "player_id");



ALTER TABLE ONLY "public"."sports_lineups"
    ADD CONSTRAINT "sports_lineups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_match_odds"
    ADD CONSTRAINT "sports_match_odds_event_id_provider_key" UNIQUE ("event_id", "provider");



ALTER TABLE ONLY "public"."sports_match_odds"
    ADD CONSTRAINT "sports_match_odds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_outright_odds"
    ADD CONSTRAINT "sports_outright_odds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_outright_odds"
    ADD CONSTRAINT "sports_outright_odds_season_id_team_id_provider_key" UNIQUE ("season_id", "team_id", "provider");



ALTER TABLE ONLY "public"."sports_player_odds"
    ADD CONSTRAINT "sports_player_odds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_player_odds"
    ADD CONSTRAINT "sports_player_odds_season_id_player_id_provider_key" UNIQUE ("season_id", "player_id", "provider");



ALTER TABLE ONLY "public"."sports_player_stats"
    ADD CONSTRAINT "sports_player_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_player_stats"
    ADD CONSTRAINT "sports_player_stats_player_id_season_id_key" UNIQUE ("player_id", "season_id");



ALTER TABLE ONLY "public"."sports_players"
    ADD CONSTRAINT "sports_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_players"
    ADD CONSTRAINT "sports_players_sportradar_id_key" UNIQUE ("sportradar_id");



ALTER TABLE ONLY "public"."sports_season_teams"
    ADD CONSTRAINT "sports_season_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_season_teams"
    ADD CONSTRAINT "sports_season_teams_season_id_team_id_key" UNIQUE ("season_id", "team_id");



ALTER TABLE ONLY "public"."sports_seasons"
    ADD CONSTRAINT "sports_seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_seasons"
    ADD CONSTRAINT "sports_seasons_sportradar_id_key" UNIQUE ("sportradar_id");



ALTER TABLE ONLY "public"."sports_standings"
    ADD CONSTRAINT "sports_standings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_standings"
    ADD CONSTRAINT "sports_standings_season_id_team_id_key" UNIQUE ("season_id", "team_id");



ALTER TABLE ONLY "public"."sports_team_stats"
    ADD CONSTRAINT "sports_team_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_team_stats"
    ADD CONSTRAINT "sports_team_stats_team_id_season_id_key" UNIQUE ("team_id", "season_id");



ALTER TABLE ONLY "public"."sports_teams"
    ADD CONSTRAINT "sports_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_teams"
    ADD CONSTRAINT "sports_teams_sportradar_id_key" UNIQUE ("sportradar_id");



ALTER TABLE ONLY "public"."sports_venues"
    ADD CONSTRAINT "sports_venues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports_venues"
    ADD CONSTRAINT "sports_venues_sportradar_id_key" UNIQUE ("sportradar_id");



ALTER TABLE ONLY "public"."st2110_presets"
    ADD CONSTRAINT "st2110_presets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_config"
    ADD CONSTRAINT "sync_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."sync_queue"
    ADD CONSTRAINT "sync_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."systems"
    ADD CONSTRAINT "systems_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tabfields"
    ADD CONSTRAINT "tabfields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tabfields"
    ADD CONSTRAINT "tabfields_template_id_name_key" UNIQUE ("template_id", "name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_forms"
    ADD CONSTRAINT "template_forms_pkey" PRIMARY KEY ("template_id");



ALTER TABLE ONLY "public"."template_settings"
    ADD CONSTRAINT "template_settings_pkey" PRIMARY KEY ("template_id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."u_audit_log"
    ADD CONSTRAINT "u_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."u_channel_access"
    ADD CONSTRAINT "u_channel_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."u_channel_access"
    ADD CONSTRAINT "u_channel_access_user_id_channel_id_key" UNIQUE ("user_id", "channel_id");



ALTER TABLE ONLY "public"."u_group_members"
    ADD CONSTRAINT "u_group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."u_group_members"
    ADD CONSTRAINT "u_group_members_user_id_group_id_key" UNIQUE ("user_id", "group_id");



ALTER TABLE ONLY "public"."u_group_permissions"
    ADD CONSTRAINT "u_group_permissions_group_id_permission_id_key" UNIQUE ("group_id", "permission_id");



ALTER TABLE ONLY "public"."u_group_permissions"
    ADD CONSTRAINT "u_group_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."u_groups"
    ADD CONSTRAINT "u_groups_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."u_groups"
    ADD CONSTRAINT "u_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."u_invitations"
    ADD CONSTRAINT "u_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."u_invitations"
    ADD CONSTRAINT "u_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."u_organizations"
    ADD CONSTRAINT "u_organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."u_organizations"
    ADD CONSTRAINT "u_organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."u_page_settings"
    ADD CONSTRAINT "u_page_settings_app_key_page_key_key" UNIQUE ("app_key", "page_key");



ALTER TABLE ONLY "public"."u_page_settings"
    ADD CONSTRAINT "u_page_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."u_permissions"
    ADD CONSTRAINT "u_permissions_app_key_resource_action_key" UNIQUE ("app_key", "resource", "action");



ALTER TABLE ONLY "public"."u_permissions"
    ADD CONSTRAINT "u_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."u_user_permissions"
    ADD CONSTRAINT "u_user_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."u_user_permissions"
    ADD CONSTRAINT "u_user_permissions_user_id_permission_id_key" UNIQUE ("user_id", "permission_id");



ALTER TABLE ONLY "public"."u_users"
    ADD CONSTRAINT "u_users_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."u_users"
    ADD CONSTRAINT "u_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bop_party_results"
    ADD CONSTRAINT "unique_party_per_election" UNIQUE ("election_result_id", "party_name");



ALTER TABLE ONLY "public"."u_invitations"
    ADD CONSTRAINT "unique_pending_u_invite" UNIQUE ("email", "organization_id");



ALTER TABLE ONLY "public"."map_settings"
    ADD CONSTRAINT "unique_user_map_settings" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_layouts"
    ADD CONSTRAINT "user_layouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_layouts"
    ADD CONSTRAINT "user_layouts_user_id_layout_name_key" UNIQUE ("user_id", "layout_name");



ALTER TABLE ONLY "public"."vs_content_folders"
    ADD CONSTRAINT "vs_content_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vs_content"
    ADD CONSTRAINT "vs_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_insights_weather"
    ADD CONSTRAINT "weather_ai_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weather_air_quality"
    ADD CONSTRAINT "weather_air_quality_location_id_as_of_key" UNIQUE ("location_id", "as_of");



ALTER TABLE ONLY "public"."weather_air_quality"
    ADD CONSTRAINT "weather_air_quality_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weather_alerts"
    ADD CONSTRAINT "weather_alerts_id_location_id_key" UNIQUE ("id", "location_id");



ALTER TABLE ONLY "public"."weather_alerts"
    ADD CONSTRAINT "weather_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weather_alerts"
    ADD CONSTRAINT "weather_alerts_unique" UNIQUE ("id");



ALTER TABLE ONLY "public"."weather_alerts"
    ADD CONSTRAINT "weather_alerts_unique_location_alert" UNIQUE ("location_id", "alert_id");



ALTER TABLE ONLY "public"."weather_current"
    ADD CONSTRAINT "weather_current_location_id_as_of_key" UNIQUE ("location_id", "as_of");



ALTER TABLE ONLY "public"."weather_current"
    ADD CONSTRAINT "weather_current_location_id_key" UNIQUE ("location_id");



ALTER TABLE ONLY "public"."weather_current"
    ADD CONSTRAINT "weather_current_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weather_current"
    ADD CONSTRAINT "weather_current_unique" UNIQUE ("location_id");



ALTER TABLE ONLY "public"."weather_daily_forecast"
    ADD CONSTRAINT "weather_daily_forecast_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weather_daily_forecast"
    ADD CONSTRAINT "weather_daily_forecast_unique" UNIQUE ("location_id", "forecast_date", "provider_id");



ALTER TABLE ONLY "public"."weather_hourly_forecast"
    ADD CONSTRAINT "weather_hourly_forecast_location_id_forecast_time_provider__key" UNIQUE ("location_id", "forecast_time", "provider_id");



ALTER TABLE ONLY "public"."weather_hourly_forecast"
    ADD CONSTRAINT "weather_hourly_forecast_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weather_hourly_forecast"
    ADD CONSTRAINT "weather_hourly_forecast_unique" UNIQUE ("location_id", "forecast_time");



ALTER TABLE ONLY "public"."weather_ingest_config"
    ADD CONSTRAINT "weather_ingest_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weather_location_channels"
    ADD CONSTRAINT "weather_location_channels_location_id_channel_id_key" UNIQUE ("location_id", "channel_id");



ALTER TABLE ONLY "public"."weather_location_channels"
    ADD CONSTRAINT "weather_location_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weather_locations"
    ADD CONSTRAINT "weather_locations_pkey" PRIMARY KEY ("id");



CREATE INDEX IF NOT EXISTS "ai_insights_school_closing_category_idx" ON "public"."ai_insights_school_closing" USING "btree" ("category");



CREATE INDEX IF NOT EXISTS "ai_insights_school_closing_created_at_idx" ON "public"."ai_insights_school_closing" USING "btree" ("created_at" DESC);



CREATE INDEX IF NOT EXISTS "ai_prompt_injectors_feature_idx" ON "public"."ai_prompt_injectors" USING "btree" ("feature");



CREATE UNIQUE INDEX IF NOT EXISTS "api_endpoints_slug_unique_non_draft" ON "public"."api_endpoints" USING "btree" ("slug") WHERE (("is_draft" = false) OR ("is_draft" IS NULL));



CREATE INDEX IF NOT EXISTS "channels_order_idx" ON "public"."channel_playlists" USING "btree" ("order");



CREATE INDEX IF NOT EXISTS "content_order_idx" ON "public"."content" USING "btree" ("order");



CREATE INDEX IF NOT EXISTS "content_parent_id_idx" ON "public"."content" USING "btree" ("parent_id");



CREATE INDEX IF NOT EXISTS "content_template_id_idx" ON "public"."content" USING "btree" ("template_id");



CREATE INDEX IF NOT EXISTS "content_user_id_idx" ON "public"."content" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "idx_agent_runs_agent_id" ON "public"."agent_runs" USING "btree" ("agent_id");



CREATE INDEX IF NOT EXISTS "idx_agent_runs_started_at" ON "public"."agent_runs" USING "btree" ("started_at");



CREATE INDEX IF NOT EXISTS "idx_agent_runs_status" ON "public"."agent_runs" USING "btree" ("status");



CREATE INDEX IF NOT EXISTS "idx_agents_org" ON "public"."agents" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_agents_status" ON "public"."agents" USING "btree" ("status");



CREATE INDEX IF NOT EXISTS "idx_agents_type" ON "public"."agents" USING "btree" ("agent_type");



CREATE INDEX IF NOT EXISTS "idx_ai_insights_elections_category" ON "public"."ai_insights_elections" USING "btree" ("category");



CREATE INDEX IF NOT EXISTS "idx_ai_insights_elections_created_at" ON "public"."ai_insights_elections" USING "btree" ("created_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_ai_insights_finance_category" ON "public"."ai_insights_finance" USING "btree" ("category");



CREATE INDEX IF NOT EXISTS "idx_ai_insights_finance_created_at" ON "public"."ai_insights_finance" USING "btree" ("created_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_ai_insights_news_category" ON "public"."ai_insights_news" USING "btree" ("category");



CREATE INDEX IF NOT EXISTS "idx_ai_insights_news_created_at" ON "public"."ai_insights_news" USING "btree" ("created_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_ai_insights_weather_category" ON "public"."ai_insights_weather" USING "btree" ("category");



CREATE INDEX IF NOT EXISTS "idx_ai_insights_weather_created_at" ON "public"."ai_insights_weather" USING "btree" ("created_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_ai_providers_dashboard_assignments" ON "public"."ai_providers" USING "gin" ("dashboard_assignments");



CREATE INDEX IF NOT EXISTS "idx_ai_providers_enabled" ON "public"."ai_providers" USING "btree" ("enabled");



CREATE INDEX IF NOT EXISTS "idx_ai_providers_org" ON "public"."ai_providers" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_ai_providers_organization_id" ON "public"."ai_providers" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_ai_providers_provider_name" ON "public"."ai_providers" USING "btree" ("provider_name");



CREATE INDEX IF NOT EXISTS "idx_ai_providers_type" ON "public"."ai_providers" USING "btree" ("type");



CREATE INDEX IF NOT EXISTS "idx_alpaca_stocks_name" ON "public"."f_stocks" USING "btree" ("name");



CREATE INDEX IF NOT EXISTS "idx_alpaca_stocks_symbol" ON "public"."f_stocks" USING "btree" ("lower"("symbol"));



CREATE INDEX IF NOT EXISTS "idx_alpaca_stocks_type" ON "public"."f_stocks" USING "btree" ("type");



CREATE INDEX IF NOT EXISTS "idx_alpaca_stocks_updated" ON "public"."f_stocks" USING "btree" ("updated_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_api_access_logs_created_at" ON "public"."api_access_logs" USING "btree" ("created_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_api_access_logs_endpoint_id" ON "public"."api_access_logs" USING "btree" ("endpoint_id");



CREATE INDEX IF NOT EXISTS "idx_api_endpoint_sources_data_source_id" ON "public"."api_endpoint_sources" USING "btree" ("data_source_id");



CREATE INDEX IF NOT EXISTS "idx_api_endpoint_sources_endpoint_id" ON "public"."api_endpoint_sources" USING "btree" ("endpoint_id");



CREATE INDEX IF NOT EXISTS "idx_api_endpoints_active" ON "public"."api_endpoints" USING "btree" ("active");



CREATE INDEX IF NOT EXISTS "idx_api_endpoints_is_draft" ON "public"."api_endpoints" USING "btree" ("is_draft");



CREATE INDEX IF NOT EXISTS "idx_api_endpoints_org" ON "public"."api_endpoints" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_api_endpoints_slug" ON "public"."api_endpoints" USING "btree" ("slug");



CREATE INDEX IF NOT EXISTS "idx_api_endpoints_target_apps" ON "public"."api_endpoints" USING "gin" ("target_apps");



CREATE INDEX IF NOT EXISTS "idx_api_endpoints_user_id" ON "public"."api_endpoints" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "idx_banner_schedules_active" ON "public"."banner_schedules" USING "btree" ("active");



CREATE INDEX IF NOT EXISTS "idx_banner_schedules_channel_ids" ON "public"."banner_schedules" USING "gin" ("channel_ids");



CREATE INDEX IF NOT EXISTS "idx_banner_schedules_dates" ON "public"."banner_schedules" USING "btree" ("start_date", "end_date");



CREATE INDEX IF NOT EXISTS "idx_banner_schedules_media_id" ON "public"."banner_schedules" USING "btree" ("media_id");



CREATE INDEX IF NOT EXISTS "idx_banner_schedules_org" ON "public"."banner_schedules" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_candidate_results_composite" ON "public"."e_candidate_results" USING "btree" ("race_result_id", "candidate_id");



CREATE INDEX IF NOT EXISTS "idx_candidate_results_override" ON "public"."e_candidate_results" USING "btree" ("override_at") WHERE ("override_at" IS NOT NULL);



CREATE INDEX IF NOT EXISTS "idx_candidate_results_race" ON "public"."e_candidate_results" USING "btree" ("race_result_id");



CREATE INDEX IF NOT EXISTS "idx_candidates_candidate_id" ON "public"."e_candidates" USING "btree" ("candidate_id");



CREATE INDEX IF NOT EXISTS "idx_channel_playlists_channel_id" ON "public"."channel_playlists" USING "btree" ("channel_id");



CREATE INDEX IF NOT EXISTS "idx_channel_playlists_org" ON "public"."channel_playlists" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_channels_content_id" ON "public"."channel_playlists" USING "btree" ("content_id");



CREATE INDEX IF NOT EXISTS "idx_channels_org" ON "public"."channels" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_content_bucket_config" ON "public"."content" USING "gin" ("bucket_config");



CREATE INDEX IF NOT EXISTS "idx_content_config" ON "public"."content" USING "gin" ("config");



CREATE INDEX IF NOT EXISTS "idx_content_data_source" ON "public"."content" USING "btree" ("data_source_id", "source_row_id");



CREATE INDEX IF NOT EXISTS "idx_content_org" ON "public"."content" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_content_type" ON "public"."content" USING "btree" ("type");



CREATE INDEX IF NOT EXISTS "idx_content_widget_type" ON "public"."content" USING "btree" ("widget_type");



CREATE UNIQUE INDEX IF NOT EXISTS "idx_customer_dashboard_unique" ON "public"."customer_dashboards" USING "btree" (COALESCE(("customer_id")::"text", 'global'::"text"), COALESCE(("deployment_id")::"text", 'default'::"text"), "dashboard_id", COALESCE("category", 'data'::"text"));



CREATE INDEX IF NOT EXISTS "idx_customer_dashboards_category" ON "public"."customer_dashboards" USING "btree" ("category");



CREATE INDEX IF NOT EXISTS "idx_customer_dashboards_org" ON "public"."customer_dashboards" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_data_providers_active" ON "public"."data_providers" USING "btree" ("is_active");



CREATE INDEX IF NOT EXISTS "idx_data_providers_category" ON "public"."data_providers" USING "btree" ("category");



CREATE INDEX IF NOT EXISTS "idx_data_providers_category_active" ON "public"."data_providers" USING "btree" ("category", "is_active");



CREATE INDEX IF NOT EXISTS "idx_data_providers_type" ON "public"."data_providers" USING "btree" ("type");



CREATE INDEX IF NOT EXISTS "idx_data_sources_active" ON "public"."data_sources" USING "btree" ("active");



CREATE INDEX IF NOT EXISTS "idx_data_sources_created_at" ON "public"."data_sources" USING "btree" ("created_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_data_sources_org" ON "public"."data_sources" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_data_sources_sync_enabled" ON "public"."data_sources" USING "btree" (((("sync_config" ->> 'enabled'::"text"))::boolean)) WHERE ((("sync_config" ->> 'enabled'::"text"))::boolean = true);



CREATE INDEX IF NOT EXISTS "idx_data_sources_type" ON "public"."data_sources" USING "btree" ("type");



CREATE INDEX IF NOT EXISTS "idx_data_sources_user_id" ON "public"."data_sources" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "idx_e_candidates_fulltext" ON "public"."e_candidates" USING "gin" ("to_tsvector"('"english"'::"regconfig", (((((((((COALESCE("first_name", ''::character varying))::"text" || ' '::"text") || (COALESCE("last_name", ''::character varying))::"text") || ' '::"text") || (COALESCE("full_name", ''::character varying))::"text") || ' '::"text") || (COALESCE("display_name", ''::character varying))::"text") || ' '::"text") || (COALESCE("short_name", ''::character varying))::"text")));



CREATE INDEX IF NOT EXISTS "idx_e_candidates_org" ON "public"."e_candidates" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_e_elections_org" ON "public"."e_elections" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_e_races_org" ON "public"."e_races" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_editorial_content_entity" ON "public"."e_election_editorial_content" USING "btree" ("entity_type", "entity_id");



CREATE INDEX IF NOT EXISTS "idx_editorial_content_status" ON "public"."e_election_editorial_content" USING "btree" ("status");



CREATE INDEX IF NOT EXISTS "idx_election_data_composite" ON "public"."e_races" USING "btree" ("type", "election_id");



CREATE INDEX IF NOT EXISTS "idx_election_data_sources_election" ON "public"."e_election_data_sources" USING "btree" ("election_id");



CREATE INDEX IF NOT EXISTS "idx_election_data_sources_provider" ON "public"."e_election_data_sources" USING "btree" ("provider", "election_id");



CREATE INDEX IF NOT EXISTS "idx_election_results_race_type" ON "public"."bop_election_results" USING "btree" ("race_type");



CREATE INDEX IF NOT EXISTS "idx_election_results_timestamp" ON "public"."bop_election_results" USING "btree" ("timestamp");



CREATE INDEX IF NOT EXISTS "idx_election_results_year" ON "public"."bop_election_results" USING "btree" ("election_year");



CREATE INDEX IF NOT EXISTS "idx_election_year_race" ON "public"."bop_election_results" USING "btree" ("election_year", "race_type");



CREATE INDEX IF NOT EXISTS "idx_elections_country" ON "public"."e_elections" USING "btree" ("country_id");



CREATE INDEX IF NOT EXISTS "idx_elections_date" ON "public"."e_elections" USING "btree" ("election_date");



CREATE INDEX IF NOT EXISTS "idx_elections_status" ON "public"."e_elections" USING "btree" ("status");



CREATE INDEX IF NOT EXISTS "idx_feeds_active" ON "public"."feeds" USING "btree" ("active");



CREATE INDEX IF NOT EXISTS "idx_feeds_category" ON "public"."feeds" USING "btree" ("category");



CREATE INDEX IF NOT EXISTS "idx_feeds_org" ON "public"."feeds" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_feeds_type" ON "public"."feeds" USING "btree" ("type");



CREATE INDEX IF NOT EXISTS "idx_geographic_divisions_country" ON "public"."e_geographic_divisions" USING "btree" ("country_id");



CREATE INDEX IF NOT EXISTS "idx_geographic_divisions_geometry" ON "public"."e_geographic_divisions" USING "gist" ("geometry");



CREATE INDEX IF NOT EXISTS "idx_geographic_divisions_parent" ON "public"."e_geographic_divisions" USING "btree" ("parent_division_id");



CREATE INDEX IF NOT EXISTS "idx_gfx_animations_element" ON "public"."gfx_animations" USING "btree" ("element_id");



CREATE INDEX IF NOT EXISTS "idx_gfx_animations_template" ON "public"."gfx_animations" USING "btree" ("template_id");



CREATE INDEX IF NOT EXISTS "idx_gfx_bindings_template" ON "public"."gfx_bindings" USING "btree" ("template_id");



CREATE INDEX IF NOT EXISTS "idx_gfx_chat_history_project" ON "public"."gfx_chat_history" USING "btree" ("project_id");



CREATE INDEX IF NOT EXISTS "idx_gfx_chat_messages_project" ON "public"."gfx_chat_messages" USING "btree" ("project_id");



CREATE INDEX IF NOT EXISTS "idx_gfx_elements_template" ON "public"."gfx_elements" USING "btree" ("template_id");



CREATE INDEX IF NOT EXISTS "idx_gfx_keyframes_animation" ON "public"."gfx_keyframes" USING "btree" ("animation_id");



CREATE INDEX IF NOT EXISTS "idx_gfx_layers_project" ON "public"."gfx_layers" USING "btree" ("project_id");



CREATE INDEX IF NOT EXISTS "idx_gfx_playback_commands_project" ON "public"."gfx_playback_commands" USING "btree" ("project_id");



CREATE INDEX IF NOT EXISTS "idx_gfx_playback_state_project" ON "public"."gfx_playback_state" USING "btree" ("project_id");



CREATE INDEX IF NOT EXISTS "idx_gfx_projects_org" ON "public"."gfx_projects" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_gfx_projects_slug" ON "public"."gfx_projects" USING "btree" ("slug");



CREATE INDEX IF NOT EXISTS "idx_gfx_templates_data_source_id" ON "public"."gfx_templates" USING "btree" ("data_source_id");



CREATE INDEX IF NOT EXISTS "idx_gfx_templates_layer" ON "public"."gfx_templates" USING "btree" ("layer_id");



CREATE INDEX IF NOT EXISTS "idx_gfx_templates_project" ON "public"."gfx_templates" USING "btree" ("project_id");



CREATE INDEX IF NOT EXISTS "idx_ingestion_log_created" ON "public"."e_election_data_ingestion_log" USING "btree" ("created_at");



CREATE INDEX IF NOT EXISTS "idx_ingestion_log_source" ON "public"."e_election_data_ingestion_log" USING "btree" ("election_data_source_id");



CREATE INDEX IF NOT EXISTS "idx_map_settings_updated_at" ON "public"."map_settings" USING "btree" ("updated_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_map_settings_user_id" ON "public"."map_settings" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "idx_media_assets_entity" ON "public"."e_media_assets" USING "btree" ("entity_type", "entity_id");



CREATE INDEX IF NOT EXISTS "idx_media_assets_location" ON "public"."media_assets" USING "btree" ("latitude", "longitude") WHERE (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL));



CREATE INDEX IF NOT EXISTS "idx_media_assets_primary" ON "public"."e_media_assets" USING "btree" ("entity_type", "entity_id", "is_primary") WHERE ("is_primary" = true);



CREATE INDEX IF NOT EXISTS "idx_media_assets_tags" ON "public"."media_assets" USING "gin" ("tags");



CREATE INDEX IF NOT EXISTS "idx_media_assets_type" ON "public"."media_assets" USING "btree" ("media_type");



CREATE INDEX IF NOT EXISTS "idx_media_distribution_media_id" ON "public"."media_distribution" USING "btree" ("media_id");



CREATE INDEX IF NOT EXISTS "idx_media_distribution_status" ON "public"."media_distribution" USING "btree" ("status");



CREATE INDEX IF NOT EXISTS "idx_media_distribution_system_id" ON "public"."media_distribution" USING "btree" ("system_id");



CREATE INDEX IF NOT EXISTS "idx_news_articles_category" ON "public"."news_articles" USING "btree" ("category");



CREATE INDEX IF NOT EXISTS "idx_news_articles_country" ON "public"."news_articles" USING "btree" ("country");



CREATE INDEX IF NOT EXISTS "idx_news_articles_fetched_at" ON "public"."news_articles" USING "btree" ("fetched_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_news_articles_language" ON "public"."news_articles" USING "btree" ("language");



CREATE INDEX IF NOT EXISTS "idx_news_articles_org" ON "public"."news_articles" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_news_articles_provider" ON "public"."news_articles" USING "btree" ("provider");



CREATE UNIQUE INDEX IF NOT EXISTS "idx_news_articles_provider_url" ON "public"."news_articles" USING "btree" ("provider", "url");



CREATE INDEX IF NOT EXISTS "idx_news_articles_published_at" ON "public"."news_articles" USING "btree" ("published_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_news_clusters_category" ON "public"."news_clusters" USING "btree" ("category");



CREATE INDEX IF NOT EXISTS "idx_news_clusters_created_at" ON "public"."news_clusters" USING "btree" ("created_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_news_clusters_search" ON "public"."news_clusters" USING "gin" ("to_tsvector"('"english"'::"regconfig", ((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("description", ''::"text"))));



CREATE INDEX IF NOT EXISTS "idx_news_clusters_sentiment" ON "public"."news_clusters" USING "btree" ("sentiment");



CREATE INDEX IF NOT EXISTS "idx_org_textures_created_at" ON "public"."organization_textures" USING "btree" ("created_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_org_textures_media_type" ON "public"."organization_textures" USING "btree" ("media_type");



CREATE INDEX IF NOT EXISTS "idx_org_textures_name" ON "public"."organization_textures" USING "btree" ("name");



CREATE INDEX IF NOT EXISTS "idx_org_textures_org_id" ON "public"."organization_textures" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_org_textures_tags" ON "public"."organization_textures" USING "gin" ("tags");



CREATE INDEX IF NOT EXISTS "idx_overrides_log_created" ON "public"."e_election_data_overrides_log" USING "btree" ("created_at");



CREATE INDEX IF NOT EXISTS "idx_overrides_log_record" ON "public"."e_election_data_overrides_log" USING "btree" ("table_name", "record_id");



CREATE INDEX IF NOT EXISTS "idx_parties_active" ON "public"."e_parties" USING "btree" ("active") WHERE ("active" = true);



CREATE INDEX IF NOT EXISTS "idx_parties_country" ON "public"."e_parties" USING "btree" ("country_id");



CREATE INDEX IF NOT EXISTS "idx_parties_featured" ON "public"."e_parties" USING "btree" ("featured") WHERE ("featured" = true);



CREATE INDEX IF NOT EXISTS "idx_party_results_election_id" ON "public"."bop_party_results" USING "btree" ("election_result_id");



CREATE INDEX IF NOT EXISTS "idx_party_results_party" ON "public"."bop_party_results" USING "btree" ("party_name");



CREATE INDEX IF NOT EXISTS "idx_playout_log_active" ON "public"."pulsar_playout_log" USING "btree" ("channel_id", "layer_index") WHERE ("ended_at" IS NULL);



CREATE INDEX IF NOT EXISTS "idx_playout_log_channel_time" ON "public"."pulsar_playout_log" USING "btree" ("channel_id", "started_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_playout_log_operator" ON "public"."pulsar_playout_log" USING "btree" ("operator_id", "started_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_playout_log_org_time" ON "public"."pulsar_playout_log" USING "btree" ("organization_id", "started_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_playout_log_page" ON "public"."pulsar_playout_log" USING "btree" ("page_id", "started_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_playout_log_template" ON "public"."pulsar_playout_log" USING "btree" ("template_id", "started_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_pulsar_channel_state_channel" ON "public"."pulsar_channel_state" USING "btree" ("channel_id");



CREATE INDEX IF NOT EXISTS "idx_pulsar_channels_org" ON "public"."pulsar_channels" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_pulsar_command_log_channel" ON "public"."pulsar_command_log" USING "btree" ("channel_id", "executed_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_pulsar_commands_project_id" ON "public"."pulsar_commands" USING "btree" ("project_id");



CREATE INDEX IF NOT EXISTS "idx_pulsar_custom_ui_controls_ui" ON "public"."pulsar_custom_ui_controls" USING "btree" ("custom_ui_id");



CREATE INDEX IF NOT EXISTS "idx_pulsar_custom_uis_org" ON "public"."pulsar_custom_uis" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_pulsar_page_groups_playlist" ON "public"."pulsar_page_groups" USING "btree" ("playlist_id");



CREATE INDEX IF NOT EXISTS "idx_pulsar_page_library_project" ON "public"."pulsar_page_library" USING "btree" ("project_id");



CREATE INDEX IF NOT EXISTS "idx_pulsar_page_library_template" ON "public"."pulsar_page_library" USING "btree" ("template_id");



CREATE INDEX IF NOT EXISTS "idx_pulsar_pages_channel" ON "public"."pulsar_pages" USING "btree" ("channel_id");



CREATE INDEX IF NOT EXISTS "idx_pulsar_pages_group" ON "public"."pulsar_pages" USING "btree" ("page_group_id");



CREATE INDEX IF NOT EXISTS "idx_pulsar_pages_playlist" ON "public"."pulsar_pages" USING "btree" ("playlist_id");



CREATE INDEX IF NOT EXISTS "idx_pulsar_pages_template" ON "public"."pulsar_pages" USING "btree" ("template_id");



CREATE INDEX IF NOT EXISTS "idx_pulsar_playlists_channel" ON "public"."pulsar_playlists" USING "btree" ("channel_id");



CREATE INDEX IF NOT EXISTS "idx_pulsar_playlists_org" ON "public"."pulsar_playlists" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_pulsar_playout_log_channel" ON "public"."pulsar_playout_log" USING "btree" ("channel_id", "created_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_pulsar_projects_is_active" ON "public"."pulsarvs_projects" USING "btree" ("is_active");



CREATE INDEX IF NOT EXISTS "idx_pulsar_projects_user_id" ON "public"."pulsarvs_projects" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "idx_pulsarvs_playlist_items_channel" ON "public"."pulsarvs_playlist_items" USING "btree" ("channel_id");



CREATE INDEX IF NOT EXISTS "idx_pulsarvs_playlist_items_parent" ON "public"."pulsarvs_playlist_items" USING "btree" ("parent_item_id");



CREATE INDEX IF NOT EXISTS "idx_pulsarvs_playlist_items_playlist" ON "public"."pulsarvs_playlist_items" USING "btree" ("playlist_id");



CREATE INDEX IF NOT EXISTS "idx_pulsarvs_playlist_items_sort" ON "public"."pulsarvs_playlist_items" USING "btree" ("playlist_id", "sort_order");



CREATE INDEX IF NOT EXISTS "idx_pulsarvs_playlists_project" ON "public"."pulsarvs_playlists" USING "btree" ("project_id");



CREATE INDEX IF NOT EXISTS "idx_race_results_composite" ON "public"."e_race_results" USING "btree" ("race_id", "division_id", "reporting_level");



CREATE INDEX IF NOT EXISTS "idx_race_results_division" ON "public"."e_race_results" USING "btree" ("division_id");



CREATE INDEX IF NOT EXISTS "idx_race_results_override" ON "public"."e_race_results" USING "btree" ("override_at") WHERE ("override_at" IS NOT NULL);



CREATE INDEX IF NOT EXISTS "idx_race_results_race" ON "public"."e_race_results" USING "btree" ("race_id");



CREATE INDEX IF NOT EXISTS "idx_race_results_updated" ON "public"."e_race_results" USING "btree" ("last_updated");



CREATE INDEX IF NOT EXISTS "idx_races_division" ON "public"."e_races" USING "btree" ("division_id");



CREATE INDEX IF NOT EXISTS "idx_races_election" ON "public"."e_races" USING "btree" ("election_id");



CREATE INDEX IF NOT EXISTS "idx_races_priority" ON "public"."e_races" USING "btree" ("priority_level");



CREATE INDEX IF NOT EXISTS "idx_races_race_id" ON "public"."e_races" USING "btree" ("race_id");



CREATE INDEX IF NOT EXISTS "idx_school_closings_org" ON "public"."school_closings" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_sponsor_schedules_active" ON "public"."sponsor_schedules" USING "btree" ("active");



CREATE INDEX IF NOT EXISTS "idx_sponsor_schedules_category" ON "public"."sponsor_schedules" USING "btree" ("category");



CREATE INDEX IF NOT EXISTS "idx_sponsor_schedules_channel_id" ON "public"."sponsor_schedules" USING "btree" ("channel_id");



CREATE INDEX IF NOT EXISTS "idx_sponsor_schedules_channel_ids" ON "public"."sponsor_schedules" USING "gin" ("channel_ids");



CREATE INDEX IF NOT EXISTS "idx_sponsor_schedules_dates" ON "public"."sponsor_schedules" USING "btree" ("start_date", "end_date");



CREATE INDEX IF NOT EXISTS "idx_sponsor_schedules_is_default" ON "public"."sponsor_schedules" USING "btree" ("is_default");



CREATE INDEX IF NOT EXISTS "idx_sponsor_schedules_media_id" ON "public"."sponsor_schedules" USING "btree" ("media_id");



CREATE INDEX IF NOT EXISTS "idx_sponsor_schedules_org" ON "public"."sponsor_schedules" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_sports_categories_country_code" ON "public"."sports_categories" USING "btree" ("country_code");



CREATE INDEX IF NOT EXISTS "idx_sports_categories_sportradar_id" ON "public"."sports_categories" USING "btree" ("sportradar_id");



CREATE INDEX IF NOT EXISTS "idx_sports_events_away_team_id" ON "public"."sports_events" USING "btree" ("away_team_id");



CREATE INDEX IF NOT EXISTS "idx_sports_events_home_team_id" ON "public"."sports_events" USING "btree" ("home_team_id");



CREATE INDEX IF NOT EXISTS "idx_sports_events_round" ON "public"."sports_events" USING "btree" ("season_id", "round_number");



CREATE INDEX IF NOT EXISTS "idx_sports_events_season_id" ON "public"."sports_events" USING "btree" ("season_id");



CREATE INDEX IF NOT EXISTS "idx_sports_events_sportradar_id" ON "public"."sports_events" USING "btree" ("sportradar_id");



CREATE INDEX IF NOT EXISTS "idx_sports_events_start_time" ON "public"."sports_events" USING "btree" ("start_time");



CREATE INDEX IF NOT EXISTS "idx_sports_events_status" ON "public"."sports_events" USING "btree" ("status");



CREATE INDEX IF NOT EXISTS "idx_sports_leagues_active" ON "public"."sports_leagues" USING "btree" ("active");



CREATE INDEX IF NOT EXISTS "idx_sports_leagues_category_id" ON "public"."sports_leagues" USING "btree" ("category_id");



CREATE INDEX IF NOT EXISTS "idx_sports_leagues_sport" ON "public"."sports_leagues" USING "btree" ("sport");



CREATE INDEX IF NOT EXISTS "idx_sports_leagues_sportradar_id" ON "public"."sports_leagues" USING "btree" ("sportradar_id");



CREATE INDEX IF NOT EXISTS "idx_sports_lineups_event_id" ON "public"."sports_lineups" USING "btree" ("event_id");



CREATE INDEX IF NOT EXISTS "idx_sports_lineups_player_id" ON "public"."sports_lineups" USING "btree" ("player_id");



CREATE INDEX IF NOT EXISTS "idx_sports_lineups_team_id" ON "public"."sports_lineups" USING "btree" ("team_id");



CREATE INDEX IF NOT EXISTS "idx_sports_match_odds_event_id" ON "public"."sports_match_odds" USING "btree" ("event_id");



CREATE INDEX IF NOT EXISTS "idx_sports_match_odds_is_live" ON "public"."sports_match_odds" USING "btree" ("is_live");



CREATE INDEX IF NOT EXISTS "idx_sports_outright_odds_season_id" ON "public"."sports_outright_odds" USING "btree" ("season_id");



CREATE INDEX IF NOT EXISTS "idx_sports_outright_odds_team_id" ON "public"."sports_outright_odds" USING "btree" ("team_id");



CREATE INDEX IF NOT EXISTS "idx_sports_player_odds_player_id" ON "public"."sports_player_odds" USING "btree" ("player_id");



CREATE INDEX IF NOT EXISTS "idx_sports_player_odds_season_id" ON "public"."sports_player_odds" USING "btree" ("season_id");



CREATE INDEX IF NOT EXISTS "idx_sports_player_stats_goals" ON "public"."sports_player_stats" USING "btree" ("season_id", "goals" DESC);



CREATE INDEX IF NOT EXISTS "idx_sports_player_stats_player_id" ON "public"."sports_player_stats" USING "btree" ("player_id");



CREATE INDEX IF NOT EXISTS "idx_sports_player_stats_season_id" ON "public"."sports_player_stats" USING "btree" ("season_id");



CREATE INDEX IF NOT EXISTS "idx_sports_player_stats_team_id" ON "public"."sports_player_stats" USING "btree" ("team_id");



CREATE INDEX IF NOT EXISTS "idx_sports_players_name" ON "public"."sports_players" USING "btree" ("name");



CREATE INDEX IF NOT EXISTS "idx_sports_players_sportradar_id" ON "public"."sports_players" USING "btree" ("sportradar_id");



CREATE INDEX IF NOT EXISTS "idx_sports_players_team_id" ON "public"."sports_players" USING "btree" ("team_id");



CREATE INDEX IF NOT EXISTS "idx_sports_season_teams_season_id" ON "public"."sports_season_teams" USING "btree" ("season_id");



CREATE INDEX IF NOT EXISTS "idx_sports_season_teams_team_id" ON "public"."sports_season_teams" USING "btree" ("team_id");



CREATE INDEX IF NOT EXISTS "idx_sports_seasons_dates" ON "public"."sports_seasons" USING "btree" ("start_date", "end_date");



CREATE INDEX IF NOT EXISTS "idx_sports_seasons_is_current" ON "public"."sports_seasons" USING "btree" ("is_current");



CREATE INDEX IF NOT EXISTS "idx_sports_seasons_league_id" ON "public"."sports_seasons" USING "btree" ("league_id");



CREATE INDEX IF NOT EXISTS "idx_sports_seasons_sportradar_id" ON "public"."sports_seasons" USING "btree" ("sportradar_id");



CREATE INDEX IF NOT EXISTS "idx_sports_standings_rank" ON "public"."sports_standings" USING "btree" ("season_id", "rank");



CREATE INDEX IF NOT EXISTS "idx_sports_standings_season_id" ON "public"."sports_standings" USING "btree" ("season_id");



CREATE INDEX IF NOT EXISTS "idx_sports_standings_team_id" ON "public"."sports_standings" USING "btree" ("team_id");



CREATE INDEX IF NOT EXISTS "idx_sports_team_stats_season_id" ON "public"."sports_team_stats" USING "btree" ("season_id");



CREATE INDEX IF NOT EXISTS "idx_sports_team_stats_team_id" ON "public"."sports_team_stats" USING "btree" ("team_id");



CREATE INDEX IF NOT EXISTS "idx_sports_teams_abbreviation" ON "public"."sports_teams" USING "btree" ("abbreviation");



CREATE INDEX IF NOT EXISTS "idx_sports_teams_country_code" ON "public"."sports_teams" USING "btree" ("country_code");



CREATE INDEX IF NOT EXISTS "idx_sports_teams_name" ON "public"."sports_teams" USING "btree" ("name");



CREATE INDEX IF NOT EXISTS "idx_sports_teams_sportradar_id" ON "public"."sports_teams" USING "btree" ("sportradar_id");



CREATE INDEX IF NOT EXISTS "idx_sports_teams_venue_id" ON "public"."sports_teams" USING "btree" ("venue_id");



CREATE INDEX IF NOT EXISTS "idx_sports_venues_city" ON "public"."sports_venues" USING "btree" ("city");



CREATE INDEX IF NOT EXISTS "idx_sports_venues_country" ON "public"."sports_venues" USING "btree" ("country");



CREATE INDEX IF NOT EXISTS "idx_sports_venues_sportradar_id" ON "public"."sports_venues" USING "btree" ("sportradar_id");



CREATE INDEX IF NOT EXISTS "idx_sync_queue_pending" ON "public"."sync_queue" USING "btree" ("status", "priority" DESC, "created_at") WHERE ("status" = 'pending'::"text");



CREATE UNIQUE INDEX IF NOT EXISTS "idx_sync_queue_unique_pending" ON "public"."sync_queue" USING "btree" ("data_source_id") WHERE ("status" = ANY (ARRAY['pending'::"text", 'processing'::"text"]));



CREATE INDEX IF NOT EXISTS "idx_synthetic_groups_created_by" ON "public"."e_synthetic_groups" USING "btree" ("created_by");



CREATE INDEX IF NOT EXISTS "idx_synthetic_groups_name" ON "public"."e_synthetic_groups" USING "btree" ("name");



CREATE INDEX IF NOT EXISTS "idx_synthetic_races_group" ON "public"."e_synthetic_races" USING "btree" ("synthetic_group_id");



CREATE INDEX IF NOT EXISTS "idx_systems_type" ON "public"."systems" USING "btree" ("system_type");



CREATE INDEX IF NOT EXISTS "idx_template_forms_template_id" ON "public"."template_forms" USING "btree" ("template_id");



CREATE INDEX IF NOT EXISTS "idx_template_forms_template_id_schema" ON "public"."template_forms" USING "btree" ("template_id", (("schema" ->> 'id'::"text")));



CREATE INDEX IF NOT EXISTS "idx_template_settings_template_id" ON "public"."template_settings" USING "btree" ("template_id");



CREATE INDEX IF NOT EXISTS "idx_templates_carousel_name" ON "public"."templates" USING "btree" ("carousel_name");



CREATE UNIQUE INDEX IF NOT EXISTS "idx_templates_default_per_user" ON "public"."templates" USING "btree" ("user_id") WHERE ("is_default" = true);



CREATE INDEX IF NOT EXISTS "idx_templates_is_favorite" ON "public"."templates" USING "btree" ("is_favorite") WHERE ("is_favorite" = true);



CREATE INDEX IF NOT EXISTS "idx_templates_org" ON "public"."templates" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_u_audit_log_app_key" ON "public"."u_audit_log" USING "btree" ("app_key");



CREATE INDEX IF NOT EXISTS "idx_u_audit_log_created" ON "public"."u_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_u_audit_log_resource" ON "public"."u_audit_log" USING "btree" ("resource_type", "resource_id");



CREATE INDEX IF NOT EXISTS "idx_u_audit_log_user" ON "public"."u_audit_log" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "idx_u_channel_access_channel_id" ON "public"."u_channel_access" USING "btree" ("channel_id");



CREATE INDEX IF NOT EXISTS "idx_u_channel_access_user_id" ON "public"."u_channel_access" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "idx_u_group_members_group_id" ON "public"."u_group_members" USING "btree" ("group_id");



CREATE INDEX IF NOT EXISTS "idx_u_group_members_user_id" ON "public"."u_group_members" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "idx_u_group_permissions_group_id" ON "public"."u_group_permissions" USING "btree" ("group_id");



CREATE INDEX IF NOT EXISTS "idx_u_invitations_email" ON "public"."u_invitations" USING "btree" ("email");



CREATE INDEX IF NOT EXISTS "idx_u_invitations_org" ON "public"."u_invitations" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_u_invitations_token" ON "public"."u_invitations" USING "btree" ("token") WHERE ("accepted_at" IS NULL);



CREATE INDEX IF NOT EXISTS "idx_u_organizations_slug" ON "public"."u_organizations" USING "btree" ("slug");



CREATE INDEX IF NOT EXISTS "idx_u_page_settings_app_key" ON "public"."u_page_settings" USING "btree" ("app_key");



CREATE INDEX IF NOT EXISTS "idx_u_permissions_app_key" ON "public"."u_permissions" USING "btree" ("app_key");



CREATE INDEX IF NOT EXISTS "idx_u_user_permissions_user_id" ON "public"."u_user_permissions" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "idx_u_users_auth_user_id" ON "public"."u_users" USING "btree" ("auth_user_id");



CREATE INDEX IF NOT EXISTS "idx_u_users_email" ON "public"."u_users" USING "btree" ("email");



CREATE INDEX IF NOT EXISTS "idx_u_users_organization_id" ON "public"."u_users" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_u_users_status" ON "public"."u_users" USING "btree" ("status");



CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_pending_sync" ON "public"."sync_queue" USING "btree" ("data_source_id") WHERE ("status" = ANY (ARRAY['pending'::"text", 'processing'::"text"]));



CREATE INDEX IF NOT EXISTS "idx_vs_content_created_at" ON "public"."vs_content" USING "btree" ("created_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_vs_content_folder" ON "public"."vs_content" USING "btree" ("folder_id");



CREATE INDEX IF NOT EXISTS "idx_vs_content_folders_parent" ON "public"."vs_content_folders" USING "btree" ("parent_id");



CREATE INDEX IF NOT EXISTS "idx_vs_content_folders_project_id" ON "public"."vs_content_folders" USING "btree" ("project_id");



CREATE INDEX IF NOT EXISTS "idx_vs_content_folders_user" ON "public"."vs_content_folders" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "idx_vs_content_is_public" ON "public"."vs_content" USING "btree" ("is_public");



CREATE INDEX IF NOT EXISTS "idx_vs_content_project_id" ON "public"."vs_content" USING "btree" ("project_id");



CREATE INDEX IF NOT EXISTS "idx_vs_content_tags" ON "public"."vs_content" USING "gin" ("tags");



CREATE INDEX IF NOT EXISTS "idx_vs_content_user_id" ON "public"."vs_content" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "idx_weather_air_quality_as_of" ON "public"."weather_air_quality" USING "btree" ("as_of" DESC);



CREATE INDEX IF NOT EXISTS "idx_weather_air_quality_location" ON "public"."weather_air_quality" USING "btree" ("location_id");



CREATE INDEX IF NOT EXISTS "idx_weather_alerts_active" ON "public"."weather_alerts" USING "btree" ("start_time", "end_time");



CREATE INDEX IF NOT EXISTS "idx_weather_alerts_fetched" ON "public"."weather_alerts" USING "btree" ("fetched_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_weather_alerts_location" ON "public"."weather_alerts" USING "btree" ("location_id");



CREATE INDEX IF NOT EXISTS "idx_weather_alerts_location_alert" ON "public"."weather_alerts" USING "btree" ("location_id", "alert_id");



CREATE INDEX IF NOT EXISTS "idx_weather_alerts_severity" ON "public"."weather_alerts" USING "btree" ("severity");



CREATE INDEX IF NOT EXISTS "idx_weather_current_as_of" ON "public"."weather_current" USING "btree" ("as_of" DESC);



CREATE INDEX IF NOT EXISTS "idx_weather_current_fetched_at" ON "public"."weather_current" USING "btree" ("fetched_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_weather_current_location" ON "public"."weather_current" USING "btree" ("location_id");



CREATE INDEX IF NOT EXISTS "idx_weather_daily_date" ON "public"."weather_daily_forecast" USING "btree" ("forecast_date");



CREATE INDEX IF NOT EXISTS "idx_weather_daily_fetched" ON "public"."weather_daily_forecast" USING "btree" ("fetched_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_weather_daily_location" ON "public"."weather_daily_forecast" USING "btree" ("location_id");



CREATE INDEX IF NOT EXISTS "idx_weather_hourly_fetched" ON "public"."weather_hourly_forecast" USING "btree" ("fetched_at" DESC);



CREATE INDEX IF NOT EXISTS "idx_weather_hourly_location" ON "public"."weather_hourly_forecast" USING "btree" ("location_id");



CREATE INDEX IF NOT EXISTS "idx_weather_hourly_time" ON "public"."weather_hourly_forecast" USING "btree" ("forecast_time");



CREATE INDEX IF NOT EXISTS "idx_weather_location_channels_channel_id" ON "public"."weather_location_channels" USING "btree" ("channel_id");



CREATE INDEX IF NOT EXISTS "idx_weather_location_channels_location_id" ON "public"."weather_location_channels" USING "btree" ("location_id");



CREATE INDEX IF NOT EXISTS "idx_weather_locations_active" ON "public"."weather_locations" USING "btree" ("is_active");



CREATE INDEX IF NOT EXISTS "idx_weather_locations_channel_id" ON "public"."weather_locations" USING "btree" ("channel_id");



CREATE INDEX IF NOT EXISTS "idx_weather_locations_country" ON "public"."weather_locations" USING "btree" ("country");



CREATE INDEX IF NOT EXISTS "idx_weather_locations_custom_name" ON "public"."weather_locations" USING "btree" ("custom_name") WHERE ("custom_name" IS NOT NULL);



CREATE INDEX IF NOT EXISTS "idx_weather_locations_org" ON "public"."weather_locations" USING "btree" ("organization_id");



CREATE INDEX IF NOT EXISTS "idx_weather_locations_provider_id" ON "public"."weather_locations" USING "btree" ("provider_id");



CREATE INDEX IF NOT EXISTS "item_tabfields_content_id_idx" ON "public"."item_tabfields" USING "btree" ("item_id");



CREATE INDEX IF NOT EXISTS "kv_store_7eabc66c_key_idx" ON "public"."kv_store_7eabc66c" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX IF NOT EXISTS "kv_store_7eabc66c_key_idx1" ON "public"."kv_store_7eabc66c" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX IF NOT EXISTS "kv_store_7eabc66c_key_idx2" ON "public"."kv_store_7eabc66c" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX IF NOT EXISTS "kv_store_7eabc66c_key_idx3" ON "public"."kv_store_7eabc66c" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX IF NOT EXISTS "map_settings_user_id_idx" ON "public"."map_settings" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "tabfields_template_id_idx" ON "public"."tabfields" USING "btree" ("template_id");



CREATE INDEX IF NOT EXISTS "tabfields_user_id_idx" ON "public"."tabfields" USING "btree" ("user_id");



CREATE INDEX IF NOT EXISTS "templates_order_idx" ON "public"."templates" USING "btree" ("order");



CREATE INDEX IF NOT EXISTS "templates_parent_id_idx" ON "public"."templates" USING "btree" ("parent_id");



CREATE INDEX IF NOT EXISTS "templates_user_id_idx" ON "public"."templates" USING "btree" ("user_id");



CREATE UNIQUE INDEX IF NOT EXISTS "u_users_single_superuser" ON "public"."u_users" USING "btree" ((true)) WHERE ("is_superuser" = true);



CREATE OR REPLACE TRIGGER "ai_providers_updated_at_trigger" BEFORE UPDATE ON "public"."ai_providers" FOR EACH ROW EXECUTE FUNCTION "public"."update_ai_providers_updated_at"();



CREATE OR REPLACE TRIGGER "audit_channel_playlists" AFTER INSERT OR DELETE OR UPDATE ON "public"."channel_playlists" FOR EACH ROW EXECUTE FUNCTION "public"."u_audit_trigger"('pulsar');



CREATE OR REPLACE TRIGGER "audit_channels" AFTER INSERT OR DELETE OR UPDATE ON "public"."channels" FOR EACH ROW EXECUTE FUNCTION "public"."u_audit_trigger"('nova');



CREATE OR REPLACE TRIGGER "audit_content" AFTER INSERT OR DELETE OR UPDATE ON "public"."content" FOR EACH ROW EXECUTE FUNCTION "public"."u_audit_trigger"('pulsar');



CREATE OR REPLACE TRIGGER "audit_data_sources" AFTER INSERT OR DELETE OR UPDATE ON "public"."data_sources" FOR EACH ROW EXECUTE FUNCTION "public"."u_audit_trigger"('pulsar');



CREATE OR REPLACE TRIGGER "audit_e_candidate_results" AFTER INSERT OR DELETE OR UPDATE ON "public"."e_candidate_results" FOR EACH ROW EXECUTE FUNCTION "public"."u_audit_trigger"('nova');



CREATE OR REPLACE TRIGGER "audit_e_race_results" AFTER INSERT OR DELETE OR UPDATE ON "public"."e_race_results" FOR EACH ROW EXECUTE FUNCTION "public"."u_audit_trigger"('nova');



CREATE OR REPLACE TRIGGER "audit_media_assets" AFTER INSERT OR DELETE OR UPDATE ON "public"."media_assets" FOR EACH ROW EXECUTE FUNCTION "public"."u_audit_trigger"('nova');



CREATE OR REPLACE TRIGGER "audit_templates" AFTER INSERT OR DELETE OR UPDATE ON "public"."templates" FOR EACH ROW EXECUTE FUNCTION "public"."u_audit_trigger"('pulsar');



CREATE OR REPLACE TRIGGER "audit_u_group_members" AFTER INSERT OR DELETE OR UPDATE ON "public"."u_group_members" FOR EACH ROW EXECUTE FUNCTION "public"."u_audit_trigger"('system');



CREATE OR REPLACE TRIGGER "audit_u_groups" AFTER INSERT OR DELETE OR UPDATE ON "public"."u_groups" FOR EACH ROW EXECUTE FUNCTION "public"."u_audit_trigger"('system');



CREATE OR REPLACE TRIGGER "audit_u_invitations" AFTER INSERT OR DELETE OR UPDATE ON "public"."u_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."u_audit_trigger"('system');



CREATE OR REPLACE TRIGGER "audit_u_organizations" AFTER INSERT OR DELETE OR UPDATE ON "public"."u_organizations" FOR EACH ROW EXECUTE FUNCTION "public"."u_audit_trigger"('system');



CREATE OR REPLACE TRIGGER "audit_u_users" AFTER INSERT OR DELETE OR UPDATE ON "public"."u_users" FOR EACH ROW EXECUTE FUNCTION "public"."u_audit_trigger"('system');



CREATE OR REPLACE TRIGGER "channels_updated_at" BEFORE UPDATE ON "public"."channels" FOR EACH ROW EXECUTE FUNCTION "public"."update_channels_updated_at"();



CREATE OR REPLACE TRIGGER "channels_updated_at_trigger" BEFORE UPDATE ON "public"."channels" FOR EACH ROW EXECUTE FUNCTION "public"."update_channels_updated_at"();



CREATE OR REPLACE TRIGGER "ensure_single_default_sponsor_per_category" BEFORE INSERT OR UPDATE OF "is_default", "category" ON "public"."sponsor_schedules" FOR EACH ROW WHEN (("new"."is_default" = true)) EXECUTE FUNCTION "public"."ensure_single_default_sponsor_per_category"();



CREATE OR REPLACE TRIGGER "ensure_template_forms_schema_not_null" BEFORE INSERT OR UPDATE ON "public"."template_forms" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_schema_not_null"();



CREATE OR REPLACE TRIGGER "log_candidate_results_overrides" AFTER UPDATE ON "public"."e_candidate_results" FOR EACH ROW WHEN ((("old"."votes_override" IS DISTINCT FROM "new"."votes_override") OR ("old"."vote_percentage_override" IS DISTINCT FROM "new"."vote_percentage_override") OR ("old"."electoral_votes_override" IS DISTINCT FROM "new"."electoral_votes_override") OR ("old"."winner_override" IS DISTINCT FROM "new"."winner_override"))) EXECUTE FUNCTION "public"."e_log_override_change"();



CREATE OR REPLACE TRIGGER "log_race_results_overrides" AFTER UPDATE ON "public"."e_race_results" FOR EACH ROW WHEN ((("old"."precincts_reporting_override" IS DISTINCT FROM "new"."precincts_reporting_override") OR ("old"."precincts_total_override" IS DISTINCT FROM "new"."precincts_total_override") OR ("old"."percent_reporting_override" IS DISTINCT FROM "new"."percent_reporting_override") OR ("old"."total_votes_override" IS DISTINCT FROM "new"."total_votes_override") OR ("old"."called_override" IS DISTINCT FROM "new"."called_override") OR (("old"."called_status_override")::"text" IS DISTINCT FROM ("new"."called_status_override")::"text") OR ("old"."winner_override_candidate_id" IS DISTINCT FROM "new"."winner_override_candidate_id"))) EXECUTE FUNCTION "public"."e_log_override_change"();



CREATE OR REPLACE TRIGGER "news_articles_updated_at" BEFORE UPDATE ON "public"."news_articles" FOR EACH ROW EXECUTE FUNCTION "public"."update_news_articles_updated_at"();



CREATE OR REPLACE TRIGGER "on_pulsar_channel_created" AFTER INSERT ON "public"."pulsar_channels" FOR EACH ROW EXECUTE FUNCTION "public"."create_pulsar_channel_state"();



CREATE OR REPLACE TRIGGER "pulsarvs_playlist_items_updated_at" BEFORE UPDATE ON "public"."pulsarvs_playlist_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_pulsarvs_updated_at"();



CREATE OR REPLACE TRIGGER "pulsarvs_playlists_updated_at" BEFORE UPDATE ON "public"."pulsarvs_playlists" FOR EACH ROW EXECUTE FUNCTION "public"."update_pulsarvs_updated_at"();



CREATE OR REPLACE TRIGGER "queue_ready_trigger" AFTER UPDATE ON "public"."file_sync_queue" FOR EACH ROW WHEN ((("old"."status" = 'pending'::"text") AND ("new"."status" = 'ready'::"text"))) EXECUTE FUNCTION "public"."notify_edge_function"();



CREATE OR REPLACE TRIGGER "set_next_sync_at" BEFORE INSERT OR UPDATE ON "public"."data_sources" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_next_sync_at"();



CREATE OR REPLACE TRIGGER "shift_order_on_delete" AFTER DELETE ON "public"."channel_playlists" FOR EACH ROW EXECUTE FUNCTION "public"."shift_order_on_delete"();



CREATE OR REPLACE TRIGGER "shift_order_on_delete" AFTER DELETE ON "public"."content" FOR EACH ROW EXECUTE FUNCTION "public"."shift_order_on_delete"();



CREATE OR REPLACE TRIGGER "shift_order_on_delete" AFTER DELETE ON "public"."templates" FOR EACH ROW EXECUTE FUNCTION "public"."shift_order_on_delete"();



CREATE OR REPLACE TRIGGER "trg_ai_prompt_injectors_updated" BEFORE UPDATE ON "public"."ai_prompt_injectors" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_alpaca_stocks_updated_at" BEFORE UPDATE ON "public"."f_stocks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_normalize_custom_name" BEFORE INSERT OR UPDATE OF "custom_name" ON "public"."f_stocks" FOR EACH ROW EXECUTE FUNCTION "public"."_normalize_custom_name"();



CREATE OR REPLACE TRIGGER "trig_set_updated_at_stocks" BEFORE UPDATE ON "public"."f_stocks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_data_providers_updated_at" BEFORE UPDATE ON "public"."data_providers" FOR EACH ROW EXECUTE FUNCTION "public"."update_data_providers_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_ensure_single_default_template" BEFORE INSERT OR UPDATE OF "is_default" ON "public"."templates" FOR EACH ROW WHEN (("new"."is_default" = true)) EXECUTE FUNCTION "public"."ensure_single_default_template"();



CREATE OR REPLACE TRIGGER "trigger_news_articles_updated_at" BEFORE UPDATE ON "public"."news_articles" FOR EACH ROW EXECUTE FUNCTION "public"."update_news_articles_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_pulsar_projects_updated_at" BEFORE UPDATE ON "public"."pulsarvs_projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_pulsar_projects_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_map_settings_timestamp" BEFORE UPDATE ON "public"."map_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_map_settings_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_media_assets_timestamp" BEFORE UPDATE ON "public"."media_assets" FOR EACH ROW EXECUTE FUNCTION "public"."update_media_assets_timestamp"();



CREATE OR REPLACE TRIGGER "update_agents_updated_at" BEFORE UPDATE ON "public"."agents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_api_documentation_updated_at" BEFORE UPDATE ON "public"."api_documentation" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_api_endpoints_updated_at" BEFORE UPDATE ON "public"."api_endpoints" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_applications_timestamp" BEFORE UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "update_banner_schedules_updated_at" BEFORE UPDATE ON "public"."banner_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."update_banner_schedules_updated_at"();



CREATE OR REPLACE TRIGGER "update_candidates_updated_at" BEFORE UPDATE ON "public"."e_candidates" FOR EACH ROW EXECUTE FUNCTION "public"."e_update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customer_dashboards_updated_at" BEFORE UPDATE ON "public"."customer_dashboards" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "update_elections_updated_at" BEFORE UPDATE ON "public"."e_elections" FOR EACH ROW EXECUTE FUNCTION "public"."e_update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_feeds_updated_at" BEFORE UPDATE ON "public"."feeds" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_map_data_timestamp" BEFORE UPDATE ON "public"."map_data" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_media_assets_updated_at" BEFORE UPDATE ON "public"."e_media_assets" FOR EACH ROW EXECUTE FUNCTION "public"."e_update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_output_profiles_updated_at" BEFORE UPDATE ON "public"."output_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_parties_updated_at" BEFORE UPDATE ON "public"."e_parties" FOR EACH ROW EXECUTE FUNCTION "public"."e_update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_race_results_updated_at" BEFORE UPDATE ON "public"."e_race_results" FOR EACH ROW EXECUTE FUNCTION "public"."e_update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_races_updated_at" BEFORE UPDATE ON "public"."e_races" FOR EACH ROW EXECUTE FUNCTION "public"."e_update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sponsor_schedules_updated_at" BEFORE UPDATE ON "public"."sponsor_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."update_sponsor_schedules_updated_at"();



CREATE OR REPLACE TRIGGER "update_sports_categories_updated_at" BEFORE UPDATE ON "public"."sports_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sports_events_updated_at" BEFORE UPDATE ON "public"."sports_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sports_leagues_updated_at" BEFORE UPDATE ON "public"."sports_leagues" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sports_match_odds_updated_at" BEFORE UPDATE ON "public"."sports_match_odds" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sports_outright_odds_updated_at" BEFORE UPDATE ON "public"."sports_outright_odds" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sports_player_odds_updated_at" BEFORE UPDATE ON "public"."sports_player_odds" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sports_player_stats_updated_at" BEFORE UPDATE ON "public"."sports_player_stats" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sports_players_updated_at" BEFORE UPDATE ON "public"."sports_players" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sports_seasons_updated_at" BEFORE UPDATE ON "public"."sports_seasons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sports_standings_updated_at" BEFORE UPDATE ON "public"."sports_standings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sports_team_stats_updated_at" BEFORE UPDATE ON "public"."sports_team_stats" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sports_teams_updated_at" BEFORE UPDATE ON "public"."sports_teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sports_venues_updated_at" BEFORE UPDATE ON "public"."sports_venues" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_synthetic_groups_updated_at" BEFORE UPDATE ON "public"."e_synthetic_groups" FOR EACH ROW EXECUTE FUNCTION "public"."e_update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_vs_content_updated_at" BEFORE UPDATE ON "public"."vs_content" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_weather_locations_updated_at" BEFORE UPDATE ON "public"."weather_locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_channel_hierarchy" BEFORE INSERT OR UPDATE ON "public"."channel_playlists" FOR EACH ROW EXECUTE FUNCTION "public"."validate_channel_hierarchy"();



CREATE OR REPLACE TRIGGER "validate_content_hierarchy" BEFORE INSERT OR UPDATE ON "public"."content" FOR EACH ROW EXECUTE FUNCTION "public"."validate_content_hierarchy"();



CREATE OR REPLACE TRIGGER "validate_item_tabfields_content" BEFORE INSERT OR UPDATE ON "public"."item_tabfields" FOR EACH ROW EXECUTE FUNCTION "public"."validate_item_tabfields_content"();



CREATE OR REPLACE TRIGGER "validate_template_hierarchy" BEFORE INSERT OR UPDATE ON "public"."templates" FOR EACH ROW EXECUTE FUNCTION "public"."validate_template_hierarchy"();



ALTER TABLE ONLY "public"."agent_runs"
    ADD CONSTRAINT "agent_runs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_runs"
    ADD CONSTRAINT "agent_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."ai_insights_elections"
    ADD CONSTRAINT "ai_insights_elections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."ai_insights_finance"
    ADD CONSTRAINT "ai_insights_finance_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."ai_insights_news"
    ADD CONSTRAINT "ai_insights_news_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."ai_insights_school_closing"
    ADD CONSTRAINT "ai_insights_school_closing_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."ai_insights_weather"
    ADD CONSTRAINT "ai_insights_weather_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."ai_prompt_injectors"
    ADD CONSTRAINT "ai_prompt_injectors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."ai_providers"
    ADD CONSTRAINT "ai_providers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."api_access_logs"
    ADD CONSTRAINT "api_access_logs_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "public"."api_endpoints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_access_logs"
    ADD CONSTRAINT "api_access_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."api_documentation"
    ADD CONSTRAINT "api_documentation_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "public"."api_endpoints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_documentation"
    ADD CONSTRAINT "api_documentation_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."api_endpoint_sources"
    ADD CONSTRAINT "api_endpoint_sources_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_endpoint_sources"
    ADD CONSTRAINT "api_endpoint_sources_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "public"."api_endpoints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_endpoint_sources"
    ADD CONSTRAINT "api_endpoint_sources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."api_endpoints"
    ADD CONSTRAINT "api_endpoints_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."api_endpoints"
    ADD CONSTRAINT "api_endpoints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banner_schedules"
    ADD CONSTRAINT "banner_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."banner_schedules"
    ADD CONSTRAINT "banner_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bop_election_results"
    ADD CONSTRAINT "bop_election_results_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."bop_insufficient_vote_details"
    ADD CONSTRAINT "bop_insufficient_vote_details_election_result_id_fkey" FOREIGN KEY ("election_result_id") REFERENCES "public"."bop_election_results"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bop_insufficient_vote_details"
    ADD CONSTRAINT "bop_insufficient_vote_details_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."bop_net_changes"
    ADD CONSTRAINT "bop_net_changes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."bop_net_changes"
    ADD CONSTRAINT "bop_net_changes_party_result_id_fkey" FOREIGN KEY ("party_result_id") REFERENCES "public"."bop_party_results"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bop_party_results"
    ADD CONSTRAINT "bop_party_results_election_result_id_fkey" FOREIGN KEY ("election_result_id") REFERENCES "public"."bop_election_results"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bop_party_results"
    ADD CONSTRAINT "bop_party_results_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."channel_playlists"
    ADD CONSTRAINT "channel_playlists_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."channel_playlists"
    ADD CONSTRAINT "channel_playlists_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."channel_playlists"
    ADD CONSTRAINT "channel_playlists_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."channel_playlists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_playlists"
    ADD CONSTRAINT "channels_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



COMMENT ON CONSTRAINT "channels_content_id_fkey" ON "public"."channel_playlists" IS 'Cascade deletes from content.id to channels.content_id - when a bucket is deleted from content, all channel bucket references are automatically removed';



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."channel_playlists"
    ADD CONSTRAINT "channels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_dashboards"
    ADD CONSTRAINT "customer_dashboards_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."data_providers"
    ADD CONSTRAINT "data_providers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."data_source_sync_logs"
    ADD CONSTRAINT "data_source_sync_logs_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_source_sync_logs"
    ADD CONSTRAINT "data_source_sync_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."data_sources"
    ADD CONSTRAINT "data_sources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."data_sources"
    ADD CONSTRAINT "data_sources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."e_ap_call_history"
    ADD CONSTRAINT "e_ap_call_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_ballot_measure_results"
    ADD CONSTRAINT "e_ballot_measure_results_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."e_geographic_divisions"("id");



ALTER TABLE ONLY "public"."e_ballot_measure_results"
    ADD CONSTRAINT "e_ballot_measure_results_measure_id_fkey" FOREIGN KEY ("measure_id") REFERENCES "public"."e_ballot_measures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."e_ballot_measure_results"
    ADD CONSTRAINT "e_ballot_measure_results_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_ballot_measures"
    ADD CONSTRAINT "e_ballot_measures_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."e_geographic_divisions"("id");



ALTER TABLE ONLY "public"."e_ballot_measures"
    ADD CONSTRAINT "e_ballot_measures_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "public"."e_elections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."e_ballot_measures"
    ADD CONSTRAINT "e_ballot_measures_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_candidate_results"
    ADD CONSTRAINT "e_candidate_results_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."e_candidates"("id");



ALTER TABLE ONLY "public"."e_candidate_results"
    ADD CONSTRAINT "e_candidate_results_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_candidate_results"
    ADD CONSTRAINT "e_candidate_results_override_by_fkey" FOREIGN KEY ("override_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."e_candidate_results"
    ADD CONSTRAINT "e_candidate_results_race_result_id_fkey" FOREIGN KEY ("race_result_id") REFERENCES "public"."e_race_results"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."e_candidates"
    ADD CONSTRAINT "e_candidates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_candidates"
    ADD CONSTRAINT "e_candidates_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "public"."e_parties"("id");



ALTER TABLE ONLY "public"."e_countries"
    ADD CONSTRAINT "e_countries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_election_data_ingestion_log"
    ADD CONSTRAINT "e_election_data_ingestion_log_election_data_source_id_fkey" FOREIGN KEY ("election_data_source_id") REFERENCES "public"."e_election_data_sources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."e_election_data_ingestion_log"
    ADD CONSTRAINT "e_election_data_ingestion_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_election_data_overrides_log"
    ADD CONSTRAINT "e_election_data_overrides_log_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."e_election_data_overrides_log"
    ADD CONSTRAINT "e_election_data_overrides_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_election_data_overrides_log"
    ADD CONSTRAINT "e_election_data_overrides_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."e_election_data_sources"
    ADD CONSTRAINT "e_election_data_sources_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."e_election_data_sources"
    ADD CONSTRAINT "e_election_data_sources_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "public"."e_elections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."e_election_data_sources"
    ADD CONSTRAINT "e_election_data_sources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_election_editorial_content"
    ADD CONSTRAINT "e_election_editorial_content_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."e_election_editorial_content"
    ADD CONSTRAINT "e_election_editorial_content_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_elections"
    ADD CONSTRAINT "e_elections_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."e_countries"("id");



ALTER TABLE ONLY "public"."e_elections"
    ADD CONSTRAINT "e_elections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_exit_polls"
    ADD CONSTRAINT "e_exit_polls_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."e_candidates"("id");



ALTER TABLE ONLY "public"."e_exit_polls"
    ADD CONSTRAINT "e_exit_polls_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_exit_polls"
    ADD CONSTRAINT "e_exit_polls_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "public"."e_races"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."e_geographic_divisions"
    ADD CONSTRAINT "e_geographic_divisions_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."e_countries"("id");



ALTER TABLE ONLY "public"."e_geographic_divisions"
    ADD CONSTRAINT "e_geographic_divisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_geographic_divisions"
    ADD CONSTRAINT "e_geographic_divisions_parent_division_id_fkey" FOREIGN KEY ("parent_division_id") REFERENCES "public"."e_geographic_divisions"("id");



ALTER TABLE ONLY "public"."e_historical_results"
    ADD CONSTRAINT "e_historical_results_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."e_countries"("id");



ALTER TABLE ONLY "public"."e_historical_results"
    ADD CONSTRAINT "e_historical_results_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."e_geographic_divisions"("id");



ALTER TABLE ONLY "public"."e_historical_results"
    ADD CONSTRAINT "e_historical_results_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_media_assets"
    ADD CONSTRAINT "e_media_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_media_assets"
    ADD CONSTRAINT "e_media_assets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."e_parties"
    ADD CONSTRAINT "e_parties_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."e_countries"("id");



ALTER TABLE ONLY "public"."e_parties"
    ADD CONSTRAINT "e_parties_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_parties"
    ADD CONSTRAINT "e_parties_predecessor_party_id_fkey" FOREIGN KEY ("predecessor_party_id") REFERENCES "public"."e_parties"("id");



ALTER TABLE ONLY "public"."e_parties"
    ADD CONSTRAINT "e_parties_successor_party_id_fkey" FOREIGN KEY ("successor_party_id") REFERENCES "public"."e_parties"("id");



ALTER TABLE ONLY "public"."e_race_candidates"
    ADD CONSTRAINT "e_race_candidates_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."e_candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."e_race_candidates"
    ADD CONSTRAINT "e_race_candidates_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "public"."e_races"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."e_race_results"
    ADD CONSTRAINT "e_race_results_called_override_by_fkey" FOREIGN KEY ("called_override_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."e_race_results"
    ADD CONSTRAINT "e_race_results_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."e_geographic_divisions"("id");



ALTER TABLE ONLY "public"."e_race_results"
    ADD CONSTRAINT "e_race_results_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_race_results"
    ADD CONSTRAINT "e_race_results_override_approved_by_fkey" FOREIGN KEY ("override_approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."e_race_results"
    ADD CONSTRAINT "e_race_results_override_by_fkey" FOREIGN KEY ("override_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."e_race_results"
    ADD CONSTRAINT "e_race_results_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "public"."e_races"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."e_race_results"
    ADD CONSTRAINT "e_race_results_winner_candidate_id_fkey" FOREIGN KEY ("winner_candidate_id") REFERENCES "public"."e_candidates"("id");



ALTER TABLE ONLY "public"."e_race_results"
    ADD CONSTRAINT "e_race_results_winner_override_candidate_id_fkey" FOREIGN KEY ("winner_override_candidate_id") REFERENCES "public"."e_candidates"("id");



ALTER TABLE ONLY "public"."e_races"
    ADD CONSTRAINT "e_races_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."e_geographic_divisions"("id");



ALTER TABLE ONLY "public"."e_races"
    ADD CONSTRAINT "e_races_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "public"."e_elections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."e_races"
    ADD CONSTRAINT "e_races_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_synthetic_candidate_results"
    ADD CONSTRAINT "e_synthetic_candidate_results_synthetic_race_id_fkey" FOREIGN KEY ("synthetic_race_id") REFERENCES "public"."e_synthetic_races"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."e_synthetic_groups"
    ADD CONSTRAINT "e_synthetic_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."e_synthetic_groups"
    ADD CONSTRAINT "e_synthetic_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."e_synthetic_race_candidates"
    ADD CONSTRAINT "e_synthetic_race_candidates_synthetic_race_id_fkey" FOREIGN KEY ("synthetic_race_id") REFERENCES "public"."e_synthetic_races"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."e_synthetic_race_results"
    ADD CONSTRAINT "e_synthetic_race_results_synthetic_race_id_fkey" FOREIGN KEY ("synthetic_race_id") REFERENCES "public"."e_synthetic_races"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."e_synthetic_races"
    ADD CONSTRAINT "e_synthetic_races_base_election_id_fkey" FOREIGN KEY ("base_election_id") REFERENCES "public"."e_elections"("id");



ALTER TABLE ONLY "public"."e_synthetic_races"
    ADD CONSTRAINT "e_synthetic_races_base_race_id_fkey" FOREIGN KEY ("base_race_id") REFERENCES "public"."e_races"("id");



ALTER TABLE ONLY "public"."e_synthetic_races"
    ADD CONSTRAINT "e_synthetic_races_synthetic_group_id_fkey" FOREIGN KEY ("synthetic_group_id") REFERENCES "public"."e_synthetic_groups"("id");



ALTER TABLE ONLY "public"."e_synthetic_races"
    ADD CONSTRAINT "e_synthetic_races_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."f_stocks"
    ADD CONSTRAINT "f_stocks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."feeds"
    ADD CONSTRAINT "feeds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."file_sync_queue"
    ADD CONSTRAINT "file_sync_queue_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id");



ALTER TABLE ONLY "public"."gfx_animation_presets"
    ADD CONSTRAINT "gfx_animation_presets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_animations"
    ADD CONSTRAINT "gfx_animations_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "public"."gfx_elements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_animations"
    ADD CONSTRAINT "gfx_animations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."gfx_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_bindings"
    ADD CONSTRAINT "gfx_bindings_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "public"."gfx_elements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_bindings"
    ADD CONSTRAINT "gfx_bindings_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."gfx_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_chat_history"
    ADD CONSTRAINT "gfx_chat_history_context_template_id_fkey" FOREIGN KEY ("context_template_id") REFERENCES "public"."gfx_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gfx_chat_history"
    ADD CONSTRAINT "gfx_chat_history_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."gfx_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_chat_history"
    ADD CONSTRAINT "gfx_chat_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."u_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gfx_chat_messages"
    ADD CONSTRAINT "gfx_chat_messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."gfx_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_chat_messages"
    ADD CONSTRAINT "gfx_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."u_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gfx_elements"
    ADD CONSTRAINT "gfx_elements_parent_element_id_fkey" FOREIGN KEY ("parent_element_id") REFERENCES "public"."gfx_elements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_elements"
    ADD CONSTRAINT "gfx_elements_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."gfx_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_folders"
    ADD CONSTRAINT "gfx_folders_layer_id_fkey" FOREIGN KEY ("layer_id") REFERENCES "public"."gfx_layers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_folders"
    ADD CONSTRAINT "gfx_folders_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."gfx_folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_folders"
    ADD CONSTRAINT "gfx_folders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."gfx_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_keyframes"
    ADD CONSTRAINT "gfx_keyframes_animation_id_fkey" FOREIGN KEY ("animation_id") REFERENCES "public"."gfx_animations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_layers"
    ADD CONSTRAINT "gfx_layers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."gfx_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_playback_commands"
    ADD CONSTRAINT "gfx_playback_commands_layer_id_fkey" FOREIGN KEY ("layer_id") REFERENCES "public"."gfx_layers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_playback_commands"
    ADD CONSTRAINT "gfx_playback_commands_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."gfx_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_playback_commands"
    ADD CONSTRAINT "gfx_playback_commands_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."gfx_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gfx_playback_state"
    ADD CONSTRAINT "gfx_playback_state_layer_id_fkey" FOREIGN KEY ("layer_id") REFERENCES "public"."gfx_layers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_playback_state"
    ADD CONSTRAINT "gfx_playback_state_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."gfx_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_playback_state"
    ADD CONSTRAINT "gfx_playback_state_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."gfx_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gfx_project_design_systems"
    ADD CONSTRAINT "gfx_project_design_systems_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."gfx_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_projects"
    ADD CONSTRAINT "gfx_projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_support_tickets"
    ADD CONSTRAINT "gfx_support_tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."gfx_support_tickets"
    ADD CONSTRAINT "gfx_support_tickets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."gfx_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gfx_support_tickets"
    ADD CONSTRAINT "gfx_support_tickets_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."u_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gfx_support_tickets"
    ADD CONSTRAINT "gfx_support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."u_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gfx_template_versions"
    ADD CONSTRAINT "gfx_template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."gfx_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_templates"
    ADD CONSTRAINT "gfx_templates_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."gfx_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gfx_templates"
    ADD CONSTRAINT "gfx_templates_layer_id_fkey" FOREIGN KEY ("layer_id") REFERENCES "public"."gfx_layers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gfx_templates"
    ADD CONSTRAINT "gfx_templates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."gfx_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_tabfields"
    ADD CONSTRAINT "item_tabfields_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."media_distribution"
    ADD CONSTRAINT "media_distribution_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_distribution"
    ADD CONSTRAINT "media_distribution_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_push_queue"
    ADD CONSTRAINT "media_push_queue_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_push_queue"
    ADD CONSTRAINT "media_push_queue_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_tags"
    ADD CONSTRAINT "media_tags_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_tags"
    ADD CONSTRAINT "media_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."news_clusters"
    ADD CONSTRAINT "news_clusters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."organization_textures"
    ADD CONSTRAINT "organization_textures_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."u_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_textures"
    ADD CONSTRAINT "organization_textures_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulsar_channel_state"
    ADD CONSTRAINT "pulsar_channel_state_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."pulsar_channels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulsar_channel_state"
    ADD CONSTRAINT "pulsar_channel_state_controlled_by_fkey" FOREIGN KEY ("controlled_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pulsar_channels"
    ADD CONSTRAINT "pulsar_channels_loaded_project_id_fkey" FOREIGN KEY ("loaded_project_id") REFERENCES "public"."gfx_projects"("id");



ALTER TABLE ONLY "public"."pulsar_channels"
    ADD CONSTRAINT "pulsar_channels_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pulsar_channels"
    ADD CONSTRAINT "pulsar_channels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."pulsar_command_log"
    ADD CONSTRAINT "pulsar_command_log_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."pulsar_channels"("id");



ALTER TABLE ONLY "public"."pulsar_command_log"
    ADD CONSTRAINT "pulsar_command_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."pulsar_command_log"
    ADD CONSTRAINT "pulsar_command_log_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pulsar_pages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsar_command_log"
    ADD CONSTRAINT "pulsar_command_log_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pulsar_commands"
    ADD CONSTRAINT "pulsar_commands_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."pulsarvs_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsar_custom_ui_controls"
    ADD CONSTRAINT "pulsar_custom_ui_controls_custom_ui_id_fkey" FOREIGN KEY ("custom_ui_id") REFERENCES "public"."pulsar_custom_uis"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulsar_custom_uis"
    ADD CONSTRAINT "pulsar_custom_uis_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pulsar_custom_uis"
    ADD CONSTRAINT "pulsar_custom_uis_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulsar_custom_uis"
    ADD CONSTRAINT "pulsar_custom_uis_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pulsar_pages"("id");



ALTER TABLE ONLY "public"."pulsar_custom_uis"
    ADD CONSTRAINT "pulsar_custom_uis_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."gfx_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsar_page_groups"
    ADD CONSTRAINT "pulsar_page_groups_parent_group_id_fkey" FOREIGN KEY ("parent_group_id") REFERENCES "public"."pulsar_page_groups"("id");



ALTER TABLE ONLY "public"."pulsar_page_groups"
    ADD CONSTRAINT "pulsar_page_groups_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "public"."pulsar_playlists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulsar_page_library"
    ADD CONSTRAINT "pulsar_page_library_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsar_page_library"
    ADD CONSTRAINT "pulsar_page_library_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."pulsar_page_library"
    ADD CONSTRAINT "pulsar_page_library_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."gfx_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulsar_page_library"
    ADD CONSTRAINT "pulsar_page_library_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."gfx_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulsar_pages"
    ADD CONSTRAINT "pulsar_pages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."pulsar_channels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsar_pages"
    ADD CONSTRAINT "pulsar_pages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."pulsar_pages"
    ADD CONSTRAINT "pulsar_pages_page_group_id_fkey" FOREIGN KEY ("page_group_id") REFERENCES "public"."pulsar_page_groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsar_pages"
    ADD CONSTRAINT "pulsar_pages_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "public"."pulsar_playlists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulsar_pages"
    ADD CONSTRAINT "pulsar_pages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."gfx_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsar_playlist_page_links"
    ADD CONSTRAINT "pulsar_playlist_page_links_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pulsar_pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulsar_playlist_page_links"
    ADD CONSTRAINT "pulsar_playlist_page_links_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "public"."pulsar_playlists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulsar_playlists"
    ADD CONSTRAINT "pulsar_playlists_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."pulsar_channels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsar_playlists"
    ADD CONSTRAINT "pulsar_playlists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pulsar_playlists"
    ADD CONSTRAINT "pulsar_playlists_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."pulsar_playlists"
    ADD CONSTRAINT "pulsar_playlists_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."gfx_projects"("id");



ALTER TABLE ONLY "public"."pulsar_playout_log"
    ADD CONSTRAINT "pulsar_playout_log_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."pulsar_channels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsar_playout_log"
    ADD CONSTRAINT "pulsar_playout_log_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsar_playout_log"
    ADD CONSTRAINT "pulsar_playout_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulsar_playout_log"
    ADD CONSTRAINT "pulsar_playout_log_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pulsar_pages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsar_playout_log"
    ADD CONSTRAINT "pulsar_playout_log_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."gfx_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsar_playout_log"
    ADD CONSTRAINT "pulsar_playout_log_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."gfx_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsarvs_projects"
    ADD CONSTRAINT "pulsar_projects_default_channel_id_fkey" FOREIGN KEY ("default_channel_id") REFERENCES "public"."channels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsar_user_preferences"
    ADD CONSTRAINT "pulsar_user_preferences_active_playlist_id_fkey" FOREIGN KEY ("active_playlist_id") REFERENCES "public"."pulsar_playlists"("id");



ALTER TABLE ONLY "public"."pulsar_user_preferences"
    ADD CONSTRAINT "pulsar_user_preferences_default_channel_id_fkey" FOREIGN KEY ("default_channel_id") REFERENCES "public"."pulsar_channels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsar_user_preferences"
    ADD CONSTRAINT "pulsar_user_preferences_default_project_id_fkey" FOREIGN KEY ("default_project_id") REFERENCES "public"."gfx_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsar_user_preferences"
    ADD CONSTRAINT "pulsar_user_preferences_last_project_id_fkey" FOREIGN KEY ("last_project_id") REFERENCES "public"."gfx_projects"("id");



ALTER TABLE ONLY "public"."pulsar_user_preferences"
    ADD CONSTRAINT "pulsar_user_preferences_selected_channel_id_fkey" FOREIGN KEY ("selected_channel_id") REFERENCES "public"."pulsar_channels"("id");



ALTER TABLE ONLY "public"."pulsarvs_playlist_items"
    ADD CONSTRAINT "pulsarvs_playlist_items_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsarvs_playlist_items"
    ADD CONSTRAINT "pulsarvs_playlist_items_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."vs_content"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsarvs_playlist_items"
    ADD CONSTRAINT "pulsarvs_playlist_items_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulsarvs_playlist_items"
    ADD CONSTRAINT "pulsarvs_playlist_items_parent_item_id_fkey" FOREIGN KEY ("parent_item_id") REFERENCES "public"."pulsarvs_playlist_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulsarvs_playlist_items"
    ADD CONSTRAINT "pulsarvs_playlist_items_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "public"."pulsarvs_playlists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulsarvs_playlists"
    ADD CONSTRAINT "pulsarvs_playlists_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."pulsarvs_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_closings"
    ADD CONSTRAINT "school_closings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."school_closings"
    ADD CONSTRAINT "school_closings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sponsor_schedules"
    ADD CONSTRAINT "sponsor_schedules_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sponsor_schedules"
    ADD CONSTRAINT "sponsor_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."sponsor_schedules"
    ADD CONSTRAINT "sponsor_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sports_events"
    ADD CONSTRAINT "sports_events_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "public"."sports_teams"("id");



ALTER TABLE ONLY "public"."sports_events"
    ADD CONSTRAINT "sports_events_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "public"."sports_teams"("id");



ALTER TABLE ONLY "public"."sports_events"
    ADD CONSTRAINT "sports_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."sports_events"
    ADD CONSTRAINT "sports_events_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."sports_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_events"
    ADD CONSTRAINT "sports_events_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."sports_teams"("id");



ALTER TABLE ONLY "public"."sports_leagues"
    ADD CONSTRAINT "sports_leagues_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."sports_categories"("id");



ALTER TABLE ONLY "public"."sports_leagues"
    ADD CONSTRAINT "sports_leagues_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."sports_lineups"
    ADD CONSTRAINT "sports_lineups_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."sports_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_lineups"
    ADD CONSTRAINT "sports_lineups_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."sports_players"("id");



ALTER TABLE ONLY "public"."sports_lineups"
    ADD CONSTRAINT "sports_lineups_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."sports_teams"("id");



ALTER TABLE ONLY "public"."sports_match_odds"
    ADD CONSTRAINT "sports_match_odds_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."sports_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_outright_odds"
    ADD CONSTRAINT "sports_outright_odds_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."sports_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_outright_odds"
    ADD CONSTRAINT "sports_outright_odds_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."sports_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_player_odds"
    ADD CONSTRAINT "sports_player_odds_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."sports_players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_player_odds"
    ADD CONSTRAINT "sports_player_odds_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."sports_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_player_stats"
    ADD CONSTRAINT "sports_player_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."sports_players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_player_stats"
    ADD CONSTRAINT "sports_player_stats_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."sports_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_player_stats"
    ADD CONSTRAINT "sports_player_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."sports_teams"("id");



ALTER TABLE ONLY "public"."sports_players"
    ADD CONSTRAINT "sports_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."sports_teams"("id");



ALTER TABLE ONLY "public"."sports_season_teams"
    ADD CONSTRAINT "sports_season_teams_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."sports_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_season_teams"
    ADD CONSTRAINT "sports_season_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."sports_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_seasons"
    ADD CONSTRAINT "sports_seasons_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."sports_leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_standings"
    ADD CONSTRAINT "sports_standings_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."sports_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_standings"
    ADD CONSTRAINT "sports_standings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."sports_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_team_stats"
    ADD CONSTRAINT "sports_team_stats_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."sports_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_team_stats"
    ADD CONSTRAINT "sports_team_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."sports_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sports_teams"
    ADD CONSTRAINT "sports_teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."sports_teams"
    ADD CONSTRAINT "sports_teams_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."sports_venues"("id");



ALTER TABLE ONLY "public"."sync_queue"
    ADD CONSTRAINT "sync_queue_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tabfields"
    ADD CONSTRAINT "tabfields_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tabfields"
    ADD CONSTRAINT "tabfields_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_forms"
    ADD CONSTRAINT "template_forms_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_settings"
    ADD CONSTRAINT "template_settings_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."u_audit_log"
    ADD CONSTRAINT "u_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."u_channel_access"
    ADD CONSTRAINT "u_channel_access_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."u_channel_access"
    ADD CONSTRAINT "u_channel_access_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."u_channel_access"
    ADD CONSTRAINT "u_channel_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."u_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."u_group_members"
    ADD CONSTRAINT "u_group_members_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."u_group_members"
    ADD CONSTRAINT "u_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."u_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."u_group_members"
    ADD CONSTRAINT "u_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."u_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."u_group_permissions"
    ADD CONSTRAINT "u_group_permissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."u_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."u_group_permissions"
    ADD CONSTRAINT "u_group_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."u_permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."u_invitations"
    ADD CONSTRAINT "u_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."u_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."u_invitations"
    ADD CONSTRAINT "u_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."u_page_settings"
    ADD CONSTRAINT "u_page_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."u_user_permissions"
    ADD CONSTRAINT "u_user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."u_permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."u_user_permissions"
    ADD CONSTRAINT "u_user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."u_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."u_users"
    ADD CONSTRAINT "u_users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."u_users"
    ADD CONSTRAINT "u_users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."u_users"
    ADD CONSTRAINT "u_users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."user_layouts"
    ADD CONSTRAINT "user_layouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vs_content"
    ADD CONSTRAINT "vs_content_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."vs_content_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vs_content_folders"
    ADD CONSTRAINT "vs_content_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."vs_content_folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vs_content_folders"
    ADD CONSTRAINT "vs_content_folders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."pulsarvs_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vs_content"
    ADD CONSTRAINT "vs_content_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."pulsarvs_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."weather_air_quality"
    ADD CONSTRAINT "weather_air_quality_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."weather_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weather_air_quality"
    ADD CONSTRAINT "weather_air_quality_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."weather_alerts"
    ADD CONSTRAINT "weather_alerts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."weather_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weather_alerts"
    ADD CONSTRAINT "weather_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."weather_current"
    ADD CONSTRAINT "weather_current_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."weather_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weather_current"
    ADD CONSTRAINT "weather_current_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."weather_daily_forecast"
    ADD CONSTRAINT "weather_daily_forecast_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."weather_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weather_daily_forecast"
    ADD CONSTRAINT "weather_daily_forecast_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."weather_hourly_forecast"
    ADD CONSTRAINT "weather_hourly_forecast_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."weather_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weather_hourly_forecast"
    ADD CONSTRAINT "weather_hourly_forecast_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."weather_ingest_config"
    ADD CONSTRAINT "weather_ingest_config_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."weather_location_channels"
    ADD CONSTRAINT "weather_location_channels_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weather_location_channels"
    ADD CONSTRAINT "weather_location_channels_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."weather_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weather_location_channels"
    ADD CONSTRAINT "weather_location_channels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."weather_locations"
    ADD CONSTRAINT "weather_locations_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."weather_locations"
    ADD CONSTRAINT "weather_locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."u_organizations"("id");



ALTER TABLE ONLY "public"."weather_locations"
    ADD CONSTRAINT "weather_locations_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."data_providers"("id") ON DELETE SET NULL;



DROP POLICY IF EXISTS "All authenticated users can delete api_endpoints" ON "public"."api_endpoints";
CREATE POLICY "All authenticated users can delete api_endpoints" ON "public"."api_endpoints" FOR DELETE TO "authenticated" USING (true);



DROP POLICY IF EXISTS "All authenticated users can insert api_endpoints" ON "public"."api_endpoints";
CREATE POLICY "All authenticated users can insert api_endpoints" ON "public"."api_endpoints" FOR INSERT TO "authenticated" WITH CHECK (true);



DROP POLICY IF EXISTS "All authenticated users can update api_endpoints" ON "public"."api_endpoints";
CREATE POLICY "All authenticated users can update api_endpoints" ON "public"."api_endpoints" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "All authenticated users can view api_endpoints" ON "public"."api_endpoints";
CREATE POLICY "All authenticated users can view api_endpoints" ON "public"."api_endpoints" FOR SELECT TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Allow all deletes for testing" ON "public"."vs_content";
CREATE POLICY "Allow all deletes for testing" ON "public"."vs_content" FOR DELETE USING (true);



DROP POLICY IF EXISTS "Allow all for authenticated users" ON "public"."agent_runs";
CREATE POLICY "Allow all for authenticated users" ON "public"."agent_runs" USING (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Allow all for authenticated users" ON "public"."agents";
CREATE POLICY "Allow all for authenticated users" ON "public"."agents" USING (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Allow all for authenticated users" ON "public"."feeds";
CREATE POLICY "Allow all for authenticated users" ON "public"."feeds" USING (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Allow all inserts for testing" ON "public"."vs_content";
CREATE POLICY "Allow all inserts for testing" ON "public"."vs_content" FOR INSERT WITH CHECK (true);



DROP POLICY IF EXISTS "Allow all on pulsarvs_playlist_items" ON "public"."pulsarvs_playlist_items";
CREATE POLICY "Allow all on pulsarvs_playlist_items" ON "public"."pulsarvs_playlist_items" USING (true);



DROP POLICY IF EXISTS "Allow all on pulsarvs_playlists" ON "public"."pulsarvs_playlists";
CREATE POLICY "Allow all on pulsarvs_playlists" ON "public"."pulsarvs_playlists" USING (true);



DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON "public"."ai_insights_elections";
CREATE POLICY "Allow all operations for authenticated users" ON "public"."ai_insights_elections" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Allow all operations on ai_insights_finance" ON "public"."ai_insights_finance";
CREATE POLICY "Allow all operations on ai_insights_finance" ON "public"."ai_insights_finance" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Allow all operations on weather_ai_insights" ON "public"."ai_insights_weather";
CREATE POLICY "Allow all operations on weather_ai_insights" ON "public"."ai_insights_weather" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Allow all updates for testing" ON "public"."vs_content";
CREATE POLICY "Allow all updates for testing" ON "public"."vs_content" FOR UPDATE USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Allow all users to read weather_air_quality" ON "public"."weather_air_quality";
CREATE POLICY "Allow all users to read weather_air_quality" ON "public"."weather_air_quality" FOR SELECT TO "authenticated", "anon" USING (true);



DROP POLICY IF EXISTS "Allow all users to read weather_alerts" ON "public"."weather_alerts";
CREATE POLICY "Allow all users to read weather_alerts" ON "public"."weather_alerts" FOR SELECT TO "authenticated", "anon" USING (true);



DROP POLICY IF EXISTS "Allow all users to read weather_current" ON "public"."weather_current";
CREATE POLICY "Allow all users to read weather_current" ON "public"."weather_current" FOR SELECT TO "authenticated", "anon" USING (true);



DROP POLICY IF EXISTS "Allow all users to read weather_daily_forecast" ON "public"."weather_daily_forecast";
CREATE POLICY "Allow all users to read weather_daily_forecast" ON "public"."weather_daily_forecast" FOR SELECT TO "authenticated", "anon" USING (true);



DROP POLICY IF EXISTS "Allow all users to read weather_hourly_forecast" ON "public"."weather_hourly_forecast";
CREATE POLICY "Allow all users to read weather_hourly_forecast" ON "public"."weather_hourly_forecast" FOR SELECT TO "authenticated", "anon" USING (true);



DROP POLICY IF EXISTS "Allow all users to read weather_locations" ON "public"."weather_locations";
CREATE POLICY "Allow all users to read weather_locations" ON "public"."weather_locations" FOR SELECT TO "authenticated", "anon" USING (true);



DROP POLICY IF EXISTS "Allow anonymous delete" ON "public"."pulsarvs_projects";
CREATE POLICY "Allow anonymous delete" ON "public"."pulsarvs_projects" FOR DELETE USING (true);



DROP POLICY IF EXISTS "Allow anonymous insert" ON "public"."pulsarvs_projects";
CREATE POLICY "Allow anonymous insert" ON "public"."pulsarvs_projects" FOR INSERT WITH CHECK (true);



DROP POLICY IF EXISTS "Allow anonymous read" ON "public"."pulsarvs_projects";
CREATE POLICY "Allow anonymous read" ON "public"."pulsarvs_projects" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Allow anonymous update" ON "public"."pulsarvs_projects";
CREATE POLICY "Allow anonymous update" ON "public"."pulsarvs_projects" FOR UPDATE USING (true);



DROP POLICY IF EXISTS "Allow authenticated delete from channels" ON "public"."channels";
CREATE POLICY "Allow authenticated delete from channels" ON "public"."channels" FOR DELETE USING (true);



DROP POLICY IF EXISTS "Allow authenticated insert to channels" ON "public"."channels";
CREATE POLICY "Allow authenticated insert to channels" ON "public"."channels" FOR INSERT WITH CHECK (true);



DROP POLICY IF EXISTS "Allow authenticated update to channels" ON "public"."channels";
CREATE POLICY "Allow authenticated update to channels" ON "public"."channels" FOR UPDATE USING (true);



DROP POLICY IF EXISTS "Allow authenticated users to read weather_air_quality" ON "public"."weather_air_quality";
CREATE POLICY "Allow authenticated users to read weather_air_quality" ON "public"."weather_air_quality" FOR SELECT TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Allow authenticated users to read weather_alerts" ON "public"."weather_alerts";
CREATE POLICY "Allow authenticated users to read weather_alerts" ON "public"."weather_alerts" FOR SELECT TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Allow authenticated users to read weather_current" ON "public"."weather_current";
CREATE POLICY "Allow authenticated users to read weather_current" ON "public"."weather_current" FOR SELECT TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Allow authenticated users to read weather_daily_forecast" ON "public"."weather_daily_forecast";
CREATE POLICY "Allow authenticated users to read weather_daily_forecast" ON "public"."weather_daily_forecast" FOR SELECT TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Allow authenticated users to read weather_hourly_forecast" ON "public"."weather_hourly_forecast";
CREATE POLICY "Allow authenticated users to read weather_hourly_forecast" ON "public"."weather_hourly_forecast" FOR SELECT TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Allow delete for authenticated users" ON "public"."weather_location_channels";
CREATE POLICY "Allow delete for authenticated users" ON "public"."weather_location_channels" FOR DELETE TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Allow insert for anon users" ON "public"."ai_prompt_injectors";
CREATE POLICY "Allow insert for anon users" ON "public"."ai_prompt_injectors" FOR INSERT TO "anon" WITH CHECK (true);



DROP POLICY IF EXISTS "Allow insert for authenticated users" ON "public"."ai_prompt_injectors";
CREATE POLICY "Allow insert for authenticated users" ON "public"."ai_prompt_injectors" FOR INSERT TO "authenticated" WITH CHECK (true);



DROP POLICY IF EXISTS "Allow insert for authenticated users" ON "public"."weather_location_channels";
CREATE POLICY "Allow insert for authenticated users" ON "public"."weather_location_channels" FOR INSERT TO "authenticated" WITH CHECK (true);



DROP POLICY IF EXISTS "Allow public read access" ON "public"."ai_insights_elections";
CREATE POLICY "Allow public read access" ON "public"."ai_insights_elections" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Allow public read access to channels" ON "public"."channels";
CREATE POLICY "Allow public read access to channels" ON "public"."channels" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Allow public to read" ON "public"."e_geographic_divisions";
CREATE POLICY "Allow public to read" ON "public"."e_geographic_divisions" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Allow read for anon users" ON "public"."ai_prompt_injectors";
CREATE POLICY "Allow read for anon users" ON "public"."ai_prompt_injectors" FOR SELECT TO "anon" USING (true);



DROP POLICY IF EXISTS "Allow read for authenticated users" ON "public"."ai_prompt_injectors";
CREATE POLICY "Allow read for authenticated users" ON "public"."ai_prompt_injectors" FOR SELECT TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Allow select for authenticated users" ON "public"."weather_location_channels";
CREATE POLICY "Allow select for authenticated users" ON "public"."weather_location_channels" FOR SELECT TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Allow service role to delete weather_locations" ON "public"."weather_locations";
CREATE POLICY "Allow service role to delete weather_locations" ON "public"."weather_locations" FOR DELETE TO "service_role" USING (true);



DROP POLICY IF EXISTS "Allow service role to insert weather_air_quality" ON "public"."weather_air_quality";
CREATE POLICY "Allow service role to insert weather_air_quality" ON "public"."weather_air_quality" FOR INSERT TO "service_role" WITH CHECK (true);



DROP POLICY IF EXISTS "Allow service role to insert weather_alerts" ON "public"."weather_alerts";
CREATE POLICY "Allow service role to insert weather_alerts" ON "public"."weather_alerts" FOR INSERT TO "service_role" WITH CHECK (true);



DROP POLICY IF EXISTS "Allow service role to insert weather_current" ON "public"."weather_current";
CREATE POLICY "Allow service role to insert weather_current" ON "public"."weather_current" FOR INSERT TO "service_role" WITH CHECK (true);



DROP POLICY IF EXISTS "Allow service role to insert weather_daily_forecast" ON "public"."weather_daily_forecast";
CREATE POLICY "Allow service role to insert weather_daily_forecast" ON "public"."weather_daily_forecast" FOR INSERT TO "service_role" WITH CHECK (true);



DROP POLICY IF EXISTS "Allow service role to insert weather_hourly_forecast" ON "public"."weather_hourly_forecast";
CREATE POLICY "Allow service role to insert weather_hourly_forecast" ON "public"."weather_hourly_forecast" FOR INSERT TO "service_role" WITH CHECK (true);



DROP POLICY IF EXISTS "Allow service role to insert weather_locations" ON "public"."weather_locations";
CREATE POLICY "Allow service role to insert weather_locations" ON "public"."weather_locations" FOR INSERT TO "service_role" WITH CHECK (true);



DROP POLICY IF EXISTS "Allow service role to update weather_air_quality" ON "public"."weather_air_quality";
CREATE POLICY "Allow service role to update weather_air_quality" ON "public"."weather_air_quality" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Allow service role to update weather_alerts" ON "public"."weather_alerts";
CREATE POLICY "Allow service role to update weather_alerts" ON "public"."weather_alerts" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Allow service role to update weather_current" ON "public"."weather_current";
CREATE POLICY "Allow service role to update weather_current" ON "public"."weather_current" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Allow service role to update weather_daily_forecast" ON "public"."weather_daily_forecast";
CREATE POLICY "Allow service role to update weather_daily_forecast" ON "public"."weather_daily_forecast" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Allow service role to update weather_hourly_forecast" ON "public"."weather_hourly_forecast";
CREATE POLICY "Allow service role to update weather_hourly_forecast" ON "public"."weather_hourly_forecast" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Allow service role to update weather_locations" ON "public"."weather_locations";
CREATE POLICY "Allow service role to update weather_locations" ON "public"."weather_locations" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Allow update for anon users" ON "public"."ai_prompt_injectors";
CREATE POLICY "Allow update for anon users" ON "public"."ai_prompt_injectors" FOR UPDATE TO "anon" USING (true);



DROP POLICY IF EXISTS "Allow update for authenticated users" ON "public"."ai_prompt_injectors";
CREATE POLICY "Allow update for authenticated users" ON "public"."ai_prompt_injectors" FOR UPDATE TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Allow update for authenticated users" ON "public"."weather_location_channels";
CREATE POLICY "Allow update for authenticated users" ON "public"."weather_location_channels" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Anyone authenticated can read item_tabfields" ON "public"."item_tabfields";
CREATE POLICY "Anyone authenticated can read item_tabfields" ON "public"."item_tabfields" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Anyone authenticated can read tabfields" ON "public"."tabfields";
CREATE POLICY "Anyone authenticated can read tabfields" ON "public"."tabfields" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Anyone authenticated can read template_forms" ON "public"."template_forms";
CREATE POLICY "Anyone authenticated can read template_forms" ON "public"."template_forms" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Anyone can read active data sources" ON "public"."data_sources";
CREATE POLICY "Anyone can read active data sources" ON "public"."data_sources" FOR SELECT USING (("active" = true));



DROP POLICY IF EXISTS "Anyone can view api_endpoints" ON "public"."api_endpoints";
CREATE POLICY "Anyone can view api_endpoints" ON "public"."api_endpoints" FOR SELECT TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Authenticated can read" ON "public"."channel_playlists";
CREATE POLICY "Authenticated can read" ON "public"."channel_playlists" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Authenticated users - full access" ON "public"."channel_playlists";
CREATE POLICY "Authenticated users - full access" ON "public"."channel_playlists" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Authenticated users - full access" ON "public"."content";
CREATE POLICY "Authenticated users - full access" ON "public"."content" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Authenticated users - full access" ON "public"."data_sources";
CREATE POLICY "Authenticated users - full access" ON "public"."data_sources" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Authenticated users - full access" ON "public"."item_tabfields";
CREATE POLICY "Authenticated users - full access" ON "public"."item_tabfields" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Authenticated users - full access" ON "public"."tabfields";
CREATE POLICY "Authenticated users - full access" ON "public"."tabfields" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Authenticated users - full access" ON "public"."template_forms";
CREATE POLICY "Authenticated users - full access" ON "public"."template_forms" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Authenticated users - full access" ON "public"."templates";
CREATE POLICY "Authenticated users - full access" ON "public"."templates" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Authenticated users can create api_endpoints" ON "public"."api_endpoints";
CREATE POLICY "Authenticated users can create api_endpoints" ON "public"."api_endpoints" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Authenticated users can create overrides" ON "public"."e_candidate_results";
CREATE POLICY "Authenticated users can create overrides" ON "public"."e_candidate_results" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Authenticated users can create overrides" ON "public"."e_race_results";
CREATE POLICY "Authenticated users can create overrides" ON "public"."e_race_results" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Authenticated users can manage" ON "public"."e_election_data_sources";
CREATE POLICY "Authenticated users can manage" ON "public"."e_election_data_sources" TO "authenticated" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Authenticated users can manage editorial" ON "public"."e_election_editorial_content";
CREATE POLICY "Authenticated users can manage editorial" ON "public"."e_election_editorial_content" TO "authenticated" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Authenticated users can manage groups" ON "public"."e_synthetic_groups";
CREATE POLICY "Authenticated users can manage groups" ON "public"."e_synthetic_groups" TO "authenticated" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Authenticated users can manage media" ON "public"."e_media_assets";
CREATE POLICY "Authenticated users can manage media" ON "public"."e_media_assets" TO "authenticated" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Authenticated users can manage providers" ON "public"."data_providers";
CREATE POLICY "Authenticated users can manage providers" ON "public"."data_providers" USING (true);



DROP POLICY IF EXISTS "Authenticated users can view override logs" ON "public"."e_election_data_overrides_log";
CREATE POLICY "Authenticated users can view override logs" ON "public"."e_election_data_overrides_log" FOR SELECT TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."channels";
CREATE POLICY "Enable delete for authenticated users only" ON "public"."channels" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."channels";
CREATE POLICY "Enable insert for authenticated users only" ON "public"."channels" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."channels";
CREATE POLICY "Enable read access for all users" ON "public"."channels" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."channels";
CREATE POLICY "Enable update for authenticated users only" ON "public"."channels" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



DROP POLICY IF EXISTS "Full access for authenticated users" ON "public"."api_access_logs";
CREATE POLICY "Full access for authenticated users" ON "public"."api_access_logs" TO "authenticated" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Full access for authenticated users" ON "public"."api_documentation";
CREATE POLICY "Full access for authenticated users" ON "public"."api_documentation" TO "authenticated" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Full access for authenticated users" ON "public"."api_endpoint_sources";
CREATE POLICY "Full access for authenticated users" ON "public"."api_endpoint_sources" TO "authenticated" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Full access for authenticated users" ON "public"."api_endpoints";
CREATE POLICY "Full access for authenticated users" ON "public"."api_endpoints" TO "authenticated" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Public can view providers" ON "public"."data_providers";
CREATE POLICY "Public can view providers" ON "public"."data_providers" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public content viewable" ON "public"."vs_content";
CREATE POLICY "Public content viewable" ON "public"."vs_content" FOR SELECT USING (("is_public" = true));



DROP POLICY IF EXISTS "Public read access" ON "public"."bop_election_results";
CREATE POLICY "Public read access" ON "public"."bop_election_results" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."bop_insufficient_vote_details";
CREATE POLICY "Public read access" ON "public"."bop_insufficient_vote_details" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."bop_net_changes";
CREATE POLICY "Public read access" ON "public"."bop_net_changes" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."bop_party_results";
CREATE POLICY "Public read access" ON "public"."bop_party_results" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_ap_call_history";
CREATE POLICY "Public read access" ON "public"."e_ap_call_history" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_ballot_measure_results";
CREATE POLICY "Public read access" ON "public"."e_ballot_measure_results" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_ballot_measures";
CREATE POLICY "Public read access" ON "public"."e_ballot_measures" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_candidate_results";
CREATE POLICY "Public read access" ON "public"."e_candidate_results" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_candidates";
CREATE POLICY "Public read access" ON "public"."e_candidates" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_countries";
CREATE POLICY "Public read access" ON "public"."e_countries" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_election_data_ingestion_log";
CREATE POLICY "Public read access" ON "public"."e_election_data_ingestion_log" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_election_data_sources";
CREATE POLICY "Public read access" ON "public"."e_election_data_sources" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_election_editorial_content";
CREATE POLICY "Public read access" ON "public"."e_election_editorial_content" FOR SELECT USING ((("status")::"text" = 'published'::"text"));



DROP POLICY IF EXISTS "Public read access" ON "public"."e_elections";
CREATE POLICY "Public read access" ON "public"."e_elections" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_exit_polls";
CREATE POLICY "Public read access" ON "public"."e_exit_polls" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_geographic_divisions";
CREATE POLICY "Public read access" ON "public"."e_geographic_divisions" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_historical_results";
CREATE POLICY "Public read access" ON "public"."e_historical_results" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_media_assets";
CREATE POLICY "Public read access" ON "public"."e_media_assets" FOR SELECT USING (("active" = true));



DROP POLICY IF EXISTS "Public read access" ON "public"."e_parties";
CREATE POLICY "Public read access" ON "public"."e_parties" FOR SELECT USING (("active" = true));



DROP POLICY IF EXISTS "Public read access" ON "public"."e_race_candidates";
CREATE POLICY "Public read access" ON "public"."e_race_candidates" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_race_results";
CREATE POLICY "Public read access" ON "public"."e_race_results" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_races";
CREATE POLICY "Public read access" ON "public"."e_races" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access" ON "public"."e_synthetic_groups";
CREATE POLICY "Public read access" ON "public"."e_synthetic_groups" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access to data sources" ON "public"."data_sources";
CREATE POLICY "Public read access to data sources" ON "public"."data_sources" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Public read access to news articles" ON "public"."news_articles";
CREATE POLICY "Public read access to news articles" ON "public"."news_articles" FOR SELECT TO "authenticated", "anon" USING (true);



DROP POLICY IF EXISTS "Public update access" ON "public"."e_candidate_results";
CREATE POLICY "Public update access" ON "public"."e_candidate_results" FOR UPDATE USING (true);



DROP POLICY IF EXISTS "Public update access" ON "public"."e_candidates";
CREATE POLICY "Public update access" ON "public"."e_candidates" FOR UPDATE USING (true);



DROP POLICY IF EXISTS "Public update access" ON "public"."e_parties";
CREATE POLICY "Public update access" ON "public"."e_parties" FOR UPDATE USING (true);



DROP POLICY IF EXISTS "Public update access" ON "public"."e_race_candidates";
CREATE POLICY "Public update access" ON "public"."e_race_candidates" FOR UPDATE USING (true);



DROP POLICY IF EXISTS "Public update access" ON "public"."e_races";
CREATE POLICY "Public update access" ON "public"."e_races" FOR UPDATE USING (true);



DROP POLICY IF EXISTS "Public users can insert override logs" ON "public"."e_election_data_overrides_log";
CREATE POLICY "Public users can insert override logs" ON "public"."e_election_data_overrides_log" FOR INSERT WITH CHECK (true);



DROP POLICY IF EXISTS "Public users can update override logs" ON "public"."e_election_data_overrides_log";
CREATE POLICY "Public users can update override logs" ON "public"."e_election_data_overrides_log" FOR UPDATE USING (true);



DROP POLICY IF EXISTS "Public users can view override logs" ON "public"."e_election_data_overrides_log";
CREATE POLICY "Public users can view override logs" ON "public"."e_election_data_overrides_log" FOR SELECT USING (true);



DROP POLICY IF EXISTS "Service role full access to news articles" ON "public"."news_articles";
CREATE POLICY "Service role full access to news articles" ON "public"."news_articles" TO "service_role" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "Users access own layouts combined" ON "public"."user_layouts";
CREATE POLICY "Users access own layouts combined" ON "public"."user_layouts" USING ((("auth"."role"() = 'authenticated'::"text") AND ((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR (("auth"."uid"() IS NOT NULL) AND (("auth"."uid"())::"text" = ("user_id")::"text")) OR (("user_id")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text"))))) WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR (("auth"."uid"() IS NOT NULL) AND (("auth"."uid"())::"text" = ("user_id")::"text")) OR (("user_id")::"text" = (("current_setting"('request.jwt.claims'::"text", true))::"json" ->> 'sub'::"text")))));



DROP POLICY IF EXISTS "Users can create their own endpoints" ON "public"."api_endpoints";
CREATE POLICY "Users can create their own endpoints" ON "public"."api_endpoints" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can delete banner schedules" ON "public"."banner_schedules";
CREATE POLICY "Users can delete banner schedules" ON "public"."banner_schedules" FOR DELETE TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Users can delete content and widgets" ON "public"."content";
CREATE POLICY "Users can delete content and widgets" ON "public"."content" FOR DELETE USING ((("type" = 'widget'::"text") OR ("auth"."uid"() = "user_id")));



DROP POLICY IF EXISTS "Users can delete own content" ON "public"."vs_content";
CREATE POLICY "Users can delete own content" ON "public"."vs_content" FOR DELETE USING (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can delete own map settings" ON "public"."map_settings";
CREATE POLICY "Users can delete own map settings" ON "public"."map_settings" FOR DELETE USING (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can delete sponsor schedules" ON "public"."sponsor_schedules";
CREATE POLICY "Users can delete sponsor schedules" ON "public"."sponsor_schedules" FOR DELETE TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Users can delete their own endpoints" ON "public"."api_endpoints";
CREATE POLICY "Users can delete their own endpoints" ON "public"."api_endpoints" FOR DELETE USING (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can insert banner schedules" ON "public"."banner_schedules";
CREATE POLICY "Users can insert banner schedules" ON "public"."banner_schedules" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can insert content and widgets" ON "public"."content";
CREATE POLICY "Users can insert content and widgets" ON "public"."content" FOR INSERT WITH CHECK (((("type" = 'widget'::"text") AND ("user_id" IS NULL)) OR ("auth"."uid"() = "user_id")));



DROP POLICY IF EXISTS "Users can insert own content" ON "public"."vs_content";
CREATE POLICY "Users can insert own content" ON "public"."vs_content" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can insert own map settings" ON "public"."map_settings";
CREATE POLICY "Users can insert own map settings" ON "public"."map_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can insert sponsor schedules" ON "public"."sponsor_schedules";
CREATE POLICY "Users can insert sponsor schedules" ON "public"."sponsor_schedules" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can manage docs for their endpoints" ON "public"."api_documentation";
CREATE POLICY "Users can manage docs for their endpoints" ON "public"."api_documentation" USING ((EXISTS ( SELECT 1
   FROM "public"."api_endpoints"
  WHERE (("api_endpoints"."id" = "api_documentation"."endpoint_id") AND ("api_endpoints"."user_id" = "auth"."uid"())))));



DROP POLICY IF EXISTS "Users can manage sources for their endpoints" ON "public"."api_endpoint_sources";
CREATE POLICY "Users can manage sources for their endpoints" ON "public"."api_endpoint_sources" USING ((EXISTS ( SELECT 1
   FROM "public"."api_endpoints"
  WHERE (("api_endpoints"."id" = "api_endpoint_sources"."endpoint_id") AND ("api_endpoints"."user_id" = "auth"."uid"())))));



DROP POLICY IF EXISTS "Users can manage their own layouts" ON "public"."user_layouts";
CREATE POLICY "Users can manage their own layouts" ON "public"."user_layouts" USING (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can read content and widgets" ON "public"."content";
CREATE POLICY "Users can read content and widgets" ON "public"."content" FOR SELECT USING ((("type" = 'widget'::"text") OR ("auth"."uid"() = "user_id")));



DROP POLICY IF EXISTS "Users can update banner schedules" ON "public"."banner_schedules";
CREATE POLICY "Users can update banner schedules" ON "public"."banner_schedules" FOR UPDATE TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Users can update content and widgets" ON "public"."content";
CREATE POLICY "Users can update content and widgets" ON "public"."content" FOR UPDATE USING ((("type" = 'widget'::"text") OR ("auth"."uid"() = "user_id"))) WITH CHECK ((("type" = 'widget'::"text") OR ("auth"."uid"() = "user_id")));



DROP POLICY IF EXISTS "Users can update own content" ON "public"."vs_content";
CREATE POLICY "Users can update own content" ON "public"."vs_content" FOR UPDATE USING (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can update own map settings" ON "public"."map_settings";
CREATE POLICY "Users can update own map settings" ON "public"."map_settings" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can update sponsor schedules" ON "public"."sponsor_schedules";
CREATE POLICY "Users can update sponsor schedules" ON "public"."sponsor_schedules" FOR UPDATE TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Users can update their own endpoints" ON "public"."api_endpoints";
CREATE POLICY "Users can update their own endpoints" ON "public"."api_endpoints" FOR UPDATE USING (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can view banner schedules" ON "public"."banner_schedules";
CREATE POLICY "Users can view banner schedules" ON "public"."banner_schedules" FOR SELECT TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Users can view logs for their endpoints" ON "public"."api_access_logs";
CREATE POLICY "Users can view logs for their endpoints" ON "public"."api_access_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."api_endpoints"
  WHERE (("api_endpoints"."id" = "api_access_logs"."endpoint_id") AND ("api_endpoints"."user_id" = "auth"."uid"())))));



DROP POLICY IF EXISTS "Users can view own content" ON "public"."vs_content";
CREATE POLICY "Users can view own content" ON "public"."vs_content" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("user_id" = '00000000-0000-0000-0000-000000000000'::"uuid")));



DROP POLICY IF EXISTS "Users can view own map settings" ON "public"."map_settings";
CREATE POLICY "Users can view own map settings" ON "public"."map_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



DROP POLICY IF EXISTS "Users can view public content" ON "public"."vs_content";
CREATE POLICY "Users can view public content" ON "public"."vs_content" FOR SELECT USING (("is_public" = true));



DROP POLICY IF EXISTS "Users can view sponsor schedules" ON "public"."sponsor_schedules";
CREATE POLICY "Users can view sponsor schedules" ON "public"."sponsor_schedules" FOR SELECT TO "authenticated" USING (true);



DROP POLICY IF EXISTS "Users can view their own or active endpoints" ON "public"."api_endpoints";
CREATE POLICY "Users can view their own or active endpoints" ON "public"."api_endpoints" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("active" = true)));



DROP POLICY IF EXISTS "Users can view their own sync logs" ON "public"."data_source_sync_logs";
CREATE POLICY "Users can view their own sync logs" ON "public"."data_source_sync_logs" FOR SELECT USING (("data_source_id" IN ( SELECT "data_sources"."id"
   FROM "public"."data_sources"
  WHERE ("data_sources"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."agent_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_insights_elections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_insights_finance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_insights_weather" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_prompt_injectors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_providers" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "ai_providers_delete_policy" ON "public"."ai_providers";
CREATE POLICY "ai_providers_delete_policy" ON "public"."ai_providers" FOR DELETE TO "authenticated" USING (("organization_id" IN ( SELECT "u_users"."organization_id"
   FROM "public"."u_users"
  WHERE (("u_users"."auth_user_id" = "auth"."uid"()) AND ("u_users"."org_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



DROP POLICY IF EXISTS "ai_providers_insert_policy" ON "public"."ai_providers";
CREATE POLICY "ai_providers_insert_policy" ON "public"."ai_providers" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "u_users"."organization_id"
   FROM "public"."u_users"
  WHERE (("u_users"."auth_user_id" = "auth"."uid"()) AND ("u_users"."org_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



DROP POLICY IF EXISTS "ai_providers_select_policy" ON "public"."ai_providers";
CREATE POLICY "ai_providers_select_policy" ON "public"."ai_providers" FOR SELECT TO "authenticated" USING ((("organization_id" IS NULL) OR ("organization_id" IN ( SELECT "u_users"."organization_id"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())))));



DROP POLICY IF EXISTS "ai_providers_update_policy" ON "public"."ai_providers";
CREATE POLICY "ai_providers_update_policy" ON "public"."ai_providers" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "u_users"."organization_id"
   FROM "public"."u_users"
  WHERE (("u_users"."auth_user_id" = "auth"."uid"()) AND ("u_users"."org_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK (("organization_id" IN ( SELECT "u_users"."organization_id"
   FROM "public"."u_users"
  WHERE (("u_users"."auth_user_id" = "auth"."uid"()) AND ("u_users"."org_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



DROP POLICY IF EXISTS "all select" ON "public"."e_ap_call_history";
CREATE POLICY "all select" ON "public"."e_ap_call_history" FOR SELECT USING (true);



DROP POLICY IF EXISTS "allow all public" ON "public"."ai_prompt_injectors";
CREATE POLICY "allow all public" ON "public"."ai_prompt_injectors" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "allow insert" ON "public"."e_synthetic_races";
CREATE POLICY "allow insert" ON "public"."e_synthetic_races" FOR INSERT WITH CHECK (true);



DROP POLICY IF EXISTS "allow public all" ON "public"."api_endpoint_sources";
CREATE POLICY "allow public all" ON "public"."api_endpoint_sources" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "allow public all" ON "public"."api_endpoints";
CREATE POLICY "allow public all" ON "public"."api_endpoints" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "allow public all" ON "public"."data_sources";
CREATE POLICY "allow public all" ON "public"."data_sources" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "allow public all" ON "public"."e_ap_call_history";
CREATE POLICY "allow public all" ON "public"."e_ap_call_history" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "allow public all" ON "public"."f_stocks";
CREATE POLICY "allow public all" ON "public"."f_stocks" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "allow public update" ON "public"."e_race_results";
CREATE POLICY "allow public update" ON "public"."e_race_results" FOR UPDATE USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "allow read" ON "public"."e_synthetic_races";
CREATE POLICY "allow read" ON "public"."e_synthetic_races" FOR SELECT USING (true);



DROP POLICY IF EXISTS "allow_all_deletes_testing" ON "public"."vs_content";
CREATE POLICY "allow_all_deletes_testing" ON "public"."vs_content" FOR DELETE USING (true);



DROP POLICY IF EXISTS "allow_all_folders_testing" ON "public"."vs_content_folders";
CREATE POLICY "allow_all_folders_testing" ON "public"."vs_content_folders" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "allow_all_inserts_testing" ON "public"."vs_content";
CREATE POLICY "allow_all_inserts_testing" ON "public"."vs_content" FOR INSERT WITH CHECK (true);



DROP POLICY IF EXISTS "allow_all_selects_testing" ON "public"."vs_content";
CREATE POLICY "allow_all_selects_testing" ON "public"."vs_content" FOR SELECT USING (true);



DROP POLICY IF EXISTS "allow_all_updates_testing" ON "public"."vs_content";
CREATE POLICY "allow_all_updates_testing" ON "public"."vs_content" FOR UPDATE USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "allow_authenticated_select" ON "public"."u_organizations";
CREATE POLICY "allow_authenticated_select" ON "public"."u_organizations" FOR SELECT TO "authenticated" USING (true);



DROP POLICY IF EXISTS "allow_delete_data_providers" ON "public"."data_providers";
CREATE POLICY "allow_delete_data_providers" ON "public"."data_providers" FOR DELETE TO "authenticated" USING ((( SELECT "u_users"."is_superuser"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1) = true));



DROP POLICY IF EXISTS "allow_delete_f_stocks" ON "public"."f_stocks";
CREATE POLICY "allow_delete_f_stocks" ON "public"."f_stocks" FOR DELETE TO "authenticated" USING ((( SELECT "u_users"."is_superuser"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1) = true));



DROP POLICY IF EXISTS "allow_delete_weather_locations" ON "public"."weather_locations";
CREATE POLICY "allow_delete_weather_locations" ON "public"."weather_locations" FOR DELETE TO "authenticated", "anon" USING (true);



DROP POLICY IF EXISTS "allow_insert_data_providers" ON "public"."data_providers";
CREATE POLICY "allow_insert_data_providers" ON "public"."data_providers" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "u_users"."is_superuser"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1) = true));



DROP POLICY IF EXISTS "allow_insert_f_stocks" ON "public"."f_stocks";
CREATE POLICY "allow_insert_f_stocks" ON "public"."f_stocks" FOR INSERT TO "authenticated" WITH CHECK (true);



DROP POLICY IF EXISTS "allow_select_data_providers" ON "public"."data_providers";
CREATE POLICY "allow_select_data_providers" ON "public"."data_providers" FOR SELECT USING (true);



DROP POLICY IF EXISTS "allow_select_f_stocks" ON "public"."f_stocks";
CREATE POLICY "allow_select_f_stocks" ON "public"."f_stocks" FOR SELECT USING (true);



DROP POLICY IF EXISTS "allow_update_data_providers" ON "public"."data_providers";
CREATE POLICY "allow_update_data_providers" ON "public"."data_providers" FOR UPDATE TO "authenticated" USING ((( SELECT "u_users"."is_superuser"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1) = true));



DROP POLICY IF EXISTS "allow_update_f_stocks" ON "public"."f_stocks";
CREATE POLICY "allow_update_f_stocks" ON "public"."f_stocks" FOR UPDATE TO "authenticated" USING (true);



DROP POLICY IF EXISTS "anon_check_superuser_exists" ON "public"."u_users";
CREATE POLICY "anon_check_superuser_exists" ON "public"."u_users" FOR SELECT TO "anon" USING (("is_superuser" = true));



ALTER TABLE "public"."api_access_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_documentation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_endpoint_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_endpoints" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "authenticated_read_users" ON "public"."u_users";
CREATE POLICY "authenticated_read_users" ON "public"."u_users" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."banner_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bop_election_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bop_insufficient_vote_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bop_net_changes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bop_party_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channel_playlists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_dashboards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_source_sync_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_sources" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "delete_u_invitations" ON "public"."u_invitations";
CREATE POLICY "delete_u_invitations" ON "public"."u_invitations" FOR DELETE TO "authenticated" USING (((( SELECT "u_users"."is_superuser"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1) = true) OR (("organization_id" = ( SELECT "u_users"."organization_id"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1)) AND (( SELECT "u_users"."org_role"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1) = ANY (ARRAY['owner'::"text", 'admin'::"text"])))));



ALTER TABLE "public"."e_ap_call_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_ballot_measure_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_ballot_measures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_candidate_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_candidates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_countries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_election_data_ingestion_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_election_data_overrides_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_election_data_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_election_editorial_content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_elections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_exit_polls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_geographic_divisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_historical_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_media_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_parties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_race_candidates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_race_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_races" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."e_synthetic_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."f_stocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feeds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gfx_animation_presets" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_animation_presets_anon_select" ON "public"."gfx_animation_presets";
CREATE POLICY "gfx_animation_presets_anon_select" ON "public"."gfx_animation_presets" FOR SELECT TO "anon" USING (true);



DROP POLICY IF EXISTS "gfx_animation_presets_auth_all" ON "public"."gfx_animation_presets";
CREATE POLICY "gfx_animation_presets_auth_all" ON "public"."gfx_animation_presets" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."gfx_animations" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_animations_anon_select" ON "public"."gfx_animations";
CREATE POLICY "gfx_animations_anon_select" ON "public"."gfx_animations" FOR SELECT TO "anon" USING (true);



DROP POLICY IF EXISTS "gfx_animations_auth_all" ON "public"."gfx_animations";
CREATE POLICY "gfx_animations_auth_all" ON "public"."gfx_animations" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."gfx_bindings" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_bindings_anon_select" ON "public"."gfx_bindings";
CREATE POLICY "gfx_bindings_anon_select" ON "public"."gfx_bindings" FOR SELECT TO "anon" USING (true);



DROP POLICY IF EXISTS "gfx_bindings_auth_all" ON "public"."gfx_bindings";
CREATE POLICY "gfx_bindings_auth_all" ON "public"."gfx_bindings" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."gfx_chat_history" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_chat_history_auth_all" ON "public"."gfx_chat_history";
CREATE POLICY "gfx_chat_history_auth_all" ON "public"."gfx_chat_history" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."gfx_chat_messages" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_chat_messages_auth_all" ON "public"."gfx_chat_messages";
CREATE POLICY "gfx_chat_messages_auth_all" ON "public"."gfx_chat_messages" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."gfx_elements" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_elements_anon_select" ON "public"."gfx_elements";
CREATE POLICY "gfx_elements_anon_select" ON "public"."gfx_elements" FOR SELECT TO "anon" USING (true);



DROP POLICY IF EXISTS "gfx_elements_auth_all" ON "public"."gfx_elements";
CREATE POLICY "gfx_elements_auth_all" ON "public"."gfx_elements" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."gfx_folders" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_folders_auth_all" ON "public"."gfx_folders";
CREATE POLICY "gfx_folders_auth_all" ON "public"."gfx_folders" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."gfx_keyframes" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_keyframes_anon_select" ON "public"."gfx_keyframes";
CREATE POLICY "gfx_keyframes_anon_select" ON "public"."gfx_keyframes" FOR SELECT TO "anon" USING (true);



DROP POLICY IF EXISTS "gfx_keyframes_auth_all" ON "public"."gfx_keyframes";
CREATE POLICY "gfx_keyframes_auth_all" ON "public"."gfx_keyframes" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."gfx_layers" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_layers_anon_select" ON "public"."gfx_layers";
CREATE POLICY "gfx_layers_anon_select" ON "public"."gfx_layers" FOR SELECT TO "anon" USING (true);



DROP POLICY IF EXISTS "gfx_layers_auth_all" ON "public"."gfx_layers";
CREATE POLICY "gfx_layers_auth_all" ON "public"."gfx_layers" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."gfx_playback_commands" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_playback_commands_anon_all" ON "public"."gfx_playback_commands";
CREATE POLICY "gfx_playback_commands_anon_all" ON "public"."gfx_playback_commands" TO "anon" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "gfx_playback_commands_auth_all" ON "public"."gfx_playback_commands";
CREATE POLICY "gfx_playback_commands_auth_all" ON "public"."gfx_playback_commands" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."gfx_playback_state" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_playback_state_anon_all" ON "public"."gfx_playback_state";
CREATE POLICY "gfx_playback_state_anon_all" ON "public"."gfx_playback_state" TO "anon" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "gfx_playback_state_auth_all" ON "public"."gfx_playback_state";
CREATE POLICY "gfx_playback_state_auth_all" ON "public"."gfx_playback_state" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."gfx_project_design_systems" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_project_design_systems_anon_select" ON "public"."gfx_project_design_systems";
CREATE POLICY "gfx_project_design_systems_anon_select" ON "public"."gfx_project_design_systems" FOR SELECT TO "anon" USING (true);



DROP POLICY IF EXISTS "gfx_project_design_systems_auth_all" ON "public"."gfx_project_design_systems";
CREATE POLICY "gfx_project_design_systems_auth_all" ON "public"."gfx_project_design_systems" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."gfx_projects" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_projects_anon_select" ON "public"."gfx_projects";
CREATE POLICY "gfx_projects_anon_select" ON "public"."gfx_projects" FOR SELECT TO "anon" USING (true);



DROP POLICY IF EXISTS "gfx_projects_auth_all" ON "public"."gfx_projects";
CREATE POLICY "gfx_projects_auth_all" ON "public"."gfx_projects" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."gfx_support_tickets" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_support_tickets_auth_all" ON "public"."gfx_support_tickets";
CREATE POLICY "gfx_support_tickets_auth_all" ON "public"."gfx_support_tickets" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."gfx_template_versions" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_template_versions_auth_all" ON "public"."gfx_template_versions";
CREATE POLICY "gfx_template_versions_auth_all" ON "public"."gfx_template_versions" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."gfx_templates" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "gfx_templates_anon_select" ON "public"."gfx_templates";
CREATE POLICY "gfx_templates_anon_select" ON "public"."gfx_templates" FOR SELECT TO "anon" USING (true);



DROP POLICY IF EXISTS "gfx_templates_auth_all" ON "public"."gfx_templates";
CREATE POLICY "gfx_templates_auth_all" ON "public"."gfx_templates" TO "authenticated" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "insert_synthetic_races" ON "public"."e_synthetic_races";
CREATE POLICY "insert_synthetic_races" ON "public"."e_synthetic_races" FOR INSERT WITH CHECK ((("user_id" IS NULL) OR ("user_id" = "auth"."uid"())));



DROP POLICY IF EXISTS "insert_u_invitations" ON "public"."u_invitations";
CREATE POLICY "insert_u_invitations" ON "public"."u_invitations" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "u_users"."is_superuser"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1) = true) OR (("organization_id" = ( SELECT "u_users"."organization_id"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1)) AND (( SELECT "u_users"."org_role"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1) = ANY (ARRAY['owner'::"text", 'admin'::"text"])))));



ALTER TABLE "public"."item_tabfields" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kv_store_7eabc66c" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."map_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_articles" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "org_delete_agents" ON "public"."agents";
CREATE POLICY "org_delete_agents" ON "public"."agents" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_ai_providers" ON "public"."ai_providers";
CREATE POLICY "org_delete_ai_providers" ON "public"."ai_providers" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_api_endpoints" ON "public"."api_endpoints";
CREATE POLICY "org_delete_api_endpoints" ON "public"."api_endpoints" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_banner_schedules" ON "public"."banner_schedules";
CREATE POLICY "org_delete_banner_schedules" ON "public"."banner_schedules" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_channel_playlists" ON "public"."channel_playlists";
CREATE POLICY "org_delete_channel_playlists" ON "public"."channel_playlists" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_channels" ON "public"."channels";
CREATE POLICY "org_delete_channels" ON "public"."channels" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_content" ON "public"."content";
CREATE POLICY "org_delete_content" ON "public"."content" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_customer_dashboards" ON "public"."customer_dashboards";
CREATE POLICY "org_delete_customer_dashboards" ON "public"."customer_dashboards" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_data_sources" ON "public"."data_sources";
CREATE POLICY "org_delete_data_sources" ON "public"."data_sources" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_e_candidates" ON "public"."e_candidates";
CREATE POLICY "org_delete_e_candidates" ON "public"."e_candidates" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_e_elections" ON "public"."e_elections";
CREATE POLICY "org_delete_e_elections" ON "public"."e_elections" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_e_races" ON "public"."e_races";
CREATE POLICY "org_delete_e_races" ON "public"."e_races" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_feeds" ON "public"."feeds";
CREATE POLICY "org_delete_feeds" ON "public"."feeds" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_news_articles" ON "public"."news_articles";
CREATE POLICY "org_delete_news_articles" ON "public"."news_articles" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_school_closings" ON "public"."school_closings";
CREATE POLICY "org_delete_school_closings" ON "public"."school_closings" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_sponsor_schedules" ON "public"."sponsor_schedules";
CREATE POLICY "org_delete_sponsor_schedules" ON "public"."sponsor_schedules" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_templates" ON "public"."templates";
CREATE POLICY "org_delete_templates" ON "public"."templates" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_delete_weather_locations" ON "public"."weather_locations";
CREATE POLICY "org_delete_weather_locations" ON "public"."weather_locations" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_insert_agents" ON "public"."agents";
CREATE POLICY "org_insert_agents" ON "public"."agents" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_ai_providers" ON "public"."ai_providers";
CREATE POLICY "org_insert_ai_providers" ON "public"."ai_providers" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_api_endpoints" ON "public"."api_endpoints";
CREATE POLICY "org_insert_api_endpoints" ON "public"."api_endpoints" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_banner_schedules" ON "public"."banner_schedules";
CREATE POLICY "org_insert_banner_schedules" ON "public"."banner_schedules" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_channel_playlists" ON "public"."channel_playlists";
CREATE POLICY "org_insert_channel_playlists" ON "public"."channel_playlists" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_channels" ON "public"."channels";
CREATE POLICY "org_insert_channels" ON "public"."channels" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_content" ON "public"."content";
CREATE POLICY "org_insert_content" ON "public"."content" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_customer_dashboards" ON "public"."customer_dashboards";
CREATE POLICY "org_insert_customer_dashboards" ON "public"."customer_dashboards" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_data_sources" ON "public"."data_sources";
CREATE POLICY "org_insert_data_sources" ON "public"."data_sources" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_e_candidates" ON "public"."e_candidates";
CREATE POLICY "org_insert_e_candidates" ON "public"."e_candidates" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_e_elections" ON "public"."e_elections";
CREATE POLICY "org_insert_e_elections" ON "public"."e_elections" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_e_races" ON "public"."e_races";
CREATE POLICY "org_insert_e_races" ON "public"."e_races" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_feeds" ON "public"."feeds";
CREATE POLICY "org_insert_feeds" ON "public"."feeds" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_news_articles" ON "public"."news_articles";
CREATE POLICY "org_insert_news_articles" ON "public"."news_articles" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_school_closings" ON "public"."school_closings";
CREATE POLICY "org_insert_school_closings" ON "public"."school_closings" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_sponsor_schedules" ON "public"."sponsor_schedules";
CREATE POLICY "org_insert_sponsor_schedules" ON "public"."sponsor_schedules" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_templates" ON "public"."templates";
CREATE POLICY "org_insert_templates" ON "public"."templates" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_insert_weather_locations" ON "public"."weather_locations";
CREATE POLICY "org_insert_weather_locations" ON "public"."weather_locations" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



DROP POLICY IF EXISTS "org_select_agents" ON "public"."agents";
CREATE POLICY "org_select_agents" ON "public"."agents" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_ai_providers" ON "public"."ai_providers";
CREATE POLICY "org_select_ai_providers" ON "public"."ai_providers" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_api_endpoints" ON "public"."api_endpoints";
CREATE POLICY "org_select_api_endpoints" ON "public"."api_endpoints" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_banner_schedules" ON "public"."banner_schedules";
CREATE POLICY "org_select_banner_schedules" ON "public"."banner_schedules" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_channel_playlists" ON "public"."channel_playlists";
CREATE POLICY "org_select_channel_playlists" ON "public"."channel_playlists" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_channels" ON "public"."channels";
CREATE POLICY "org_select_channels" ON "public"."channels" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_content" ON "public"."content";
CREATE POLICY "org_select_content" ON "public"."content" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_customer_dashboards" ON "public"."customer_dashboards";
CREATE POLICY "org_select_customer_dashboards" ON "public"."customer_dashboards" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_data_sources" ON "public"."data_sources";
CREATE POLICY "org_select_data_sources" ON "public"."data_sources" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_e_candidates" ON "public"."e_candidates";
CREATE POLICY "org_select_e_candidates" ON "public"."e_candidates" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_e_elections" ON "public"."e_elections";
CREATE POLICY "org_select_e_elections" ON "public"."e_elections" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_e_races" ON "public"."e_races";
CREATE POLICY "org_select_e_races" ON "public"."e_races" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_feeds" ON "public"."feeds";
CREATE POLICY "org_select_feeds" ON "public"."feeds" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_news_articles" ON "public"."news_articles";
CREATE POLICY "org_select_news_articles" ON "public"."news_articles" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_school_closings" ON "public"."school_closings";
CREATE POLICY "org_select_school_closings" ON "public"."school_closings" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_sponsor_schedules" ON "public"."sponsor_schedules";
CREATE POLICY "org_select_sponsor_schedules" ON "public"."sponsor_schedules" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_templates" ON "public"."templates";
CREATE POLICY "org_select_templates" ON "public"."templates" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_select_weather_locations" ON "public"."weather_locations";
CREATE POLICY "org_select_weather_locations" ON "public"."weather_locations" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_agents" ON "public"."agents";
CREATE POLICY "org_update_agents" ON "public"."agents" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_ai_providers" ON "public"."ai_providers";
CREATE POLICY "org_update_ai_providers" ON "public"."ai_providers" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_api_endpoints" ON "public"."api_endpoints";
CREATE POLICY "org_update_api_endpoints" ON "public"."api_endpoints" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_banner_schedules" ON "public"."banner_schedules";
CREATE POLICY "org_update_banner_schedules" ON "public"."banner_schedules" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_channel_playlists" ON "public"."channel_playlists";
CREATE POLICY "org_update_channel_playlists" ON "public"."channel_playlists" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_channels" ON "public"."channels";
CREATE POLICY "org_update_channels" ON "public"."channels" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_content" ON "public"."content";
CREATE POLICY "org_update_content" ON "public"."content" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_customer_dashboards" ON "public"."customer_dashboards";
CREATE POLICY "org_update_customer_dashboards" ON "public"."customer_dashboards" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_data_sources" ON "public"."data_sources";
CREATE POLICY "org_update_data_sources" ON "public"."data_sources" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_e_candidates" ON "public"."e_candidates";
CREATE POLICY "org_update_e_candidates" ON "public"."e_candidates" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_e_elections" ON "public"."e_elections";
CREATE POLICY "org_update_e_elections" ON "public"."e_elections" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_e_races" ON "public"."e_races";
CREATE POLICY "org_update_e_races" ON "public"."e_races" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_feeds" ON "public"."feeds";
CREATE POLICY "org_update_feeds" ON "public"."feeds" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_news_articles" ON "public"."news_articles";
CREATE POLICY "org_update_news_articles" ON "public"."news_articles" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_school_closings" ON "public"."school_closings";
CREATE POLICY "org_update_school_closings" ON "public"."school_closings" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_sponsor_schedules" ON "public"."sponsor_schedules";
CREATE POLICY "org_update_sponsor_schedules" ON "public"."sponsor_schedules" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_templates" ON "public"."templates";
CREATE POLICY "org_update_templates" ON "public"."templates" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



DROP POLICY IF EXISTS "org_update_weather_locations" ON "public"."weather_locations";
CREATE POLICY "org_update_weather_locations" ON "public"."weather_locations" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) OR "public"."is_superuser"()));



ALTER TABLE "public"."organization_textures" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "organization_textures_authenticated_all" ON "public"."organization_textures";
CREATE POLICY "organization_textures_authenticated_all" ON "public"."organization_textures" TO "authenticated" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "public insert allowed" ON "public"."e_synthetic_candidate_results";
CREATE POLICY "public insert allowed" ON "public"."e_synthetic_candidate_results" FOR INSERT WITH CHECK (true);



DROP POLICY IF EXISTS "public insert allowed" ON "public"."e_synthetic_race_candidates";
CREATE POLICY "public insert allowed" ON "public"."e_synthetic_race_candidates" FOR INSERT WITH CHECK (true);



DROP POLICY IF EXISTS "public insert allowed" ON "public"."e_synthetic_race_results";
CREATE POLICY "public insert allowed" ON "public"."e_synthetic_race_results" FOR INSERT WITH CHECK (true);



DROP POLICY IF EXISTS "public insert allowed" ON "public"."e_synthetic_races";
CREATE POLICY "public insert allowed" ON "public"."e_synthetic_races" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."pulsar_channel_state" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "pulsar_channel_state_anon_all" ON "public"."pulsar_channel_state";
CREATE POLICY "pulsar_channel_state_anon_all" ON "public"."pulsar_channel_state" TO "anon" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "pulsar_channel_state_anon_update" ON "public"."pulsar_channel_state";
CREATE POLICY "pulsar_channel_state_anon_update" ON "public"."pulsar_channel_state" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "pulsar_channel_state_auth_all" ON "public"."pulsar_channel_state";
CREATE POLICY "pulsar_channel_state_auth_all" ON "public"."pulsar_channel_state" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."pulsar_channels" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "pulsar_channels_anon_select" ON "public"."pulsar_channels";
CREATE POLICY "pulsar_channels_anon_select" ON "public"."pulsar_channels" FOR SELECT TO "anon" USING (true);



DROP POLICY IF EXISTS "pulsar_channels_anon_update" ON "public"."pulsar_channels";
CREATE POLICY "pulsar_channels_anon_update" ON "public"."pulsar_channels" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "pulsar_channels_auth_all" ON "public"."pulsar_channels";
CREATE POLICY "pulsar_channels_auth_all" ON "public"."pulsar_channels" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."pulsar_command_log" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "pulsar_command_log_auth_insert" ON "public"."pulsar_command_log";
CREATE POLICY "pulsar_command_log_auth_insert" ON "public"."pulsar_command_log" FOR INSERT TO "authenticated" WITH CHECK (true);



DROP POLICY IF EXISTS "pulsar_command_log_auth_select" ON "public"."pulsar_command_log";
CREATE POLICY "pulsar_command_log_auth_select" ON "public"."pulsar_command_log" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."pulsar_custom_ui_controls" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "pulsar_custom_ui_controls_auth_all" ON "public"."pulsar_custom_ui_controls";
CREATE POLICY "pulsar_custom_ui_controls_auth_all" ON "public"."pulsar_custom_ui_controls" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."pulsar_custom_uis" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "pulsar_custom_uis_auth_all" ON "public"."pulsar_custom_uis";
CREATE POLICY "pulsar_custom_uis_auth_all" ON "public"."pulsar_custom_uis" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."pulsar_page_groups" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "pulsar_page_groups_auth_all" ON "public"."pulsar_page_groups";
CREATE POLICY "pulsar_page_groups_auth_all" ON "public"."pulsar_page_groups" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."pulsar_page_library" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "pulsar_page_library_auth_all" ON "public"."pulsar_page_library";
CREATE POLICY "pulsar_page_library_auth_all" ON "public"."pulsar_page_library" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."pulsar_pages" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "pulsar_pages_anon_select" ON "public"."pulsar_pages";
CREATE POLICY "pulsar_pages_anon_select" ON "public"."pulsar_pages" FOR SELECT TO "anon" USING (true);



DROP POLICY IF EXISTS "pulsar_pages_auth_all" ON "public"."pulsar_pages";
CREATE POLICY "pulsar_pages_auth_all" ON "public"."pulsar_pages" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."pulsar_playlist_page_links" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "pulsar_playlist_page_links_auth_all" ON "public"."pulsar_playlist_page_links";
CREATE POLICY "pulsar_playlist_page_links_auth_all" ON "public"."pulsar_playlist_page_links" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."pulsar_playlists" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "pulsar_playlists_anon_select" ON "public"."pulsar_playlists";
CREATE POLICY "pulsar_playlists_anon_select" ON "public"."pulsar_playlists" FOR SELECT TO "anon" USING (true);



DROP POLICY IF EXISTS "pulsar_playlists_auth_all" ON "public"."pulsar_playlists";
CREATE POLICY "pulsar_playlists_auth_all" ON "public"."pulsar_playlists" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."pulsar_playout_log" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "pulsar_playout_log_anon_insert" ON "public"."pulsar_playout_log";
CREATE POLICY "pulsar_playout_log_anon_insert" ON "public"."pulsar_playout_log" FOR INSERT TO "anon" WITH CHECK (true);



DROP POLICY IF EXISTS "pulsar_playout_log_auth_insert" ON "public"."pulsar_playout_log";
CREATE POLICY "pulsar_playout_log_auth_insert" ON "public"."pulsar_playout_log" FOR INSERT TO "authenticated" WITH CHECK (true);



DROP POLICY IF EXISTS "pulsar_playout_log_auth_select" ON "public"."pulsar_playout_log";
CREATE POLICY "pulsar_playout_log_auth_select" ON "public"."pulsar_playout_log" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."pulsar_user_preferences" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "pulsar_user_preferences_auth_all" ON "public"."pulsar_user_preferences";
CREATE POLICY "pulsar_user_preferences_auth_all" ON "public"."pulsar_user_preferences" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."pulsarvs_playlist_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pulsarvs_playlists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pulsarvs_projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."school_closings" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "select_synthetic_races" ON "public"."e_synthetic_races";
CREATE POLICY "select_synthetic_races" ON "public"."e_synthetic_races" FOR SELECT USING (true);



DROP POLICY IF EXISTS "select_u_invitations" ON "public"."u_invitations";
CREATE POLICY "select_u_invitations" ON "public"."u_invitations" FOR SELECT TO "authenticated" USING (((( SELECT "u_users"."is_superuser"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1) = true) OR (("organization_id" = ( SELECT "u_users"."organization_id"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1)) AND (( SELECT "u_users"."org_role"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1) = ANY (ARRAY['owner'::"text", 'admin'::"text"])))));



DROP POLICY IF EXISTS "service_role_all" ON "public"."u_users";
CREATE POLICY "service_role_all" ON "public"."u_users" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."sponsor_schedules" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "superuser_only_delete" ON "public"."u_organizations";
CREATE POLICY "superuser_only_delete" ON "public"."u_organizations" FOR DELETE TO "authenticated" USING ((( SELECT "u_users"."is_superuser"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1) = true));



DROP POLICY IF EXISTS "superuser_only_insert" ON "public"."u_organizations";
CREATE POLICY "superuser_only_insert" ON "public"."u_organizations" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "u_users"."is_superuser"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1) = true));



DROP POLICY IF EXISTS "superuser_only_update" ON "public"."u_organizations";
CREATE POLICY "superuser_only_update" ON "public"."u_organizations" FOR UPDATE TO "authenticated" USING ((( SELECT "u_users"."is_superuser"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1) = true));



DROP POLICY IF EXISTS "superusers_can_update_all" ON "public"."u_users";
CREATE POLICY "superusers_can_update_all" ON "public"."u_users" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."u_users" "u_users_1"
  WHERE (("u_users_1"."auth_user_id" = "auth"."uid"()) AND ("u_users_1"."is_superuser" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."u_users" "u_users_1"
  WHERE (("u_users_1"."auth_user_id" = "auth"."uid"()) AND ("u_users_1"."is_superuser" = true)))));



ALTER TABLE "public"."tabfields" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_forms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."u_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."u_organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."u_users" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "update_u_invitations" ON "public"."u_invitations";
CREATE POLICY "update_u_invitations" ON "public"."u_invitations" FOR UPDATE TO "authenticated" USING (((( SELECT "u_users"."is_superuser"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1) = true) OR (("organization_id" = ( SELECT "u_users"."organization_id"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1)) AND (( SELECT "u_users"."org_role"
   FROM "public"."u_users"
  WHERE ("u_users"."auth_user_id" = "auth"."uid"())
 LIMIT 1) = ANY (ARRAY['owner'::"text", 'admin'::"text"])))));



ALTER TABLE "public"."user_layouts" ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "users_can_update_own" ON "public"."u_users";
CREATE POLICY "users_can_update_own" ON "public"."u_users" FOR UPDATE TO "authenticated" USING (("auth_user_id" = "auth"."uid"())) WITH CHECK (("auth_user_id" = "auth"."uid"()));



ALTER TABLE "public"."vs_content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vs_content_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weather_air_quality" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weather_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weather_current" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weather_daily_forecast" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weather_hourly_forecast" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weather_location_channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weather_locations" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."_normalize_custom_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."_normalize_custom_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_normalize_custom_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_u_invitation"("p_token" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_u_invitation"("p_token" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_u_invitation"("p_token" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_sync_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_sync_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_sync_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_trigger_syncs"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_trigger_syncs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_trigger_syncs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_is_superuser"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_superuser"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_superuser"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_pg_net_request"("request_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."check_pg_net_request"("request_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_pg_net_request"("request_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_sync_intervals_detailed"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_sync_intervals_detailed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_sync_intervals_detailed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_sync_results"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_sync_results"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_sync_results"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_log_tables"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_log_tables"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_log_tables"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_agent_runs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_agent_runs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_agent_runs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_drafts"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_drafts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_drafts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_weather_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_weather_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_weather_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_stuck_syncs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_stuck_syncs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_stuck_syncs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."copy_gfx_project_complete"("p_source_project_id" "uuid", "p_target_org_id" "uuid", "p_new_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."copy_gfx_project_complete"("p_source_project_id" "uuid", "p_target_org_id" "uuid", "p_new_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."copy_gfx_project_complete"("p_source_project_id" "uuid", "p_target_org_id" "uuid", "p_new_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_data_provider"("_type" "text", "_category" "text", "_name" "text", "_id" "text", "_description" "text", "_is_active" boolean, "_api_key" "text", "_api_secret" "text", "_base_url" "text", "_api_version" "text", "_config" "jsonb", "_source_url" "text", "_storage_path" "text", "_refresh_interval_minutes" integer, "_last_run" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."create_data_provider"("_type" "text", "_category" "text", "_name" "text", "_id" "text", "_description" "text", "_is_active" boolean, "_api_key" "text", "_api_secret" "text", "_base_url" "text", "_api_version" "text", "_config" "jsonb", "_source_url" "text", "_storage_path" "text", "_refresh_interval_minutes" integer, "_last_run" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_data_provider"("_type" "text", "_category" "text", "_name" "text", "_id" "text", "_description" "text", "_is_active" boolean, "_api_key" "text", "_api_secret" "text", "_base_url" "text", "_api_version" "text", "_config" "jsonb", "_source_url" "text", "_storage_path" "text", "_refresh_interval_minutes" integer, "_last_run" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_invitation"("p_user_id" "uuid", "p_email" "text", "p_organization_id" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_invitation"("p_user_id" "uuid", "p_email" "text", "p_organization_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invitation"("p_user_id" "uuid", "p_email" "text", "p_organization_id" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_organization_with_seed"("p_name" "text", "p_slug" "text", "p_allowed_domains" "text"[], "p_admin_email" "text", "p_seed_config" "jsonb", "p_dashboard_config" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_organization_with_seed"("p_name" "text", "p_slug" "text", "p_allowed_domains" "text"[], "p_admin_email" "text", "p_seed_config" "jsonb", "p_dashboard_config" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_organization_with_seed"("p_name" "text", "p_slug" "text", "p_allowed_domains" "text"[], "p_admin_email" "text", "p_seed_config" "jsonb", "p_dashboard_config" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_project"("p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "text", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_project"("p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "text", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_project"("p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "text", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_pulsar_channel_state"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_pulsar_channel_state"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_pulsar_channel_state"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_auth_uid"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_auth_uid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_auth_uid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_get_user_layout"("p_layout_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_get_user_layout"("p_layout_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_get_user_layout"("p_layout_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_data_provider"("_id" "text", "_type" "text", "_category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_data_provider"("_id" "text", "_type" "text", "_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_data_provider"("_id" "text", "_type" "text", "_category" "text") TO "service_role";



GRANT ALL ON TABLE "public"."map_settings" TO "anon";
GRANT ALL ON TABLE "public"."map_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."map_settings" TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_map_position"("p_user_id" "uuid", "p_position_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_map_position"("p_user_id" "uuid", "p_position_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_map_position"("p_user_id" "uuid", "p_position_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."e_calculate_party_strength"("p_party_id" "uuid", "p_election_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."e_calculate_party_strength"("p_party_id" "uuid", "p_election_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_calculate_party_strength"("p_party_id" "uuid", "p_election_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."e_calculate_vote_percentages"() TO "anon";
GRANT ALL ON FUNCTION "public"."e_calculate_vote_percentages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_calculate_vote_percentages"() TO "service_role";



GRANT ALL ON FUNCTION "public"."e_create_synthetic_group"("p_name" character varying, "p_description" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."e_create_synthetic_group"("p_name" character varying, "p_description" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_create_synthetic_group"("p_name" character varying, "p_description" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."e_create_synthetic_race"("p_user_id" "uuid", "p_base_race_id" "uuid", "p_base_election_id" "uuid", "p_name" "text", "p_description" "text", "p_scenario_input" "jsonb", "p_ai_response" "jsonb", "p_summary" "jsonb", "p_office" "text", "p_state" "text", "p_district" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."e_create_synthetic_race"("p_user_id" "uuid", "p_base_race_id" "uuid", "p_base_election_id" "uuid", "p_name" "text", "p_description" "text", "p_scenario_input" "jsonb", "p_ai_response" "jsonb", "p_summary" "jsonb", "p_office" "text", "p_state" "text", "p_district" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_create_synthetic_race"("p_user_id" "uuid", "p_base_race_id" "uuid", "p_base_election_id" "uuid", "p_name" "text", "p_description" "text", "p_scenario_input" "jsonb", "p_ai_response" "jsonb", "p_summary" "jsonb", "p_office" "text", "p_state" "text", "p_district" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."e_create_synthetic_race"("p_user_id" "uuid", "p_base_race_id" "uuid", "p_base_election_id" "uuid", "p_name" character varying, "p_description" "text", "p_scenario_input" "jsonb", "p_ai_response" "jsonb", "p_office" character varying, "p_state" character varying, "p_district" character varying, "p_summary" "jsonb", "p_synthetic_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."e_create_synthetic_race"("p_user_id" "uuid", "p_base_race_id" "uuid", "p_base_election_id" "uuid", "p_name" character varying, "p_description" "text", "p_scenario_input" "jsonb", "p_ai_response" "jsonb", "p_office" character varying, "p_state" character varying, "p_district" character varying, "p_summary" "jsonb", "p_synthetic_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_create_synthetic_race"("p_user_id" "uuid", "p_base_race_id" "uuid", "p_base_election_id" "uuid", "p_name" character varying, "p_description" "text", "p_scenario_input" "jsonb", "p_ai_response" "jsonb", "p_office" character varying, "p_state" character varying, "p_district" character varying, "p_summary" "jsonb", "p_synthetic_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."e_delete_synthetic_group"("p_group_id" "uuid", "p_cascade_delete_races" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."e_delete_synthetic_group"("p_group_id" "uuid", "p_cascade_delete_races" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_delete_synthetic_group"("p_group_id" "uuid", "p_cascade_delete_races" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."e_delete_synthetic_race"("p_user_id" "uuid", "p_synthetic_race_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."e_delete_synthetic_race"("p_user_id" "uuid", "p_synthetic_race_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_delete_synthetic_race"("p_user_id" "uuid", "p_synthetic_race_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."e_get_effective_value"("original_value" "anyelement", "override_value" "anyelement") TO "anon";
GRANT ALL ON FUNCTION "public"."e_get_effective_value"("original_value" "anyelement", "override_value" "anyelement") TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_get_effective_value"("original_value" "anyelement", "override_value" "anyelement") TO "service_role";



GRANT ALL ON FUNCTION "public"."e_get_race_counties"("p_race_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."e_get_race_counties"("p_race_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_get_race_counties"("p_race_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."e_get_synthetic_race_full"("p_synthetic_race_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."e_get_synthetic_race_full"("p_synthetic_race_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_get_synthetic_race_full"("p_synthetic_race_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."e_get_synthetic_races"() TO "anon";
GRANT ALL ON FUNCTION "public"."e_get_synthetic_races"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_get_synthetic_races"() TO "service_role";



GRANT ALL ON FUNCTION "public"."e_list_synthetic_groups"() TO "anon";
GRANT ALL ON FUNCTION "public"."e_list_synthetic_groups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_list_synthetic_groups"() TO "service_role";



GRANT ALL ON FUNCTION "public"."e_list_synthetic_races"() TO "anon";
GRANT ALL ON FUNCTION "public"."e_list_synthetic_races"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_list_synthetic_races"() TO "service_role";



GRANT ALL ON TABLE "public"."e_synthetic_races" TO "anon";
GRANT ALL ON TABLE "public"."e_synthetic_races" TO "authenticated";
GRANT ALL ON TABLE "public"."e_synthetic_races" TO "service_role";



GRANT ALL ON FUNCTION "public"."e_list_synthetic_races"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."e_list_synthetic_races"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_list_synthetic_races"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."e_list_synthetic_races_by_group"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."e_list_synthetic_races_by_group"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_list_synthetic_races_by_group"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."e_log_override_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."e_log_override_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_log_override_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."e_merge_parties"("source_party_id" "uuid", "target_party_id" "uuid", "update_references" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."e_merge_parties"("source_party_id" "uuid", "target_party_id" "uuid", "update_references" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_merge_parties"("source_party_id" "uuid", "target_party_id" "uuid", "update_references" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."e_rename_synthetic_group"("p_group_id" "uuid", "p_new_name" character varying, "p_new_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."e_rename_synthetic_group"("p_group_id" "uuid", "p_new_name" character varying, "p_new_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_rename_synthetic_group"("p_group_id" "uuid", "p_new_name" character varying, "p_new_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."e_search_candidates"("p_query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."e_search_candidates"("p_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_search_candidates"("p_query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."e_update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."e_update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."e_update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."end_active_playout"("p_channel_id" "uuid", "p_layer_index" integer, "p_end_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."end_active_playout"("p_channel_id" "uuid", "p_layer_index" integer, "p_end_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_active_playout"("p_channel_id" "uuid", "p_layer_index" integer, "p_end_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."end_all_channel_playout"("p_channel_id" "uuid", "p_end_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."end_all_channel_playout"("p_channel_id" "uuid", "p_end_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_all_channel_playout"("p_channel_id" "uuid", "p_end_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_schema_not_null"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_schema_not_null"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_schema_not_null"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_default_sponsor_per_category"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_default_sponsor_per_category"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_default_sponsor_per_category"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_default_template"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_default_template"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_default_template"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fetch_bop_data"("p_election_year" integer, "p_race_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_bop_data"("p_election_year" integer, "p_race_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_bop_data"("p_election_year" integer, "p_race_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."fetch_county_data_extended"("p_race_type" "text", "p_year" integer, "p_state" "text", "p_offset" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_county_data_extended"("p_race_type" "text", "p_year" integer, "p_state" "text", "p_offset" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_county_data_extended"("p_race_type" "text", "p_year" integer, "p_state" "text", "p_offset" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fetch_election_data_for_api"("p_year" integer, "p_race_type" character varying, "p_level" character varying, "p_state" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_election_data_for_api"("p_year" integer, "p_race_type" character varying, "p_level" character varying, "p_state" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_election_data_for_api"("p_year" integer, "p_race_type" character varying, "p_level" character varying, "p_state" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."fetch_election_data_for_ui"("p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_election_data_for_ui"("p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_election_data_for_ui"("p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fetch_house_district_data_extended"("p_year" integer, "p_offset" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_house_district_data_extended"("p_year" integer, "p_offset" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_house_district_data_extended"("p_year" integer, "p_offset" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fetch_presidential_national_data_extended"("p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_presidential_national_data_extended"("p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_presidential_national_data_extended"("p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fetch_presidential_state_data_extended"("p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_presidential_state_data_extended"("p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_presidential_state_data_extended"("p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fetch_senate_state_data_extended"("p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fetch_senate_state_data_extended"("p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fetch_senate_state_data_extended"("p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fix_order_gaps"("table_name" "text", "parent_id_value" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fix_order_gaps"("table_name" "text", "parent_id_value" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fix_order_gaps"("table_name" "text", "parent_id_value" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_feeds_by_category"("p_category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_feeds_by_category"("p_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_feeds_by_category"("p_category" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_api_endpoint_dependencies"("p_endpoint_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_api_endpoint_dependencies"("p_endpoint_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_api_endpoint_dependencies"("p_endpoint_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_competition_with_seasons"("p_competition_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_competition_with_seasons"("p_competition_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_competition_with_seasons"("p_competition_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_competitions"("p_sport" character varying, "p_active_only" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_competitions"("p_sport" character varying, "p_active_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_competitions"("p_sport" character varying, "p_active_only" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_season"("p_competition_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_season"("p_competition_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_season"("p_competition_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_endpoints_by_target_app"("p_target_app" "text", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_endpoints_by_target_app"("p_target_app" "text", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_endpoints_by_target_app"("p_target_app" "text", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_event_details"("p_event_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_event_details"("p_event_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_event_details"("p_event_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_gfx_project_templates"("p_project_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_gfx_project_templates"("p_project_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_gfx_project_templates"("p_project_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_instance_by_channel"("p_channel_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_instance_by_channel"("p_channel_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_instance_by_channel"("p_channel_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_integrations_to_sync"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_integrations_to_sync"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_integrations_to_sync"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_league_team_stats"("p_season_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_league_team_stats"("p_season_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_league_team_stats"("p_season_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_map_settings"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_map_settings"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_map_settings"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_match_odds"("p_event_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_match_odds"("p_event_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_match_odds"("p_event_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_for_email_domain"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_for_email_domain"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_for_email_domain"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_stats"("p_player_id" integer, "p_season_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_stats"("p_player_id" integer, "p_season_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_stats"("p_player_id" integer, "p_season_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_provider_details"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_provider_details"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_provider_details"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_results"("p_season_id" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_results"("p_season_id" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_results"("p_season_id" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_season_outrights"("p_season_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_season_outrights"("p_season_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_season_outrights"("p_season_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_season_schedule"("p_season_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_season_schedule"("p_season_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_season_schedule"("p_season_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_season_standings"("p_season_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_season_standings"("p_season_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_season_standings"("p_season_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_season_teams"("p_season_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_season_teams"("p_season_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_season_teams"("p_season_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_seedable_dashboard_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_seedable_dashboard_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_seedable_dashboard_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_seedable_data_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_seedable_data_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_seedable_data_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_seedable_items"("p_category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_seedable_items"("p_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_seedable_items"("p_category" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_table_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_table_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_table_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_team_schedule"("p_team_id" integer, "p_season_id" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_schedule"("p_team_id" integer, "p_season_id" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_schedule"("p_team_id" integer, "p_season_id" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_team_stats"("p_team_id" integer, "p_season_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_stats"("p_team_id" integer, "p_season_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_stats"("p_team_id" integer, "p_season_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_text_providers_for_dashboard"("dash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_text_providers_for_dashboard"("dash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_text_providers_for_dashboard"("dash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_assists"("p_season_id" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_assists"("p_season_id" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_assists"("p_season_id" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_scorer_odds"("p_season_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_scorer_odds"("p_season_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_scorer_odds"("p_season_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_scorers"("p_season_id" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_scorers"("p_season_id" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_scorers"("p_season_id" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_upcoming_events"("p_season_id" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_upcoming_events"("p_season_id" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_upcoming_events"("p_season_id" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_upcoming_with_odds"("p_season_id" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_upcoming_with_odds"("p_season_id" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_upcoming_with_odds"("p_season_id" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_layout"("p_layout_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_layout"("p_layout_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_layout"("p_layout_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_organization_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organization_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organization_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_permissions"("p_auth_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("p_auth_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("p_auth_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_venue_details"("p_venue_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_venue_details"("p_venue_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_venue_details"("p_venue_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_venues"("p_country" character varying, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_venues"("p_country" character varying, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_venues"("p_country" character varying, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."inspect_pg_net_tables"() TO "anon";
GRANT ALL ON FUNCTION "public"."inspect_pg_net_tables"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."inspect_pg_net_tables"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_superuser"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_superuser"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_superuser"() TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON FUNCTION "public"."list_active_applications"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_active_applications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_active_applications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."list_invitations"("p_user_id" "uuid", "p_pending_only" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."list_invitations"("p_user_id" "uuid", "p_pending_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_invitations"("p_user_id" "uuid", "p_pending_only" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."list_providers_with_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_providers_with_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_providers_with_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."list_providers_with_status_all"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_providers_with_status_all"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_providers_with_status_all"() TO "service_role";



GRANT ALL ON FUNCTION "public"."list_providers_with_status_category"("p_category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."list_providers_with_status_category"("p_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_providers_with_status_category"("p_category" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_debug"("func_name" "text", "msg" "text", "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_debug"("func_name" "text", "msg" "text", "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_debug"("func_name" "text", "msg" "text", "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_ai_providers_from_kv"() TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_ai_providers_from_kv"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_ai_providers_from_kv"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ndi_preset_rpc"("p_action" "text", "p_id" "uuid", "p_name" "text", "p_resolution" "text", "p_fps" "text", "p_pixel_format" "text", "p_stream_name" "text", "p_alpha" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."ndi_preset_rpc"("p_action" "text", "p_id" "uuid", "p_name" "text", "p_resolution" "text", "p_fps" "text", "p_pixel_format" "text", "p_stream_name" "text", "p_alpha" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ndi_preset_rpc"("p_action" "text", "p_id" "uuid", "p_name" "text", "p_resolution" "text", "p_fps" "text", "p_pixel_format" "text", "p_stream_name" "text", "p_alpha" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_edge_function"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_edge_function"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_edge_function"() TO "service_role";



GRANT ALL ON FUNCTION "public"."output_profile_rpc"("p_action" "text", "p_id" "uuid", "p_name" "text", "p_output_type" "text", "p_source_url" "text", "p_source_file_path" "text", "p_reload_source" boolean, "p_ndi_preset_id" "uuid", "p_ndi_settings" "jsonb", "p_2110_preset_id" "uuid", "p_2110_settings" "jsonb", "p_auto_start" boolean, "p_full_config" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."output_profile_rpc"("p_action" "text", "p_id" "uuid", "p_name" "text", "p_output_type" "text", "p_source_url" "text", "p_source_file_path" "text", "p_reload_source" boolean, "p_ndi_preset_id" "uuid", "p_ndi_settings" "jsonb", "p_2110_preset_id" "uuid", "p_2110_settings" "jsonb", "p_auto_start" boolean, "p_full_config" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."output_profile_rpc"("p_action" "text", "p_id" "uuid", "p_name" "text", "p_output_type" "text", "p_source_url" "text", "p_source_file_path" "text", "p_reload_source" boolean, "p_ndi_preset_id" "uuid", "p_ndi_settings" "jsonb", "p_2110_preset_id" "uuid", "p_2110_settings" "jsonb", "p_auto_start" boolean, "p_full_config" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."populate_sync_queue"() TO "anon";
GRANT ALL ON FUNCTION "public"."populate_sync_queue"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."populate_sync_queue"() TO "service_role";



GRANT ALL ON FUNCTION "public"."preview_log_cleanup"() TO "anon";
GRANT ALL ON FUNCTION "public"."preview_log_cleanup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."preview_log_cleanup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_sync_queue"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_sync_queue"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_sync_queue"() TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_create_project"("p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "uuid", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_create_project"("p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "uuid", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_create_project"("p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "uuid", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_delete_project"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_delete_project"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_delete_project"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_get_active_project"() TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_get_active_project"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_get_active_project"() TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_get_projects"() TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_get_projects"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_get_projects"() TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_create"("p_name" character varying, "p_description" "text", "p_project_id" "uuid", "p_loop_enabled" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_create"("p_name" character varying, "p_description" "text", "p_project_id" "uuid", "p_loop_enabled" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_create"("p_name" character varying, "p_description" "text", "p_project_id" "uuid", "p_loop_enabled" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_delete"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_delete"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_delete"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_get"("p_playlist_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_get"("p_playlist_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_get"("p_playlist_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_add"("p_playlist_id" "uuid", "p_item_type" "public"."pulsarvs_playlist_item_type", "p_name" character varying, "p_content_id" "uuid", "p_media_id" "uuid", "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_add"("p_playlist_id" "uuid", "p_item_type" "public"."pulsarvs_playlist_item_type", "p_name" character varying, "p_content_id" "uuid", "p_media_id" "uuid", "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_add"("p_playlist_id" "uuid", "p_item_type" "public"."pulsarvs_playlist_item_type", "p_name" character varying, "p_content_id" "uuid", "p_media_id" "uuid", "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_add"("p_playlist_id" "uuid", "p_item_type" "public"."pulsarvs_playlist_item_type", "p_name" character varying, "p_content_id" "uuid", "p_media_id" "uuid", "p_folder_id" "uuid", "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb", "p_parent_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_add"("p_playlist_id" "uuid", "p_item_type" "public"."pulsarvs_playlist_item_type", "p_name" character varying, "p_content_id" "uuid", "p_media_id" "uuid", "p_folder_id" "uuid", "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb", "p_parent_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_add"("p_playlist_id" "uuid", "p_item_type" "public"."pulsarvs_playlist_item_type", "p_name" character varying, "p_content_id" "uuid", "p_media_id" "uuid", "p_folder_id" "uuid", "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb", "p_parent_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_delete"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_delete"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_delete"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_get_nested"("p_parent_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_get_nested"("p_parent_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_get_nested"("p_parent_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_set_channel"("p_id" "uuid", "p_channel_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_set_channel"("p_id" "uuid", "p_channel_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_set_channel"("p_id" "uuid", "p_channel_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_update"("p_id" "uuid", "p_name" character varying, "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_update"("p_id" "uuid", "p_name" character varying, "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_update"("p_id" "uuid", "p_name" character varying, "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_update"("p_id" "uuid", "p_name" character varying, "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb", "p_media_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_update"("p_id" "uuid", "p_name" character varying, "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb", "p_media_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_item_update"("p_id" "uuid", "p_name" character varying, "p_channel_id" "uuid", "p_duration" integer, "p_scheduled_time" timestamp with time zone, "p_metadata" "jsonb", "p_media_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_items_group"("p_playlist_id" "uuid", "p_item_ids" "uuid"[], "p_group_name" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_items_group"("p_playlist_id" "uuid", "p_item_ids" "uuid"[], "p_group_name" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_items_group"("p_playlist_id" "uuid", "p_item_ids" "uuid"[], "p_group_name" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_items_reorder"("p_playlist_id" "uuid", "p_item_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_items_reorder"("p_playlist_id" "uuid", "p_item_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_items_reorder"("p_playlist_id" "uuid", "p_item_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_items_ungroup"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_items_ungroup"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_items_ungroup"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_list"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_list"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_list"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_update"("p_id" "uuid", "p_name" character varying, "p_description" "text", "p_is_active" boolean, "p_loop_enabled" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_update"("p_id" "uuid", "p_name" character varying, "p_description" "text", "p_is_active" boolean, "p_loop_enabled" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_playlist_update"("p_id" "uuid", "p_name" character varying, "p_description" "text", "p_is_active" boolean, "p_loop_enabled" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_set_active_project"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_set_active_project"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_set_active_project"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pulsarvs_update_project"("p_id" "uuid", "p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "uuid", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."pulsarvs_update_project"("p_id" "uuid", "p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "uuid", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pulsarvs_update_project"("p_id" "uuid", "p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "uuid", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_agent_run"("p_agent_id" "uuid", "p_status" "text", "p_duration_ms" integer, "p_logs" "jsonb", "p_error_message" "text", "p_results" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."record_agent_run"("p_agent_id" "uuid", "p_status" "text", "p_duration_ms" integer, "p_logs" "jsonb", "p_error_message" "text", "p_results" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_agent_run"("p_agent_id" "uuid", "p_status" "text", "p_duration_ms" integer, "p_logs" "jsonb", "p_error_message" "text", "p_results" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."resend_invitation"("p_user_id" "uuid", "p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."resend_invitation"("p_user_id" "uuid", "p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resend_invitation"("p_user_id" "uuid", "p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_invitation"("p_user_id" "uuid", "p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_invitation"("p_user_id" "uuid", "p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_invitation"("p_user_id" "uuid", "p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_map_position"("p_user_id" "uuid", "p_name" "text", "p_lat" numeric, "p_lng" numeric, "p_zoom" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."save_map_position"("p_user_id" "uuid", "p_name" "text", "p_lat" numeric, "p_lng" numeric, "p_zoom" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_map_position"("p_user_id" "uuid", "p_name" "text", "p_lat" numeric, "p_lng" numeric, "p_zoom" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."save_map_settings"("p_user_id" "uuid", "p_settings" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_map_settings"("p_user_id" "uuid", "p_settings" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_map_settings"("p_user_id" "uuid", "p_settings" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."user_layouts" TO "anon";
GRANT ALL ON TABLE "public"."user_layouts" TO "authenticated";
GRANT ALL ON TABLE "public"."user_layouts" TO "service_role";



GRANT ALL ON FUNCTION "public"."save_user_layout"("p_layout_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_user_layout"("p_layout_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_user_layout"("p_layout_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_e_candidates"("p_query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_e_candidates"("p_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_e_candidates"("p_query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_teams"("p_query" character varying, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_teams"("p_query" character varying, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_teams"("p_query" character varying, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_dashboard_data"("p_target_org_id" "uuid", "p_dashboard_config" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_dashboard_data"("p_target_org_id" "uuid", "p_dashboard_config" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_dashboard_data"("p_target_org_id" "uuid", "p_dashboard_config" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_elections"("p_target_org_id" "uuid", "p_election_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."seed_elections"("p_target_org_id" "uuid", "p_election_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_elections"("p_target_org_id" "uuid", "p_election_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_finance_stocks"("p_target_org_id" "uuid", "p_stock_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."seed_finance_stocks"("p_target_org_id" "uuid", "p_stock_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_finance_stocks"("p_target_org_id" "uuid", "p_stock_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_organization_data"("p_new_org_id" "uuid", "p_seed_config" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_organization_data"("p_new_org_id" "uuid", "p_seed_config" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_organization_data"("p_new_org_id" "uuid", "p_seed_config" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_sports_leagues"("p_target_org_id" "uuid", "p_league_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."seed_sports_leagues"("p_target_org_id" "uuid", "p_league_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_sports_leagues"("p_target_org_id" "uuid", "p_league_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_weather_locations"("p_target_org_id" "uuid", "p_location_ids" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."seed_weather_locations"("p_target_org_id" "uuid", "p_location_ids" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_weather_locations"("p_target_org_id" "uuid", "p_location_ids" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."shift_items_after_deletion"("p_parent_id" "uuid", "p_deleted_order" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."shift_items_after_deletion"("p_parent_id" "uuid", "p_deleted_order" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."shift_items_after_deletion"("p_parent_id" "uuid", "p_deleted_order" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."shift_items_for_insertion"("p_parent_id" "uuid", "p_start_order" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."shift_items_for_insertion"("p_parent_id" "uuid", "p_start_order" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."shift_items_for_insertion"("p_parent_id" "uuid", "p_start_order" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."shift_order_on_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."shift_order_on_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."shift_order_on_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sportsmonks_leagues"("p_dashboard" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."sportsmonks_leagues"("p_dashboard" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sportsmonks_leagues"("p_dashboard" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st2110_preset_rpc"("p_action" "text", "p_id" "uuid", "p_name" "text", "p_resolution" "text", "p_fps" "text", "p_pixel_format" "text", "p_nic" "text", "p_multicast_ip" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st2110_preset_rpc"("p_action" "text", "p_id" "uuid", "p_name" "text", "p_resolution" "text", "p_fps" "text", "p_pixel_format" "text", "p_nic" "text", "p_multicast_ip" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st2110_preset_rpc"("p_action" "text", "p_id" "uuid", "p_name" "text", "p_resolution" "text", "p_fps" "text", "p_pixel_format" "text", "p_nic" "text", "p_multicast_ip" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_ap_bop_data"("results_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_ap_bop_data"("results_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_ap_bop_data"("results_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_ap_election_data"("office_id" "text", "results_type" "text", "race_name" "text", "race_type" "text", "race_level" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_ap_election_data"("office_id" "text", "results_type" "text", "race_name" "text", "race_type" "text", "race_level" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_ap_election_data"("office_id" "text", "results_type" "text", "race_name" "text", "race_type" "text", "race_level" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_school_closings"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_school_closings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_school_closings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_weather_csv"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_weather_csv"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_weather_csv"() TO "service_role";



GRANT ALL ON FUNCTION "public"."system_initialized"() TO "anon";
GRANT ALL ON FUNCTION "public"."system_initialized"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."system_initialized"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_cascade_delete_order_shift"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_cascade_delete_order_shift"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_cascade_delete_order_shift"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_edge_function_simple"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_edge_function_simple"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_edge_function_simple"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_intervals_basic"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_intervals_basic"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_intervals_basic"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_pg_net_basic"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_pg_net_basic"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_pg_net_basic"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_pg_net_with_logging"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_pg_net_with_logging"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_pg_net_with_logging"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_simple"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_simple"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_simple"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_single_item_processing"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_single_item_processing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_single_item_processing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_sync_components"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_sync_components"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_sync_components"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_vault_secrets"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_vault_secrets"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_vault_secrets"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."u_audit_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."u_audit_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."u_audit_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ui_delete_weather_location"("p_location_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ui_delete_weather_location"("p_location_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ui_delete_weather_location"("p_location_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ai_providers_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ai_providers_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ai_providers_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_banner_schedules_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_banner_schedules_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_banner_schedules_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_channels_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_channels_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_channels_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_data_provider"("p_id" "text", "p_is_active" boolean, "p_api_key" "text", "p_api_secret" "text", "p_base_url" "text", "p_storage_path" "text", "p_source_url" "text", "p_config" "jsonb", "p_refresh_interval_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_data_provider"("p_id" "text", "p_is_active" boolean, "p_api_key" "text", "p_api_secret" "text", "p_base_url" "text", "p_storage_path" "text", "p_source_url" "text", "p_config" "jsonb", "p_refresh_interval_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_data_provider"("p_id" "text", "p_is_active" boolean, "p_api_key" "text", "p_api_secret" "text", "p_base_url" "text", "p_storage_path" "text", "p_source_url" "text", "p_config" "jsonb", "p_refresh_interval_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_data_providers_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_data_providers_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_data_providers_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_map_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_map_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_map_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_media_assets_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_media_assets_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_media_assets_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_news_articles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_news_articles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_news_articles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_order_after_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_order_after_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_order_after_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_project"("p_id" "uuid", "p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "text", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_project"("p_id" "uuid", "p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "text", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_project"("p_id" "uuid", "p_name" "text", "p_description" "text", "p_default_channel_id" "uuid", "p_default_instance_id" "text", "p_color" "text", "p_icon" "text", "p_settings" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_provider_settings_by_id"("p_id" "text", "p_api_key" "text", "p_api_secret" "text", "p_api_version" "text", "p_base_url" "text", "p_config_patch" "jsonb", "p_dashboard" "text", "p_is_active" boolean, "p_allow_api_key" boolean, "p_source_url" "text", "p_storage_path" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_provider_settings_by_id"("p_id" "text", "p_api_key" "text", "p_api_secret" "text", "p_api_version" "text", "p_base_url" "text", "p_config_patch" "jsonb", "p_dashboard" "text", "p_is_active" boolean, "p_allow_api_key" boolean, "p_source_url" "text", "p_storage_path" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_provider_settings_by_id"("p_id" "text", "p_api_key" "text", "p_api_secret" "text", "p_api_version" "text", "p_base_url" "text", "p_config_patch" "jsonb", "p_dashboard" "text", "p_is_active" boolean, "p_allow_api_key" boolean, "p_source_url" "text", "p_storage_path" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pulsar_projects_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_pulsar_projects_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pulsar_projects_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pulsarvs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_pulsarvs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pulsarvs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_sponsor_schedules_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_sponsor_schedules_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_sponsor_schedules_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_full_name" "text", "p_preferences" "jsonb", "p_avatar_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_full_name" "text", "p_preferences" "jsonb", "p_avatar_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_full_name" "text", "p_preferences" "jsonb", "p_avatar_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_category"("p_sportradar_id" character varying, "p_name" character varying, "p_country_code" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_category"("p_sportradar_id" character varying, "p_name" character varying, "p_country_code" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_category"("p_sportradar_id" character varying, "p_name" character varying, "p_country_code" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_league"("p_sportradar_id" character varying, "p_name" character varying, "p_alternative_name" character varying, "p_gender" character varying, "p_category_sportradar_id" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_league"("p_sportradar_id" character varying, "p_name" character varying, "p_alternative_name" character varying, "p_gender" character varying, "p_category_sportradar_id" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_league"("p_sportradar_id" character varying, "p_name" character varying, "p_alternative_name" character varying, "p_gender" character varying, "p_category_sportradar_id" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_season"("p_sportradar_id" character varying, "p_league_sportradar_id" character varying, "p_name" character varying, "p_year" character varying, "p_start_date" "date", "p_end_date" "date", "p_is_current" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_season"("p_sportradar_id" character varying, "p_league_sportradar_id" character varying, "p_name" character varying, "p_year" character varying, "p_start_date" "date", "p_end_date" "date", "p_is_current" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_season"("p_sportradar_id" character varying, "p_league_sportradar_id" character varying, "p_name" character varying, "p_year" character varying, "p_start_date" "date", "p_end_date" "date", "p_is_current" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_stock_prices"("p_stocks" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_stock_prices"("p_stocks" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_stock_prices"("p_stocks" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_team"("p_sportradar_id" character varying, "p_name" character varying, "p_short_name" character varying, "p_abbreviation" character varying, "p_gender" character varying, "p_country" character varying, "p_country_code" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_team"("p_sportradar_id" character varying, "p_name" character varying, "p_short_name" character varying, "p_abbreviation" character varying, "p_gender" character varying, "p_country" character varying, "p_country_code" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_team"("p_sportradar_id" character varying, "p_name" character varying, "p_short_name" character varying, "p_abbreviation" character varying, "p_gender" character varying, "p_country" character varying, "p_country_code" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_user_layout"("p_layout_name" "text", "p_layout_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_user_layout"("p_layout_name" "text", "p_layout_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_user_layout"("p_layout_name" "text", "p_layout_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_user_layout_with_id"("p_user_id" "uuid", "p_layout_name" "text", "p_layout_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_user_layout_with_id"("p_user_id" "uuid", "p_layout_name" "text", "p_layout_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_user_layout_with_id"("p_user_id" "uuid", "p_layout_name" "text", "p_layout_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_channel_hierarchy"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_channel_hierarchy"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_channel_hierarchy"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_content_hierarchy"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_content_hierarchy"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_content_hierarchy"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_item_tabfields_content"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_item_tabfields_content"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_item_tabfields_content"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_template_hierarchy"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_template_hierarchy"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_template_hierarchy"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_u_invitation_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_u_invitation_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_u_invitation_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."vs_content_delete"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vs_content_delete"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vs_content_delete"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."vs_content_folder_create"("p_name" "text", "p_parent_id" "uuid", "p_color" "text", "p_icon" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vs_content_folder_create"("p_name" "text", "p_parent_id" "uuid", "p_color" "text", "p_icon" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vs_content_folder_create"("p_name" "text", "p_parent_id" "uuid", "p_color" "text", "p_icon" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."vs_content_folder_delete"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vs_content_folder_delete"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vs_content_folder_delete"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."vs_content_folder_list"() TO "anon";
GRANT ALL ON FUNCTION "public"."vs_content_folder_list"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."vs_content_folder_list"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vs_content_folder_rename"("p_id" "uuid", "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vs_content_folder_rename"("p_id" "uuid", "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vs_content_folder_rename"("p_id" "uuid", "p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."vs_content_get"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vs_content_get"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vs_content_get"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."vs_content_list"("p_limit" integer, "p_offset" integer, "p_tags" "text"[], "p_search" "text", "p_my_content_only" boolean, "p_public_only" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vs_content_list"("p_limit" integer, "p_offset" integer, "p_tags" "text"[], "p_search" "text", "p_my_content_only" boolean, "p_public_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vs_content_list"("p_limit" integer, "p_offset" integer, "p_tags" "text"[], "p_search" "text", "p_my_content_only" boolean, "p_public_only" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vs_content_list"("p_limit" integer, "p_offset" integer, "p_tags" "text"[], "p_search" "text", "p_my_content_only" boolean, "p_public_only" boolean, "p_folder_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vs_content_list"("p_limit" integer, "p_offset" integer, "p_tags" "text"[], "p_search" "text", "p_my_content_only" boolean, "p_public_only" boolean, "p_folder_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vs_content_list"("p_limit" integer, "p_offset" integer, "p_tags" "text"[], "p_search" "text", "p_my_content_only" boolean, "p_public_only" boolean, "p_folder_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."vs_content_list"("p_folder_id" "uuid", "p_limit" integer, "p_my_content_only" boolean, "p_offset" integer, "p_project_id" "uuid", "p_public_only" boolean, "p_search" "text", "p_tags" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vs_content_list"("p_folder_id" "uuid", "p_limit" integer, "p_my_content_only" boolean, "p_offset" integer, "p_project_id" "uuid", "p_public_only" boolean, "p_search" "text", "p_tags" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vs_content_list"("p_folder_id" "uuid", "p_limit" integer, "p_my_content_only" boolean, "p_offset" integer, "p_project_id" "uuid", "p_public_only" boolean, "p_search" "text", "p_tags" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vs_content_move_to_folder"("p_content_id" "uuid", "p_folder_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vs_content_move_to_folder"("p_content_id" "uuid", "p_folder_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vs_content_move_to_folder"("p_content_id" "uuid", "p_folder_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."vs_content_save"("p_name" "text", "p_scene_config" "jsonb", "p_backdrop_url" "text", "p_description" "text", "p_tags" "text"[], "p_is_public" boolean, "p_id" "uuid", "p_folder_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vs_content_save"("p_name" "text", "p_scene_config" "jsonb", "p_backdrop_url" "text", "p_description" "text", "p_tags" "text"[], "p_is_public" boolean, "p_id" "uuid", "p_folder_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vs_content_save"("p_name" "text", "p_scene_config" "jsonb", "p_backdrop_url" "text", "p_description" "text", "p_tags" "text"[], "p_is_public" boolean, "p_id" "uuid", "p_folder_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."vs_content_save"("p_id" "uuid", "p_name" "text", "p_scene_config" "jsonb", "p_backdrop_url" "text", "p_description" "text", "p_tags" "text"[], "p_is_public" boolean, "p_folder_id" "uuid", "p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vs_content_save"("p_id" "uuid", "p_name" "text", "p_scene_config" "jsonb", "p_backdrop_url" "text", "p_description" "text", "p_tags" "text"[], "p_is_public" boolean, "p_folder_id" "uuid", "p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vs_content_save"("p_id" "uuid", "p_name" "text", "p_scene_config" "jsonb", "p_backdrop_url" "text", "p_description" "text", "p_tags" "text"[], "p_is_public" boolean, "p_folder_id" "uuid", "p_project_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."agent_runs" TO "anon";
GRANT ALL ON TABLE "public"."agent_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_runs" TO "service_role";



GRANT ALL ON TABLE "public"."agents" TO "anon";
GRANT ALL ON TABLE "public"."agents" TO "authenticated";
GRANT ALL ON TABLE "public"."agents" TO "service_role";



GRANT ALL ON TABLE "public"."ai_insights_elections" TO "anon";
GRANT ALL ON TABLE "public"."ai_insights_elections" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_insights_elections" TO "service_role";



GRANT ALL ON TABLE "public"."ai_insights_finance" TO "anon";
GRANT ALL ON TABLE "public"."ai_insights_finance" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_insights_finance" TO "service_role";



GRANT ALL ON TABLE "public"."ai_insights_news" TO "anon";
GRANT ALL ON TABLE "public"."ai_insights_news" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_insights_news" TO "service_role";



GRANT ALL ON TABLE "public"."ai_insights_school_closing" TO "anon";
GRANT ALL ON TABLE "public"."ai_insights_school_closing" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_insights_school_closing" TO "service_role";



GRANT ALL ON TABLE "public"."ai_insights_weather" TO "anon";
GRANT ALL ON TABLE "public"."ai_insights_weather" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_insights_weather" TO "service_role";



GRANT ALL ON TABLE "public"."ai_prompt_injectors" TO "anon";
GRANT ALL ON TABLE "public"."ai_prompt_injectors" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_prompt_injectors" TO "service_role";



GRANT ALL ON TABLE "public"."ai_providers" TO "anon";
GRANT ALL ON TABLE "public"."ai_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_providers" TO "service_role";



GRANT ALL ON TABLE "public"."ai_providers_public" TO "anon";
GRANT ALL ON TABLE "public"."ai_providers_public" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_providers_public" TO "service_role";



GRANT ALL ON TABLE "public"."api_access_logs" TO "anon";
GRANT ALL ON TABLE "public"."api_access_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."api_access_logs" TO "service_role";



GRANT ALL ON TABLE "public"."api_documentation" TO "anon";
GRANT ALL ON TABLE "public"."api_documentation" TO "authenticated";
GRANT ALL ON TABLE "public"."api_documentation" TO "service_role";



GRANT ALL ON TABLE "public"."api_endpoint_sources" TO "anon";
GRANT ALL ON TABLE "public"."api_endpoint_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."api_endpoint_sources" TO "service_role";



GRANT ALL ON TABLE "public"."api_endpoints" TO "anon";
GRANT ALL ON TABLE "public"."api_endpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."api_endpoints" TO "service_role";



GRANT ALL ON TABLE "public"."banner_schedules" TO "anon";
GRANT ALL ON TABLE "public"."banner_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."banner_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."bop_election_results" TO "anon";
GRANT ALL ON TABLE "public"."bop_election_results" TO "authenticated";
GRANT ALL ON TABLE "public"."bop_election_results" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bop_election_results_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bop_election_results_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bop_election_results_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bop_net_changes" TO "anon";
GRANT ALL ON TABLE "public"."bop_net_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."bop_net_changes" TO "service_role";



GRANT ALL ON TABLE "public"."bop_party_results" TO "anon";
GRANT ALL ON TABLE "public"."bop_party_results" TO "authenticated";
GRANT ALL ON TABLE "public"."bop_party_results" TO "service_role";



GRANT ALL ON TABLE "public"."bop_election_summary" TO "anon";
GRANT ALL ON TABLE "public"."bop_election_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."bop_election_summary" TO "service_role";



GRANT ALL ON TABLE "public"."bop_insufficient_vote_details" TO "anon";
GRANT ALL ON TABLE "public"."bop_insufficient_vote_details" TO "authenticated";
GRANT ALL ON TABLE "public"."bop_insufficient_vote_details" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bop_insufficient_vote_details_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bop_insufficient_vote_details_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bop_insufficient_vote_details_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bop_net_changes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bop_net_changes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bop_net_changes_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bop_party_results_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bop_party_results_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bop_party_results_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."channel_playlists" TO "anon";
GRANT ALL ON TABLE "public"."channel_playlists" TO "authenticated";
GRANT ALL ON TABLE "public"."channel_playlists" TO "service_role";



GRANT ALL ON TABLE "public"."channels" TO "anon";
GRANT ALL ON TABLE "public"."channels" TO "authenticated";
GRANT ALL ON TABLE "public"."channels" TO "service_role";



GRANT ALL ON TABLE "public"."content" TO "anon";
GRANT ALL ON TABLE "public"."content" TO "authenticated";
GRANT ALL ON TABLE "public"."content" TO "service_role";



GRANT ALL ON TABLE "public"."customer_dashboards" TO "anon";
GRANT ALL ON TABLE "public"."customer_dashboards" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_dashboards" TO "service_role";



GRANT ALL ON TABLE "public"."data_providers" TO "anon";
GRANT ALL ON TABLE "public"."data_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."data_providers" TO "service_role";



GRANT ALL ON TABLE "public"."data_providers_public" TO "anon";
GRANT ALL ON TABLE "public"."data_providers_public" TO "authenticated";
GRANT ALL ON TABLE "public"."data_providers_public" TO "service_role";



GRANT ALL ON TABLE "public"."data_source_sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."data_source_sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."data_source_sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."data_sources" TO "anon";
GRANT ALL ON TABLE "public"."data_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."data_sources" TO "service_role";



GRANT ALL ON TABLE "public"."debug_log" TO "anon";
GRANT ALL ON TABLE "public"."debug_log" TO "authenticated";
GRANT ALL ON TABLE "public"."debug_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."debug_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."debug_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."debug_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."e_ap_call_history" TO "anon";
GRANT ALL ON TABLE "public"."e_ap_call_history" TO "authenticated";
GRANT ALL ON TABLE "public"."e_ap_call_history" TO "service_role";



GRANT ALL ON TABLE "public"."e_ballot_measure_results" TO "anon";
GRANT ALL ON TABLE "public"."e_ballot_measure_results" TO "authenticated";
GRANT ALL ON TABLE "public"."e_ballot_measure_results" TO "service_role";



GRANT ALL ON TABLE "public"."e_ballot_measures" TO "anon";
GRANT ALL ON TABLE "public"."e_ballot_measures" TO "authenticated";
GRANT ALL ON TABLE "public"."e_ballot_measures" TO "service_role";



GRANT ALL ON TABLE "public"."e_candidate_results" TO "anon";
GRANT ALL ON TABLE "public"."e_candidate_results" TO "authenticated";
GRANT ALL ON TABLE "public"."e_candidate_results" TO "service_role";



GRANT ALL ON TABLE "public"."e_candidate_results_effective" TO "anon";
GRANT ALL ON TABLE "public"."e_candidate_results_effective" TO "authenticated";
GRANT ALL ON TABLE "public"."e_candidate_results_effective" TO "service_role";



GRANT ALL ON TABLE "public"."e_candidates" TO "anon";
GRANT ALL ON TABLE "public"."e_candidates" TO "authenticated";
GRANT ALL ON TABLE "public"."e_candidates" TO "service_role";



GRANT ALL ON TABLE "public"."e_countries" TO "anon";
GRANT ALL ON TABLE "public"."e_countries" TO "authenticated";
GRANT ALL ON TABLE "public"."e_countries" TO "service_role";



GRANT ALL ON TABLE "public"."e_election_data_ingestion_log" TO "anon";
GRANT ALL ON TABLE "public"."e_election_data_ingestion_log" TO "authenticated";
GRANT ALL ON TABLE "public"."e_election_data_ingestion_log" TO "service_role";



GRANT ALL ON TABLE "public"."e_election_data_overrides_log" TO "anon";
GRANT ALL ON TABLE "public"."e_election_data_overrides_log" TO "authenticated";
GRANT ALL ON TABLE "public"."e_election_data_overrides_log" TO "service_role";



GRANT ALL ON TABLE "public"."e_election_data_sources" TO "anon";
GRANT ALL ON TABLE "public"."e_election_data_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."e_election_data_sources" TO "service_role";



GRANT ALL ON TABLE "public"."e_election_editorial_content" TO "anon";
GRANT ALL ON TABLE "public"."e_election_editorial_content" TO "authenticated";
GRANT ALL ON TABLE "public"."e_election_editorial_content" TO "service_role";



GRANT ALL ON TABLE "public"."e_elections" TO "anon";
GRANT ALL ON TABLE "public"."e_elections" TO "authenticated";
GRANT ALL ON TABLE "public"."e_elections" TO "service_role";



GRANT ALL ON TABLE "public"."e_exit_polls" TO "anon";
GRANT ALL ON TABLE "public"."e_exit_polls" TO "authenticated";
GRANT ALL ON TABLE "public"."e_exit_polls" TO "service_role";



GRANT ALL ON TABLE "public"."e_geographic_divisions" TO "anon";
GRANT ALL ON TABLE "public"."e_geographic_divisions" TO "authenticated";
GRANT ALL ON TABLE "public"."e_geographic_divisions" TO "service_role";



GRANT ALL ON TABLE "public"."e_historical_results" TO "anon";
GRANT ALL ON TABLE "public"."e_historical_results" TO "authenticated";
GRANT ALL ON TABLE "public"."e_historical_results" TO "service_role";



GRANT ALL ON TABLE "public"."e_media_assets" TO "anon";
GRANT ALL ON TABLE "public"."e_media_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."e_media_assets" TO "service_role";



GRANT ALL ON TABLE "public"."e_parties" TO "anon";
GRANT ALL ON TABLE "public"."e_parties" TO "authenticated";
GRANT ALL ON TABLE "public"."e_parties" TO "service_role";



GRANT ALL ON TABLE "public"."e_race_candidates" TO "anon";
GRANT ALL ON TABLE "public"."e_race_candidates" TO "authenticated";
GRANT ALL ON TABLE "public"."e_race_candidates" TO "service_role";



GRANT ALL ON TABLE "public"."e_race_results" TO "anon";
GRANT ALL ON TABLE "public"."e_race_results" TO "authenticated";
GRANT ALL ON TABLE "public"."e_race_results" TO "service_role";



GRANT ALL ON TABLE "public"."e_race_results_effective" TO "anon";
GRANT ALL ON TABLE "public"."e_race_results_effective" TO "authenticated";
GRANT ALL ON TABLE "public"."e_race_results_effective" TO "service_role";



GRANT ALL ON TABLE "public"."e_races" TO "anon";
GRANT ALL ON TABLE "public"."e_races" TO "authenticated";
GRANT ALL ON TABLE "public"."e_races" TO "service_role";



GRANT ALL ON TABLE "public"."e_synthetic_candidate_results" TO "anon";
GRANT ALL ON TABLE "public"."e_synthetic_candidate_results" TO "authenticated";
GRANT ALL ON TABLE "public"."e_synthetic_candidate_results" TO "service_role";



GRANT ALL ON TABLE "public"."e_synthetic_groups" TO "anon";
GRANT ALL ON TABLE "public"."e_synthetic_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."e_synthetic_groups" TO "service_role";



GRANT ALL ON TABLE "public"."e_synthetic_race_candidates" TO "anon";
GRANT ALL ON TABLE "public"."e_synthetic_race_candidates" TO "authenticated";
GRANT ALL ON TABLE "public"."e_synthetic_race_candidates" TO "service_role";



GRANT ALL ON TABLE "public"."e_synthetic_race_results" TO "anon";
GRANT ALL ON TABLE "public"."e_synthetic_race_results" TO "authenticated";
GRANT ALL ON TABLE "public"."e_synthetic_race_results" TO "service_role";



GRANT ALL ON TABLE "public"."f_stocks" TO "anon";
GRANT ALL ON TABLE "public"."f_stocks" TO "authenticated";
GRANT ALL ON TABLE "public"."f_stocks" TO "service_role";



GRANT ALL ON TABLE "public"."feeds" TO "anon";
GRANT ALL ON TABLE "public"."feeds" TO "authenticated";
GRANT ALL ON TABLE "public"."feeds" TO "service_role";



GRANT ALL ON TABLE "public"."file_sync_queue" TO "anon";
GRANT ALL ON TABLE "public"."file_sync_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."file_sync_queue" TO "service_role";



GRANT ALL ON SEQUENCE "public"."file_sync_queue_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."file_sync_queue_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."file_sync_queue_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_animation_presets" TO "anon";
GRANT ALL ON TABLE "public"."gfx_animation_presets" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_animation_presets" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_animations" TO "anon";
GRANT ALL ON TABLE "public"."gfx_animations" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_animations" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_bindings" TO "anon";
GRANT ALL ON TABLE "public"."gfx_bindings" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_bindings" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_chat_history" TO "anon";
GRANT ALL ON TABLE "public"."gfx_chat_history" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_chat_history" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."gfx_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_elements" TO "anon";
GRANT ALL ON TABLE "public"."gfx_elements" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_elements" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_folders" TO "anon";
GRANT ALL ON TABLE "public"."gfx_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_folders" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_keyframes" TO "anon";
GRANT ALL ON TABLE "public"."gfx_keyframes" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_keyframes" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_layers" TO "anon";
GRANT ALL ON TABLE "public"."gfx_layers" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_layers" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_playback_commands" TO "anon";
GRANT ALL ON TABLE "public"."gfx_playback_commands" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_playback_commands" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_playback_state" TO "anon";
GRANT ALL ON TABLE "public"."gfx_playback_state" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_playback_state" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_project_design_systems" TO "anon";
GRANT ALL ON TABLE "public"."gfx_project_design_systems" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_project_design_systems" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_projects" TO "anon";
GRANT ALL ON TABLE "public"."gfx_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_projects" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."gfx_support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_support_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_template_versions" TO "anon";
GRANT ALL ON TABLE "public"."gfx_template_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_template_versions" TO "service_role";



GRANT ALL ON TABLE "public"."gfx_templates" TO "anon";
GRANT ALL ON TABLE "public"."gfx_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."gfx_templates" TO "service_role";



GRANT ALL ON TABLE "public"."item_tabfields" TO "anon";
GRANT ALL ON TABLE "public"."item_tabfields" TO "authenticated";
GRANT ALL ON TABLE "public"."item_tabfields" TO "service_role";



GRANT ALL ON TABLE "public"."kv_store_7eabc66c" TO "anon";
GRANT ALL ON TABLE "public"."kv_store_7eabc66c" TO "authenticated";
GRANT ALL ON TABLE "public"."kv_store_7eabc66c" TO "service_role";



GRANT ALL ON TABLE "public"."weather_locations" TO "anon";
GRANT ALL ON TABLE "public"."weather_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_locations" TO "service_role";



GRANT ALL ON TABLE "public"."live_weather_locations" TO "anon";
GRANT ALL ON TABLE "public"."live_weather_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."live_weather_locations" TO "service_role";



GRANT ALL ON TABLE "public"."map_data" TO "anon";
GRANT ALL ON TABLE "public"."map_data" TO "authenticated";
GRANT ALL ON TABLE "public"."map_data" TO "service_role";



GRANT ALL ON TABLE "public"."media_assets" TO "anon";
GRANT ALL ON TABLE "public"."media_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."media_assets" TO "service_role";



GRANT ALL ON TABLE "public"."media_distribution" TO "anon";
GRANT ALL ON TABLE "public"."media_distribution" TO "authenticated";
GRANT ALL ON TABLE "public"."media_distribution" TO "service_role";



GRANT ALL ON TABLE "public"."media_push_queue" TO "anon";
GRANT ALL ON TABLE "public"."media_push_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."media_push_queue" TO "service_role";



GRANT ALL ON TABLE "public"."media_tags" TO "anon";
GRANT ALL ON TABLE "public"."media_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."media_tags" TO "service_role";



GRANT ALL ON TABLE "public"."ndi_presets" TO "anon";
GRANT ALL ON TABLE "public"."ndi_presets" TO "authenticated";
GRANT ALL ON TABLE "public"."ndi_presets" TO "service_role";



GRANT ALL ON TABLE "public"."news_articles" TO "anon";
GRANT ALL ON TABLE "public"."news_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."news_articles" TO "service_role";



GRANT ALL ON TABLE "public"."news_clusters" TO "anon";
GRANT ALL ON TABLE "public"."news_clusters" TO "authenticated";
GRANT ALL ON TABLE "public"."news_clusters" TO "service_role";



GRANT ALL ON TABLE "public"."organization_textures" TO "anon";
GRANT ALL ON TABLE "public"."organization_textures" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_textures" TO "service_role";



GRANT ALL ON TABLE "public"."output_profiles" TO "anon";
GRANT ALL ON TABLE "public"."output_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."output_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."pulsar_channel_state" TO "anon";
GRANT ALL ON TABLE "public"."pulsar_channel_state" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsar_channel_state" TO "service_role";



GRANT ALL ON TABLE "public"."pulsar_channels" TO "anon";
GRANT ALL ON TABLE "public"."pulsar_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsar_channels" TO "service_role";



GRANT ALL ON TABLE "public"."pulsar_command_log" TO "anon";
GRANT ALL ON TABLE "public"."pulsar_command_log" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsar_command_log" TO "service_role";



GRANT ALL ON TABLE "public"."pulsar_commands" TO "anon";
GRANT ALL ON TABLE "public"."pulsar_commands" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsar_commands" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pulsar_commands_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pulsar_commands_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pulsar_commands_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pulsar_connections" TO "anon";
GRANT ALL ON TABLE "public"."pulsar_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsar_connections" TO "service_role";



GRANT ALL ON TABLE "public"."pulsar_custom_ui_controls" TO "anon";
GRANT ALL ON TABLE "public"."pulsar_custom_ui_controls" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsar_custom_ui_controls" TO "service_role";



GRANT ALL ON TABLE "public"."pulsar_custom_uis" TO "anon";
GRANT ALL ON TABLE "public"."pulsar_custom_uis" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsar_custom_uis" TO "service_role";



GRANT ALL ON TABLE "public"."pulsar_page_groups" TO "anon";
GRANT ALL ON TABLE "public"."pulsar_page_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsar_page_groups" TO "service_role";



GRANT ALL ON TABLE "public"."pulsar_page_library" TO "anon";
GRANT ALL ON TABLE "public"."pulsar_page_library" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsar_page_library" TO "service_role";



GRANT ALL ON TABLE "public"."pulsar_pages" TO "anon";
GRANT ALL ON TABLE "public"."pulsar_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsar_pages" TO "service_role";



GRANT ALL ON TABLE "public"."pulsar_playlist_page_links" TO "anon";
GRANT ALL ON TABLE "public"."pulsar_playlist_page_links" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsar_playlist_page_links" TO "service_role";



GRANT ALL ON TABLE "public"."pulsar_playlists" TO "anon";
GRANT ALL ON TABLE "public"."pulsar_playlists" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsar_playlists" TO "service_role";



GRANT ALL ON TABLE "public"."pulsar_playout_log" TO "anon";
GRANT ALL ON TABLE "public"."pulsar_playout_log" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsar_playout_log" TO "service_role";



GRANT ALL ON TABLE "public"."pulsar_user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."pulsar_user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsar_user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."pulsarvs_playlist_items" TO "anon";
GRANT ALL ON TABLE "public"."pulsarvs_playlist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsarvs_playlist_items" TO "service_role";



GRANT ALL ON TABLE "public"."pulsarvs_playlists" TO "anon";
GRANT ALL ON TABLE "public"."pulsarvs_playlists" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsarvs_playlists" TO "service_role";



GRANT ALL ON TABLE "public"."pulsarvs_projects" TO "anon";
GRANT ALL ON TABLE "public"."pulsarvs_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."pulsarvs_projects" TO "service_role";



GRANT ALL ON TABLE "public"."ready_for_sync" TO "anon";
GRANT ALL ON TABLE "public"."ready_for_sync" TO "authenticated";
GRANT ALL ON TABLE "public"."ready_for_sync" TO "service_role";



GRANT ALL ON TABLE "public"."school_closings" TO "anon";
GRANT ALL ON TABLE "public"."school_closings" TO "authenticated";
GRANT ALL ON TABLE "public"."school_closings" TO "service_role";



GRANT ALL ON TABLE "public"."sponsor_schedules" TO "anon";
GRANT ALL ON TABLE "public"."sponsor_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."sponsor_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."sports_categories" TO "anon";
GRANT ALL ON TABLE "public"."sports_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_events" TO "anon";
GRANT ALL ON TABLE "public"."sports_events" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_leagues" TO "anon";
GRANT ALL ON TABLE "public"."sports_leagues" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_leagues" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_leagues_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_leagues_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_leagues_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_lineups" TO "anon";
GRANT ALL ON TABLE "public"."sports_lineups" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_lineups" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_lineups_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_lineups_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_lineups_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_match_odds" TO "anon";
GRANT ALL ON TABLE "public"."sports_match_odds" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_match_odds" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_match_odds_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_match_odds_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_match_odds_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_outright_odds" TO "anon";
GRANT ALL ON TABLE "public"."sports_outright_odds" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_outright_odds" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_outright_odds_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_outright_odds_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_outright_odds_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_player_odds" TO "anon";
GRANT ALL ON TABLE "public"."sports_player_odds" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_player_odds" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_player_odds_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_player_odds_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_player_odds_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_player_stats" TO "anon";
GRANT ALL ON TABLE "public"."sports_player_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_player_stats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_player_stats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_player_stats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_player_stats_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_players" TO "anon";
GRANT ALL ON TABLE "public"."sports_players" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_players" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_players_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_players_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_players_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_season_teams" TO "anon";
GRANT ALL ON TABLE "public"."sports_season_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_season_teams" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_season_teams_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_season_teams_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_season_teams_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_seasons" TO "anon";
GRANT ALL ON TABLE "public"."sports_seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_seasons" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_seasons_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_seasons_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_seasons_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_standings" TO "anon";
GRANT ALL ON TABLE "public"."sports_standings" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_standings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_standings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_standings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_standings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_team_stats" TO "anon";
GRANT ALL ON TABLE "public"."sports_team_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_team_stats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_team_stats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_team_stats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_team_stats_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_teams" TO "anon";
GRANT ALL ON TABLE "public"."sports_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_teams" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_teams_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_teams_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_teams_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sports_venues" TO "anon";
GRANT ALL ON TABLE "public"."sports_venues" TO "authenticated";
GRANT ALL ON TABLE "public"."sports_venues" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sports_venues_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sports_venues_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sports_venues_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."st2110_presets" TO "anon";
GRANT ALL ON TABLE "public"."st2110_presets" TO "authenticated";
GRANT ALL ON TABLE "public"."st2110_presets" TO "service_role";



GRANT ALL ON TABLE "public"."sync_config" TO "anon";
GRANT ALL ON TABLE "public"."sync_config" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_config" TO "service_role";



GRANT ALL ON TABLE "public"."sync_intervals_view" TO "anon";
GRANT ALL ON TABLE "public"."sync_intervals_view" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_intervals_view" TO "service_role";



GRANT ALL ON TABLE "public"."sync_monitor" TO "anon";
GRANT ALL ON TABLE "public"."sync_monitor" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_monitor" TO "service_role";



GRANT ALL ON TABLE "public"."sync_pipeline_status" TO "anon";
GRANT ALL ON TABLE "public"."sync_pipeline_status" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_pipeline_status" TO "service_role";



GRANT ALL ON TABLE "public"."sync_queue" TO "anon";
GRANT ALL ON TABLE "public"."sync_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_queue" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sync_queue_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sync_queue_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sync_queue_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."systems" TO "anon";
GRANT ALL ON TABLE "public"."systems" TO "authenticated";
GRANT ALL ON TABLE "public"."systems" TO "service_role";



GRANT ALL ON TABLE "public"."tabfields" TO "anon";
GRANT ALL ON TABLE "public"."tabfields" TO "authenticated";
GRANT ALL ON TABLE "public"."tabfields" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."template_forms" TO "anon";
GRANT ALL ON TABLE "public"."template_forms" TO "authenticated";
GRANT ALL ON TABLE "public"."template_forms" TO "service_role";



GRANT ALL ON TABLE "public"."template_settings" TO "anon";
GRANT ALL ON TABLE "public"."template_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."template_settings" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



GRANT ALL ON TABLE "public"."u_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."u_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."u_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."u_channel_access" TO "anon";
GRANT ALL ON TABLE "public"."u_channel_access" TO "authenticated";
GRANT ALL ON TABLE "public"."u_channel_access" TO "service_role";



GRANT ALL ON TABLE "public"."u_group_members" TO "anon";
GRANT ALL ON TABLE "public"."u_group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."u_group_members" TO "service_role";



GRANT ALL ON TABLE "public"."u_group_permissions" TO "anon";
GRANT ALL ON TABLE "public"."u_group_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."u_group_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."u_groups" TO "anon";
GRANT ALL ON TABLE "public"."u_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."u_groups" TO "service_role";



GRANT ALL ON TABLE "public"."u_invitations" TO "anon";
GRANT ALL ON TABLE "public"."u_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."u_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."u_organizations" TO "anon";
GRANT ALL ON TABLE "public"."u_organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."u_organizations" TO "service_role";



GRANT ALL ON TABLE "public"."u_page_settings" TO "anon";
GRANT ALL ON TABLE "public"."u_page_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."u_page_settings" TO "service_role";



GRANT ALL ON TABLE "public"."u_permissions" TO "anon";
GRANT ALL ON TABLE "public"."u_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."u_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."u_user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."u_user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."u_user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."u_users" TO "anon";
GRANT ALL ON TABLE "public"."u_users" TO "authenticated";
GRANT ALL ON TABLE "public"."u_users" TO "service_role";



GRANT ALL ON TABLE "public"."v_active_agents" TO "anon";
GRANT ALL ON TABLE "public"."v_active_agents" TO "authenticated";
GRANT ALL ON TABLE "public"."v_active_agents" TO "service_role";



GRANT ALL ON TABLE "public"."v_active_feeds" TO "anon";
GRANT ALL ON TABLE "public"."v_active_feeds" TO "authenticated";
GRANT ALL ON TABLE "public"."v_active_feeds" TO "service_role";



GRANT ALL ON TABLE "public"."vs_content" TO "anon";
GRANT ALL ON TABLE "public"."vs_content" TO "authenticated";
GRANT ALL ON TABLE "public"."vs_content" TO "service_role";



GRANT ALL ON TABLE "public"."vs_content_folders" TO "anon";
GRANT ALL ON TABLE "public"."vs_content_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."vs_content_folders" TO "service_role";



GRANT ALL ON TABLE "public"."weather_alerts" TO "anon";
GRANT ALL ON TABLE "public"."weather_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."weather_active_alerts" TO "anon";
GRANT ALL ON TABLE "public"."weather_active_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_active_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."weather_air_quality" TO "anon";
GRANT ALL ON TABLE "public"."weather_air_quality" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_air_quality" TO "service_role";



GRANT ALL ON SEQUENCE "public"."weather_air_quality_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."weather_air_quality_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."weather_air_quality_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."weather_current" TO "anon";
GRANT ALL ON TABLE "public"."weather_current" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_current" TO "service_role";



GRANT ALL ON SEQUENCE "public"."weather_current_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."weather_current_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."weather_current_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."weather_daily_forecast" TO "anon";
GRANT ALL ON TABLE "public"."weather_daily_forecast" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_daily_forecast" TO "service_role";



GRANT ALL ON SEQUENCE "public"."weather_daily_forecast_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."weather_daily_forecast_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."weather_daily_forecast_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."weather_hourly_forecast" TO "anon";
GRANT ALL ON TABLE "public"."weather_hourly_forecast" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_hourly_forecast" TO "service_role";



GRANT ALL ON SEQUENCE "public"."weather_hourly_forecast_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."weather_hourly_forecast_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."weather_hourly_forecast_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."weather_ingest_config" TO "anon";
GRANT ALL ON TABLE "public"."weather_ingest_config" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_ingest_config" TO "service_role";



GRANT ALL ON SEQUENCE "public"."weather_ingest_config_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."weather_ingest_config_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."weather_ingest_config_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."weather_latest" TO "anon";
GRANT ALL ON TABLE "public"."weather_latest" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_latest" TO "service_role";



GRANT ALL ON TABLE "public"."weather_location_channels" TO "anon";
GRANT ALL ON TABLE "public"."weather_location_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."weather_location_channels" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";







