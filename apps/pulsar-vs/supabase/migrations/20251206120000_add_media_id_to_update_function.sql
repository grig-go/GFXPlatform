-- Migration: Add media_id parameter to playlist item update function
-- This allows users to replace media in playlist items

-- Drop and recreate the function with p_media_id parameter
CREATE OR REPLACE FUNCTION pulsarvs_playlist_item_update(
    p_id UUID,
    p_name VARCHAR(255) DEFAULT NULL,
    p_channel_id UUID DEFAULT NULL,
    p_duration INTEGER DEFAULT NULL,
    p_scheduled_time TIMESTAMPTZ DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_media_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    updated_item pulsarvs_playlist_items;
    v_item_type pulsarvs_playlist_item_type;
BEGIN
    -- Get the current item type
    SELECT item_type INTO v_item_type FROM pulsarvs_playlist_items WHERE id = p_id;

    IF v_item_type IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Item not found');
    END IF;

    -- Only allow media_id update for media type items
    IF p_media_id IS NOT NULL AND v_item_type != 'media' THEN
        RETURN json_build_object('success', false, 'error', 'Cannot update media_id for non-media items');
    END IF;

    UPDATE pulsarvs_playlist_items
    SET
        name = COALESCE(p_name, name),
        channel_id = COALESCE(p_channel_id, channel_id),
        duration = COALESCE(p_duration, duration),
        scheduled_time = COALESCE(p_scheduled_time, scheduled_time),
        metadata = COALESCE(p_metadata, metadata),
        media_id = COALESCE(p_media_id, media_id),
        updated_at = NOW()
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
