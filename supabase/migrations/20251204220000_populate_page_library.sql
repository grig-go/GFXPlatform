-- Populate page library with unique pages from existing playlists
-- This copies existing pages to the library table, deduplicating by template_id + name + payload

INSERT INTO pulsar_page_library (organization_id, project_id, template_id, name, payload, duration, tags)
SELECT DISTINCT ON (pl.project_id, p.template_id, p.name, p.payload::text)
  p.organization_id,
  pl.project_id,
  p.template_id,
  p.name,
  p.payload,
  p.duration,
  p.tags
FROM pulsar_pages p
INNER JOIN pulsar_playlists pl ON pl.id = p.playlist_id
WHERE p.template_id IS NOT NULL
ORDER BY pl.project_id, p.template_id, p.name, p.payload::text, p.created_at;
