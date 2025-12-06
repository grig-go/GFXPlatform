-- =====================================================
-- ACCESS POLICIES FOR DEVELOPMENT
-- Allows all users (anon and authenticated) full access
-- =====================================================

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow anon to read channel state" ON pulsar_channel_state;
DROP POLICY IF EXISTS "Allow anon to update channel state" ON pulsar_channel_state;
DROP POLICY IF EXISTS "Allow anon to insert channel state" ON pulsar_channel_state;
DROP POLICY IF EXISTS "Allow anon to read channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow anon to insert channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow anon to update channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow anon to delete channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow all read channel state" ON pulsar_channel_state;
DROP POLICY IF EXISTS "Allow all update channel state" ON pulsar_channel_state;
DROP POLICY IF EXISTS "Allow all insert channel state" ON pulsar_channel_state;
DROP POLICY IF EXISTS "Allow all read channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow all insert channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow all update channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow all delete channels" ON pulsar_channels;
DROP POLICY IF EXISTS "Allow anon to read command log" ON pulsar_command_log;
DROP POLICY IF EXISTS "Allow anon to insert command log" ON pulsar_command_log;
DROP POLICY IF EXISTS "Allow all read command log" ON pulsar_command_log;
DROP POLICY IF EXISTS "Allow all insert command log" ON pulsar_command_log;
DROP POLICY IF EXISTS "Allow anon to read pages" ON pulsar_pages;
DROP POLICY IF EXISTS "Allow anon to insert pages" ON pulsar_pages;
DROP POLICY IF EXISTS "Allow anon to update pages" ON pulsar_pages;
DROP POLICY IF EXISTS "Allow anon to delete pages" ON pulsar_pages;
DROP POLICY IF EXISTS "Allow all read pages" ON pulsar_pages;
DROP POLICY IF EXISTS "Allow all insert pages" ON pulsar_pages;
DROP POLICY IF EXISTS "Allow all update pages" ON pulsar_pages;
DROP POLICY IF EXISTS "Allow all delete pages" ON pulsar_pages;
DROP POLICY IF EXISTS "Allow anon to read playlists" ON pulsar_playlists;
DROP POLICY IF EXISTS "Allow anon to insert playlists" ON pulsar_playlists;
DROP POLICY IF EXISTS "Allow anon to update playlists" ON pulsar_playlists;
DROP POLICY IF EXISTS "Allow anon to delete playlists" ON pulsar_playlists;
DROP POLICY IF EXISTS "Allow all read playlists" ON pulsar_playlists;
DROP POLICY IF EXISTS "Allow all insert playlists" ON pulsar_playlists;
DROP POLICY IF EXISTS "Allow all update playlists" ON pulsar_playlists;
DROP POLICY IF EXISTS "Allow all delete playlists" ON pulsar_playlists;

-- =====================================================
-- Channel State policies (for all users)
-- =====================================================
CREATE POLICY "Allow all read channel state"
  ON pulsar_channel_state FOR SELECT
  USING (true);

CREATE POLICY "Allow all update channel state"
  ON pulsar_channel_state FOR UPDATE
  USING (true);

CREATE POLICY "Allow all insert channel state"
  ON pulsar_channel_state FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- Channels policies (for all users)
-- =====================================================
CREATE POLICY "Allow all read channels"
  ON pulsar_channels FOR SELECT
  USING (true);

CREATE POLICY "Allow all insert channels"
  ON pulsar_channels FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all update channels"
  ON pulsar_channels FOR UPDATE
  USING (true);

CREATE POLICY "Allow all delete channels"
  ON pulsar_channels FOR DELETE
  USING (true);

-- =====================================================
-- Command Log policies (for all users)
-- =====================================================
CREATE POLICY "Allow all read command log"
  ON pulsar_command_log FOR SELECT
  USING (true);

CREATE POLICY "Allow all insert command log"
  ON pulsar_command_log FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- Pages policies (for all users)
-- =====================================================
CREATE POLICY "Allow all read pages"
  ON pulsar_pages FOR SELECT
  USING (true);

CREATE POLICY "Allow all insert pages"
  ON pulsar_pages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all update pages"
  ON pulsar_pages FOR UPDATE
  USING (true);

CREATE POLICY "Allow all delete pages"
  ON pulsar_pages FOR DELETE
  USING (true);

-- =====================================================
-- Playlists policies (for all users)
-- =====================================================
CREATE POLICY "Allow all read playlists"
  ON pulsar_playlists FOR SELECT
  USING (true);

CREATE POLICY "Allow all insert playlists"
  ON pulsar_playlists FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all update playlists"
  ON pulsar_playlists FOR UPDATE
  USING (true);

CREATE POLICY "Allow all delete playlists"
  ON pulsar_playlists FOR DELETE
  USING (true);
