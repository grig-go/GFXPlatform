-- Nova GFX - Development Setup
-- Creates a development organization and updates RLS for dev mode

-- ============================================
-- STEP 1: Create development organization
-- ============================================

INSERT INTO organizations (id, name, slug, settings)
VALUES ('00000000-0000-0000-0000-000000000001', 'Nova Development', 'nova-dev', '{}')
ON CONFLICT (id) DO UPDATE SET name = 'Nova Development';

-- ============================================
-- STEP 2: Update RLS policies to allow authenticated users
-- These policies check auth.uid() is not null, allowing any logged-in user
-- ============================================

-- Chat Messages
DROP POLICY IF EXISTS "Users can view chat messages in their projects" ON gfx_chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages in their projects" ON gfx_chat_messages;
DROP POLICY IF EXISTS "Users can delete chat messages in their projects" ON gfx_chat_messages;
DROP POLICY IF EXISTS "Allow all for development" ON gfx_chat_messages;
DROP POLICY IF EXISTS "dev_allow_all" ON gfx_chat_messages;
DROP POLICY IF EXISTS "Allow all read for development" ON gfx_chat_messages;
DROP POLICY IF EXISTS "Allow all insert for development" ON gfx_chat_messages;
DROP POLICY IF EXISTS "Allow all update for development" ON gfx_chat_messages;
DROP POLICY IF EXISTS "Allow all delete for development" ON gfx_chat_messages;

CREATE POLICY "Authenticated users can do anything" ON gfx_chat_messages
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Layers
ALTER TABLE gfx_layers ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;

DROP POLICY IF EXISTS "Users can view layers in their projects" ON gfx_layers;
DROP POLICY IF EXISTS "Users can insert layers in their projects" ON gfx_layers;
DROP POLICY IF EXISTS "Users can update layers in their projects" ON gfx_layers;
DROP POLICY IF EXISTS "Users can delete layers in their projects" ON gfx_layers;
DROP POLICY IF EXISTS "Allow all read layers" ON gfx_layers;
DROP POLICY IF EXISTS "Allow all insert layers" ON gfx_layers;
DROP POLICY IF EXISTS "Allow all update layers" ON gfx_layers;
DROP POLICY IF EXISTS "Allow all delete layers" ON gfx_layers;

CREATE POLICY "Authenticated users can do anything" ON gfx_layers
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Templates
ALTER TABLE gfx_templates ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;

DROP POLICY IF EXISTS "Users can view templates in their projects" ON gfx_templates;
DROP POLICY IF EXISTS "Users can insert templates in their projects" ON gfx_templates;
DROP POLICY IF EXISTS "Users can update templates in their projects" ON gfx_templates;
DROP POLICY IF EXISTS "Users can delete templates in their projects" ON gfx_templates;
DROP POLICY IF EXISTS "Allow all read templates" ON gfx_templates;
DROP POLICY IF EXISTS "Allow all insert templates" ON gfx_templates;
DROP POLICY IF EXISTS "Allow all update templates" ON gfx_templates;
DROP POLICY IF EXISTS "Allow all delete templates" ON gfx_templates;

CREATE POLICY "Authenticated users can do anything" ON gfx_templates
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Elements
ALTER TABLE gfx_elements ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 0;

DROP POLICY IF EXISTS "Users can view elements in their projects" ON gfx_elements;
DROP POLICY IF EXISTS "Users can insert elements in their projects" ON gfx_elements;
DROP POLICY IF EXISTS "Users can update elements in their projects" ON gfx_elements;
DROP POLICY IF EXISTS "Users can delete elements in their projects" ON gfx_elements;
DROP POLICY IF EXISTS "Allow all read elements" ON gfx_elements;
DROP POLICY IF EXISTS "Allow all insert elements" ON gfx_elements;
DROP POLICY IF EXISTS "Allow all update elements" ON gfx_elements;
DROP POLICY IF EXISTS "Allow all delete elements" ON gfx_elements;

CREATE POLICY "Authenticated users can do anything" ON gfx_elements
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Projects
ALTER TABLE gfx_projects ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE gfx_projects ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;

DROP POLICY IF EXISTS "Users can view their org projects" ON gfx_projects;
DROP POLICY IF EXISTS "Users can create projects in their org" ON gfx_projects;
DROP POLICY IF EXISTS "Users can update their org projects" ON gfx_projects;
DROP POLICY IF EXISTS "Users can delete their org projects" ON gfx_projects;
DROP POLICY IF EXISTS "Allow all read projects" ON gfx_projects;
DROP POLICY IF EXISTS "Allow all insert projects" ON gfx_projects;
DROP POLICY IF EXISTS "Allow all update projects" ON gfx_projects;
DROP POLICY IF EXISTS "Allow all delete projects" ON gfx_projects;

CREATE POLICY "Authenticated users can do anything" ON gfx_projects
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Keyframes
ALTER TABLE gfx_keyframes ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '{}';

DROP POLICY IF EXISTS "Users can view keyframes in their projects" ON gfx_keyframes;
DROP POLICY IF EXISTS "Users can insert keyframes in their projects" ON gfx_keyframes;
DROP POLICY IF EXISTS "Users can update keyframes in their projects" ON gfx_keyframes;
DROP POLICY IF EXISTS "Users can delete keyframes in their projects" ON gfx_keyframes;
DROP POLICY IF EXISTS "Allow all read keyframes" ON gfx_keyframes;
DROP POLICY IF EXISTS "Allow all insert keyframes" ON gfx_keyframes;
DROP POLICY IF EXISTS "Allow all update keyframes" ON gfx_keyframes;
DROP POLICY IF EXISTS "Allow all delete keyframes" ON gfx_keyframes;

CREATE POLICY "Authenticated users can do anything" ON gfx_keyframes
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Animations
DROP POLICY IF EXISTS "Users can view animations in their projects" ON gfx_animations;
DROP POLICY IF EXISTS "Users can insert animations in their projects" ON gfx_animations;
DROP POLICY IF EXISTS "Users can update animations in their projects" ON gfx_animations;
DROP POLICY IF EXISTS "Users can delete animations in their projects" ON gfx_animations;
DROP POLICY IF EXISTS "Allow all read animations" ON gfx_animations;
DROP POLICY IF EXISTS "Allow all insert animations" ON gfx_animations;
DROP POLICY IF EXISTS "Allow all update animations" ON gfx_animations;
DROP POLICY IF EXISTS "Allow all delete animations" ON gfx_animations;

CREATE POLICY "Authenticated users can do anything" ON gfx_animations
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Bindings
DROP POLICY IF EXISTS "Users can view bindings in their projects" ON gfx_bindings;
DROP POLICY IF EXISTS "Users can insert bindings in their projects" ON gfx_bindings;
DROP POLICY IF EXISTS "Users can update bindings in their projects" ON gfx_bindings;
DROP POLICY IF EXISTS "Users can delete bindings in their projects" ON gfx_bindings;
DROP POLICY IF EXISTS "Allow all read bindings" ON gfx_bindings;
DROP POLICY IF EXISTS "Allow all insert bindings" ON gfx_bindings;
DROP POLICY IF EXISTS "Allow all update bindings" ON gfx_bindings;
DROP POLICY IF EXISTS "Allow all delete bindings" ON gfx_bindings;

CREATE POLICY "Authenticated users can do anything" ON gfx_bindings
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Users table (allow users to be created)
DROP POLICY IF EXISTS "Users can view themselves" ON users;
DROP POLICY IF EXISTS "Users can update themselves" ON users;

CREATE POLICY "Authenticated users can view all users" ON users
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert users" ON users
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update themselves" ON users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Organizations (allow reading)
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;

CREATE POLICY "Authenticated users can view organizations" ON organizations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- DONE
-- ============================================









