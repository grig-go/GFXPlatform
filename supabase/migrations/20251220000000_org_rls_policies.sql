-- =====================================================
-- ORGANIZATION-BASED ROW LEVEL SECURITY POLICIES
-- Migration: Replace development "allow all" policies with proper org-scoped policies
-- =====================================================

-- =====================================================
-- STEP 1: Add impersonation support to u_users
-- =====================================================

-- Add column for superuser impersonation
ALTER TABLE u_users ADD COLUMN IF NOT EXISTS acting_as_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- =====================================================
-- STEP 2: Create helper function to get effective org ID
-- This respects superuser impersonation
-- =====================================================

CREATE OR REPLACE FUNCTION get_effective_org_id()
RETURNS UUID AS $$
DECLARE
  v_acting_org UUID;
  v_user_org UUID;
  v_is_superuser BOOLEAN;
BEGIN
  -- First check if current user is superuser and impersonating
  SELECT acting_as_organization_id, is_superuser
  INTO v_acting_org, v_is_superuser
  FROM u_users
  WHERE auth_user_id = auth.uid();

  -- If superuser is impersonating, return the impersonated org
  IF v_is_superuser AND v_acting_org IS NOT NULL THEN
    RETURN v_acting_org;
  END IF;

  -- Otherwise return user's actual organization
  SELECT organization_id INTO v_user_org
  FROM users
  WHERE id = auth.uid();

  RETURN v_user_org;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 3: Create helper function to check if user is superuser
-- =====================================================

CREATE OR REPLACE FUNCTION is_superuser()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM u_users
    WHERE auth_user_id = auth.uid()
    AND is_superuser = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 4: Create helper function to check if user is org admin
-- =====================================================

CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 5: Drop existing development policies
-- =====================================================

-- Organizations
DROP POLICY IF EXISTS "Allow all for development" ON organizations;

-- Users
DROP POLICY IF EXISTS "Allow all for development" ON users;

-- GFX Projects
DROP POLICY IF EXISTS "Allow all for development" ON gfx_projects;

-- GFX Project Design Systems
DROP POLICY IF EXISTS "Allow all for development" ON gfx_project_design_systems;

-- GFX Layers
DROP POLICY IF EXISTS "Allow all for development" ON gfx_layers;

-- GFX Folders
DROP POLICY IF EXISTS "Allow all for development" ON gfx_folders;

-- GFX Templates
DROP POLICY IF EXISTS "Allow all for development" ON gfx_templates;

-- GFX Elements
DROP POLICY IF EXISTS "Allow all for development" ON gfx_elements;

-- GFX Animations
DROP POLICY IF EXISTS "Allow all for development" ON gfx_animations;

-- GFX Keyframes
DROP POLICY IF EXISTS "Allow all for development" ON gfx_keyframes;

-- GFX Bindings
DROP POLICY IF EXISTS "Allow all for development" ON gfx_bindings;

-- GFX Chat History
DROP POLICY IF EXISTS "Allow all for development" ON gfx_chat_history;

-- GFX Playback State
DROP POLICY IF EXISTS "Allow all for development" ON gfx_playback_state;

-- GFX Playback Commands
DROP POLICY IF EXISTS "Allow all for development" ON gfx_playback_commands;

-- GFX Template Versions
DROP POLICY IF EXISTS "Allow all for development" ON gfx_template_versions;

-- GFX Animation Presets
DROP POLICY IF EXISTS "Allow all for development" ON gfx_animation_presets;

-- Pulsar tables - drop all existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read playlists" ON pulsar_playlists;
DROP POLICY IF EXISTS "Allow authenticated users to insert playlists" ON pulsar_playlists;
DROP POLICY IF EXISTS "Allow authenticated users to update playlists" ON pulsar_playlists;
DROP POLICY IF EXISTS "Allow authenticated users to delete playlists" ON pulsar_playlists;

DROP POLICY IF EXISTS "Allow authenticated users to read pages" ON pulsar_pages;
DROP POLICY IF EXISTS "Allow authenticated users to insert pages" ON pulsar_pages;
DROP POLICY IF EXISTS "Allow authenticated users to update pages" ON pulsar_pages;
DROP POLICY IF EXISTS "Allow authenticated users to delete pages" ON pulsar_pages;

DROP POLICY IF EXISTS "Allow authenticated users to manage page groups" ON pulsar_page_groups;

DROP POLICY IF EXISTS "Allow authenticated users to read channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow authenticated users to manage channels" ON pulsar_channels;

DROP POLICY IF EXISTS "Allow authenticated users to manage channel state" ON pulsar_channel_state;

DROP POLICY IF EXISTS "Allow authenticated users to manage custom UIs" ON pulsar_custom_uis;

DROP POLICY IF EXISTS "Allow authenticated users to manage custom UI controls" ON pulsar_custom_ui_controls;

DROP POLICY IF EXISTS "Allow authenticated users to read command log" ON pulsar_command_log;
DROP POLICY IF EXISTS "Allow authenticated users to insert command log" ON pulsar_command_log;

-- =====================================================
-- STEP 6: Create new organization-scoped policies
-- =====================================================

-- -------------------------------------------------
-- ORGANIZATIONS TABLE
-- -------------------------------------------------

-- Superuser can do everything
CREATE POLICY "Superuser full access to organizations"
  ON organizations FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

-- Regular users can only read their own organization
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (id = get_effective_org_id());

-- -------------------------------------------------
-- USERS TABLE
-- -------------------------------------------------

-- Superuser can do everything
CREATE POLICY "Superuser full access to users"
  ON users FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

-- Org admins can manage their org's users
CREATE POLICY "Org admins can manage org users"
  ON users FOR ALL
  TO authenticated
  USING (
    organization_id = get_effective_org_id()
    AND is_org_admin()
  )
  WITH CHECK (
    organization_id = get_effective_org_id()
    AND is_org_admin()
  );

-- Users can view their own org's members
CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  TO authenticated
  USING (organization_id = get_effective_org_id());

-- Users can update their own record
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- -------------------------------------------------
-- GFX PROJECTS TABLE
-- -------------------------------------------------

-- Superuser can access all projects
CREATE POLICY "Superuser full access to projects"
  ON gfx_projects FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

-- Users can access their org's projects
CREATE POLICY "Users can access org projects"
  ON gfx_projects FOR ALL
  TO authenticated
  USING (organization_id = get_effective_org_id())
  WITH CHECK (organization_id = get_effective_org_id());

-- -------------------------------------------------
-- GFX PROJECT DESIGN SYSTEMS TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to design systems"
  ON gfx_project_design_systems FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org project design systems"
  ON gfx_project_design_systems FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM gfx_projects WHERE organization_id = get_effective_org_id()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM gfx_projects WHERE organization_id = get_effective_org_id()
    )
  );

-- -------------------------------------------------
-- GFX LAYERS TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to layers"
  ON gfx_layers FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org project layers"
  ON gfx_layers FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM gfx_projects WHERE organization_id = get_effective_org_id()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM gfx_projects WHERE organization_id = get_effective_org_id()
    )
  );

-- -------------------------------------------------
-- GFX FOLDERS TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to folders"
  ON gfx_folders FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org project folders"
  ON gfx_folders FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM gfx_projects WHERE organization_id = get_effective_org_id()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM gfx_projects WHERE organization_id = get_effective_org_id()
    )
  );

-- -------------------------------------------------
-- GFX TEMPLATES TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to templates"
  ON gfx_templates FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org project templates"
  ON gfx_templates FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM gfx_projects WHERE organization_id = get_effective_org_id()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM gfx_projects WHERE organization_id = get_effective_org_id()
    )
  );

-- -------------------------------------------------
-- GFX ELEMENTS TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to elements"
  ON gfx_elements FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org project elements"
  ON gfx_elements FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT t.id FROM gfx_templates t
      JOIN gfx_projects p ON t.project_id = p.id
      WHERE p.organization_id = get_effective_org_id()
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT t.id FROM gfx_templates t
      JOIN gfx_projects p ON t.project_id = p.id
      WHERE p.organization_id = get_effective_org_id()
    )
  );

-- -------------------------------------------------
-- GFX ANIMATIONS TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to animations"
  ON gfx_animations FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org project animations"
  ON gfx_animations FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT t.id FROM gfx_templates t
      JOIN gfx_projects p ON t.project_id = p.id
      WHERE p.organization_id = get_effective_org_id()
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT t.id FROM gfx_templates t
      JOIN gfx_projects p ON t.project_id = p.id
      WHERE p.organization_id = get_effective_org_id()
    )
  );

-- -------------------------------------------------
-- GFX KEYFRAMES TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to keyframes"
  ON gfx_keyframes FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org project keyframes"
  ON gfx_keyframes FOR ALL
  TO authenticated
  USING (
    animation_id IN (
      SELECT a.id FROM gfx_animations a
      JOIN gfx_templates t ON a.template_id = t.id
      JOIN gfx_projects p ON t.project_id = p.id
      WHERE p.organization_id = get_effective_org_id()
    )
  )
  WITH CHECK (
    animation_id IN (
      SELECT a.id FROM gfx_animations a
      JOIN gfx_templates t ON a.template_id = t.id
      JOIN gfx_projects p ON t.project_id = p.id
      WHERE p.organization_id = get_effective_org_id()
    )
  );

-- -------------------------------------------------
-- GFX BINDINGS TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to bindings"
  ON gfx_bindings FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org project bindings"
  ON gfx_bindings FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT t.id FROM gfx_templates t
      JOIN gfx_projects p ON t.project_id = p.id
      WHERE p.organization_id = get_effective_org_id()
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT t.id FROM gfx_templates t
      JOIN gfx_projects p ON t.project_id = p.id
      WHERE p.organization_id = get_effective_org_id()
    )
  );

-- -------------------------------------------------
-- GFX CHAT HISTORY TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to chat history"
  ON gfx_chat_history FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org project chat history"
  ON gfx_chat_history FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM gfx_projects WHERE organization_id = get_effective_org_id()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM gfx_projects WHERE organization_id = get_effective_org_id()
    )
  );

-- -------------------------------------------------
-- GFX PLAYBACK STATE TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to playback state"
  ON gfx_playback_state FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org project playback state"
  ON gfx_playback_state FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM gfx_projects WHERE organization_id = get_effective_org_id()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM gfx_projects WHERE organization_id = get_effective_org_id()
    )
  );

-- -------------------------------------------------
-- GFX PLAYBACK COMMANDS TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to playback commands"
  ON gfx_playback_commands FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org project playback commands"
  ON gfx_playback_commands FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM gfx_projects WHERE organization_id = get_effective_org_id()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM gfx_projects WHERE organization_id = get_effective_org_id()
    )
  );

-- -------------------------------------------------
-- GFX TEMPLATE VERSIONS TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to template versions"
  ON gfx_template_versions FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org project template versions"
  ON gfx_template_versions FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT t.id FROM gfx_templates t
      JOIN gfx_projects p ON t.project_id = p.id
      WHERE p.organization_id = get_effective_org_id()
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT t.id FROM gfx_templates t
      JOIN gfx_projects p ON t.project_id = p.id
      WHERE p.organization_id = get_effective_org_id()
    )
  );

-- -------------------------------------------------
-- GFX ANIMATION PRESETS TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to animation presets"
  ON gfx_animation_presets FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

-- System presets are readable by all
CREATE POLICY "All users can read system animation presets"
  ON gfx_animation_presets FOR SELECT
  TO authenticated
  USING (is_system = true);

-- Users can access their org's presets
CREATE POLICY "Users can access org animation presets"
  ON gfx_animation_presets FOR ALL
  TO authenticated
  USING (organization_id = get_effective_org_id())
  WITH CHECK (organization_id = get_effective_org_id());

-- -------------------------------------------------
-- PULSAR PLAYLISTS TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to playlists"
  ON pulsar_playlists FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org playlists"
  ON pulsar_playlists FOR ALL
  TO authenticated
  USING (organization_id = get_effective_org_id())
  WITH CHECK (organization_id = get_effective_org_id());

-- -------------------------------------------------
-- PULSAR PAGES TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to pages"
  ON pulsar_pages FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org pages"
  ON pulsar_pages FOR ALL
  TO authenticated
  USING (organization_id = get_effective_org_id())
  WITH CHECK (organization_id = get_effective_org_id());

-- -------------------------------------------------
-- PULSAR PAGE GROUPS TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to page groups"
  ON pulsar_page_groups FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org page groups"
  ON pulsar_page_groups FOR ALL
  TO authenticated
  USING (
    playlist_id IN (
      SELECT id FROM pulsar_playlists WHERE organization_id = get_effective_org_id()
    )
  )
  WITH CHECK (
    playlist_id IN (
      SELECT id FROM pulsar_playlists WHERE organization_id = get_effective_org_id()
    )
  );

-- -------------------------------------------------
-- PULSAR CHANNELS TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to channels"
  ON pulsar_channels FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org channels"
  ON pulsar_channels FOR ALL
  TO authenticated
  USING (organization_id = get_effective_org_id())
  WITH CHECK (organization_id = get_effective_org_id());

-- -------------------------------------------------
-- PULSAR CHANNEL STATE TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to channel state"
  ON pulsar_channel_state FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org channel state"
  ON pulsar_channel_state FOR ALL
  TO authenticated
  USING (
    channel_id IN (
      SELECT id FROM pulsar_channels WHERE organization_id = get_effective_org_id()
    )
  )
  WITH CHECK (
    channel_id IN (
      SELECT id FROM pulsar_channels WHERE organization_id = get_effective_org_id()
    )
  );

-- -------------------------------------------------
-- PULSAR CUSTOM UIS TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to custom UIs"
  ON pulsar_custom_uis FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org custom UIs"
  ON pulsar_custom_uis FOR ALL
  TO authenticated
  USING (organization_id = get_effective_org_id())
  WITH CHECK (organization_id = get_effective_org_id());

-- -------------------------------------------------
-- PULSAR CUSTOM UI CONTROLS TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to custom UI controls"
  ON pulsar_custom_ui_controls FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org custom UI controls"
  ON pulsar_custom_ui_controls FOR ALL
  TO authenticated
  USING (
    custom_ui_id IN (
      SELECT id FROM pulsar_custom_uis WHERE organization_id = get_effective_org_id()
    )
  )
  WITH CHECK (
    custom_ui_id IN (
      SELECT id FROM pulsar_custom_uis WHERE organization_id = get_effective_org_id()
    )
  );

-- -------------------------------------------------
-- PULSAR COMMAND LOG TABLE
-- -------------------------------------------------

CREATE POLICY "Superuser full access to command log"
  ON pulsar_command_log FOR ALL
  TO authenticated
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "Users can access org command log"
  ON pulsar_command_log FOR SELECT
  TO authenticated
  USING (organization_id = get_effective_org_id());

CREATE POLICY "Users can insert org command log"
  ON pulsar_command_log FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_effective_org_id());

-- =====================================================
-- STEP 7: Add anon policies for player access
-- Some tables need anon access for the player to work
-- =====================================================

-- GFX Playback state needs anon read for player
CREATE POLICY "Anon can read playback state"
  ON gfx_playback_state FOR SELECT
  TO anon
  USING (true);

-- GFX Playback commands needs anon read for player
CREATE POLICY "Anon can read playback commands"
  ON gfx_playback_commands FOR SELECT
  TO anon
  USING (true);

-- Pulsar channel state needs anon read for player
CREATE POLICY "Anon can read channel state"
  ON pulsar_channel_state FOR SELECT
  TO anon
  USING (true);

-- Anon can update channel state (for player acknowledgments)
CREATE POLICY "Anon can update channel state"
  ON pulsar_channel_state FOR UPDATE
  TO anon
  USING (true);
