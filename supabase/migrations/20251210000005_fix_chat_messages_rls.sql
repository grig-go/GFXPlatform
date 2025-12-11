-- Migration: Fix chat messages RLS policies
-- The current policies are too restrictive and cause 401 errors
-- because they require the users.organization_id to match project.organization_id
-- but this check may fail if the organization relationship isn't properly set up

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view chat messages in their projects" ON gfx_chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages in their projects" ON gfx_chat_messages;
DROP POLICY IF EXISTS "Users can delete chat messages in their projects" ON gfx_chat_messages;

-- Create simpler policies that:
-- 1. Allow authenticated users to access messages in projects they have access to
-- 2. Use the same project access check that gfx_projects uses

-- SELECT: Users can view messages in projects they can access
CREATE POLICY "Users can view chat messages in accessible projects" ON gfx_chat_messages
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    project_id IN (
      SELECT id FROM gfx_projects
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
      OR created_by = auth.uid()
    )
  );

-- INSERT: Users can insert messages in projects they can access
CREATE POLICY "Users can insert chat messages in accessible projects" ON gfx_chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    project_id IN (
      SELECT id FROM gfx_projects
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
      OR created_by = auth.uid()
    )
  );

-- DELETE: Users can delete their own messages or messages in their projects
CREATE POLICY "Users can delete chat messages in accessible projects" ON gfx_chat_messages
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    (
      user_id = auth.uid() OR
      project_id IN (
        SELECT id FROM gfx_projects
        WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
        OR created_by = auth.uid()
      )
    )
  );
