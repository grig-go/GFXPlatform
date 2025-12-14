-- ============================================
-- PulsarVS Playlist Tables
-- ============================================

-- Playlist table - stores playlist metadata
CREATE TABLE IF NOT EXISTS pulsarvs_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_id UUID REFERENCES pulsar_projects(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    loop_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlist item types enum
DO $$ BEGIN
    CREATE TYPE pulsarvs_playlist_item_type AS ENUM ('page', 'group', 'media');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Playlist items table - stores items within a playlist
CREATE TABLE IF NOT EXISTS pulsarvs_playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES pulsarvs_playlists(id) ON DELETE CASCADE,
    item_type pulsarvs_playlist_item_type NOT NULL,
    -- Reference to content (page/group from vs_content table)
    content_id UUID REFERENCES vs_content(id) ON DELETE SET NULL,
    -- Reference to media (from media_assets table)
    media_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
    -- Item metadata
    name VARCHAR(255) NOT NULL,
    -- Channel assignment
    channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
    -- Duration in seconds (0 = manual advance)
    duration INTEGER DEFAULT 10,
    -- Scheduled time to play (optional, NULL = play in sequence)
    scheduled_time TIMESTAMPTZ,
    -- Order within the playlist
    sort_order INTEGER DEFAULT 0,
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure at least one reference is set
    CONSTRAINT valid_item_reference CHECK (
        (item_type = 'media' AND media_id IS NOT NULL) OR
        (item_type IN ('page', 'group') AND content_id IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pulsarvs_playlists_project ON pulsarvs_playlists(project_id);
CREATE INDEX IF NOT EXISTS idx_pulsarvs_playlist_items_playlist ON pulsarvs_playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_pulsarvs_playlist_items_sort ON pulsarvs_playlist_items(playlist_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_pulsarvs_playlist_items_channel ON pulsarvs_playlist_items(channel_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_pulsarvs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pulsarvs_playlists_updated_at ON pulsarvs_playlists;
CREATE TRIGGER pulsarvs_playlists_updated_at
    BEFORE UPDATE ON pulsarvs_playlists
    FOR EACH ROW EXECUTE FUNCTION update_pulsarvs_updated_at();

DROP TRIGGER IF EXISTS pulsarvs_playlist_items_updated_at ON pulsarvs_playlist_items;
CREATE TRIGGER pulsarvs_playlist_items_updated_at
    BEFORE UPDATE ON pulsarvs_playlist_items
    FOR EACH ROW EXECUTE FUNCTION update_pulsarvs_updated_at();

-- ============================================
-- RPC Functions for Playlist Management
-- ============================================

-- List all playlists (optionally filtered by project)
CREATE OR REPLACE FUNCTION pulsarvs_playlist_list(
    p_project_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'success', true,
        'data', COALESCE(json_agg(row_to_json(p)), '[]'::json)
    ) INTO result
    FROM (
        SELECT
            pl.id,
            pl.name,
            pl.description,
            pl.project_id,
            pl.is_active,
            pl.loop_enabled,
            pl.created_at,
            pl.updated_at,
            (SELECT COUNT(*) FROM pulsarvs_playlist_items WHERE playlist_id = pl.id) as item_count
        FROM pulsarvs_playlists pl
        WHERE (p_project_id IS NULL OR pl.project_id = p_project_id)
        ORDER BY pl.name ASC
    ) p;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get playlist with items
CREATE OR REPLACE FUNCTION pulsarvs_playlist_get(
    p_playlist_id UUID
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    playlist_data JSON;
    items_data JSON;
BEGIN
    -- Get playlist
    SELECT row_to_json(pl) INTO playlist_data
    FROM (
        SELECT
            id, name, description, project_id,
            is_active, loop_enabled, created_at, updated_at
        FROM pulsarvs_playlists
        WHERE id = p_playlist_id
    ) pl;

    IF playlist_data IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Playlist not found');
    END IF;

    -- Get items with joined data
    SELECT COALESCE(json_agg(row_to_json(i) ORDER BY i.sort_order), '[]'::json) INTO items_data
    FROM (
        SELECT
            pi.id,
            pi.playlist_id,
            pi.item_type,
            pi.content_id,
            pi.media_id,
            pi.name,
            pi.channel_id,
            c.name as channel_name,
            c.type as channel_type,
            pi.duration,
            pi.scheduled_time,
            pi.sort_order,
            pi.metadata,
            pi.created_at,
            -- Content details if applicable
            vc.backdrop_url as content_backdrop,
            -- Media details if applicable
            ma.file_url as media_url,
            ma.thumbnail_url as media_thumbnail,
            ma.media_type
        FROM pulsarvs_playlist_items pi
        LEFT JOIN channels c ON pi.channel_id = c.id
        LEFT JOIN vs_content vc ON pi.content_id = vc.id
        LEFT JOIN media_assets ma ON pi.media_id = ma.id
        WHERE pi.playlist_id = p_playlist_id
    ) i;

    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'playlist', playlist_data,
            'items', items_data
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create playlist
CREATE OR REPLACE FUNCTION pulsarvs_playlist_create(
    p_name VARCHAR(255),
    p_description TEXT DEFAULT NULL,
    p_project_id UUID DEFAULT NULL,
    p_loop_enabled BOOLEAN DEFAULT false
)
RETURNS JSON AS $$
DECLARE
    new_playlist pulsarvs_playlists;
BEGIN
    INSERT INTO pulsarvs_playlists (name, description, project_id, loop_enabled)
    VALUES (p_name, p_description, p_project_id, p_loop_enabled)
    RETURNING * INTO new_playlist;

    RETURN json_build_object('success', true, 'data', row_to_json(new_playlist));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update playlist
CREATE OR REPLACE FUNCTION pulsarvs_playlist_update(
    p_id UUID,
    p_name VARCHAR(255) DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL,
    p_loop_enabled BOOLEAN DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    updated_playlist pulsarvs_playlists;
BEGIN
    UPDATE pulsarvs_playlists
    SET
        name = COALESCE(p_name, name),
        description = COALESCE(p_description, description),
        is_active = COALESCE(p_is_active, is_active),
        loop_enabled = COALESCE(p_loop_enabled, loop_enabled)
    WHERE id = p_id
    RETURNING * INTO updated_playlist;

    IF updated_playlist IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Playlist not found');
    END IF;

    RETURN json_build_object('success', true, 'data', row_to_json(updated_playlist));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete playlist
CREATE OR REPLACE FUNCTION pulsarvs_playlist_delete(
    p_id UUID
)
RETURNS JSON AS $$
BEGIN
    DELETE FROM pulsarvs_playlists WHERE id = p_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Playlist not found');
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add item to playlist
CREATE OR REPLACE FUNCTION pulsarvs_playlist_item_add(
    p_playlist_id UUID,
    p_item_type pulsarvs_playlist_item_type,
    p_name VARCHAR(255),
    p_content_id UUID DEFAULT NULL,
    p_media_id UUID DEFAULT NULL,
    p_channel_id UUID DEFAULT NULL,
    p_duration INTEGER DEFAULT 10,
    p_scheduled_time TIMESTAMPTZ DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
    new_item pulsarvs_playlist_items;
    max_sort INTEGER;
BEGIN
    -- Get next sort order
    SELECT COALESCE(MAX(sort_order), -1) + 1 INTO max_sort
    FROM pulsarvs_playlist_items
    WHERE playlist_id = p_playlist_id;

    INSERT INTO pulsarvs_playlist_items (
        playlist_id, item_type, name, content_id, media_id,
        channel_id, duration, scheduled_time, sort_order, metadata
    )
    VALUES (
        p_playlist_id, p_item_type, p_name, p_content_id, p_media_id,
        p_channel_id, p_duration, p_scheduled_time, max_sort, p_metadata
    )
    RETURNING * INTO new_item;

    RETURN json_build_object('success', true, 'data', row_to_json(new_item));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update playlist item
CREATE OR REPLACE FUNCTION pulsarvs_playlist_item_update(
    p_id UUID,
    p_name VARCHAR(255) DEFAULT NULL,
    p_channel_id UUID DEFAULT NULL,
    p_duration INTEGER DEFAULT NULL,
    p_scheduled_time TIMESTAMPTZ DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    updated_item pulsarvs_playlist_items;
BEGIN
    UPDATE pulsarvs_playlist_items
    SET
        name = COALESCE(p_name, name),
        channel_id = COALESCE(p_channel_id, channel_id),
        duration = COALESCE(p_duration, duration),
        scheduled_time = COALESCE(p_scheduled_time, scheduled_time),
        metadata = COALESCE(p_metadata, metadata)
    WHERE id = p_id
    RETURNING * INTO updated_item;

    IF updated_item IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Item not found');
    END IF;

    RETURN json_build_object('success', true, 'data', row_to_json(updated_item));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete playlist item
CREATE OR REPLACE FUNCTION pulsarvs_playlist_item_delete(
    p_id UUID
)
RETURNS JSON AS $$
BEGIN
    DELETE FROM pulsarvs_playlist_items WHERE id = p_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Item not found');
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reorder playlist items
CREATE OR REPLACE FUNCTION pulsarvs_playlist_items_reorder(
    p_playlist_id UUID,
    p_item_ids UUID[]
)
RETURNS JSON AS $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 1..array_length(p_item_ids, 1) LOOP
        UPDATE pulsarvs_playlist_items
        SET sort_order = i - 1
        WHERE id = p_item_ids[i] AND playlist_id = p_playlist_id;
    END LOOP;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE pulsarvs_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsarvs_playlist_items ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - adjust based on auth requirements)
DROP POLICY IF EXISTS "Allow all on pulsarvs_playlists" ON pulsarvs_playlists;
CREATE POLICY "Allow all on pulsarvs_playlists" ON pulsarvs_playlists FOR ALL USING (true);
DROP POLICY IF EXISTS "Allow all on pulsarvs_playlist_items" ON pulsarvs_playlist_items;
CREATE POLICY "Allow all on pulsarvs_playlist_items" ON pulsarvs_playlist_items FOR ALL USING (true);
