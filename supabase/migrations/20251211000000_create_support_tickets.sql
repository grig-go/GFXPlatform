-- Migration: Create support tickets table for bug reports and feature requests
-- Users can submit tickets through Nova GFX, and admins can manage them

-- Create enum for ticket type
CREATE TYPE support_ticket_type AS ENUM ('bug', 'feature', 'question', 'other');

-- Create enum for ticket status
CREATE TYPE support_ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Create enum for ticket priority
CREATE TYPE support_ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Create support tickets table
CREATE TABLE gfx_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ticket details
  type support_ticket_type NOT NULL DEFAULT 'bug',
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Status tracking
  status support_ticket_status NOT NULL DEFAULT 'open',
  priority support_ticket_priority NOT NULL DEFAULT 'medium',

  -- User info (who submitted)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,

  -- Organization context
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Optional context (which project/template they were working on)
  project_id UUID REFERENCES gfx_projects(id) ON DELETE SET NULL,
  project_name TEXT,

  -- Browser/system info for debugging
  user_agent TEXT,
  browser_info JSONB,

  -- Optional screenshot or attachment URLs
  attachments TEXT[],

  -- Admin response/notes
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_support_tickets_status ON gfx_support_tickets(status);
CREATE INDEX idx_support_tickets_type ON gfx_support_tickets(type);
CREATE INDEX idx_support_tickets_user_id ON gfx_support_tickets(user_id);
CREATE INDEX idx_support_tickets_organization_id ON gfx_support_tickets(organization_id);
CREATE INDEX idx_support_tickets_created_at ON gfx_support_tickets(created_at DESC);

-- Enable RLS
ALTER TABLE gfx_support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON gfx_support_tickets
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create tickets
CREATE POLICY "Authenticated users can create tickets" ON gfx_support_tickets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own open tickets (e.g., add more info)
CREATE POLICY "Users can update own open tickets" ON gfx_support_tickets
  FOR UPDATE USING (
    auth.uid() = user_id AND
    status = 'open'
  );

-- Admins (emergent.new users) can view all tickets
CREATE POLICY "Admins can view all tickets" ON gfx_support_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = '6f1e0ed4-4994-4de5-9a22-e450457155c5'
    )
  );

-- Admins can update any ticket
CREATE POLICY "Admins can update all tickets" ON gfx_support_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = '6f1e0ed4-4994-4de5-9a22-e450457155c5'
    )
  );

-- Admins can delete tickets
CREATE POLICY "Admins can delete tickets" ON gfx_support_tickets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = '6f1e0ed4-4994-4de5-9a22-e450457155c5'
    )
  );

-- Create or replace the update_updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON gfx_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE gfx_support_tickets IS 'Support tickets for bug reports and feature requests from Nova GFX users';
