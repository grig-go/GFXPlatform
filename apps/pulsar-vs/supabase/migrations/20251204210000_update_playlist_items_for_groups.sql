-- ============================================
-- Update PulsarVS Playlist Items for Groups Support
-- ============================================

-- Add folder_id column for groups (references vs_content_folders)
ALTER TABLE pulsarvs_playlist_items
ADD COLUMN IF NOT EXISTS folder_id UUID;

-- Add parent_item_id for nested items within groups
ALTER TABLE pulsarvs_playlist_items
ADD COLUMN IF NOT EXISTS parent_item_id UUID REFERENCES pulsarvs_playlist_items(id) ON DELETE CASCADE;

-- Create index for parent_item_id
CREATE INDEX IF NOT EXISTS idx_pulsarvs_playlist_items_parent ON pulsarvs_playlist_items(parent_item_id);

-- Drop the old constraint
ALTER TABLE pulsarvs_playlist_items DROP CONSTRAINT IF EXISTS valid_item_reference;

-- Add new constraint that allows groups with folder_id
ALTER TABLE pulsarvs_playlist_items ADD CONSTRAINT valid_item_reference CHECK (
    (item_type = 'media' AND media_id IS NOT NULL) OR
    (item_type = 'page' AND content_id IS NOT NULL) OR
    (item_type = 'group' AND (folder_id IS NOT NULL OR content_id IS NOT NULL))
);

-- Update pulsarvs_playlist_item_add to support folder_id and parent_item_id
CREATE OR REPLACE FUNCTION pulsarvs_playlist_item_add(
    p_playlist_id UUID,
    p_item_type pulsarvs_playlist_item_type,
    p_name VARCHAR(255),
    p_content_id UUID DEFAULT NULL,
    p_media_id UUID DEFAULT NULL,
    p_folder_id UUID DEFAULT NULL,
    p_channel_id UUID DEFAULT NULL,
    p_duration INTEGER DEFAULT 10,
    p_scheduled_time TIMESTAMPTZ DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_parent_item_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    new_item pulsarvs_playlist_items;
    max_sort INTEGER;
BEGIN
    -- Get next sort order (within parent if applicable)
    IF p_parent_item_id IS NOT NULL THEN
        SELECT COALESCE(MAX(sort_order), -1) + 1 INTO max_sort
        FROM pulsarvs_playlist_items
        WHERE playlist_id = p_playlist_id AND parent_item_id = p_parent_item_id;
    ELSE
        SELECT COALESCE(MAX(sort_order), -1) + 1 INTO max_sort
        FROM pulsarvs_playlist_items
        WHERE playlist_id = p_playlist_id AND parent_item_id IS NULL;
    END IF;

    INSERT INTO pulsarvs_playlist_items (
        playlist_id, item_type, name, content_id, media_id, folder_id,
        channel_id, duration, scheduled_time, sort_order, metadata, parent_item_id
    )
    VALUES (
        p_playlist_id, p_item_type, p_name, p_content_id, p_media_id, p_folder_id,
        p_channel_id, p_duration, p_scheduled_time, max_sort, p_metadata, p_parent_item_id
    )
    RETURNING * INTO new_item;

    RETURN json_build_object('success', true, 'data', row_to_json(new_item));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update pulsarvs_playlist_get to include folder info and nested items
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

    -- Get items with joined data (top-level items only, nested items included in metadata)
    SELECT COALESCE(json_agg(row_to_json(i) ORDER BY i.sort_order), '[]'::json) INTO items_data
    FROM (
        SELECT
            pi.id,
            pi.playlist_id,
            pi.item_type,
            pi.content_id,
            pi.media_id,
            pi.folder_id,
            pi.name,
            pi.channel_id,
            c.name as channel_name,
            c.type as channel_type,
            pi.duration,
            pi.scheduled_time,
            pi.sort_order,
            pi.metadata,
            pi.parent_item_id,
            pi.created_at,
            -- Content details if applicable
            vc.backdrop_url as content_backdrop,
            -- Media details if applicable
            ma.file_url as media_url,
            ma.thumbnail_url as media_thumbnail,
            ma.media_type,
            -- Count of nested items (for groups)
            (SELECT COUNT(*) FROM pulsarvs_playlist_items WHERE parent_item_id = pi.id) as nested_count
        FROM pulsarvs_playlist_items pi
        LEFT JOIN channels c ON pi.channel_id = c.id
        LEFT JOIN vs_content vc ON pi.content_id = vc.id
        LEFT JOIN media_assets ma ON pi.media_id = ma.id
        WHERE pi.playlist_id = p_playlist_id AND pi.parent_item_id IS NULL
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

-- Function to get nested items for a group
CREATE OR REPLACE FUNCTION pulsarvs_playlist_item_get_nested(
    p_parent_item_id UUID
)
RETURNS JSON AS $$
DECLARE
    items_data JSON;
BEGIN
    SELECT COALESCE(json_agg(row_to_json(i) ORDER BY i.sort_order), '[]'::json) INTO items_data
    FROM (
        SELECT
            pi.id,
            pi.playlist_id,
            pi.item_type,
            pi.content_id,
            pi.media_id,
            pi.folder_id,
            pi.name,
            pi.channel_id,
            c.name as channel_name,
            pi.duration,
            pi.scheduled_time,
            pi.sort_order,
            pi.metadata,
            pi.parent_item_id,
            pi.created_at,
            vc.backdrop_url as content_backdrop,
            ma.file_url as media_url,
            ma.thumbnail_url as media_thumbnail,
            ma.media_type
        FROM pulsarvs_playlist_items pi
        LEFT JOIN channels c ON pi.channel_id = c.id
        LEFT JOIN vs_content vc ON pi.content_id = vc.id
        LEFT JOIN media_assets ma ON pi.media_id = ma.id
        WHERE pi.parent_item_id = p_parent_item_id
    ) i;

    RETURN json_build_object('success', true, 'data', items_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update item channel (for inline editing)
CREATE OR REPLACE FUNCTION pulsarvs_playlist_item_set_channel(
    p_id UUID,
    p_channel_id UUID
)
RETURNS JSON AS $$
DECLARE
    updated_item pulsarvs_playlist_items;
BEGIN
    UPDATE pulsarvs_playlist_items
    SET channel_id = p_channel_id
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

-- Function to group selected items
CREATE OR REPLACE FUNCTION pulsarvs_playlist_items_group(
    p_playlist_id UUID,
    p_item_ids UUID[],
    p_group_name VARCHAR(255)
)
RETURNS JSON AS $$
DECLARE
    new_group pulsarvs_playlist_items;
    max_sort INTEGER;
    min_sort INTEGER;
    i INTEGER;
BEGIN
    -- Get the minimum sort_order of selected items (where to insert group)
    SELECT MIN(sort_order) INTO min_sort
    FROM pulsarvs_playlist_items
    WHERE id = ANY(p_item_ids);

    -- Create the group item
    INSERT INTO pulsarvs_playlist_items (
        playlist_id, item_type, name, sort_order, metadata
    )
    VALUES (
        p_playlist_id, 'group', p_group_name, min_sort, '{}'::jsonb
    )
    RETURNING * INTO new_group;

    -- Move selected items under the group
    FOR i IN 1..array_length(p_item_ids, 1) LOOP
        UPDATE pulsarvs_playlist_items
        SET
            parent_item_id = new_group.id,
            sort_order = i - 1
        WHERE id = p_item_ids[i];
    END LOOP;

    -- Reorder remaining top-level items
    WITH sorted_items AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) - 1 as new_order
        FROM pulsarvs_playlist_items
        WHERE playlist_id = p_playlist_id AND parent_item_id IS NULL
    )
    UPDATE pulsarvs_playlist_items pi
    SET sort_order = si.new_order
    FROM sorted_items si
    WHERE pi.id = si.id;

    RETURN json_build_object('success', true, 'data', row_to_json(new_group));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ungroup items (move nested items back to top level)
CREATE OR REPLACE FUNCTION pulsarvs_playlist_items_ungroup(
    p_group_id UUID
)
RETURNS JSON AS $$
DECLARE
    group_item pulsarvs_playlist_items;
    group_sort INTEGER;
BEGIN
    -- Get the group item
    SELECT * INTO group_item FROM pulsarvs_playlist_items WHERE id = p_group_id AND item_type = 'group';

    IF group_item IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Group not found');
    END IF;

    group_sort := group_item.sort_order;

    -- Move nested items to top level, positioning them where the group was
    UPDATE pulsarvs_playlist_items
    SET
        parent_item_id = NULL,
        sort_order = group_sort + sort_order
    WHERE parent_item_id = p_group_id;

    -- Delete the group item
    DELETE FROM pulsarvs_playlist_items WHERE id = p_group_id;

    -- Reorder all items
    WITH sorted_items AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) - 1 as new_order
        FROM pulsarvs_playlist_items
        WHERE playlist_id = group_item.playlist_id AND parent_item_id IS NULL
    )
    UPDATE pulsarvs_playlist_items pi
    SET sort_order = si.new_order
    FROM sorted_items si
    WHERE pi.id = si.id;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
