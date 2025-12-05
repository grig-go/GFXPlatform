-- RPC function to get all pages across all playlists for a project
-- This is needed for the Page Repository in Pulsar GFX

-- Drop existing functions if they exist (to allow re-creation with different signature)
DROP FUNCTION IF EXISTS get_project_pages(uuid);
DROP FUNCTION IF EXISTS get_project_page_groups(uuid);

CREATE OR REPLACE FUNCTION get_project_pages(p_project_id uuid)
RETURNS TABLE (
  id uuid,
  playlist_id uuid,
  playlist_name text,
  template_id uuid,
  page_group_id uuid,
  name text,
  payload jsonb,
  sort_order integer,
  duration integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.playlist_id,
    pl.name as playlist_name,
    p.template_id,
    p.page_group_id,
    p.name,
    p.payload,
    p.sort_order,
    p.duration,
    p.created_at,
    p.updated_at
  FROM pulsar_pages p
  INNER JOIN pulsar_playlists pl ON pl.id = p.playlist_id
  WHERE pl.project_id = p_project_id
  ORDER BY pl.name, p.sort_order;
END;
$$;

-- RPC function to get all page groups across all playlists for a project
CREATE OR REPLACE FUNCTION get_project_page_groups(p_project_id uuid)
RETURNS TABLE (
  id uuid,
  playlist_id uuid,
  playlist_name text,
  name text,
  color text,
  sort_order integer,
  is_collapsed boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.playlist_id,
    pl.name as playlist_name,
    g.name,
    g.color,
    g.sort_order,
    g.is_collapsed,
    g.created_at
  FROM pulsar_page_groups g
  INNER JOIN pulsar_playlists pl ON pl.id = g.playlist_id
  WHERE pl.project_id = p_project_id
  ORDER BY pl.name, g.sort_order;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_project_pages(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_pages(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_project_page_groups(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_page_groups(uuid) TO anon;
