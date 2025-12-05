-- =====================================================
-- USER PREFERENCES TABLE
-- Stores per-user UI preferences for Pulsar GFX
-- =====================================================

-- Create user preferences table
CREATE TABLE IF NOT EXISTS pulsar_user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Project & Playlist state
    last_project_id UUID REFERENCES gfx_projects(id) ON DELETE SET NULL,
    open_playlist_ids UUID[] DEFAULT '{}',
    active_playlist_id UUID REFERENCES pulsar_playlists(id) ON DELETE SET NULL,
    selected_channel_id UUID REFERENCES pulsar_channels(id) ON DELETE SET NULL,

    -- Panel visibility
    show_playout_controls BOOLEAN DEFAULT true,
    show_preview BOOLEAN DEFAULT true,
    show_content_editor BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one preferences row per user
    UNIQUE(user_id)
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_pulsar_user_preferences_user_id ON pulsar_user_preferences(user_id);

-- Enable RLS
ALTER TABLE pulsar_user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view/edit their own preferences
CREATE POLICY "Users can view their own preferences"
    ON pulsar_user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON pulsar_user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON pulsar_user_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
    ON pulsar_user_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pulsar_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_pulsar_user_preferences_updated_at ON pulsar_user_preferences;
CREATE TRIGGER trigger_update_pulsar_user_preferences_updated_at
    BEFORE UPDATE ON pulsar_user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_pulsar_user_preferences_updated_at();

-- Grant permissions
GRANT ALL ON pulsar_user_preferences TO authenticated;
GRANT ALL ON pulsar_user_preferences TO anon;
