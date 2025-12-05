-- =====================================================
-- ANONYMOUS ACCESS POLICIES FOR DEVELOPMENT
-- =====================================================

-- Allow anon users to read/write channel state (for development)
CREATE POLICY "Allow anon to read channel state"
  ON pulsar_channel_state FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to update channel state"
  ON pulsar_channel_state FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert channel state"
  ON pulsar_channel_state FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon users to read/write channels
CREATE POLICY "Allow anon to read channels"
  ON pulsar_channels FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert channels"
  ON pulsar_channels FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update channels"
  ON pulsar_channels FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow anon to delete channels"
  ON pulsar_channels FOR DELETE
  TO anon
  USING (true);

-- Allow anon users to read/write command log
CREATE POLICY "Allow anon to read command log"
  ON pulsar_command_log FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert command log"
  ON pulsar_command_log FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon users to read/write pages
CREATE POLICY "Allow anon to read pages"
  ON pulsar_pages FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert pages"
  ON pulsar_pages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update pages"
  ON pulsar_pages FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow anon to delete pages"
  ON pulsar_pages FOR DELETE
  TO anon
  USING (true);

-- Allow anon users to read/write playlists
CREATE POLICY "Allow anon to read playlists"
  ON pulsar_playlists FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert playlists"
  ON pulsar_playlists FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update playlists"
  ON pulsar_playlists FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow anon to delete playlists"
  ON pulsar_playlists FOR DELETE
  TO anon
  USING (true);
