-- Nova GFX - Fix RLS Policies for Development
-- Run this in Supabase SQL Editor to fix permission issues

-- ============================================
-- STEP 1: Drop existing restrictive policies
-- ============================================

DROP POLICY IF EXISTS "Users can view chat messages in their projects" ON gfx_chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages in their projects" ON gfx_chat_messages;
DROP POLICY IF EXISTS "Users can delete chat messages in their projects" ON gfx_chat_messages;
DROP POLICY IF EXISTS "Allow all for development" ON gfx_chat_messages;

-- ============================================
-- STEP 2: Create permissive policies for development
-- These allow all operations without authentication
-- ============================================

CREATE POLICY "Allow all read for development" ON gfx_chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Allow all insert for development" ON gfx_chat_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all update for development" ON gfx_chat_messages
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow all delete for development" ON gfx_chat_messages
  FOR DELETE USING (true);

-- ============================================
-- STEP 3: Fix gfx_layers - Add missing locked column
-- ============================================

ALTER TABLE gfx_layers 
ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;

-- ============================================
-- STEP 4: Fix gfx_layers RLS policies
-- ============================================

DROP POLICY IF EXISTS "Users can view layers in their projects" ON gfx_layers;
DROP POLICY IF EXISTS "Users can insert layers in their projects" ON gfx_layers;
DROP POLICY IF EXISTS "Users can update layers in their projects" ON gfx_layers;
DROP POLICY IF EXISTS "Users can delete layers in their projects" ON gfx_layers;

CREATE POLICY "Allow all read layers" ON gfx_layers FOR SELECT USING (true);
CREATE POLICY "Allow all insert layers" ON gfx_layers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update layers" ON gfx_layers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete layers" ON gfx_layers FOR DELETE USING (true);

-- ============================================
-- STEP 5: Fix gfx_templates RLS policies
-- ============================================

ALTER TABLE gfx_templates 
ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;

DROP POLICY IF EXISTS "Users can view templates in their projects" ON gfx_templates;
DROP POLICY IF EXISTS "Users can insert templates in their projects" ON gfx_templates;
DROP POLICY IF EXISTS "Users can update templates in their projects" ON gfx_templates;
DROP POLICY IF EXISTS "Users can delete templates in their projects" ON gfx_templates;

CREATE POLICY "Allow all read templates" ON gfx_templates FOR SELECT USING (true);
CREATE POLICY "Allow all insert templates" ON gfx_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update templates" ON gfx_templates FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete templates" ON gfx_templates FOR DELETE USING (true);

-- ============================================
-- STEP 6: Fix gfx_elements RLS policies
-- ============================================

ALTER TABLE gfx_elements 
ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 0;

DROP POLICY IF EXISTS "Users can view elements in their projects" ON gfx_elements;
DROP POLICY IF EXISTS "Users can insert elements in their projects" ON gfx_elements;
DROP POLICY IF EXISTS "Users can update elements in their projects" ON gfx_elements;
DROP POLICY IF EXISTS "Users can delete elements in their projects" ON gfx_elements;

CREATE POLICY "Allow all read elements" ON gfx_elements FOR SELECT USING (true);
CREATE POLICY "Allow all insert elements" ON gfx_elements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update elements" ON gfx_elements FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete elements" ON gfx_elements FOR DELETE USING (true);

-- ============================================
-- STEP 7: Fix gfx_projects RLS policies
-- ============================================

ALTER TABLE gfx_projects 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

ALTER TABLE gfx_projects 
ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;

DROP POLICY IF EXISTS "Users can view their org projects" ON gfx_projects;
DROP POLICY IF EXISTS "Users can create projects in their org" ON gfx_projects;
DROP POLICY IF EXISTS "Users can update their org projects" ON gfx_projects;
DROP POLICY IF EXISTS "Users can delete their org projects" ON gfx_projects;

CREATE POLICY "Allow all read projects" ON gfx_projects FOR SELECT USING (true);
CREATE POLICY "Allow all insert projects" ON gfx_projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update projects" ON gfx_projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete projects" ON gfx_projects FOR DELETE USING (true);

-- ============================================
-- STEP 8: Fix gfx_keyframes
-- ============================================

ALTER TABLE gfx_keyframes 
ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '{}';

DROP POLICY IF EXISTS "Users can view keyframes in their projects" ON gfx_keyframes;
DROP POLICY IF EXISTS "Users can insert keyframes in their projects" ON gfx_keyframes;
DROP POLICY IF EXISTS "Users can update keyframes in their projects" ON gfx_keyframes;
DROP POLICY IF EXISTS "Users can delete keyframes in their projects" ON gfx_keyframes;

CREATE POLICY "Allow all read keyframes" ON gfx_keyframes FOR SELECT USING (true);
CREATE POLICY "Allow all insert keyframes" ON gfx_keyframes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update keyframes" ON gfx_keyframes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete keyframes" ON gfx_keyframes FOR DELETE USING (true);

-- ============================================
-- STEP 9: Fix gfx_animations
-- ============================================

DROP POLICY IF EXISTS "Users can view animations in their projects" ON gfx_animations;
DROP POLICY IF EXISTS "Users can insert animations in their projects" ON gfx_animations;
DROP POLICY IF EXISTS "Users can update animations in their projects" ON gfx_animations;
DROP POLICY IF EXISTS "Users can delete animations in their projects" ON gfx_animations;

CREATE POLICY "Allow all read animations" ON gfx_animations FOR SELECT USING (true);
CREATE POLICY "Allow all insert animations" ON gfx_animations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update animations" ON gfx_animations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete animations" ON gfx_animations FOR DELETE USING (true);

-- ============================================
-- STEP 10: Fix gfx_bindings
-- ============================================

DROP POLICY IF EXISTS "Users can view bindings in their projects" ON gfx_bindings;
DROP POLICY IF EXISTS "Users can insert bindings in their projects" ON gfx_bindings;
DROP POLICY IF EXISTS "Users can update bindings in their projects" ON gfx_bindings;
DROP POLICY IF EXISTS "Users can delete bindings in their projects" ON gfx_bindings;

CREATE POLICY "Allow all read bindings" ON gfx_bindings FOR SELECT USING (true);
CREATE POLICY "Allow all insert bindings" ON gfx_bindings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update bindings" ON gfx_bindings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete bindings" ON gfx_bindings FOR DELETE USING (true);

-- ============================================
-- STEP 11: Fix users table RLS policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view org members" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Allow all read users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow all update users" ON users FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================
-- DONE - Database should now work without authentication
-- ============================================









