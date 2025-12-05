-- Add parent_group_id column to pulsar_page_groups for nested groups support
ALTER TABLE pulsar_page_groups
ADD COLUMN IF NOT EXISTS parent_group_id UUID REFERENCES pulsar_page_groups(id) ON DELETE SET NULL;

-- Create index for efficient queries on nested groups
CREATE INDEX IF NOT EXISTS idx_pulsar_page_groups_parent ON pulsar_page_groups(parent_group_id);
