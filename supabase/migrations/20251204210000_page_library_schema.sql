-- Page Library Schema
-- This creates standalone pages at the project level that can be linked to multiple playlists

-- 1. Create the page library table (standalone pages)
CREATE TABLE IF NOT EXISTS pulsar_page_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES gfx_projects(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES gfx_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  duration integer,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create junction table for playlist-page links
CREATE TABLE IF NOT EXISTS pulsar_playlist_page_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES pulsar_playlists(id) ON DELETE CASCADE,
  page_id uuid NOT NULL REFERENCES pulsar_page_library(id) ON DELETE CASCADE,
  page_group_id uuid REFERENCES pulsar_page_groups(id) ON DELETE SET NULL,
  channel_id uuid REFERENCES pulsar_channels(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0,
  is_on_air boolean DEFAULT false,
  -- Allow overriding page properties per-playlist
  override_name text,
  override_payload jsonb,
  override_duration integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure a page can only be linked once per playlist
  UNIQUE(playlist_id, page_id)
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_page_library_project ON pulsar_page_library(project_id);
CREATE INDEX IF NOT EXISTS idx_page_library_template ON pulsar_page_library(template_id);
CREATE INDEX IF NOT EXISTS idx_page_library_org ON pulsar_page_library(organization_id);

CREATE INDEX IF NOT EXISTS idx_playlist_page_links_playlist ON pulsar_playlist_page_links(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_page_links_page ON pulsar_playlist_page_links(page_id);
CREATE INDEX IF NOT EXISTS idx_playlist_page_links_group ON pulsar_playlist_page_links(page_group_id);

-- 4. Enable RLS
ALTER TABLE pulsar_page_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsar_playlist_page_links ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for pulsar_page_library (development mode - allow authenticated users)
CREATE POLICY "Authenticated users can do anything"
  ON pulsar_page_library FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 6. RLS Policies for pulsar_playlist_page_links (development mode - allow authenticated users)
CREATE POLICY "Authenticated users can do anything"
  ON pulsar_playlist_page_links FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 7. RPC to get all pages in a project's library
CREATE OR REPLACE FUNCTION get_page_library(p_project_id uuid)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  template_id uuid,
  name text,
  payload jsonb,
  duration integer,
  tags text[],
  created_at timestamptz,
  updated_at timestamptz,
  -- Include usage count
  usage_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.id,
    pl.project_id,
    pl.template_id,
    pl.name,
    pl.payload,
    pl.duration,
    pl.tags,
    pl.created_at,
    pl.updated_at,
    COUNT(ppl.id) as usage_count
  FROM pulsar_page_library pl
  LEFT JOIN pulsar_playlist_page_links ppl ON ppl.page_id = pl.id
  WHERE pl.project_id = p_project_id
  GROUP BY pl.id
  ORDER BY pl.name;
END;
$$;

-- 8. RPC to get pages in a playlist (with their link info)
CREATE OR REPLACE FUNCTION get_playlist_pages_v2(p_playlist_id uuid)
RETURNS TABLE (
  link_id uuid,
  page_id uuid,
  page_group_id uuid,
  channel_id uuid,
  sort_order integer,
  is_on_air boolean,
  -- Page data (with overrides applied)
  name text,
  template_id uuid,
  payload jsonb,
  duration integer,
  -- Original page data for reference
  original_name text,
  original_payload jsonb,
  original_duration integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ppl.id as link_id,
    ppl.page_id,
    ppl.page_group_id,
    ppl.channel_id,
    ppl.sort_order,
    ppl.is_on_air,
    -- Apply overrides if present
    COALESCE(ppl.override_name, pl.name) as name,
    pl.template_id,
    COALESCE(ppl.override_payload, pl.payload) as payload,
    COALESCE(ppl.override_duration, pl.duration) as duration,
    -- Original values
    pl.name as original_name,
    pl.payload as original_payload,
    pl.duration as original_duration
  FROM pulsar_playlist_page_links ppl
  INNER JOIN pulsar_page_library pl ON pl.id = ppl.page_id
  WHERE ppl.playlist_id = p_playlist_id
  ORDER BY ppl.sort_order;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_page_library(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_page_library(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_playlist_pages_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_playlist_pages_v2(uuid) TO anon;
