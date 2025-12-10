-- Organization textures table for storing texture metadata
-- Each organization gets their own folder in storage: Textures/{organization_id}/

CREATE TABLE IF NOT EXISTS organization_textures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT NOT NULL,
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
  size BIGINT,
  width INTEGER,
  height INTEGER,
  duration REAL, -- for videos, in seconds
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_org_textures_org_id ON organization_textures(organization_id);
CREATE INDEX idx_org_textures_media_type ON organization_textures(media_type);
CREATE INDEX idx_org_textures_created_at ON organization_textures(created_at DESC);
CREATE INDEX idx_org_textures_name ON organization_textures(name);
CREATE INDEX idx_org_textures_tags ON organization_textures USING GIN(tags);

-- RLS Policies
ALTER TABLE organization_textures ENABLE ROW LEVEL SECURITY;

-- Users can view textures from their organization
CREATE POLICY "Users can view org textures"
  ON organization_textures FOR SELECT
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Users can insert textures for their organization
CREATE POLICY "Users can insert org textures"
  ON organization_textures FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Users can update their organization's textures
CREATE POLICY "Users can update org textures"
  ON organization_textures FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Users can delete their organization's textures (all members can delete)
CREATE POLICY "Users can delete org textures"
  ON organization_textures FOR DELETE
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_org_textures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER org_textures_updated_at
  BEFORE UPDATE ON organization_textures
  FOR EACH ROW
  EXECUTE FUNCTION update_org_textures_updated_at();

-- NOTE: Storage bucket policies for the "Textures" bucket should be configured
-- via the Supabase Dashboard under Storage > Policies
-- Required policies:
-- 1. SELECT: Allow authenticated users to read files (for public access or org-based)
-- 2. INSERT: Allow authenticated users to upload files
-- 3. DELETE: Allow authenticated users to delete their org's files
