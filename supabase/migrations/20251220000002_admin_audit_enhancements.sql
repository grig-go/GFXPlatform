-- =====================================================
-- ADMIN AUDIT LOG ENHANCEMENTS
-- Migration: Add additional audit tracking for admin operations
-- =====================================================

-- =====================================================
-- STEP 1: Add additional indexes for common queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_u_audit_log_action_created
  ON u_audit_log(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_u_audit_log_resource_type_action
  ON u_audit_log(resource_type, action, created_at DESC);

-- =====================================================
-- STEP 2: Add RLS policies for u_audit_log
-- =====================================================

ALTER TABLE u_audit_log ENABLE ROW LEVEL SECURITY;

-- Superuser can view all audit logs
CREATE POLICY "Superuser can view all audit logs"
  ON u_audit_log FOR SELECT
  TO authenticated
  USING (is_superuser());

-- Org admins can view their org's audit logs
CREATE POLICY "Org admins can view org audit logs"
  ON u_audit_log FOR SELECT
  TO authenticated
  USING (
    is_org_admin()
    AND (
      -- System-level logs for their org
      (resource_type = 'organization' AND resource_id = get_effective_org_id()::text)
      OR
      -- User logs for their org members
      (resource_type = 'user' AND resource_id IN (
        SELECT id::text FROM users WHERE organization_id = get_effective_org_id()
      ))
      OR
      -- App-specific logs (nova/pulsar) - check if resource belongs to their org
      app_key IN ('nova', 'pulsar')
    )
  );

-- Users can view their own audit trail
CREATE POLICY "Users can view own audit logs"
  ON u_audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- STEP 3: Add RPC to get admin audit log (with filters)
-- =====================================================

CREATE OR REPLACE FUNCTION get_admin_audit_log(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_action TEXT DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  app_key TEXT,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  resource_name TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if current user is superuser
  IF NOT is_superuser() THEN
    RAISE EXCEPTION 'Only superuser can access admin audit log';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.user_id,
    al.user_email,
    al.app_key,
    al.action,
    al.resource_type,
    al.resource_id,
    al.resource_name,
    al.old_values,
    al.new_values,
    al.ip_address,
    al.created_at
  FROM u_audit_log al
  WHERE
    (p_action IS NULL OR al.action = p_action)
    AND (p_resource_type IS NULL OR al.resource_type = p_resource_type)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_from_date IS NULL OR al.created_at >= p_from_date)
    AND (p_to_date IS NULL OR al.created_at <= p_to_date)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 4: Add RPC to get audit log summary stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_audit_log_stats(
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check if current user is superuser
  IF NOT is_superuser() THEN
    RAISE EXCEPTION 'Only superuser can access audit log stats';
  END IF;

  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'by_action', (
      SELECT jsonb_object_agg(action, cnt)
      FROM (
        SELECT action, COUNT(*) as cnt
        FROM u_audit_log
        WHERE created_at >= NOW() - (p_days || ' days')::interval
        GROUP BY action
      ) t
    ),
    'by_resource_type', (
      SELECT jsonb_object_agg(resource_type, cnt)
      FROM (
        SELECT resource_type, COUNT(*) as cnt
        FROM u_audit_log
        WHERE created_at >= NOW() - (p_days || ' days')::interval
        GROUP BY resource_type
      ) t
    ),
    'by_app', (
      SELECT jsonb_object_agg(app_key, cnt)
      FROM (
        SELECT app_key, COUNT(*) as cnt
        FROM u_audit_log
        WHERE created_at >= NOW() - (p_days || ' days')::interval
        GROUP BY app_key
      ) t
    ),
    'impersonation_events', (
      SELECT COUNT(*)
      FROM u_audit_log
      WHERE created_at >= NOW() - (p_days || ' days')::interval
      AND action = 'permission_change'
      AND new_values->>'action' IN ('impersonation_start', 'impersonation_end')
    )
  ) INTO v_result
  FROM u_audit_log
  WHERE created_at >= NOW() - (p_days || ' days')::interval;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 5: Add admin dashboard stats RPC
-- =====================================================

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSONB AS $$
BEGIN
  -- Check if current user is superuser
  IF NOT is_superuser() THEN
    RAISE EXCEPTION 'Only superuser can access admin dashboard stats';
  END IF;

  RETURN jsonb_build_object(
    'organizations', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'created_last_30_days', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')
      )
      FROM organizations
    ),
    'users', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'active', COUNT(*) FILTER (WHERE organization_id IS NOT NULL),
        'orphaned', COUNT(*) FILTER (WHERE organization_id IS NULL),
        'by_role', (
          SELECT jsonb_object_agg(role, cnt)
          FROM (
            SELECT role, COUNT(*) as cnt
            FROM users
            WHERE organization_id IS NOT NULL
            GROUP BY role
          ) t
        )
      )
      FROM users
    ),
    'projects', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'live', COUNT(*) FILTER (WHERE is_live = true),
        'archived', COUNT(*) FILTER (WHERE archived = true)
      )
      FROM gfx_projects
    ),
    'pulsar', (
      SELECT jsonb_build_object(
        'playlists', (SELECT COUNT(*) FROM pulsar_playlists),
        'channels', (SELECT COUNT(*) FROM pulsar_channels),
        'pages', (SELECT COUNT(*) FROM pulsar_pages)
      )
    ),
    'recent_activity', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          id,
          user_email,
          action,
          resource_type,
          resource_name,
          created_at
        FROM u_audit_log
        WHERE app_key = 'system'
        ORDER BY created_at DESC
        LIMIT 10
      ) t
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 6: Grant execute permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION get_admin_audit_log(INTEGER, INTEGER, TEXT, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_log_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
