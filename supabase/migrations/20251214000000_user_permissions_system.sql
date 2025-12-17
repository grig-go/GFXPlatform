-- Migration: User Permissions System
-- Creates tables for user management, groups, permissions, and audit logging
-- Frontend-only enforcement (no RLS policies on existing tables)

-- ============================================================================
-- 1. CORE AUTH TABLES
-- ============================================================================

-- u_users: Extended user profiles linked to auth.users
CREATE TABLE IF NOT EXISTS u_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'inactive')),
  is_superuser boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Only one superuser allowed (enforced at DB level as safety net)
CREATE UNIQUE INDEX IF NOT EXISTS u_users_single_superuser ON u_users ((true)) WHERE is_superuser = true;
CREATE INDEX IF NOT EXISTS idx_u_users_auth_user_id ON u_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_u_users_email ON u_users(email);
CREATE INDEX IF NOT EXISTS idx_u_users_status ON u_users(status);

-- u_groups: Permission groups
CREATE TABLE IF NOT EXISTS u_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  color text DEFAULT '#6366f1',
  is_system boolean DEFAULT false,  -- Cannot be deleted (admin group)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- u_group_members: User to Group relationships
CREATE TABLE IF NOT EXISTS u_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES u_users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES u_groups(id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_u_group_members_user_id ON u_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_u_group_members_group_id ON u_group_members(group_id);

-- ============================================================================
-- 2. PERMISSION TABLES
-- ============================================================================

-- u_permissions: Permission definitions
CREATE TABLE IF NOT EXISTS u_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_key text NOT NULL,  -- 'system' or applications.app_key
  resource text NOT NULL,
  action text NOT NULL CHECK (action IN ('read', 'write', 'admin')),
  description text,
  UNIQUE(app_key, resource, action)
);

CREATE INDEX IF NOT EXISTS idx_u_permissions_app_key ON u_permissions(app_key);

-- u_group_permissions: Permissions assigned to groups
CREATE TABLE IF NOT EXISTS u_group_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES u_groups(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES u_permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_u_group_permissions_group_id ON u_group_permissions(group_id);

-- u_user_permissions: Direct user permission overrides
CREATE TABLE IF NOT EXISTS u_user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES u_users(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES u_permissions(id) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,  -- false = explicit deny
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_u_user_permissions_user_id ON u_user_permissions(user_id);

-- u_channel_access: Pulsar channel-level write access
CREATE TABLE IF NOT EXISTS u_channel_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES u_users(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  can_write boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_u_channel_access_user_id ON u_channel_access(user_id);
CREATE INDEX IF NOT EXISTS idx_u_channel_access_channel_id ON u_channel_access(channel_id);

-- ============================================================================
-- 3. UI CONTROL TABLES
-- ============================================================================

-- u_page_settings: Admin-controlled page visibility
CREATE TABLE IF NOT EXISTS u_page_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_key text NOT NULL,
  page_key text NOT NULL,
  page_label text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(app_key, page_key)
);

CREATE INDEX IF NOT EXISTS idx_u_page_settings_app_key ON u_page_settings(app_key);

-- ============================================================================
-- 4. AUDIT TABLES
-- ============================================================================

-- u_audit_log: Comprehensive activity tracking
CREATE TABLE IF NOT EXISTS u_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  app_key text NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'login', 'logout', 'permission_change')),
  resource_type text NOT NULL,
  resource_id text,
  resource_name text,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_u_audit_log_user ON u_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_u_audit_log_resource ON u_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_u_audit_log_created ON u_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_u_audit_log_app_key ON u_audit_log(app_key);

-- ============================================================================
-- 5. DEFAULT PERMISSIONS
-- ============================================================================

-- System permissions (app_key = 'system')
INSERT INTO u_permissions (app_key, resource, action, description) VALUES
  ('system', 'users', 'read', 'View user list and profiles'),
  ('system', 'users', 'write', 'Create and edit users'),
  ('system', 'users', 'admin', 'Full user management including status changes'),
  ('system', 'groups', 'read', 'View groups and memberships'),
  ('system', 'groups', 'write', 'Create and edit groups'),
  ('system', 'groups', 'admin', 'Full group management'),
  ('system', 'applications', 'read', 'View application list'),
  ('system', 'applications', 'admin', 'Enable/disable applications'),
  ('system', 'pages', 'admin', 'Enable/disable pages within apps'),
  ('system', 'audit', 'read', 'View audit logs')
ON CONFLICT (app_key, resource, action) DO NOTHING;

-- Nova permissions
INSERT INTO u_permissions (app_key, resource, action, description) VALUES
  ('nova', 'election', 'read', 'View election data'),
  ('nova', 'election', 'write', 'Edit election data'),
  ('nova', 'finance', 'read', 'View finance data'),
  ('nova', 'finance', 'write', 'Edit finance data'),
  ('nova', 'sports', 'read', 'View sports data'),
  ('nova', 'sports', 'write', 'Edit sports data'),
  ('nova', 'weather', 'read', 'View weather data'),
  ('nova', 'weather', 'write', 'Edit weather data'),
  ('nova', 'news', 'read', 'View news and feeds'),
  ('nova', 'news', 'write', 'Edit news and feeds'),
  ('nova', 'media', 'read', 'View media library'),
  ('nova', 'media', 'write', 'Upload and edit media'),
  ('nova', 'school_closings', 'read', 'View school closings'),
  ('nova', 'school_closings', 'write', 'Edit school closings'),
  ('nova', 'channels', 'read', 'View channel configuration'),
  ('nova', 'channels', 'write', 'Edit channel configuration'),
  ('nova', 'channels', 'admin', 'Full channel management'),
  ('nova', 'ai_connections', 'read', 'View AI provider settings'),
  ('nova', 'ai_connections', 'write', 'Edit AI provider settings'),
  ('nova', 'ai_connections', 'admin', 'Full AI connection management'),
  ('nova', 'agents', 'read', 'View AI agents'),
  ('nova', 'agents', 'write', 'Create and edit AI agents')
ON CONFLICT (app_key, resource, action) DO NOTHING;

-- Pulsar permissions
INSERT INTO u_permissions (app_key, resource, action, description) VALUES
  ('pulsar', 'channels', 'read', 'View channels'),
  ('pulsar', 'channels', 'write', 'Edit channels'),
  ('pulsar', 'channels', 'admin', 'Full channel management'),
  ('pulsar', 'playlists', 'read', 'View channel playlists'),
  ('pulsar', 'playlists', 'write', 'Edit channel playlists (requires channel access)'),
  ('pulsar', 'content', 'read', 'View content'),
  ('pulsar', 'content', 'write', 'Create and edit content'),
  ('pulsar', 'templates', 'read', 'View templates'),
  ('pulsar', 'templates', 'write', 'Create and edit templates'),
  ('pulsar', 'widgets', 'read', 'View widgets'),
  ('pulsar', 'widgets', 'write', 'Create and edit widgets'),
  ('pulsar', 'virtual_set', 'read', 'View virtual set'),
  ('pulsar', 'virtual_set', 'write', 'Edit virtual set'),
  ('pulsar', 'integrations', 'read', 'View data integrations'),
  ('pulsar', 'integrations', 'write', 'Create and edit integrations'),
  ('pulsar', 'sponsors', 'read', 'View sponsor schedules'),
  ('pulsar', 'sponsors', 'write', 'Edit sponsor schedules'),
  ('pulsar', 'banners', 'read', 'View banner schedules'),
  ('pulsar', 'banners', 'write', 'Edit banner schedules'),
  ('pulsar', 'live_view', 'read', 'View live preview')
ON CONFLICT (app_key, resource, action) DO NOTHING;

-- ============================================================================
-- 6. DEFAULT GROUPS
-- ============================================================================

-- Administrators group (is_system = true, cannot be deleted)
INSERT INTO u_groups (name, description, is_system, color)
VALUES ('Administrators', 'Full admin access to all applications', true, '#dc2626')
ON CONFLICT (name) DO NOTHING;

-- Default editor/viewer groups
INSERT INTO u_groups (name, description, color) VALUES
  ('Nova Editors', 'Can edit all Nova data types', '#2563eb'),
  ('Nova Viewers', 'Read-only access to Nova', '#6b7280'),
  ('Pulsar Editors', 'Can edit Pulsar content', '#7c3aed'),
  ('Pulsar Viewers', 'Read-only access to Pulsar', '#64748b')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 7. ASSIGN PERMISSIONS TO DEFAULT GROUPS
-- ============================================================================

-- Administrators get ALL permissions
INSERT INTO u_group_permissions (group_id, permission_id)
SELECT g.id, p.id
FROM u_groups g
CROSS JOIN u_permissions p
WHERE g.name = 'Administrators'
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- Nova Editors get all nova read/write permissions
INSERT INTO u_group_permissions (group_id, permission_id)
SELECT g.id, p.id
FROM u_groups g
CROSS JOIN u_permissions p
WHERE g.name = 'Nova Editors'
  AND p.app_key = 'nova'
  AND p.action IN ('read', 'write')
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- Nova Viewers get all nova read permissions
INSERT INTO u_group_permissions (group_id, permission_id)
SELECT g.id, p.id
FROM u_groups g
CROSS JOIN u_permissions p
WHERE g.name = 'Nova Viewers'
  AND p.app_key = 'nova'
  AND p.action = 'read'
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- Pulsar Editors get all pulsar read/write permissions
INSERT INTO u_group_permissions (group_id, permission_id)
SELECT g.id, p.id
FROM u_groups g
CROSS JOIN u_permissions p
WHERE g.name = 'Pulsar Editors'
  AND p.app_key = 'pulsar'
  AND p.action IN ('read', 'write')
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- Pulsar Viewers get all pulsar read permissions
INSERT INTO u_group_permissions (group_id, permission_id)
SELECT g.id, p.id
FROM u_groups g
CROSS JOIN u_permissions p
WHERE g.name = 'Pulsar Viewers'
  AND p.app_key = 'pulsar'
  AND p.action = 'read'
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ============================================================================
-- 8. PAGE SETTINGS
-- ============================================================================

-- Nova pages
INSERT INTO u_page_settings (app_key, page_key, page_label, enabled, display_order) VALUES
  ('nova', 'home', 'Home Dashboard', true, 1),
  ('nova', 'election', 'Election', true, 2),
  ('nova', 'finance', 'Finance', true, 3),
  ('nova', 'sports', 'Sports', true, 4),
  ('nova', 'weather', 'Weather', true, 5),
  ('nova', 'weather-data', 'Weather Data', true, 6),
  ('nova', 'news', 'News', true, 7),
  ('nova', 'feeds', 'Feeds', true, 8),
  ('nova', 'agents', 'AI Agents', true, 9),
  ('nova', 'users-groups', 'Users & Groups', true, 10),
  ('nova', 'ai-connections', 'AI Connections', true, 11),
  ('nova', 'media', 'Media Library', true, 12),
  ('nova', 'channels', 'Channels', true, 13),
  ('nova', 'school-closings', 'School Closings', true, 14)
ON CONFLICT (app_key, page_key) DO NOTHING;

-- Pulsar pages
INSERT INTO u_page_settings (app_key, page_key, page_label, enabled, display_order) VALUES
  ('pulsar', 'channels', 'Channels', true, 1),
  ('pulsar', 'channel-playlists', 'Channel Schedules', true, 2),
  ('pulsar', 'content', 'Content', true, 3),
  ('pulsar', 'templates', 'Templates', true, 4),
  ('pulsar', 'widget-builder', 'Widget Builder', true, 5),
  ('pulsar', 'virtual-set', 'Virtual Set', true, 6),
  ('pulsar', 'integrations', 'Integrations', true, 7),
  ('pulsar', 'sponsors', 'Sponsor Scheduling', true, 8),
  ('pulsar', 'banners', 'Banner Scheduling', true, 9),
  ('pulsar', 'widget-windows', 'Widget Windows', true, 10),
  ('pulsar', 'live-view', 'Live View', true, 11),
  ('pulsar', 'production-widget', 'Production Widget', true, 12)
ON CONFLICT (app_key, page_key) DO NOTHING;

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Helper to get user's resolved permissions (for single query from frontend)
CREATE OR REPLACE FUNCTION get_user_permissions(p_auth_user_id uuid)
RETURNS TABLE (
  app_key text,
  resource text,
  action text,
  granted boolean,
  source text
) AS $$
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
$$ LANGUAGE sql STABLE;

-- Helper to check if system is initialized (has superuser)
CREATE OR REPLACE FUNCTION system_initialized()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM u_users WHERE is_superuser = true);
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- 10. AUDIT TRIGGER FUNCTION
-- ============================================================================

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION u_audit_trigger()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. AUDIT TRIGGERS ON KEY TABLES
-- ============================================================================

-- System tables
DROP TRIGGER IF EXISTS audit_u_users ON u_users;
CREATE TRIGGER audit_u_users
  AFTER INSERT OR UPDATE OR DELETE ON u_users
  FOR EACH ROW EXECUTE FUNCTION u_audit_trigger('system');

DROP TRIGGER IF EXISTS audit_u_groups ON u_groups;
CREATE TRIGGER audit_u_groups
  AFTER INSERT OR UPDATE OR DELETE ON u_groups
  FOR EACH ROW EXECUTE FUNCTION u_audit_trigger('system');

DROP TRIGGER IF EXISTS audit_u_group_members ON u_group_members;
CREATE TRIGGER audit_u_group_members
  AFTER INSERT OR UPDATE OR DELETE ON u_group_members
  FOR EACH ROW EXECUTE FUNCTION u_audit_trigger('system');

-- Nova tables (election)
DROP TRIGGER IF EXISTS audit_e_race_results ON e_race_results;
CREATE TRIGGER audit_e_race_results
  AFTER INSERT OR UPDATE OR DELETE ON e_race_results
  FOR EACH ROW EXECUTE FUNCTION u_audit_trigger('nova');

DROP TRIGGER IF EXISTS audit_e_candidate_results ON e_candidate_results;
CREATE TRIGGER audit_e_candidate_results
  AFTER INSERT OR UPDATE OR DELETE ON e_candidate_results
  FOR EACH ROW EXECUTE FUNCTION u_audit_trigger('nova');

-- Nova tables (channels)
DROP TRIGGER IF EXISTS audit_channels ON channels;
CREATE TRIGGER audit_channels
  AFTER INSERT OR UPDATE OR DELETE ON channels
  FOR EACH ROW EXECUTE FUNCTION u_audit_trigger('nova');

-- Nova tables (media)
DROP TRIGGER IF EXISTS audit_media_assets ON media_assets;
CREATE TRIGGER audit_media_assets
  AFTER INSERT OR UPDATE OR DELETE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION u_audit_trigger('nova');

-- Pulsar tables
DROP TRIGGER IF EXISTS audit_channel_playlists ON channel_playlists;
CREATE TRIGGER audit_channel_playlists
  AFTER INSERT OR UPDATE OR DELETE ON channel_playlists
  FOR EACH ROW EXECUTE FUNCTION u_audit_trigger('pulsar');

DROP TRIGGER IF EXISTS audit_content ON content;
CREATE TRIGGER audit_content
  AFTER INSERT OR UPDATE OR DELETE ON content
  FOR EACH ROW EXECUTE FUNCTION u_audit_trigger('pulsar');

DROP TRIGGER IF EXISTS audit_templates ON templates;
CREATE TRIGGER audit_templates
  AFTER INSERT OR UPDATE OR DELETE ON templates
  FOR EACH ROW EXECUTE FUNCTION u_audit_trigger('pulsar');

DROP TRIGGER IF EXISTS audit_data_sources ON data_sources;
CREATE TRIGGER audit_data_sources
  AFTER INSERT OR UPDATE OR DELETE ON data_sources
  FOR EACH ROW EXECUTE FUNCTION u_audit_trigger('pulsar');

-- ============================================================================
-- 12. GRANTS (allow authenticated users to access these tables)
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON u_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON u_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON u_group_members TO authenticated;
GRANT SELECT ON u_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON u_group_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON u_user_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON u_channel_access TO authenticated;
GRANT SELECT, INSERT, UPDATE ON u_page_settings TO authenticated;
GRANT SELECT, INSERT ON u_audit_log TO authenticated;

-- Service role gets full access
GRANT ALL ON u_users TO service_role;
GRANT ALL ON u_groups TO service_role;
GRANT ALL ON u_group_members TO service_role;
GRANT ALL ON u_permissions TO service_role;
GRANT ALL ON u_group_permissions TO service_role;
GRANT ALL ON u_user_permissions TO service_role;
GRANT ALL ON u_channel_access TO service_role;
GRANT ALL ON u_page_settings TO service_role;
GRANT ALL ON u_audit_log TO service_role;
