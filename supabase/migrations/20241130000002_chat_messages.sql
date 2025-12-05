-- Nova GFX Chat Messages Schema
-- Stores AI chat history per project

-- ============================================
-- CHAT MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS gfx_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES gfx_projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  context_template_id UUID REFERENCES gfx_templates(id) ON DELETE SET NULL,
  context_element_ids UUID[] DEFAULT '{}',
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  changes_applied JSONB DEFAULT NULL,
  error BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient project-based queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_project_id ON gfx_chat_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON gfx_chat_messages(created_at);

-- Enable RLS
ALTER TABLE gfx_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view chat messages in their projects" ON gfx_chat_messages
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM gfx_projects p
      JOIN users u ON u.organization_id = p.organization_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chat messages in their projects" ON gfx_chat_messages
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM gfx_projects p
      JOIN users u ON u.organization_id = p.organization_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chat messages in their projects" ON gfx_chat_messages
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM gfx_projects p
      JOIN users u ON u.organization_id = p.organization_id
      WHERE u.id = auth.uid()
    )
  );

