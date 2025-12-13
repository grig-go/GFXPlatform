-- Migration: Remove 'closed' status from support tickets
-- The workflow has been simplified to: open -> in_progress -> resolved

-- First, update any existing 'closed' tickets to 'resolved'
UPDATE gfx_support_tickets SET status = 'resolved' WHERE status = 'closed';

-- Drop the RLS policy that references the status column
DROP POLICY IF EXISTS "Users can update own open tickets" ON gfx_support_tickets;

-- Drop the default value
ALTER TABLE gfx_support_tickets ALTER COLUMN status DROP DEFAULT;

-- Create new enum type without 'closed'
CREATE TYPE support_ticket_status_new AS ENUM ('open', 'in_progress', 'resolved');

-- Update the column to use the new type
ALTER TABLE gfx_support_tickets
  ALTER COLUMN status TYPE support_ticket_status_new
  USING status::text::support_ticket_status_new;

-- Drop the old enum type
DROP TYPE support_ticket_status;

-- Rename the new type to the original name
ALTER TYPE support_ticket_status_new RENAME TO support_ticket_status;

-- Re-add the default value
ALTER TABLE gfx_support_tickets ALTER COLUMN status SET DEFAULT 'open';

-- Recreate the RLS policy with the new enum type
CREATE POLICY "Users can update own open tickets" ON gfx_support_tickets
  FOR UPDATE USING (
    auth.uid() = user_id AND
    status = 'open'
  );

-- Add a comment about this change
COMMENT ON TYPE support_ticket_status IS 'Support ticket status: open, in_progress, resolved (closed was removed in Dec 2025)';
